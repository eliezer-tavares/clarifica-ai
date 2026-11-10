// Service Worker que gerencia os atalhos de teclado e garante o feedback
// para leitores de tela (aria-live) como NVDA e JAWS.
//
// As mensagens de anúncio são resolvidas AQUI, no service worker, a partir
// dos dicionários de _locales (ver motor de mensagens abaixo) e injetadas
// como argumento — a função executada na página web não tem acesso a
// chrome.*, então as strings prontas cruzam a fronteira via args.

const commandActions = {
  'toggle-resumo': 'summarize',
  'toggle-leitura': 'apply-leitura-essencial',
  'toggle-imagens': 'describe-images',
  'toggle-reset': 'reset-all',
  // v1.3.0: sem suggested_key — o Chrome aceita no máximo 4 atalhos
  // sugeridos por extensão; este fica configurável pelo usuário em
  // chrome://extensions/shortcuts (documentado no README).
  'traduzir-selecao': 'translate-selection'
};

// ---- Legendas ao vivo (v1.4.0) — estado do service worker ----
// Fonte de verdade da sessão: quem está capturando (aba) e desde quando.
// Persistido em chrome.storage (legendasAtivas/legendasIdioma) para que o
// popup reaberto reflita o estado real (o popup fecha a qualquer clique
// fora; a captura continua no documento offscreen).
var estadoLegendas = { ativo: false, tabId: null };

// Teto de segurança da captura: em alguns ambientes (headless, hardware
// sem dispositivo de áudio) o getMediaStreamId fica PENDENTE
// indefinidamente — sem teto, o usuário fica preso em "Iniciando...".
// Cinco segundos é generoso para conceder um identificador de fluxo.
const TETO_GET_MEDIA_STREAM_MS = 5000;
const TETO_RESPOSTA_OFFSCREEN_MS = 10000;

// Corrida com teto: rejeita (ou devolve erro) quando a API não responde.
function comTeto(promessa, ms) {
  return Promise.race([
    promessa,
    new Promise((_, recusar) => setTimeout(() => recusar(new Error('teto-tempo')), ms))
  ]);
}

const MENSAGENS_LEITOR = {
  'summarize': 'anuncioResumo',
  'apply-leitura-essencial': 'anuncioLeitura',
  'describe-images': 'anuncioImagens',
  'reset-all': 'anuncioReset',
  'translate-selection': 'anuncioTraducao'
};

// ---- Motor de mensagens (v1.1.0) — ver comentário completo em popup.js ----
// Mesma fonte (_locales), mesmo critério: idioma resolvido por
// getAcceptLanguages com fallback determinístico para pt_BR; JSONs locais.
// Duplicado aqui porque o service worker clássico não pode importar módulo
// compartilhado; a paridade dos dois dicionários é garantida por testes.
let mensagensCache = null;

const MAPA_LOCAIS = { pt: 'pt_BR', en: 'en' };

async function carregarMensagens() {
  if (mensagensCache) return mensagensCache;
  // Ordem de resolução no service worker: (1) idioma publicado pelo popup
  // no chrome.storage (fonte primária — o popup enxerga navigator.languages
  // com confiabilidade), (2) idiomas do perfil visíveis ao SW, (3) API
  // chrome.i18n, (4) fallback determinístico pt_BR.
  let locale = null;
  try {
    const salvo = await chrome.storage.local.get({ idioma: null });
    if (salvo.idioma) locale = salvo.idioma;
  } catch (e) { /* storage indisponível */ }
  // Valida contra os VALORES do mapa (pt_BR/en), não as chaves (pt/en).
  if (!Object.values(MAPA_LOCAIS).includes(locale)) {
    const candidatos = [];
    if (typeof navigator !== 'undefined' && Array.isArray(navigator.languages)) {
      candidatos.push(...navigator.languages);
    }
    try {
      const aceitos = await chrome.i18n.getAcceptLanguages();
      if (Array.isArray(aceitos)) candidatos.push(...aceitos);
    } catch (e) { /* API indisponível */ }
    locale = candidatos
      .map((l) => MAPA_LOCAIS[String(l).split('-')[0].toLowerCase()])
      .find(Boolean) || 'pt_BR';
  }
  const resposta = await fetch(chrome.runtime.getURL(`_locales/${locale}/messages.json`));
  if (!resposta.ok) throw new Error(`Falha ao carregar mensagens: ${resposta.status}`);
  mensagensCache = await resposta.json();
  return mensagensCache;
}

