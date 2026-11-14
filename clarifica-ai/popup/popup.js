// Controlador do popup: orquestra a comunicação com a página ativa,
// aplica os filtros de daltonismo (com intensidade ajustável), gerencia
// tema claro/escuro, configurações persistidas via chrome.storage e a
// interface em pt-BR/en via chrome.i18n.
//
// Nota de engenharia (encontrada por teste E2E em navegador real): não é
// possível construir `new Worker('chrome-extension://...')` a partir de
// uma página web — o Chrome bloqueia com SecurityError mesmo com o recurso
// em web_accessible_resources. O worker de IA é então criado a partir de
// um Blob com o código buscado da extensão, como módulo. O import da
// biblioteca de IA (vendor/transformers.min.js, pacote vendado desde a
// v1.1.0 — sem CDN) e a base dos binários WASM são resolvidos AQUI, com
// chrome.runtime.getURL, e substituídos nos placeholders do ai-worker.js
// antes da criação do Blob.
// Além disso, quando a função injetada rejeita, o chrome.scripting
// devolve result=null (não propaga a rejeição) — por isso cada resultado
// é validado antes de exibir sucesso ao usuário.
//
// As strings exibidas na PÁGINA (anúncios aria-live, aria-label das
// imagens) também são resolvidas aqui com chrome.i18n e cruzam a
// fronteira como argumentos — funções injetadas não têm acesso a chrome.*.

// === INÍCIO DA LÓGICA PURA DE FILTROS (seção extrável: exercitada em
// Node por css-filters.test.js — não depende de chrome.* nem de DOM) ===

// Matrizes feColorMatrix de correção cromática (4 linhas × 5 colunas,
// luminância preservada: cada linha RGB soma 1; alfa intocado).
const MATRIZES_DALTONISMO = {
  protanopia: [0.567, 0.433, 0, 0, 0,
               0.558, 0.442, 0, 0, 0,
               0, 0.242, 0.758, 0, 0,
               0, 0, 0, 1, 0],
  deuteranopia: [0.625, 0.375, 0, 0, 0,
                 0.7, 0.3, 0, 0, 0,
                 0, 0.3, 0.7, 0, 0,
                 0, 0, 0, 1, 0],
  tritanopia: [0.95, 0.05, 0, 0, 0,
               0, 0.433, 0.567, 0, 0,
               0, 0.475, 0.525, 0, 0,
               0, 0, 0, 1, 0]
};

// Interpola linearmente entre a identidade (intensidade 0 — página sem
// alteração) e a matriz de referência (intensidade 100). Para qualquer
// intensidade as linhas R/G/B continuam somando 1 e o alfa permanece.
function matrizComIntensidade(matriz, intensidade) {
  const t = Math.min(100, Math.max(0, Number(intensidade) || 0)) / 100;
  return matriz.map((valor, i) => {
    const diagonal = i % 5 === Math.floor(i / 5) ? 1 : 0;
    return t * valor + (1 - t) * diagonal;
  });
}

// Formata os 20 valores como o feColorMatrix espera: colunas separadas
// por vírgula, linhas separadas por espaço, sem zeros à direita.
function formatarValoresMatriz(matriz) {
  const valores = matriz.map((v) => Number(v.toFixed(3)).toString());
  return [0, 1, 2, 3]
    .map((linha) => valores.slice(linha * 5, linha * 5 + 5).join(', '))
    .join(' ');
}

// Constrói o CSS filter com o feColorMatrix codificado em data URI SVG.
function filtroDaltonismoCss(tipo, intensidade) {
  const matriz = MATRIZES_DALTONISMO[tipo];
  if (!matriz) return '';
  const valores = formatarValoresMatriz(matrizComIntensidade(matriz, intensidade));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg'><filter id='f'><feColorMatrix type='matrix' values='${valores}'/></filter></svg>#f`;
  return `url("data:image/svg+xml;utf8,${svg}")`;
}

// === FIM DA LÓGICA PURA DE FILTROS ===

// === INÍCIO DA LÓGICA PURA DE PERFIS NEURODIVERGENTES (v1.2.0: seção
// extrável — exercitada em Node por perfis.test.js, sem DOM nem chrome.*) ===
//
// Três perfis prontos, planejados no roadmap do README e materializados
// com CSS/DOM/JS nativos — nenhum deles usa IA, rede ou permissão nova:
//   tea      → menos estímulos: pausa animações/transições, converte GIFs
//              animados em um quadro estático (canvas, sem rede) e remove
//              sombras/blur (ruído visual).
//   tdah     → foco: holofote que escurece a página ao redor do cursor e
//              navegação progressiva por blocos de leitura (Alt+↓/↑).
//   dislexia → leitura: espaçamento de letras/palavras/linhas, fonte de
//              leitura do sistema e régua que acompanha o mouse.
// O CSS de cada perfil nasce AQUI (testável) e cruza a fronteira como
// argumento — funções injetadas não enxergam o escopo do popup.js.

const NOMES_PERFIS = {
  tea: 'nomePerfilTea',
  tdah: 'nomePerfilTdah',
  dislexia: 'nomePerfilDislexia'
};

const TIPOS_PERFIL = Object.keys(NOMES_PERFIS);

// Elementos de texto que recebem o ajuste tipográfico do perfil dislexia.
const ALVO_TEXTO = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, dd, dt, figcaption, td, th, span, a, label, button, summary';
// Trechos de código ficam de fora do espaçamento (indentação é significativa)
// e voltam à fonte monoespaçada — regra colocada por ÚLTIMO para vencer.
const ALVO_MONO = 'code, pre, kbd, samp, textarea, input';

function cssPerfil(nome) {
  if (nome === 'tea') {
    return [
      // Pausa (não pula para o estado final): animações congelam onde estão.
      '*, *::before, *::after { animation-play-state: paused !important; transition: none !important; scroll-behavior: auto !important; }',
      // Simplificação visual — html fica de fora para NÃO apagar o filtro
      // de daltonismo, que vive como filter no documentElement.
      '*:not(html):not(head):not(style):not(script):not(link):not(meta) { box-shadow: none !important; text-shadow: none !important; backdrop-filter: none !important; filter: none !important; }'
    ].join('\n');
  }
  if (nome === 'tdah') {
    return [
      // Holofote: um buraco transparente segue o cursor; o resto escurece.
      '#clarifica-spotlight { position: fixed; inset: 0; pointer-events: none; z-index: 2147483646; background: radial-gradient(circle 170px at var(--clarifica-x, 50%) var(--clarifica-y, 40%), rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 150px, rgba(2, 6, 23, 0.82) 240px); }',
      // Bloco de leitura em destaque (navegação Alt+↓/↑).
      '.clarifica-destaque-leitura { outline: 3px solid #2563eb; outline-offset: 3px; background: rgba(250, 204, 21, 0.35) !important; border-radius: 2px; }'
    ].join('\n');
  }
  if (nome === 'dislexia') {
    return [
      `${ALVO_TEXTO} { letter-spacing: 0.05em !important; word-spacing: 0.12em !important; }`,
      `${ALVO_TEXTO} { line-height: 1.8 !important; }`,
      `${ALVO_TEXTO} { font-family: Verdana, Tahoma, 'Segoe UI', Arial, sans-serif !important; }`,
      `${ALVO_MONO} { letter-spacing: normal !important; word-spacing: normal !important; line-height: normal !important; font-family: ui-monospace, 'Cascadia Mono', 'Courier New', monospace !important; }`,
      // Régua de leitura: faixa fixa de 48 px que o JS centraliza 24 px acima
      // do cursor. pointer-events:none garante que ela nunca bloqueie cliques;
      // o top fora da tela evita uma faixa solta antes do primeiro mousemove.
      '#clarifica-regua { position: fixed; left: 0; right: 0; top: -100px; height: 48px; box-sizing: border-box; border-top: 2px solid rgba(37, 99, 235, 0.85); border-bottom: 2px solid rgba(37, 99, 235, 0.85); background: rgba(37, 99, 235, 0.08); pointer-events: none; z-index: 2147483646; }'
    ].join('\n');
  }
  return '';
}

// === FIM DA LÓGICA PURA DE PERFIS NEURODIVERGENTES ===

// ---- Motor de mensagens (v1.1.0) ----
// As mensagens vivem em _locales/<locale>/messages.json (fonte única, os
// mesmos arquivos do padrão chrome.i18n). O getMessage nativo depende do
// app-locale do PROCESSO do navegador — que não reflete com confiabilidade
// o idioma do usuário em builds headless (usados nos E2E) e em instalações
// com várias línguas. O popup resolve o idioma por navigator.languages →
// getAcceptLanguages → fallback pt_BR, carrega o JSON do próprio pacote
// (sem rede) e PUBLICA o idioma no chrome.storage para o service worker
// consumir (ver background.js).
let mensagensCache = null;
let localeResolvido = 'pt_BR';

const MAPA_LOCAIS = { pt: 'pt_BR', en: 'en' };

async function carregarMensagens() {
  if (mensagensCache) return mensagensCache;
  // Ordem de resolução: idiomas visíveis à página (navigator.languages, que
  // o usuário controla no navegador), idiomas aceitos da API chrome.i18n,
  // e fallback determinístico pt_BR.
  const candidatos = [];
  if (typeof navigator !== 'undefined' && Array.isArray(navigator.languages)) {
    candidatos.push(...navigator.languages);
  }
  try {
    const aceitos = await chrome.i18n.getAcceptLanguages();
    if (Array.isArray(aceitos)) candidatos.push(...aceitos);
  } catch (e) { /* API indisponível: segue os candidatos */ }
  localeResolvido = candidatos
    .map((l) => MAPA_LOCAIS[String(l).split('-')[0].toLowerCase()])
    .find(Boolean) || 'pt_BR';
  const resposta = await fetch(chrome.runtime.getURL(`_locales/${localeResolvido}/messages.json`));
  if (!resposta.ok) throw new Error(`Falha ao carregar mensagens: ${resposta.status}`);
  mensagensCache = await resposta.json();
  // Publica o idioma resolvido: o service worker (que não enxerga
  // navigator.languages com confiabilidade) consome o storage e re-carrega
  // via onChanged — uma única fonte de verdade para os dois contextos.
  try { await chrome.storage.local.set({ idioma: localeResolvido }); } catch (e) { /* sem persistência */ }
  return mensagensCache;
}

