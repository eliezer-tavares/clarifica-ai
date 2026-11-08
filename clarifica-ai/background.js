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
  'toggle-reset': 'reset-all'
};

const MENSAGENS_LEITOR = {
  'summarize': 'anuncioResumo',
  'apply-leitura-essencial': 'anuncioLeitura',
  'describe-images': 'anuncioImagens',
  'reset-all': 'anuncioReset'
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
  }
  else if (acao === 'summarize' || acao === 'describe-images') {
    window.postMessage({ type: 'TRIGGER_ACTION', action: acao }, '*');
  }
}