// O popup publica o idioma resolvido no storage; mudou, o SW re-carrega
// (o usuário trocará o idioma pelo popup em versões futuras do roadmap).
try {
  chrome.storage.onChanged.addListener((mudancas, area) => {
    if (area === 'local' && mudancas.idioma && mudancas.idioma.newValue) {
      mensagensCache = null;
      carregarMensagens().catch(() => null);
    }
  });
} catch (e) { /* ambiente sem storage.onChanged (testes, por exemplo) */ }

function mensagemResolvida(mensagens, chave, args = []) {
  const definicao = mensagens && mensagens[chave];
  if (!definicao) return '';
  let texto = definicao.message;
  for (const [nome, ph] of Object.entries(definicao.placeholders || {})) {
    const indice = Number(String(ph.content).replace('$', '')) - 1;
    texto = texto.split(`$${nome}$`).join(args[indice] ?? '');
  }
  return texto;
}

function mensagemParaLeitor(acao) {
  return mensagemResolvida(mensagensCache, MENSAGENS_LEITOR[acao] || 'anuncioGenerico');
}

// Pré-carrega as mensagens no boot do service worker; o listener abaixo
// garante o carregamento mesmo em corrida (comando antes do boot).
(async () => {
  try { await carregarMensagens(); } catch (e) { /* listener re-carrega */ }
})();

chrome.commands.onCommand.addListener(async (command) => {
  const action = commandActions[command];
  if (!action) return;

  if (!mensagensCache) {
    try { await carregarMensagens(); } catch (e) { /* segue com texto vazio */ }
  }

  // Legendas ao vivo (v1.4.0): o Ctrl+Shift+X também encerra a captura —
  // a desmontagem do host na página acontece em executarAcao (abaixo) e a
  // captura/documento offscreen encerram aqui.
  if (action === 'reset-all' && estadoLegendas.ativo) {
    try { await pararLegendas('parada-pedida'); } catch (e) { /* degradação */ }
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: anunciarAcao,
      args: [action, mensagemParaLeitor(action)]
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: executarAcao,
      args: [action]
    });
  } catch (error) {
    console.error('Erro no comando:', error);
  }
});

function anunciarAcao(acao, texto) {
  const antigo = document.getElementById('clarifica-anuncio');
  if (antigo) antigo.remove();

  const anuncio = document.createElement('div');
  anuncio.id = 'clarifica-anuncio';
  anuncio.setAttribute('role', 'status');
  anuncio.setAttribute('aria-live', 'assertive'); // Força o leitor de tela a ler
  anuncio.setAttribute('aria-atomic', 'true');
  anuncio.style.cssText = 'position:fixed; top:-9999px; left:-9999px; width:1px; height:1px; overflow:hidden;';
  anuncio.textContent = texto;
  document.body.appendChild(anuncio);
  setTimeout(() => anuncio.remove(), 5000);
}