// Resolve uma mensagem do dicionário, incluindo os placeholders do
// chrome.i18n ("$nome$" → args[N-1] conforme placeholders.nome.content "$N").
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

document.addEventListener('DOMContentLoaded', () => {
  // ---- i18n de superfície (v1.1.0) ----
  // O Chrome substitui __MSG_chave__ no HTML da extensão na carga; em
  // alguns builds (headless usado nos E2E, por exemplo) a substituição
  // automática não acontece — o popup então resolve os placeholders
  // restantes com chrome.i18n. Idempotente: sem placeholders, nada muda.
  function aplicarI18n(raiz) {
    const resolver = (texto) => texto.replace(/__MSG_(\w+)__/g, (original, chave) => mensagemResolvida(mensagensCache, chave) || original);
    const percorrer = (node) => {
      for (const filho of [...node.childNodes]) {
        if (filho.nodeType === 3 && /__MSG_\w+__/.test(filho.textContent)) {
          filho.textContent = resolver(filho.textContent);
        } else if (filho.nodeType === 1) {
          percorrer(filho);
        }
      }
    };
    percorrer(raiz);
    for (const el of raiz.querySelectorAll('*')) {
      for (const atributo of [...el.attributes]) {
        if (/__MSG_\w+__/.test(atributo.value)) el.setAttribute(atributo.name, resolver(atributo.value));
      }
    }
  }
  aplicarI18n(document.documentElement);

  const statusEl = document.getElementById('status');
  const resultArea = document.getElementById('result-area');
  const aiOutput = document.getElementById('ai-output');
  const slider = document.getElementById('intensidade');
  const sliderValor = document.getElementById('intensidade-valor');
  const btnTema = document.getElementById('btn-tema');
  // Legendas ao vivo (v1.4.0): seletor de idioma das legendas (original ×
  // inglês por tradução) — alterna a tarefa do pipeline Whisper.
  const idiomaLegendasEl = document.getElementById('idioma-legendas');
  // v2.0.0 — Assistente de perguntas (QA), saída em português com Português
  // Claro e sincronização de perfis entre páginas e abas.
  const inputPergunta = document.getElementById('pergunta');
  const idiomaSaidaEl = document.getElementById('idioma-saida');
  const claroEl = document.getElementById('claro');
  const sincronizarEl = document.getElementById('sincronizar');

  // Suporte a Firefox (v2.0.0): chrome.tabCapture e o documento offscreen
  // não existem no Firefox — as legendas ao vivo ficam indisponíveis e os
  // controles correspondentes são ocultados (docs/FIREFOX.md). Todos os
  // demais recursos funcionam no Firefox 115+ via Manifest V2.
  const ehFirefox = typeof navigator !== 'undefined' && /firefox/i.test(String(navigator.userAgent || ''));
  if (ehFirefox) {
    const btnLegendasFF = document.querySelector('.mode-btn[data-mode="legendas"]');
    if (btnLegendasFF) btnLegendasFF.style.display = 'none';
    if (idiomaLegendasEl && idiomaLegendasEl.parentElement) idiomaLegendasEl.parentElement.style.display = 'none';
    const notaLegendasFF = document.querySelector('.nota-legendas');
    if (notaLegendasFF) notaLegendasFF.style.display = 'none';
  }

  const TIPOS_FILTRO = ['protanopia', 'deuteranopia', 'tritanopia'];
  // Códigos de erro que atravessam a fronteira página↔popup (a página
  // injetada não tem chrome.i18n) — traduzidos aqui, no idioma da UI.
  // Todo erro que cruza a fronteira é um CÓDIGO desta lista; códigos
  // desconhecidos caem na mensagem genérica de falha da IA.
  const TRADUCAO_ERROS = {
    'texto-curto': 'statusTextoCurto',
    'erro-resumo': 'statusErroProcessamento',
    'erro-imagem': 'statusErroImagem',
    'falha-worker': 'statusFalhaIA',
    'falha-injecao': 'statusInjecaoErro',
    // Áudio e Multimodal (v1.3.0): códigos da página (descoberta de mídia,
    // CORS, seleção, TTS) e códigos do worker (falha de inferência).
    'sem-audio': 'statusSemAudio',
    'audio-indisponivel': 'statusAudioIndisponivel',
    'media-bloqueado': 'statusMediaBloqueado',
    'audio-muito-curto': 'statusAudioCurto',
    'erro-audio': 'statusErroAudio',
    'erro-ocr': 'statusErroOcr',
    'erro-traducao': 'statusErroTraducao',
    'selecao-vazia': 'statusSelecaoVazia',
    'tts-indisponivel': 'statusTtsIndisponivel',
    'sem-texto-voz': 'statusSemTextoVoz',
    // Legendas ao vivo (v1.4.0): códigos da fronteira captura/offscreen.
    'captura-negada': 'statusCapturaNegada',
    'aba-sem-midia': 'statusAbaSemMidia',
    'captura-encerrada': 'statusCapturaEncerrada',
    'falha-legendas': 'statusFalhaLegendas',
    // v2.0.0: códigos do assistente de perguntas e da sincronização.
    'pergunta-vazia': 'statusPerguntaVazia',
    'contexto-curto': 'statusContextoCurto',
    'erro-qa': 'statusErroQa',
    'falha-sincronizacao': 'statusFalhaSincronizacao'
  };
  const CICLO_TEMA = ['auto', 'claro', 'escuro'];

  const textoDeErro = (codigo) => mensagem(TRADUCAO_ERROS[codigo] || 'statusFalhaIA');

  let intensidadeAtual = 100;
  let ultimoFiltro = null;
  let perfilAtivo = null;

  const mensagem = (chave, args) => mensagemResolvida(mensagensCache, chave, args);

  // ---- Configurações persistidas (chrome.storage.local) ----
  // Falhas de storage nunca devem derrubar a UI: o estado padrão já está
  // aplicado e o try/catch mantém o popup funcional sem persistência.
  async function salvarConfig(parcial) {
    try { await chrome.storage.local.set(parcial); } catch (e) { /* sem persistência */ }
  }
  async function carregarConfig() {
    try {
      const cfg = await chrome.storage.local.get({ tema: 'auto', intensidade: 100, ultimoFiltro: null, perfilAtivo: null, legendasAtivas: false, legendasIdioma: 'original', idiomaSaida: 'original', claro: false, sincronizacaoAtiva: true });
      aplicarTema(cfg.tema);
      definirIntensidade(cfg.intensidade);
      if (TIPOS_FILTRO.includes(cfg.ultimoFiltro)) destacarFiltro(cfg.ultimoFiltro);
      // Perfis neurodivergentes (v1.2.0): o botão do perfil ativo é
      // restaurado ao reabrir o popup (o efeito na página é por visita,
      // como nos filtros — reativar é um clique).
      if (TIPOS_PERFIL.includes(cfg.perfilAtivo)) destacarPerfil(cfg.perfilAtivo);
      // Legendas ao vivo (v1.4.0): o toggle e o seletor de idioma refletem
      // o estado real da captura (que continua no offscreen mesmo com o
      // popup fechado — o storage é publicado pelo service worker).
      idiomaLegendasEl.value = cfg.legendasIdioma === 'ingles' ? 'ingles' : 'original';
      marcarLegendas(!!cfg.legendasAtivas);
      // v2.0.0: idioma de saída da IA (original × português), Português
      // Claro e sincronização de perfis (padrão: ligada).
      idiomaSaidaEl.value = cfg.idiomaSaida === 'pt' ? 'pt' : 'original';
      claroEl.checked = cfg.claro === true;
      sincronizarEl.checked = cfg.sincronizacaoAtiva !== false;
    } catch (e) { /* mantém os padrões */ }
  }

  // ---- Perfis neurodivergentes (v1.2.0) ----
  // Destaque visual do perfil ativo nos três botões (aria-pressed para
  // leitores de tela — WCAG 4.1.2).
  function destacarPerfil(nome) {
    perfilAtivo = TIPOS_PERFIL.includes(nome) ? nome : null;
    document.querySelectorAll('.mode-btn.perfil').forEach((b) => {
      const ativo = perfilAtivo !== null && b.dataset.mode === perfilAtivo;
      b.classList.toggle('ativo', ativo);
      if (ativo) b.setAttribute('aria-pressed', 'true');
      else b.removeAttribute('aria-pressed');
    });
  }

  async function aplicarPerfil(nome) {
    const nomeTraduzido = mensagem(NOMES_PERFIS[nome]);
    const r = await enviarParaContent('perfil-' + nome, {
      css: cssPerfil(nome),
      anuncioPerfil: mensagem('anuncioPerfilNaPagina', [nomeTraduzido])
    });
    if (r && r.success) {
      statusEl.textContent = mensagem('statusPerfilOk', [nomeTraduzido]);
      destacarPerfil(nome);
      await salvarConfig({ perfilAtivo: nome });
      await sincronizarOutrasAbas('aplicar');
    } else {
      // A página NÃO recebeu o perfil: a UI não pode afirmar que está ativo.
      statusEl.textContent = (r && r.error) ? textoDeErro(r.error) : mensagem('statusInjecaoErro');
      destacarPerfil(null);
    }
  }

  // ---- Sincronização de perfis e filtros (v2.0.0) ----
  // O estado corrente vive no chrome.storage (fonte única): ao ativar ou
  // desligar um recurso, o popup pede ao service worker a propagação para
  // as abas http(s) já abertas (o próprio service worker lê o storage —
  // o popup não duplica estado). A aplicação em CADA NAVEGAÇÃO é feita
  // pelo listener chrome.tabs.onUpdated do service worker.
  async function sincronizarOutrasAbas(action) {
    if (ehFirefox) return; // sem sync cross-tab no MV2 (suporte básico)
    const r = await enviarRuntime({ target: 'background', type: 'clarifica-sincronizar', action });
    if (r && r.error === 'falha-sincronizacao') {
      statusEl.textContent = textoDeErro('falha-sincronizacao');
    }
  }

  // ---- Áudio e Multimodal (v1.3.0) ----
  // O botão de leitura em voz alta é um TOGGLE: aria-pressed reflete o
  // estado real de fala devolvido pela página (WCAG 4.1.2).
  function marcarVoz(falando) {
    const btn = document.querySelector('.mode-btn[data-mode="voz"]');
    if (!btn) return;
    btn.classList.toggle('ativo', !!falando);
    btn.setAttribute('aria-pressed', falando ? 'true' : 'false');
  }

  // ---- Legendas ao vivo (v1.4.0) ----
  // Mesmo padrão de toggle da voz: aria-pressed reflete o estado real da
  // captura (fonte de verdade: resposta do service worker + storage).
  function marcarLegendas(ativo) {
    const btn = document.querySelector('.mode-btn[data-mode="legendas"]');
    if (!btn) return;
    btn.classList.toggle('ativo', !!ativo);
    btn.setAttribute('aria-pressed', ativo ? 'true' : 'false');
  }

  // Mensagens ao service worker: o chrome.runtime.sendMessage é
  // encapsulado para que ausência da API (testes em Node) e promessas
  // rejeitadas (popup sem background disponível) virem SEMPRE um
  // objeto-resposta com código de erro — nunca exceção na UI.
  async function enviarRuntime(mensagem) {
    try {
      if (!chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
        return { error: 'falha-legendas' };
      }
      return await chrome.runtime.sendMessage(mensagem);
    } catch (e) {
      return { error: 'falha-legendas' };
    }
  }

  // Teto geral das mensagens de legendas: APIs de captura podem ficar
  // pendentes em ambientes limitados — a UI nunca fica presa em
  // "Iniciando..." (comTeto correspondente vive no service worker).
  function enviarRuntimeComTeto(mensagem, tetoMs = 15000) {
    return Promise.race([
      enviarRuntime(mensagem),
      new Promise((resolve) => setTimeout(() => resolve({ error: 'falha-legendas' }), tetoMs))
    ]);
  }

  let transcriptAoVivo = [];

  async function desligarPerfil() {
    const r = await enviarParaContent('perfil-desligar');
    if (r && r.success) {
      statusEl.textContent = mensagem('statusPerfilDesligado');
      destacarPerfil(null);
      await salvarConfig({ perfilAtivo: null });
      await sincronizarOutrasAbas('limpar');
    } else {
      // Falhou a limpeza na página: o perfil permanece como estava.
      statusEl.textContent = (r && r.error) ? textoDeErro(r.error) : mensagem('statusInjecaoErro');
    }
  }

  // ---- Tema claro/escuro (ciclo auto → claro → escuro) ----
  function aplicarTema(tema) {
    if (!CICLO_TEMA.includes(tema)) tema = 'auto';
    if (tema === 'auto') document.documentElement.removeAttribute('data-tema');
    else document.documentElement.setAttribute('data-tema', tema);
    const chave = tema === 'auto' ? 'btnTemaRotuloAuto'
      : tema === 'claro' ? 'btnTemaRotuloClaro' : 'btnTemaRotuloEscuro';
    btnTema.textContent = mensagem(chave);
  }
  btnTema.addEventListener('click', async () => {
    const atual = document.documentElement.getAttribute('data-tema') || 'auto';
    const proximo = CICLO_TEMA[(CICLO_TEMA.indexOf(atual) + 1) % CICLO_TEMA.length];
    aplicarTema(proximo);
    await salvarConfig({ tema: proximo });
  });

  // ---- Intensidade do filtro de daltonismo ----
  function definirIntensidade(valor) {
    intensidadeAtual = Math.min(100, Math.max(0, Math.round(Number(valor) || 0)));
    slider.value = String(intensidadeAtual);
    sliderValor.textContent = `${intensidadeAtual}%`;
  }
  slider.addEventListener('input', () => definirIntensidade(slider.value));
  slider.addEventListener('change', async () => {
    // Re-lê o slider: no navegador real o 'input' sempre antecede o
    // 'change', mas o re-cálculo aqui torna o handler auto-suficiente.
    definirIntensidade(slider.value);
    await salvarConfig({ intensidade: intensidadeAtual });
    if (ultimoFiltro) await aplicarFiltro(ultimoFiltro); // re-aplica na página com o novo valor
  });

  function destacarFiltro(tipo) {
    ultimoFiltro = tipo;
    document.querySelectorAll('.mode-btn.dalton').forEach((b) => {
      const ativo = b.dataset.mode === tipo;
      b.classList.toggle('ativo', ativo);
      if (ativo) b.setAttribute('aria-pressed', 'true');
      else b.removeAttribute('aria-pressed');
    });
  }

  async function aplicarFiltro(tipo) {
    destacarFiltro(tipo);
    await salvarConfig({ ultimoFiltro: tipo, intensidade: intensidadeAtual });
    const nomes = {
      protanopia: mensagem('nomeProtanopia'),
      deuteranopia: mensagem('nomeDeuteranopia'),
      tritanopia: mensagem('nomeTritanopia')
    };
    const r = await enviarParaContent('daltonismo-' + tipo, {
      intensidade: intensidadeAtual,
      cssFilter: filtroDaltonismoCss(tipo, intensidadeAtual),
      anuncioFiltro: mensagem('anuncioFiltroNaPagina', [nomes[tipo]])
    });
    statusEl.textContent = (r && r.success) ? mensagem('statusFiltroOk')
      : (r && r.error) ? textoDeErro(r.error) : mensagem('statusInjecaoErro');
    // Sincronização (v2.0.0): propaga o estado salvo para as abas já abertas.
    if (r && r.success) await sincronizarOutrasAbas('aplicar');
  }

  // ---- Botões de modo (listeners registrados sincronamente; a
  // configuração persistida é carregada logo em seguida, sem bloquear) ----
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mode = btn.dataset.mode;
      statusEl.textContent = mensagem('statusProcessando');

      if (mode === 'leitura') {
        const r = await enviarParaContent('apply-leitura-essencial');
        statusEl.textContent = (r && r.success) ? mensagem('statusLeituraOk')
          : (r && r.error) ? textoDeErro(r.error) : mensagem('statusInjecaoErro');
      }
      else if (mode === 'resumo') {
        const resultado = await enviarParaContent('summarize', {
          // v2.0.0: idioma de saída (original × português via cadeia
          // modelo→modelo no worker) e Português Claro (geração com frases
          // curtas). Sem seleção, os valores padrão preservam a v1.0.0.
          idioma: idiomaSaidaEl.value === 'pt' ? 'pt' : 'original',
          claro: claroEl.checked === true
        });
        if (resultado?.error) statusEl.textContent = textoDeErro(resultado.error);
        else if (resultado?.summary) {
          statusEl.textContent = mensagem('statusResumoOk');
          aiOutput.textContent = resultado.summary;
          resultArea.classList.remove('hidden');
        }
        else statusEl.textContent = mensagem('statusSemResposta');
      }
      else if (mode === 'imagens') {
        const resultado = await enviarParaContent('describe-images', {
          prefixoAltIA: mensagem('prefixoAltIA'),
          // v2.0.0: a descrição também segue o idioma de saída escolhido.
          idioma: idiomaSaidaEl.value === 'pt' ? 'pt' : 'original'
        });
        if (resultado?.error) statusEl.textContent = textoDeErro(resultado.error);
        else if (typeof resultado?.totalSemAlt === 'number') {
          statusEl.textContent = resultado.totalSemAlt === 0
            ? mensagem('statusImagensCompletas')
            : mensagem('statusImagensIniciando', [String(resultado.totalSemAlt)]);
        }
        else statusEl.textContent = mensagem('statusSemResposta');
      }
      else if (mode === 'perguntar') {
        // Assistente de perguntas e respostas (v2.0.0): modelo QA EXTRATIVO
        // — a resposta é um trecho do próprio texto da página (sem geração
        // livre). A pergunta sai do campo rotulado acima do botão.
        const pergunta = (inputPergunta.value || '').trim();
        if (!pergunta) {
          statusEl.textContent = mensagem('statusPerguntaVazia');
          return;
        }
        const resultado = await enviarParaContent('perguntar', { pergunta });
        if (resultado?.error) statusEl.textContent = textoDeErro(resultado.error);
        else if (typeof resultado?.resposta === 'string' && resultado.resposta.trim()) {
          statusEl.textContent = mensagem('statusQaOk');
          aiOutput.textContent = `${mensagem('prefixoQa')} ${resultado.resposta.trim()}`;
          resultArea.classList.remove('hidden');
        }
        else statusEl.textContent = mensagem('statusSemResposta');
      }
      else if (mode === 'transcrever') {
        const resultado = await enviarParaContent('transcribe-audio');
        if (resultado?.error) statusEl.textContent = textoDeErro(resultado.error);
        else if (typeof resultado?.transcript === 'string' && resultado.transcript.trim().length > 0) {
          statusEl.textContent = mensagem('statusTranscricaoOk');
          aiOutput.textContent = resultado.transcript.trim();
          resultArea.classList.remove('hidden');
        }
        else statusEl.textContent = mensagem('statusSemResposta');
      }
      else if (mode === 'ocr') {
        // O modelo de anúncio de conclusão vai pronto (traduzido no popup)
        // porque a página não tem chrome.i18n; o $quantidade$ é substituído
        // pela página, única que conhece a contagem real de imagens.
        const resultado = await enviarParaContent('ocr-imagens', {
          prefixoOcrIA: mensagem('prefixoOcrIA'),
          anuncioOcr: mensagem('anuncioOcrNaPagina')
        });
        if (resultado?.error) statusEl.textContent = textoDeErro(resultado.error);
        else if (typeof resultado?.totalSemAlt === 'number') {
          statusEl.textContent = resultado.totalSemAlt === 0
            ? mensagem('statusImagensCompletas')
            : mensagem('statusOcrIniciando', [String(resultado.totalSemAlt)]);
        }
        else statusEl.textContent = mensagem('statusSemResposta');
      }
      else if (mode === 'traduzir') {
        const resultado = await enviarParaContent('traduzir-selecao', {
          anuncioTraducao: mensagem('anuncioTraducaoConcluida')
        });
        if (resultado?.error) statusEl.textContent = textoDeErro(resultado.error);
        else if (typeof resultado?.translation === 'string' && resultado.translation.trim().length > 0) {
          statusEl.textContent = mensagem('statusTraducaoOk');
          aiOutput.textContent = resultado.translation.trim();
          resultArea.classList.remove('hidden');
        }
        else statusEl.textContent = mensagem('statusSemResposta');
      }
      else if (mode === 'voz') {
        const resultado = await enviarParaContent('ler-voz-alta', {
          // A voz acompanha o idioma da interface (pt-BR ou en-US).
          idiomaVoz: localeResolvido === 'pt_BR' ? 'pt-BR' : 'en-US'
        });
        if (resultado?.error) {
          statusEl.textContent = textoDeErro(resultado.error);
          marcarVoz(false);
        }
        else if (typeof resultado?.falando === 'boolean') {
          statusEl.textContent = resultado.falando ? mensagem('statusLendoVozAlta') : mensagem('statusVozParada');
          marcarVoz(resultado.falando);
        }
        else statusEl.textContent = mensagem('statusSemResposta');
      }
      else if (mode === 'legendas') {
        // Toggle das legendas ao vivo (v1.4.0): a captura vive no service
        // worker/offscreen — ligar e desligar são mensagens de runtime, e
        // o gesto do usuário (este clique) habilita a captura da aba.
        // v2.0.0: no Firefox a captura de aba não existe (sem tabCapture);
        // os controles já ficam ocultos e o fluxo não inicia.
        if (ehFirefox) {
          statusEl.textContent = mensagem('statusLegendasFirefox');
          return;
        }
        const ativo = btn.getAttribute('aria-pressed') === 'true';
        if (ativo) {
          const r = await enviarRuntimeComTeto({ target: 'background', type: 'clarifica-legendas', action: 'parar' });
          marcarLegendas(false);
          await salvarConfig({ legendasAtivas: false });
          statusEl.textContent = (r && r.error && r.error !== 'falha-legendas') ? textoDeErro(r.error) : mensagem('statusLegendasParadas');
        } else {
          statusEl.textContent = mensagem('statusLegendasIniciando');
          transcriptAoVivo = [];
          let r = await enviarRuntimeComTeto({ target: 'background', type: 'clarifica-legendas', action: 'iniciar', idioma: idiomaLegendasEl.value });
          // Fallback do plano de risco (M1): o getMediaStreamId do service
          // worker pode ser recusado em algumas configurações — o popup é
          // também página de extensão com gesto; tenta obter o
          // identificador aqui e re-enviar com streamId.
          if (r && r.error === 'captura-negada' && chrome.tabCapture && typeof chrome.tabCapture.getMediaStreamId === 'function') {
            try {
              const streamId = await Promise.race([
                chrome.tabCapture.getMediaStreamId(),
                new Promise((_, recusar) => setTimeout(() => recusar(new Error('teto-tempo')), 5000))
              ]);
              r = await enviarRuntimeComTeto({ target: 'background', type: 'clarifica-legendas', action: 'iniciar', idioma: idiomaLegendasEl.value, streamId });
            } catch (e) { /* mantém o erro original traduzido */ }
          }
          if (r && r.error) {
            statusEl.textContent = textoDeErro(r.error);
            marcarLegendas(false);
            await salvarConfig({ legendasAtivas: false });
          } else if (r && r.success) {
            marcarLegendas(true);
            await salvarConfig({ legendasAtivas: true, legendasIdioma: idiomaLegendasEl.value });
            statusEl.textContent = mensagem('statusLegendasAtivas');
          } else {
            statusEl.textContent = mensagem('statusSemResposta');
            marcarLegendas(false);
          }
        }
      }
      else if (mode === 'verificar-legendas') {
        // Verificador mínimo do critério WCAG 1.2.2 (v1.4.0): leitura
        // pura dos <video> da página — sem IA, sem rede. O resultado com
        // contagens é produzido pela função pura DENTRO da página
        // (auditoriaLegendas, fonte canônica em clarifica-puro.js).
        const resultado = await enviarParaContent('auditar-legendas');
        if (resultado?.error) statusEl.textContent = textoDeErro(resultado.error);
        else if (resultado && resultado.auditoria) {
          const a = resultado.auditoria;
          if (!a.total) statusEl.textContent = mensagem('statusAuditoriaSemVideo');
          else if (a.semLegenda === 0) statusEl.textContent = mensagem('statusAuditoriaLegendasOk', [String(a.total)]);
          else statusEl.textContent = mensagem('statusAuditoriaLegendas', [String(a.semLegenda), String(a.total)]);
        }
        else statusEl.textContent = mensagem('statusSemResposta');
      }
      else if (mode === 'auditoria') {
        // Painel de auditoria WCAG em tempo real (v2.0.0): toggle — abre o
        // painel acessível na página (dialog não modal, Esc fecha) ou
        // fecha o que já está aberto. As strings de interface (título,
        // dicas por critério, rodapé) são traduzidas AQUI e cruzam a
        // fronteira como argumentos — a página não tem chrome.i18n.
        const resultado = await enviarParaContent('painel-auditoria', {
          dicas: {
            dicaCriterio111: mensagem('dicaCriterio111'),
            dicaCriterio122: mensagem('dicaCriterio122'),
            dicaCriterio131: mensagem('dicaCriterio131'),
            dicaCriterio241: mensagem('dicaCriterio241'),
            dicaCriterio244: mensagem('dicaCriterio244'),
            dicaCriterio311: mensagem('dicaCriterio311'),
            dicaCriterio412: mensagem('dicaCriterio412')
          },
          rotulos: {
            titulo: mensagem('painelTitulo'),
            rodape: mensagem('painelRodape'),
            fechar: mensagem('painelFechar'),
            semBarreiras: mensagem('painelSemBarreiras'),
            prefixoResumo: mensagem('painelPrefixoResumo'),
            unidadeBarreiras: mensagem('painelUnidadeBarreiras'),
            unidadeCriterios: mensagem('painelUnidadeCriterios')
          },
          anuncioAberto: mensagem('anuncioPainelAberto'),
          anuncioFechado: mensagem('anuncioPainelFechado')
        });
        const btnAuditoria = document.querySelector('.mode-btn[data-mode="auditoria"]');
        if (resultado?.error) {
          statusEl.textContent = textoDeErro(resultado.error);
          if (btnAuditoria) btnAuditoria.removeAttribute('aria-pressed');
        } else if (resultado && resultado.aberto && resultado.auditoria) {
          const a = resultado.auditoria;
          if (btnAuditoria) btnAuditoria.setAttribute('aria-pressed', 'true');
          statusEl.textContent = a.totalBarreiras === 0
            ? mensagem('statusAuditoriaPainelZero')
            : mensagem('statusAuditoriaPainel', [String(a.totalBarreiras), String(a.criterios)]);
        } else if (resultado && resultado.fechado) {
          if (btnAuditoria) btnAuditoria.removeAttribute('aria-pressed');
          statusEl.textContent = mensagem('statusAuditoriaFechado');
        }
        else statusEl.textContent = mensagem('statusSemResposta');
      }
      else if (TIPOS_FILTRO.includes(mode)) {
        await aplicarFiltro(mode);
      }
      else if (TIPOS_PERFIL.includes(mode)) {
        // Perfis são exclusivos entre si: clicar no ativo desliga; clicar
        // em outro troca (a página limpa o anterior antes de aplicar).
        if (perfilAtivo === mode) await desligarPerfil();
        else await aplicarPerfil(mode);
      }
    });
  });

  document.getElementById('close-result').addEventListener('click', () => {
    resultArea.classList.add('hidden');
    statusEl.textContent = mensagem('statusPronto');
  });

  // ---- Legendas ao vivo (v1.4.0) — transmissão ao vivo no popup ----
  // Cada transcrição parcial cruza a fronteira como broadcast único
  // ('legenda-pronta'): o service worker consome para ENTREGAR NA PÁGINA
  // e o popup consome para o transcript ao vivo (essencial em páginas com
  // apenas <audio>, onde não há track na página). O popup também reage a
  // encerramentos externos (navegação, fim do fluxo). Guardas de API.
  try {
    chrome.runtime.onMessage.addListener((evento) => {
      if (!evento || typeof evento !== 'object') return;
      if (evento.type === 'legenda-pronta' && typeof evento.texto === 'string' && evento.texto.trim()) {
        transcriptAoVivo.push(evento.texto.trim());
        if (transcriptAoVivo.length > 200) transcriptAoVivo.splice(0, transcriptAoVivo.length - 200);
        aiOutput.textContent = transcriptAoVivo.join(' ');
        resultArea.classList.remove('hidden');
        statusEl.textContent = mensagem('statusLegendasAtivas');
      }
      if (evento.type === 'clarifica-legendas-estado' && evento.ativo === false && evento.motivo === 'captura-encerrada') {
        marcarLegendas(false);
        statusEl.textContent = textoDeErro('captura-encerrada');
      }
    });
  } catch (e) { /* ambiente sem runtime.onMessage (testes) */ }

  // Troca do idioma das legendas: persiste imediatamente e, com legendas
  // em execução, reinicia a captura com a tarefa nova (transcrever ↔
  // traduzir) — o Whisper não troca tarefa no fluxo em andamento.
  idiomaLegendasEl.addEventListener('change', async () => {
    await salvarConfig({ legendasIdioma: idiomaLegendasEl.value });
    const btnLegendas = document.querySelector('.mode-btn[data-mode="legendas"]');
    if (btnLegendas && btnLegendas.getAttribute('aria-pressed') === 'true') {
      await enviarRuntimeComTeto({ target: 'background', type: 'clarifica-legendas', action: 'parar' });
      transcriptAoVivo = [];
      const r = await enviarRuntimeComTeto({ target: 'background', type: 'clarifica-legendas', action: 'iniciar', idioma: idiomaLegendasEl.value });
      if (r && r.error) {
        marcarLegendas(false);
        await salvarConfig({ legendasAtivas: false });
        statusEl.textContent = textoDeErro(r.error);
      } else {
        statusEl.textContent = mensagem('statusLegendasAtivas');
      }
    }
  });

  // ---- Configurações da v2.0.0 (persistência imediata) ----
  // Idioma de saída da IA, Português Claro e sincronização de perfis —
  // cada escolha fica memorizada para o próximo uso (mesma disciplina do
  // tema e do último filtro desde a v1.1.0).
  idiomaSaidaEl.addEventListener('change', async () => {
    await salvarConfig({ idiomaSaida: idiomaSaidaEl.value === 'pt' ? 'pt' : 'original' });
  });
  claroEl.addEventListener('change', async () => {
    await salvarConfig({ claro: claroEl.checked === true });
  });
  sincronizarEl.addEventListener('change', async () => {
    await salvarConfig({ sincronizacaoAtiva: sincronizarEl.checked === true });
  });

  carregarMensagens()
    .catch(() => null)
    .then(() => {
      aplicarI18n(document.documentElement);
      return carregarConfig();
    });

  async function enviarParaContent(acao, extra = null) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      const response = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: manipularPagina,
        args: [acao, extra]
      });
      return response[0].result;
    } catch (e) {
      return { error: 'falha-injecao' };
    }
  }

  async function manipularPagina(acao, extras = null) {
    // === INÍCIO DA LÓGICA PURA DE ÁUDIO (v1.3.0: exercitada em Node por
    // multimodal.test.js — extração por marcadores, sem DOM nem chrome.*) ===
    // O Whisper exige PCM mono a 16 kHz. O áudio da página chega decodificado
    // (decodeAudioData) na taxa original do arquivo; a reamostragem linear
    // aqui é determinística e testável em Node.
    function reamostrarPara16k(amostras, taxaOrigem) {
      const entrada = amostras instanceof Float32Array ? amostras : Float32Array.from(amostras || []);
      const taxa = Number(taxaOrigem) || 0;
      if (entrada.length === 0 || taxa <= 0) return new Float32Array(0);
      if (taxa === 16000) return entrada;
      const total = Math.max(1, Math.round((entrada.length / taxa) * 16000));
      const saida = new Float32Array(total);
      for (let i = 0; i < total; i++) {
        // Interpolação linear entre as amostras vizinhas; as pontas
        // (primeira e última amostra) são preservadas exatamente.
        const posicao = total === 1 ? 0 : (i * (entrada.length - 1)) / (total - 1);
        const base = Math.floor(posicao);
        const resto = posicao - base;
        const vizinho = Math.min(entrada.length - 1, base + 1);
        saida[i] = entrada[base] * (1 - resto) + entrada[vizinho] * resto;
      }
      return saida;
    }
    // === FIM DA LÓGICA PURA DE ÁUDIO ===

    // ---- Perfis neurodivergentes (v1.2.0) — helpers da PÁGINA ----
    // IMPORTANTE: tudo abaixo vive DENTRO de manipularPagina porque o
    // Chrome serializa apenas o corpo desta função na injeção.
    function limparPerfisDaPagina() {
      // Remove estilos e elementos criados pelos 3 perfis (idempotente).
      for (const id of ['clarifica-perfil-tea', 'clarifica-perfil-tdah', 'clarifica-perfil-dislexia', 'clarifica-spotlight', 'clarifica-regua']) {
        const el = document.getElementById(id);
        if (el) el.remove();
      }
      document.querySelectorAll('.clarifica-destaque-leitura').forEach((el) => el.classList.remove('clarifica-destaque-leitura'));
      // Restaura os GIFs que viraram canvas (pares canvas → img original).
      const gifs = window.__clarificaGifsPerfilTea;
      if (Array.isArray(gifs)) {
        for (const par of gifs) {
          try { par.canvas.replaceWith(par.original); } catch (e) { /* nó fora do DOM */ }
        }
        window.__clarificaGifsPerfilTea = [];
      }
      // Desfaz os listeners registrados pelos perfis (mousemove, teclado).
      const limpeza = window.__clarificaLimpezaPerfis;
      if (typeof limpeza === 'function') {
        try { limpeza(); } catch (e) { /* listeners já removidos */ }
      }
      window.__clarificaLimpezaPerfis = null;
      window.__clarificaIndiceBloco = -1;
    }

    // Anúncio para leitores de tela (mensagem já traduzida pelo popup).
    // Apenas UM anúncio por vez na página: ao aplicar um novo filtro ou
    // perfil, o anúncio anterior é removido — regiões assertive empilhadas
    // fariam o leitor de tela re-ler anúncios antigos (WCAG 4.1.3). Mesma
    // conduta do anúncio do service worker (background.js).
    function anunciarNaPagina(texto) {
      document.querySelectorAll('.clarifica-anuncio').forEach((a) => a.remove());
      const anuncio = document.createElement('div');
      anuncio.className = 'clarifica-anuncio';
      anuncio.setAttribute('role', 'status');
      anuncio.setAttribute('aria-live', 'assertive');
      anuncio.textContent = texto;
      document.body.appendChild(anuncio);
      setTimeout(() => anuncio.remove(), 3000);
    }

    if (acao.startsWith('perfil-')) {
      const nome = acao.replace('perfil-', '');
      // Sempre desmonta o perfil anterior antes de qualquer coisa — perfis
      // são exclusivos entre si e re-aplicar é idempotente.
      limparPerfisDaPagina();
      if (nome === 'desligar' || !['tea', 'tdah', 'dislexia'].includes(nome)) {
        return { success: true };
      }

      const estilo = document.createElement('style');
      estilo.id = 'clarifica-perfil-' + nome;
      estilo.textContent = (extras && extras.css) || '';
      document.documentElement.appendChild(estilo);

      // Listeners deste perfil; a limpeza fica registrada em window para o
      // reset-all (que pode vir do atalho Ctrl+Shift+X, via service worker).
      const limpezas = [];

      if (nome === 'tea') {
        // Congela também animações da Web Animations API (CSS já pausou as
        // declaradas via stylesheet — getAnimations cobre o resto).
        if (typeof document.getAnimations === 'function') {
          try {
            document.getAnimations().forEach((anim) => {
              try { anim.pause(); } catch (e) { /* animação já terminada */ }
            });
          } catch (e) { /* API indisponível */ }
        }
        // GIFs animados → quadro estático em canvas (sem rede, sem modelo).
        window.__clarificaGifsPerfilTea = [];
        for (const img of Array.from(document.querySelectorAll('img'))) {
          const src = img.getAttribute('src') || '';
          if (!/\.gif(\?|#|$)/i.test(src)) continue;
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width || 300;
            canvas.height = img.naturalHeight || img.height || 300;
            const contexto = canvas.getContext && canvas.getContext('2d');
            if (!contexto) break; // sem canvas: mantém o GIF original, sem quebrar
            contexto.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Canvas não tem semântica de imagem: `alt` nele é atributo morto.
            // role="img" + aria-label preservam para o leitor de tela o texto
            // alternativo do GIF que acabou de ser substituído.
            const alt = img.getAttribute('alt');
            if (alt) {
              canvas.setAttribute('role', 'img');
              canvas.setAttribute('aria-label', alt);
            }
            window.__clarificaGifsPerfilTea.push({ canvas, original: img });
            img.replaceWith(canvas);
          } catch (e) { /* imagem indisponível: segue com as demais */ }
        }
      }

      if (nome === 'tdah') {
        // Holofote: o buraco segue o cursor (mousemove + rAF de throttle).
        const spot = document.createElement('div');
        spot.id = 'clarifica-spotlight';
        document.body.appendChild(spot);
        const aplicarPosicao = (x, y) => {
          spot.style.setProperty('--clarifica-x', x + 'px');
          spot.style.setProperty('--clarifica-y', y + 'px');
        };
        let quadroPendente = null;
        const moverSpot = (evento) => {
          const x = evento.clientX || 0;
          const y = evento.clientY || 0;
          if (typeof requestAnimationFrame !== 'function') { aplicarPosicao(x, y); return; }
          if (quadroPendente !== null) return;
          quadroPendente = requestAnimationFrame(() => {
            quadroPendente = null;
            aplicarPosicao(x, y);
          });
        };
        window.addEventListener('mousemove', moverSpot, true);
        limpezas.push(() => window.removeEventListener('mousemove', moverSpot, true));

        // Destaque progressivo de leitura: Alt+↓ avança, Alt+↑ volta —
        // o bloco atual recebe a classe de destaque e o foco visual.
        const blocosDeLeitura = () => Array.from(
          document.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, pre')
        ).filter((el) => (el.textContent || '').trim().length > 0).slice(0, 400);
        window.__clarificaIndiceBloco = -1;
        const destacarBloco = (indice) => {
          const lista = blocosDeLeitura();
          if (lista.length === 0) return;
          window.__clarificaIndiceBloco = Math.max(0, Math.min(lista.length - 1, indice));
          document.querySelectorAll('.clarifica-destaque-leitura').forEach((el) => el.classList.remove('clarifica-destaque-leitura'));
          const alvo = lista[window.__clarificaIndiceBloco];
          alvo.classList.add('clarifica-destaque-leitura');
          if (typeof alvo.scrollIntoView === 'function') {
            try { alvo.scrollIntoView({ block: 'center' }); } catch (e) { /* sem rolagem */ }
          }
        };
        const teclado = (evento) => {
          if (!evento.altKey) return;
          if (evento.key === 'ArrowDown') destacarBloco((window.__clarificaIndiceBloco ?? -1) + 1);
          else if (evento.key === 'ArrowUp') destacarBloco(Math.max(0, (window.__clarificaIndiceBloco ?? 0) - 1));
        };
        document.addEventListener('keydown', teclado, true);
        limpezas.push(() => document.removeEventListener('keydown', teclado, true));
      }

      if (nome === 'dislexia') {
        // Régua de leitura: faixa horizontal que acompanha o mouse e ajuda
        // a não perder a linha atual.
        const regua = document.createElement('div');
        regua.id = 'clarifica-regua';
        document.body.appendChild(regua);
        const moverRegua = (evento) => {
          regua.style.top = Math.max(0, (evento.clientY || 0) - 24) + 'px';
        };
        window.addEventListener('mousemove', moverRegua, true);
        limpezas.push(() => window.removeEventListener('mousemove', moverRegua, true));
      }

      window.__clarificaLimpezaPerfis = () => {
        for (const fn of limpezas) {
          try { fn(); } catch (e) { /* listener já removido */ }
        }
      };

      anunciarNaPagina((extras && extras.anuncioPerfil) || '');

      return { success: true, perfil: nome };
    }

    // Cria o worker de IA a partir de um Blob com o código buscado da
    // extensão (web_accessible_resources): a via direta
    // new Worker('chrome-extension://...') é bloqueada pelo Chrome com
    // SecurityError quando a origem é uma página web. É criado como
    // módulo porque o ai-worker.js usa `import` (sintaxe ESM). Desde a
    // v1.1.0 a biblioteca é servida pela própria extensão
    // (vendor/transformers.min.js) — sem CDN — e os placeholders do
    // worker recebem as URLs locais aqui resolvidas.
    //
    // IMPORTANTE: o Chrome serializa apenas o CORPO desta função ao
    // injetá-la na página — toda dependência deve viver aqui dentro.
    // Além disso, quando a função injetada rejeita, o chrome.scripting
    // devolve result=null (não propaga a rejeição) — por isso nenhum
    // caminho lança exceção: sempre resolve com sucesso ou { error }.
    async function criarWorkerIA() {
      const resposta = await fetch(chrome.runtime.getURL('scripts/ai-worker.js'));
      if (!resposta.ok) throw new Error(`Falha ao buscar o worker: ${resposta.status}`);
      const codigo = (await resposta.text())
        .replace(/__CLARIFICA_BIBLIOTECA__/g, chrome.runtime.getURL('vendor/transformers.min.js'))
        .replace(/__CLARIFICA_VENDOR_BASE__/g, chrome.runtime.getURL('vendor/'));
      const urlBlob = URL.createObjectURL(new Blob([codigo], { type: 'text/javascript' }));
      const worker = new Worker(urlBlob, { type: 'module' });
      return { worker, urlBlob };
    }

    if (acao === 'apply-leitura-essencial') {
      document.querySelectorAll('nav, footer, aside, .ads').forEach(el => {
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('inert', '');
      });
      const main = document.querySelector('main, article, #content') || document.body;
      main.setAttribute('role', 'main');
      main.setAttribute('tabindex', '-1'); // necessário para focus() funcionar em elementos não interativos
      main.focus();
      return { success: true };
    }

    if (acao.startsWith('daltonismo-')) {
      const tipo = acao.replace('daltonismo-', '');
      document.documentElement.style.filter = ''; // Limpa anterior
      // O filtro (feColorMatrix interpolado pela intensidade) é construído
      // no popup e chega pronto — funções injetadas não enxergam o escopo
      // do popup.js.
      document.documentElement.style.filter = (extras && extras.cssFilter) || '';

      anunciarNaPagina((extras && extras.anuncioFiltro) || '');

      return { success: true };
    }

    if (acao === 'summarize') {
      const texto = (document.querySelector('main, article, #content') || document.body).innerText;
      if (texto.length < 200) return { error: 'texto-curto' };

      try {
        const { worker, urlBlob } = await criarWorkerIA();
        const encerrar = () => { worker.terminate(); URL.revokeObjectURL(urlBlob); };
        return await new Promise((resolve) => {
          // v2.0.0: opcoes cruza a fronteira (idioma de saída × Português
          // Claro) — o worker aplica a cadeia modelo→modelo e os parâmetros
          // de geração. Sem extras, opcoes fica vazia (v1.0.0 intocada).
          worker.postMessage({ type: 'summarize', data: texto.substring(0, 3000), opcoes: { idioma: (extras && extras.idioma) || 'original', claro: !!(extras && extras.claro) } });
          // O worker emite mensagens de progresso ("loading"/"processing") antes
          // do resultado final: só encerra na mensagem de success (ou erro),
          // nunca no primeiro sinal de vida.
          worker.onmessage = (e) => {
            if (e.data.status === 'success') {
              encerrar();
              resolve(e.data);
            } else if (e.data.status === 'error') {
              encerrar();
              resolve({ error: e.data.error || 'erro-resumo' });
            }
          };
          worker.onerror = () => { encerrar(); resolve({ error: 'falha-worker' }); };
        });
      } catch (e) {
        return { error: 'falha-worker' };
      }
    }

    if (acao === 'describe-images') {
      const imagens = Array.from(document.querySelectorAll('img')).filter(img => {
        const alt = img.getAttribute('alt');
        return !alt || alt.trim() === '' || alt === 'image';
      });

      if (imagens.length === 0) return { totalSemAlt: 0 };

      let worker, urlBlob;
      try {
        ({ worker, urlBlob } = await criarWorkerIA());
      } catch (e) {
        return { error: 'falha-worker' };
      }

      let processadas = 0;
      const prefixoAltIA = (extras && extras.prefixoAltIA) || '';

      worker.onmessage = (e) => {
        if (e.data.type === 'image-description') {
          const img = imagens.find(i => i.src === e.data.imageUrl);
          if (img) {
            img.setAttribute('alt', e.data.description);
            img.setAttribute('aria-label', `${prefixoAltIA}${e.data.description}`);
            img.style.border = '2px solid #10b981';
          }
          processadas++;
          if (processadas === imagens.length) {
            worker.terminate();
            URL.revokeObjectURL(urlBlob);
          }
        } else if (e.data.type === 'error') {
          // O worker falhou ao carregar/descrever: sem tratamento o Worker
          // ficaria zumbi e as imagens, sem descrição — encerra com limpeza.
          worker.terminate();
          URL.revokeObjectURL(urlBlob);
        }
      };

      imagens.forEach((img, i) => {
        // v2.0.0: opcoes.idioma cruza a fronteira — descrição gerada em
        // inglês pelo vit-gpt2 e traduzida pelo opus-mt no mesmo worker.
        setTimeout(() => worker.postMessage({ type: 'describe-image', data: img.src, opcoes: { idioma: (extras && extras.idioma) || 'original' } }), i * 500);
      });

      return { totalSemAlt: imagens.length };
    }

    if (acao === 'transcribe-audio') {
      // Um único caminho para vídeo e podcast: o primeiro elemento <video>/
      // <audio> com src http(s). blob: (ex.: YouTube) e data: não são
      // fetcháveis — são ignorados sem quebrar o fluxo.
      const src = Array.from(document.querySelectorAll('video, audio'))
        .map((m) => m.currentSrc || m.getAttribute('src') || (m.querySelector('source') || {}).src || '')
        .find((s) => /^https?:\/\//i.test(s));
      if (!src) return { error: 'sem-audio' };

      // Teto de 120 s de áudio 16 kHz (~7,7 MB de PCM): Whisper-tiny custa
      // segundos por janela de 30 s — podcasts longos transcrevem o trecho
      // inicial (limitação documentada no README).
      const TETO_16K = 16000 * 120;

      try {
        const resposta = await fetch(src);
        if (!resposta.ok) return { error: 'audio-indisponivel' };
        const buffer = await resposta.arrayBuffer();
        const ContextoAudio = window.AudioContext || window.webkitAudioContext;
        if (typeof ContextoAudio !== 'function') return { error: 'audio-indisponivel' };
        const contexto = new ContextoAudio();
        const decodificado = await contexto.decodeAudioData(buffer);
        try { contexto.close && contexto.close(); } catch (e) { /* já fechado */ }
        const canal = decodificado.getChannelData(0);
        const pcm = reamostrarPara16k(canal, decodificado.sampleRate);
        const limitado = pcm.length > TETO_16K ? pcm.subarray(0, TETO_16K) : pcm;
        if (limitado.length < 16000) return { error: 'audio-muito-curto' }; // menos de 1 s

        const { worker, urlBlob } = await criarWorkerIA();
        const encerrar = () => { worker.terminate(); URL.revokeObjectURL(urlBlob); };
        return await new Promise((resolve) => {
          worker.postMessage({ type: 'transcribe-audio', data: limitado });
          worker.onmessage = (e) => {
            if (e.data.type === 'transcription') {
              encerrar();
              resolve({ transcript: e.data.transcript });
            } else if (e.data.type === 'error') {
              encerrar();
              resolve({ error: e.data.error || 'erro-audio' });
            }
          };
          worker.onerror = () => { encerrar(); resolve({ error: 'falha-worker' }); };
        });
      } catch (e) {
        // fetch e decodeAudioData falham (com exceção silenciosa) em mídia
        // cross-origin sem CORS — o usuário recebe uma mensagem clara.
        return { error: 'media-bloqueado' };
      }
    }

    if (acao === 'perguntar') {
      // Assistente de perguntas e respostas (v2.0.0): o CONTEXTO é o texto
      // da página (main/article/body, teto de 4000 caracteres) e a resposta
      // é EXTRAÍDA dele pelo modelo distilbert-squad — sem geração livre,
      // o que elimina alucinação por construção. Teto de 50 caracteres:
      // páginas praticamente vazias não têm conteúdo para responder.
      const pergunta = String((extras && extras.pergunta) || '').trim();
      if (!pergunta) return { error: 'pergunta-vazia' };
      const texto = (document.querySelector('main, article, #content') || document.body).innerText || '';
      const contexto = texto.trim().slice(0, 4000);
      if (contexto.length < 50) return { error: 'contexto-curto' };

      try {
        const { worker, urlBlob } = await criarWorkerIA();
        const encerrar = () => { worker.terminate(); URL.revokeObjectURL(urlBlob); };
        return await new Promise((resolve) => {
          worker.postMessage({ type: 'question-answering', data: { pergunta, contexto } });
          worker.onmessage = (e) => {
            if (e.data.type === 'qa-answer') {
              encerrar();
              resolve({ resposta: String(e.data.answer || '').trim(), score: e.data.score });
            } else if (e.data.type === 'error') {
              encerrar();
              resolve({ error: e.data.error || 'erro-qa' });
            }
          };
          worker.onerror = () => { encerrar(); resolve({ error: 'falha-worker' }); };
        });
      } catch (e) {
        return { error: 'falha-worker' };
      }
    }

    if (acao === 'auditar-legendas') {
      // Verificador mínimo do critério WCAG 1.2.2 (v1.4.0): inventaria os
      // <video> da página e conta quantos possuem <track kind="captions">
      // ou kind="subtitles" (via DOM e via API textTracks). Sem IA e sem
      // rede — leitura pura de estado, reutilizada pelo fluxo de ação
      // ("auditar e agir") do plano da v1.4.0.
      // === INÍCIO DA LÓGICA PURA DE AUDITORIA DE LEGENDAS (v1.4.0: fonte
      // canônica em scripts/clarifica-puro.js; paridade garantida por
      // tests/legendas.test.js) ===
      function auditoriaLegendas(descritores) {
        const lista = Array.isArray(descritores) ? descritores : [];
        const detalhes = lista.map((descritor, indice) => {
          const temCaptions = !!(descritor && descritor.temCaptions);
          const temSubtitles = !!(descritor && descritor.temSubtitles);
          return { indice, temCaptions, temSubtitles, comLegendas: temCaptions || temSubtitles };
        });
        const comLegendas = detalhes.filter((d) => d.comLegendas).length;
        return {
          total: lista.length,
          comLegendas,
          semLegenda: lista.length - comLegendas,
          detalhes
        };
      }
      // === FIM DA LÓGICA PURA DE AUDITORIA DE LEGENDAS ===
      const descritores = Array.from(document.querySelectorAll('video')).map((video) => {
        const faixas = Array.from(video.querySelectorAll('track'));
        const tipoDe = (t) => String(t.getAttribute('kind') || '').toLowerCase();
        let temCaptions = faixas.some((t) => tipoDe(t) === 'captions');
        let temSubtitles = faixas.some((t) => tipoDe(t) === 'subtitles');
        try {
          if (video.textTracks) {
            for (const faixa of video.textTracks) {
              if (faixa.kind === 'captions') temCaptions = true;
              if (faixa.kind === 'subtitles') temSubtitles = true;
            }
          }
        } catch (e) { /* textTracks indisponível: segue com o DOM */ }
        return { temCaptions, temSubtitles };
      });
      return { descritores, auditoria: auditoriaLegendas(descritores) };
    }

    if (acao === 'painel-auditoria') {
      // Painel de auditoria WCAG em tempo real (v2.0.0): toggle. A abertura
      // cria um dialog NÃO modal (aria-modal=false — o usuário continua
      // operando a página), foca o botão de fechar (WCAG 2.4.3), reexecuta
      // a auditoria a cada mutação relevante (MutationObserver com
      // debounce de 1,2 s) e fecha com Esc. O JULGAMENTO dos achados é a
      // função pura auditarAcessibilidade (cópia canônica abaixo; fonte em
      // scripts/clarifica-puro.js, paridade por tests/auditoria.test.js).
      if (window.__clarificaPainelAuditoria) {
        try { window.__clarificaPainelAuditoria.fechar(); } catch (e) { /* nó fora do DOM */ }
        return { fechado: true };
      }
      const dicas = (extras && extras.dicas) || {};
      const rotulos = (extras && extras.rotulos) || {};

      // === INÍCIO DA LÓGICA PURA DE AUDITORIA WCAG (v2.0.0: cópia canônica
      // de scripts/clarifica-puro.js; paridade garantida por
      // tests/auditoria.test.js — mesmo padrão das legendas) ===
      function auditoriaLegendasPainel(descritores) {
        const lista = Array.isArray(descritores) ? descritores : [];
        const detalhes = lista.map((descritor, indice) => {
          const temCaptions = !!(descritor && descritor.temCaptions);
          const temSubtitles = !!(descritor && descritor.temSubtitles);
          return { indice, temCaptions, temSubtitles, comLegendas: temCaptions || temSubtitles };
        });
        const comLegendas = detalhes.filter((d) => d.comLegendas).length;
        return { total: lista.length, comLegendas, semLegenda: lista.length - comLegendas, detalhes };
      }
      const TEXTOS_LINK_GENERICOS_PAINEL = [
        'clique aqui', 'aqui', 'leia mais', 'saiba mais', 'continue lendo',
        'ver mais', 'mais', 'link', 'click here', 'here', 'read more', 'more',
        'learn more', 'this link', 'link para', 'link para:'
      ];
      function ehTextoLinkGenerico(texto) {
        const t = String(texto || '').trim().toLowerCase();
        if (!t) return false;
        return TEXTOS_LINK_GENERICOS_PAINEL.includes(t);
      }
      function headingsForaDeOrdem(niveis) {
        const lista = Array.isArray(niveis) ? niveis.map((n) => Number(n)).filter((n) => n >= 1 && n <= 6) : [];
        let anterior = 0;
        for (const nivel of lista) {
          if (anterior > 0 && nivel > anterior + 1) return true;
          anterior = nivel;
        }
        return false;
      }
      function auditarAcessibilidade(descritores) {
        const d = descritores && typeof descritores === 'object' ? descritores : {};
        const imagens = Array.isArray(d.imagens) ? d.imagens : [];
        const controles = Array.isArray(d.controles) ? d.controles : [];
        const links = Array.isArray(d.links) ? d.links : [];
        const iframes = Array.isArray(d.iframes) ? d.iframes : [];
        const videos = Array.isArray(d.videos) ? d.videos : [];
        const achados = [];
        const imagensSemAlt = imagens.filter((img) => img && !img.temAlt).length;
        if (imagensSemAlt > 0) achados.push({ criterio: '1.1.1', chaveMensagem: 'dicaCriterio111', contagem: imagensSemAlt });
        const legenda = auditoriaLegendasPainel(videos);
        if (legenda.semLegenda > 0) achados.push({ criterio: '1.2.2', chaveMensagem: 'dicaCriterio122', contagem: legenda.semLegenda });
        const controlesSemNome = controles.filter((c) => c && !c.nome).length;
        if (controlesSemNome > 0) achados.push({ criterio: '4.1.2', chaveMensagem: 'dicaCriterio412', contagem: controlesSemNome });
        const genericos = links.filter((texto) => ehTextoLinkGenerico(texto)).length;
        if (genericos > 0) achados.push({ criterio: '2.4.4', chaveMensagem: 'dicaCriterio244', contagem: genericos });
        const iframesSemTitle = iframes.filter((f) => f && !f.temTitle).length;
        if (iframesSemTitle > 0) achados.push({ criterio: '2.4.1', chaveMensagem: 'dicaCriterio241', contagem: iframesSemTitle });
        if (!String(d.htmlLang || '').trim()) achados.push({ criterio: '3.1.1', chaveMensagem: 'dicaCriterio311', contagem: 1 });
        if (headingsForaDeOrdem(d.headings)) achados.push({ criterio: '1.3.1', chaveMensagem: 'dicaCriterio131', contagem: 1 });
        const totalBarreiras = achados.reduce((soma, a) => soma + a.contagem, 0);
        return { achados, totalBarreiras, criterios: achados.length };
      }
      // === FIM DA LÓGICA PURA DE AUDITORIA WCAG ===

      // COLETA de descritores planos (extração sem julgamento — o
      // julgamento é a função pura acima). Nome acessível simplificado:
      // aria-labelledby → aria-label → title → value (inputs de botão) →
      // texto visível.
      function nomeAcessivelDe(el) {
        try {
          const labelledby = el.getAttribute('aria-labelledby');
          if (labelledby) {
            const partes = labelledby.split(/\s+/)
              .map((id) => (document.getElementById(id) || {}).textContent || '')
              .join(' ').trim();
            if (partes) return partes;
          }
          const aria = el.getAttribute('aria-label');
          if (aria && aria.trim()) return aria.trim();
          const title = el.getAttribute('title');
          if (title && title.trim()) return title.trim();
          const tipo = String(el.getAttribute && el.getAttribute('type') || '').toLowerCase();
          if (el.tagName.toLowerCase() === 'input' && ['submit', 'button', 'reset'].includes(tipo)) {
            const valor = el.getAttribute('value');
            if (valor && valor.trim()) return valor.trim();
          }
          const alt = el.getAttribute('alt');
          if (alt && alt.trim()) return alt.trim();
          return (el.innerText || el.textContent || '').trim();
        } catch (e) { return ''; }
      }
      function coletarDescritores() {
        const controles = [];
        try {
          document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"], input[type="reset"]').forEach((b) => {
            controles.push({ tag: b.tagName.toLowerCase(), nome: nomeAcessivelDe(b) });
          });
          document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input[type="password"], input[type="tel"], input[type="number"], input[type="url"], input[type="date"], select, textarea').forEach((c) => {
            let nome = '';
            try {
              const id = c.getAttribute('id');
              if (id) {
                const label = document.querySelector('label[for="' + id + '"]');
                if (label && (label.textContent || '').trim()) nome = label.textContent.trim();
              }
              if (!nome && c.parentElement && c.parentElement.tagName === 'LABEL') {
                nome = (c.parentElement.textContent || '').trim();
              }
            } catch (e) { /* querySelector indisponível: segue sem label */ }
            controles.push({ tag: c.tagName.toLowerCase(), nome: nome || nomeAcessivelDe(c) });
          });
        } catch (e) { /* página sem controles */ }
        const videos = Array.from(document.querySelectorAll('video')).map((video) => {
          const faixas = Array.from(video.querySelectorAll('track'));
          const tipoDe = (t) => String(t.getAttribute('kind') || '').toLowerCase();
          let temCaptions = faixas.some((t) => tipoDe(t) === 'captions');
          let temSubtitles = faixas.some((t) => tipoDe(t) === 'subtitles');
          try {
            if (video.textTracks) {
              for (const faixa of video.textTracks) {
                if (faixa.kind === 'captions') temCaptions = true;
                if (faixa.kind === 'subtitles') temSubtitles = true;
              }
            }
          } catch (e) { /* textTracks indisponível: segue com o DOM */ }
          return { temCaptions, temSubtitles };
        });
        return {
          htmlLang: document.documentElement.getAttribute('lang') || '',
          imagens: Array.from(document.querySelectorAll('img')).map((img) => ({ temAlt: img.hasAttribute('alt') })),
          videos,
          controles,
          links: Array.from(document.querySelectorAll('a[href]')).map((a) => (a.innerText || a.textContent || '').trim().slice(0, 60)),
          iframes: Array.from(document.querySelectorAll('iframe')).map((f) => ({ temTitle: !!String(f.getAttribute('title') || '').trim() })),
          headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => Number(h.tagName[1]))
        };
      }

      // ---- Painel DOM (dialog não modal, acessível, em tempo real) ----
      const painel = document.createElement('div');
      painel.id = 'clarifica-painel-auditoria';
      painel.setAttribute('role', 'dialog');
      painel.setAttribute('aria-modal', 'false');
      painel.setAttribute('aria-label', rotulos.titulo || 'Auditoria WCAG');
      painel.style.cssText = 'position:fixed;top:12px;right:12px;width:min(320px,92vw);max-height:min(70vh,560px);overflow-y:auto;background:rgba(2,6,23,0.94);color:#ffffff;font-size:0.9rem;line-height:1.45;border-radius:12px;z-index:2147483647;box-shadow:0 12px 32px rgba(0,0,0,0.5);padding:14px 16px;font-family:system-ui,sans-serif;';

      const cabecalho = document.createElement('div');
      cabecalho.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;';
      const tituloPainel = document.createElement('h2');
      tituloPainel.textContent = rotulos.titulo || 'Auditoria WCAG';
      tituloPainel.style.cssText = 'font-size:1rem;margin:0;color:#ffffff;';
      const btnFecharPainel = document.createElement('button');
      btnFecharPainel.type = 'button';
      btnFecharPainel.textContent = rotulos.fechar || 'Fechar';
      btnFecharPainel.style.cssText = 'background:#1e293b;color:#ffffff;border:1px solid #475569;border-radius:6px;padding:4px 10px;font-size:0.8rem;cursor:pointer;';
      cabecalho.appendChild(tituloPainel);
      cabecalho.appendChild(btnFecharPainel);
      painel.appendChild(cabecalho);

      const regiaoViva = document.createElement('p');
      regiaoViva.setAttribute('role', 'status');
      regiaoViva.setAttribute('aria-live', 'polite');
      regiaoViva.style.cssText = 'font-size:0.82rem;margin:0 0 8px;color:#cbd5f5;';
      painel.appendChild(regiaoViva);

      const lista = document.createElement('ul');
      lista.style.cssText = 'margin:0 0 8px;padding-left:18px;';
      painel.appendChild(lista);

      const rodape = document.createElement('p');
      rodape.textContent = rotulos.rodape || '';
      rodape.style.cssText = 'font-size:0.72rem;color:#94a3b8;margin:0;';
      painel.appendChild(rodape);

      const anunciarNaPagina = (texto) => {
        document.querySelectorAll('.clarifica-anuncio').forEach((a) => a.remove());
        const anuncio = document.createElement('div');
        anuncio.className = 'clarifica-anuncio';
        anuncio.setAttribute('role', 'status');
        anuncio.setAttribute('aria-live', 'assertive');
        anuncio.textContent = texto;
        document.body.appendChild(anuncio);
        setTimeout(() => anuncio.remove(), 3000);
      };

      function atualizarPainel() {
        const auditoria = auditarAcessibilidade(coletarDescritores());
        while (lista.firstChild) lista.removeChild(lista.firstChild);
        if (!auditoria.achados.length) {
          const item = document.createElement('li');
          item.textContent = rotulos.semBarreiras || 'Nenhuma barreira detectada.';
          lista.appendChild(item);
        } else {
          for (const achado of auditoria.achados) {
            const item = document.createElement('li');
            item.textContent = `${achado.criterio} — ${dicas[achado.chaveMensagem] || ''} (${achado.contagem})`;
            lista.appendChild(item);
          }
        }
        regiaoViva.textContent = auditoria.totalBarreiras === 0
          ? (rotulos.semBarreiras || '')
          : `${rotulos.prefixoResumo || ''}${auditoria.totalBarreiras} ${rotulos.unidadeBarreiras || ''} · ${auditoria.criterios} ${rotulos.unidadeCriterios || ''}`;
        return auditoria;
      }

      // Tempo real: mutações EXTERNAS ao painel (a própria atualização do
      // painel não re-agenda — evita laço infinito de observação).
      let temporizador = null;
      const observador = new MutationObserver((mutacoes) => {
        const externa = mutacoes.some((m) => !(m.target === painel || painel.contains(m.target)));
        if (!externa) return;
        if (temporizador !== null) clearTimeout(temporizador);
        temporizador = setTimeout(atualizarPainel, 1200);
      });

      const aoTeclar = (evento) => {
        if (evento && evento.key === 'Escape') fecharPainel();
      };
      function fecharPainel() {
        try { if (temporizador !== null) clearTimeout(temporizador); } catch (e) { /* já limpo */ }
        try { observador.disconnect(); } catch (e) { /* já desconectado */ }
        try { document.removeEventListener('keydown', aoTeclar, true); } catch (e) { /* já removido */ }
        try { painel.remove(); } catch (e) { /* nó fora do DOM */ }
        window.__clarificaPainelAuditoria = null;
        anunciarNaPagina((extras && extras.anuncioFechado) || '');
      }
      window.__clarificaPainelAuditoria = { painel, fechar: fecharPainel };
      btnFecharPainel.addEventListener('click', fecharPainel);
      document.addEventListener('keydown', aoTeclar, true);
      document.body.appendChild(painel);
      try { btnFecharPainel.focus(); } catch (e) { /* sem foco disponível */ }
      observador.observe(document.documentElement, { childList: true, subtree: true });
      const auditoriaInicial = atualizarPainel();
      anunciarNaPagina((extras && extras.anuncioAberto) || '');
      return { aberto: true, auditoria: auditoriaInicial };
    }

    if (acao === 'ocr-imagens') {
      // Mesma descoberta da descrição de imagens: sem alt, alt vazio ou o
      // genérico "image". O texto impresso extraído vira alt/aria-label da
      // imagem (WCAG 1.4.5 — imagens de texto exigem alternativa textual).
      const imagens = Array.from(document.querySelectorAll('img')).filter(img => {
        const alt = img.getAttribute('alt');
        return !alt || alt.trim() === '' || alt === 'image';
      });

      if (imagens.length === 0) return { totalSemAlt: 0 };

      let worker, urlBlob;
      try {
        ({ worker, urlBlob } = await criarWorkerIA());
      } catch (e) {
        return { error: 'falha-worker' };
      }

      const prefixoOcr = (extras && extras.prefixoOcrIA) || '';
      let respondidas = 0;

      worker.onmessage = (e) => {
        if (e.data.type === 'ocr-text') {
          respondidas++;
          const img = imagens.find(i => i.src === e.data.imageUrl);
          const texto = String(e.data.text || '').trim();
          if (img && texto) {
            img.setAttribute('alt', `${prefixoOcr}${texto}`);
            img.setAttribute('aria-label', `${prefixoOcr}${texto}`);
            img.style.border = '2px solid #10b981';
          }
          if (respondidas === imagens.length) {
            // Todas as imagens responderam (com texto ou vazias): anuncia
            // e encerra — contagem por RESPOSTAS, não por textos úteis,
            // para nunca deixar Worker zumbi quando o OCR vier vazio.
            const modelo = (extras && extras.anuncioOcr) || 'OCR concluído em $quantidade$ imagens.';
            anunciarNaPagina(modelo.replace('$quantidade$', String(imagens.length)));
            worker.terminate();
            URL.revokeObjectURL(urlBlob);
          }
        } else if (e.data.type === 'error') {
          // Falha do worker: encerra com limpeza (sem Worker zumbi).
          worker.terminate();
          URL.revokeObjectURL(urlBlob);
        }
      };

      imagens.forEach((img, i) => {
        setTimeout(() => worker.postMessage({ type: 'ocr-image', data: img.src }), i * 500);
      });

      return { totalSemAlt: imagens.length };
    }

    if (acao === 'traduzir-selecao') {
      const selecao = ((window.getSelection && typeof window.getSelection().toString === 'function')
        ? window.getSelection().toString()
        : '').trim();
      if (!selecao) return { error: 'selecao-vazia' };

      try {
        const { worker, urlBlob } = await criarWorkerIA();
        const encerrar = () => { worker.terminate(); URL.revokeObjectURL(urlBlob); };
        return await new Promise((resolve) => {
          // Teto de 1500 caracteres: "tradução instantânea" de trechos —
          // passagens longas custariam minutos em hardware modesto.
          worker.postMessage({ type: 'translate-text', data: selecao.slice(0, 1500) });
          worker.onmessage = (e) => {
            if (e.data.type === 'translation') {
              encerrar();
              anunciarNaPagina((extras && extras.anuncioTraducao) || '');
              resolve({ translation: e.data.translation });
            } else if (e.data.type === 'error') {
              encerrar();
              resolve({ error: e.data.error || 'erro-traducao' });
            }
          };
          worker.onerror = () => { encerrar(); resolve({ error: 'falha-worker' }); };
        });
      } catch (e) {
        return { error: 'falha-worker' };
      }
    }

    if (acao === 'ler-voz-alta') {
      // TTS na PÁGINA (Web Speech API, vozes do sistema — sem modelo e sem
      // download): a fala sobrevive ao fechamento do popup e o Ctrl+Shift+X
      // também a interrompe (reset-all cancela). Toggle: se está falando,
      // o mesmo clique para.
      if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') {
        return { error: 'tts-indisponivel' };
      }
      const sintese = window.speechSynthesis;
      if (sintese.speaking || sintese.pending) {
        sintese.cancel();
        return { success: true, falando: false };
      }
      let texto = ((window.getSelection && typeof window.getSelection().toString === 'function')
        ? window.getSelection().toString()
        : '').trim();
      if (!texto) texto = (document.querySelector('main, article, #content') || document.body).innerText || '';
      texto = texto.trim().slice(0, 8000);
      if (!texto) return { error: 'sem-texto-voz' };
      const utterance = new window.SpeechSynthesisUtterance(texto);
      const idiomaVoz = (extras && extras.idiomaVoz) || '';
      if (idiomaVoz) {
        utterance.lang = idiomaVoz;
        try {
          const voz = (typeof sintese.getVoices === 'function' ? sintese.getVoices() : [])
            .find((v) => v.lang && String(v.lang).toLowerCase().startsWith(idiomaVoz.toLowerCase()));
          if (voz) utterance.voice = voz;
        } catch (e) { /* getVoices indisponível: segue a voz padrão */ }
      }
      sintese.cancel(); // descarta qualquer fila anterior antes de falar
      sintese.speak(utterance);
      return { success: true, falando: true, caracteres: texto.length };
    }
  }
});