function executarAcao(acao) {
  if (acao === 'apply-leitura-essencial') {
    document.getElementById('clarifica-style')?.remove();
    document.documentElement.style.filter = ''; // Limpa filtros de daltonismo
    document.querySelectorAll('nav, footer, aside, .ads, .sidebar, header').forEach(el => {
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('inert', '');
    });
    const main = document.querySelector('main, article, #content') || document.body;
    main.setAttribute('role', 'main');
    main.setAttribute('tabindex', '-1'); // necessário para focus() funcionar em elementos não interativos
    main.focus();
  }
  else if (acao === 'reset-all') {
    document.getElementById('clarifica-style')?.remove();
    document.getElementById('clarifica-resumo')?.remove();
    document.documentElement.style.filter = ''; // Limpa filtros de daltonismo
    // Leitura em voz alta (v1.3.0): interrompe a fala em curso na página —
    // a síntese vive na PÁGINA (Web Speech API), então o reset a alcança.
    try {
      if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') {
        window.speechSynthesis.cancel();
      }
    } catch (e) { /* API ausente (navegador/ambiente sem TTS) */ }
    document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
      el.removeAttribute('aria-hidden');
      el.removeAttribute('inert');
    });
    // Perfis neurodivergentes (v1.2.0): desmonta estilos/elementos/listeners
    // dos três perfis — espelho fiel da limpeza do popup.js (a função
    // injetada não compartilha escopo com o popup; a paridade é garantida
    // por testes em background.test.js e perfis.test.js).
    for (const id of ['clarifica-perfil-tea', 'clarifica-perfil-tdah', 'clarifica-perfil-dislexia', 'clarifica-spotlight', 'clarifica-regua']) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }
    document.querySelectorAll('.clarifica-destaque-leitura').forEach(el => {
      el.classList.remove('clarifica-destaque-leitura');
    });
    const gifs = window.__clarificaGifsPerfilTea;
    if (Array.isArray(gifs)) {
      for (const par of gifs) {
        try { par.canvas.replaceWith(par.original); } catch (e) { /* nó fora do DOM */ }
      }
      window.__clarificaGifsPerfilTea = [];
    }
    const limpeza = window.__clarificaLimpezaPerfis;
    if (typeof limpeza === 'function') {
      try { limpeza(); } catch (e) { /* listeners já removidos */ }
    }
    window.__clarificaLimpezaPerfis = null;
    window.__clarificaIndiceBloco = -1;
    // Legendas ao vivo (v1.4.0): desmonta o host de legendas da página —
    // track (<kind=captions> com Blob WebVTT), overlay de sobreposição,
    // chip de estado e anúncio único. Espelho fiel da limpeza do
    // desmontarLegendasNaPagina (funções injetadas não compartilham
    // escopo; paridade garantida por teste em legendas.test.js). A captura
    // em si é encerrada pelo service worker (pararLegendas no listener de
    // comandos); a limpeza abaixo cobre mesmo quando o SW não sabia do
    // estado (ex.: popup reaberto após queda do SW).
    const hostLegendas = window.__clarificaLegendas;
    if (hostLegendas) {
      try { if (hostLegendas.urlVtt) URL.revokeObjectURL(hostLegendas.urlVtt); } catch (e) { /* URL já revogada */ }
      try { if (hostLegendas.trackEl) hostLegendas.trackEl.remove(); } catch (e) { /* nó fora do DOM */ }
      try { if (hostLegendas.sobreposicao) hostLegendas.sobreposicao.remove(); } catch (e) { /* nó fora do DOM */ }
      try { if (hostLegendas.chip) hostLegendas.chip.remove(); } catch (e) { /* nó fora do DOM */ }
      window.__clarificaLegendas = null;
    }
    // Defesa em profundidade: os artefatos visíveis são removidos POR ID
    // mesmo sem host registrado (ex.: SW reiniciado perdeu o estado, mas
    // a página ainda exibe o chip/overlay da sessão anterior).
    for (const id of ['clarifica-overlay-legendas', 'clarifica-chip-legendas', 'clarifica-estilo-legendas', 'clarifica-anuncio-legendas']) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }
  }
  else if (acao === 'summarize' || acao === 'describe-images' || acao === 'translate-selection') {
    window.postMessage({ type: 'TRIGGER_ACTION', action: acao }, '*');
  }
}

// =====================================================================
// Legendas ao vivo (v1.4.0) — ponte service worker ⇄ offscreen ⇄ página
//
// Padrão MV3 para captura de áudio de aba com documento offscreen:
//   1. o popup envia { target: 'background', type: 'clarifica-legendas' };
//   2. este service worker garante o documento offscreen (um único por
//      extensão — ciclo criar/verificar/recriar idempotente), obtém o
//      identificador de fluxo da aba ativa via chrome.tabCapture
//      .getMediaStreamId (exige Chrome 116 no SW) e o entrega ao
//      offscreen;
//   3. o offscreen troca o identificador por um MediaStream, alimenta
//      janelas contínuas ao Whisper (100% local) e devolve cada
//      transcrição parcial ('legenda-pronta');
//   4. este SW entrega a legenda à página (chrome.scripting) e o popup
//      acompanha em tempo real (chrome.runtime broadcasts).
// =====================================================================

// Garante EXATAMENTE um documento offscreen (padrão setupOffscreenDocument
// da documentação: verificar com getContexts e recriar idempotentemente).
async function garantirDocumentoOffscreen() {
  try {
    const contextos = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (Array.isArray(contextos) && contextos.length > 0) return;
  } catch (e) { /* getContexts indisponível: segue para a criação */ }
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen/offscreen.html',
      reasons: ['USER_MEDIA', 'AUDIO_PLAYBACK'],
      justification: 'Captura do áudio da aba ativa para gerar legendas ao vivo com Whisper 100% local (Clarifica.ai v1.4.0).'
    });
  } catch (e) {
    // Corrida benigna: outro caminho já criou o documento neste instante.
    if (!String((e && e.message) || e).includes('single offscreen document')) throw e;
  }
}

async function iniciarLegendas(mensagem) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // Páginas restritas (chrome://, Chrome Web Store) não permitem captura:
  // código próprio traduzido no popup, sem inflar o estado.
  if (!tab || !/^https?:/i.test(tab.url || '')) return { error: 'aba-sem-midia' };

  await garantirDocumentoOffscreen();

  // Identificador de fluxo: o caminho preferencial é o service worker
  // (padrão do exemplo oficial de tab capture). O fallback — obter o
  // identificador no próprio popup, também página de extensão com gesto
  // do usuário — vive no popup.js (mitigação do M1 no plano da v1.4.0).
  let streamId = mensagem && typeof mensagem.streamId === 'string' ? mensagem.streamId : '';
  if (!streamId) {
    try {
      streamId = await comTeto(chrome.tabCapture.getMediaStreamId(), TETO_GET_MEDIA_STREAM_MS);
    } catch (e) {
      return { error: 'captura-negada' };
    }
  }

  let resposta;
  try {
    resposta = await comTeto(
      chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'legendas-iniciar-captura',
        data: { streamId, tarefa: mensagem && mensagem.idioma === 'ingles' ? 'traduzir' : 'transcrever' }
      }),
      TETO_RESPOSTA_OFFSCREEN_MS
    );
  } catch (e) {
    return { error: 'falha-legendas' };
  }
  if (!resposta || resposta.error) return resposta || { error: 'falha-legendas' };

  estadoLegendas = { ativo: true, tabId: tab.id };
  try {
    await chrome.storage.local.set({ legendasAtivas: true, legendasIdioma: (mensagem && mensagem.idioma) || 'original' });
  } catch (e) { /* sem persistência */ }

  // Host de legendas na página (track/overlay/chip) + anúncio único.
  // Páginas com apenas <audio> respondem semVideo: a transcrição ao vivo
  // segue apenas no popup (comportamento do plano da v1.4.0).
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: prepararLegendasNaPagina,
      args: [{
        chip: mensagemResolvida(mensagensCache, 'chipLegendasAtivas'),
        anuncio: mensagemResolvida(mensagensCache, 'anuncioLegendasNaPagina')
      }]
    });
  } catch (e) { /* página sem injeção: legendas seguem só no popup */ }

  return { success: true };
}

async function pararLegendas(motivo) {
  const estavaAtivo = estadoLegendas.ativo;
  const tabId = estadoLegendas.tabId;
  estadoLegendas = { ativo: false, tabId: null };

  // Idempotente por desenho: popup, Ctrl+Shift+X, fim do fluxo no
  // offscreen e navegação podem chegar na mesma janela de tempo — só a
  // PRIMEIRA execução desmonta e notifica; as demais reaproveitam o
  // caminho sem repetir a injeção nem a notificação ao popup.
  try {
    await chrome.runtime.sendMessage({ target: 'offscreen', type: 'legendas-parar', data: { motivo } });
  } catch (e) { /* offscreen já fechado */ }
  try { await chrome.offscreen.closeDocument(); } catch (e) { /* nenhum documento aberto */ }
  try { await chrome.storage.local.set({ legendasAtivas: false }); } catch (e) { /* sem persistência */ }

  if (estavaAtivo && typeof tabId === 'number') {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, func: desmontarLegendasNaPagina });
    } catch (e) { /* aba fechada ou navegada: nada a desmontar */ }
  }

  // Encerramento NÃO pedido pelo usuário (navegação, fim do fluxo, DRM):
  // o popup precisa saber para desligar o toggle com mensagem clara. O
  // caminho pedido pelo usuário não re-notifica — o popup já exibiu o
  // estado final por conta própria.
  if (motivo === 'captura-encerrada') {
    try {
      chrome.runtime.sendMessage({ type: 'clarifica-legendas-estado', ativo: false, motivo }).catch(() => {});
    } catch (e) { /* popup fechado: o storage já reflete o estado */ }
  }
}

async function entregarLegenda(mensagem) {
  if (!estadoLegendas.ativo || typeof estadoLegendas.tabId !== 'number') return;
  await chrome.scripting.executeScript({
    target: { tabId: estadoLegendas.tabId },
    func: entregarLegendasNaPagina,
    args: [{ texto: mensagem.texto, vtt: mensagem.vtt }]
  });
}

// Roteador de mensagens da fronteira legendas (popup ⇄ offscreen ⇄ aqui).
// Registrado com guarda: ambientes sem chrome.runtime (suíte em Node) não
// quebram a avaliação do arquivo.
try {
  chrome.runtime.onMessage.addListener((mensagem, remetente, responder) => {
    if (!mensagem || typeof mensagem !== 'object') return;

    if (mensagem.target === 'background' && mensagem.type === 'clarifica-legendas') {
      const promessa = mensagem.action === 'iniciar'
        ? iniciarLegendas(mensagem)
        : mensagem.action === 'parar'
          ? pararLegendas('parada-pedida').then(() => ({ success: true }))
          : Promise.resolve({ error: 'falha-legendas' });
      promessa.then(responder).catch(() => responder({ error: 'falha-legendas' }));
      return true; // resposta assíncrona
    }

    if (mensagem.target === 'background' && mensagem.type === 'legenda-pronta') {
      entregarLegenda(mensagem).catch(() => {
        // Injeção falhou (aba navegada/fechada): encerra com mensagem
        // clara em vez de continuar entregando legendas ao vácuo.
        pararLegendas('captura-encerrada').catch(() => null);
      });
      return;
    }

    if (mensagem.target === 'background' && mensagem.type === 'legendas-encerradas') {
      // O offscreen encerrou por conta própria (fim do fluxo, aba fechada,
      // erro do worker): fecha o documento e sincroniza o estado.
      pararLegendas(mensagem.motivo === 'captura-encerrada' ? 'captura-encerrada' : 'parada-pedida')
        .catch(() => null);
      return;
    }
  });
} catch (e) { /* ambiente sem runtime.onMessage (testes em Node) */ }

// Navegação/fechamento da aba encerram a captura com mensagem clara.
try {
  chrome.tabs.onUpdated.addListener((tabId, mudancas) => {
    if (estadoLegendas.ativo && tabId === estadoLegendas.tabId && mudancas && mudancas.url) {
      pararLegendas('captura-encerrada').catch(() => null);
    }
  });
  chrome.tabs.onRemoved.addListener((tabId) => {
    if (estadoLegendas.ativo && tabId === estadoLegendas.tabId) {
      // A aba sumiu: o fim do fluxo de mídia no offscreen completa a
      // limpeza ('legendas-encerradas'); aqui só o estado do SW zera.
      estadoLegendas = { ativo: false, tabId: null };
    }
  });
} catch (e) { /* ambiente sem chrome.tabs (testes em Node) */ }

// ---- Funções INJETADAS na página (o Chrome serializa apenas o corpo —
// toda dependência vive dentro; strings já traduzidas chegam como args) ----

// Cria o host de legendas: seleciona o vídeo alvo (função pura inline),
// cria <track kind="captions"> com Blob WebVTT (canal padrão, respeitado
// por leitores de tela e pelo controle CC do player) e o chip de estado.
// Sem <video> na página, responde semVideo — a transcrição segue no popup.
function prepararLegendasNaPagina(extras) {
  // === INÍCIO DA LÓGICA PURA DE SELEÇÃO DE VÍDEO (v1.4.0: fonte canônica
  // em scripts/clarifica-puro.js; paridade garantida por
  // tests/legendas.test.js) ===
  function seletorDeVideoAlvo(descritores) {
    const lista = Array.isArray(descritores) ? descritores : [];
    let melhor = null;
    for (let indice = 0; indice < lista.length; indice++) {
      const descritor = lista[indice];
      if (!descritor || !descritor.visivel || !(Number(descritor.area) > 0)) continue;
      if (!melhor || Number(descritor.area) > Number(melhor.area)) {
        melhor = { indice, area: Number(descritor.area) };
      }
    }
    return melhor ? melhor.indice : null;
  }
  // === FIM DA LÓGICA PURA DE SELEÇÃO DE VÍDEO ===

  const videos = Array.from(document.querySelectorAll('video'));
  const descritores = videos.map((video) => {
    const retangulo = typeof video.getBoundingClientRect === 'function'
      ? video.getBoundingClientRect()
      : { width: 0, height: 0 };
    const area = Math.max(0, (retangulo.width || 0) * (retangulo.height || 0));
    return { visivel: area > 0, area };
  });

  const indice = seletorDeVideoAlvo(descritores);
  const videoAlvo = indice === null ? null : videos[indice];

  // Host persiste no mundo isolado das injeções (globals de window
  // sobrevivem entre executeScript — mesma conduta dos perfis v1.2.0).
  const host = window.__clarificaLegendas || {};
  host.selecionarVideo = function () {
    const lista = Array.from(document.querySelectorAll('video')).map((v) => {
      const r = typeof v.getBoundingClientRect === 'function' ? v.getBoundingClientRect() : { width: 0, height: 0 };
      const area = Math.max(0, (r.width || 0) * (r.height || 0));
      return { visivel: area > 0, area };
    });
    const i = seletorDeVideoAlvo(lista);
    return i === null ? null : document.querySelectorAll('video')[i];
  };

  if (!videoAlvo) {
    window.__clarificaLegendas = host;
    return { success: true, semVideo: true };
  }

  host.video = videoAlvo;

  // Anúncio ÚNICO de estado (o chip e o botão do popup são redundância
  // visual; regiões assertive empilhadas fariam o leitor de tela reler).
  document.querySelectorAll('.clarifica-anuncio').forEach((a) => a.remove());
  const anuncio = document.createElement('div');
  anuncio.className = 'clarifica-anuncio';
  anuncio.setAttribute('role', 'status');
  anuncio.setAttribute('aria-live', 'assertive');
  anuncio.textContent = (extras && extras.anuncio) || '';
  document.body.appendChild(anuncio);
  setTimeout(() => anuncio.remove(), 3000);

  // Chip discreto "Legendas ativas — captando áudio" com pulso sutil.
  if (!host.chip) {
    const estiloPulso = document.createElement('style');
    estiloPulso.id = 'clarifica-estilo-legendas';
    estiloPulso.textContent = '@keyframes clarifica-pulso { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }';
    document.documentElement.appendChild(estiloPulso);

    const chip = document.createElement('div');
    chip.id = 'clarifica-chip-legendas';
    chip.setAttribute('aria-hidden', 'true');
    chip.style.cssText = 'position:fixed;top:14px;right:14px;padding:6px 12px;background:rgba(2,6,23,0.82);color:#ffffff;font-size:0.85rem;border-radius:999px;z-index:2147483647;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.35);pointer-events:none;';
    const pulso = document.createElement('span');
    pulso.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#f43f5e;animation:clarifica-pulso 1.6s ease-in-out infinite;';
    chip.appendChild(pulso);
    const rotulo = document.createElement('span');
    rotulo.textContent = (extras && extras.chip) || '';
    chip.appendChild(rotulo);
    document.body.appendChild(chip);
    host.chip = chip;
  }

  // Fallback de sobreposição (CSP restritiva bloqueia o Blob do track,
  // por exemplo): caixa fixa sobre o vídeo, aria-hidden (a legenda é
  // texto visível; o anúncio de estado é único).
  function ativarFallbackSobreposicao() {
    if (host.sobreposicao) return;
    try { if (host.trackEl) host.trackEl.remove(); } catch (e) { /* nó fora do DOM */ }
    host.trackEl = null;
    const caixa = document.createElement('div');
    caixa.id = 'clarifica-overlay-legendas';
    caixa.setAttribute('aria-hidden', 'true');
    caixa.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:12%;max-width:80%;padding:10px 16px;background:rgba(2,6,23,0.82);color:#ffffff;font-size:1.25rem;line-height:1.35;text-align:center;border-radius:10px;z-index:2147483647;box-shadow:0 8px 24px rgba(0,0,0,0.45);pointer-events:none;';
    if (host.ultimoTexto) caixa.textContent = host.ultimoTexto;
    document.body.appendChild(caixa);
    host.sobreposicao = caixa;
  }
  host.ativarFallback = ativarFallbackSobreposicao;

  // Caminho preferencial: <track kind="captions"> com Blob WebVTT.
  if (!host.trackEl) {
    const track = document.createElement('track');
    track.kind = 'captions';
    track.label = 'Clarifica.ai';
    track.srclang = 'pt-BR';
    track.addEventListener('error', () => ativarFallbackSobreposicao(), { once: true });
    videoAlvo.appendChild(track);
    host.trackEl = track;
    const aplicarModo = () => { try { track.track.mode = 'showing'; } catch (e) { /* track não pronto */ } };
    track.addEventListener('load', aplicarModo, { once: true });
    aplicarModo();
  }

  window.__clarificaLegendas = host;
  return { success: true, semVideo: false };
}

// Recebe cada transcrição parcial: atualiza o Blob WebVTT do track
// (caminho nativo) e o texto do overlay (fallback). Idempotente e tolerante
// a vídeo removido — re-seleciona pelo mesmo critério puro.
function entregarLegendasNaPagina(dados) {
  const host = window.__clarificaLegendas;
  if (!host) return { success: false };
  const texto = String((dados && dados.texto) || '').trim();
  if (!texto) return { success: false };

  host.ultimoTexto = texto;

  if ((!host.video || !host.video.isConnected) && typeof host.selecionarVideo === 'function') {
    host.video = host.selecionarVideo();
    if (host.video && !host.trackEl && !host.sobreposicao) return { success: false };
  }

  if (host.trackEl && host.video) {
    try {
      if (host.urlVtt) URL.revokeObjectURL(host.urlVtt);
      host.urlVtt = URL.createObjectURL(new Blob([String((dados && dados.vtt) || '')], { type: 'text/vtt' }));
      host.trackEl.src = host.urlVtt;
      try { host.trackEl.track.mode = 'showing'; } catch (e) { /* track não pronto */ }
    } catch (e) {
      if (typeof host.ativarFallback === 'function') host.ativarFallback();
    }
  }
  if (host.sobreposicao) host.sobreposicao.textContent = texto;
  return { success: true };
}

// Desmonta o host de legendas (toggle, Ctrl+Shift+X via SW, encerramento).
function desmontarLegendasNaPagina() {
  const host = window.__clarificaLegendas;
  if (host) {
    try { if (host.urlVtt) URL.revokeObjectURL(host.urlVtt); } catch (e) { /* URL já revogada */ }
    try { if (host.trackEl) host.trackEl.remove(); } catch (e) { /* nó fora do DOM */ }
    try { if (host.sobreposicao) host.sobreposicao.remove(); } catch (e) { /* nó fora do DOM */ }
    try { if (host.chip) host.chip.remove(); } catch (e) { /* nó fora do DOM */ }
    window.__clarificaLegendas = null;
  }
  const estilo = document.getElementById('clarifica-estilo-legendas');
  if (estilo) estilo.remove();
  const anuncio = document.getElementById('clarifica-anuncio-legendas');
  if (anuncio) anuncio.remove();
  return { success: true };
}
