// Service Worker que gerencia os atalhos de teclado e garante o feedback
// auditivo (aria-live) para leitores de tela como NVDA e JAWS.

const commandActions = {
  'toggle-resumo': 'summarize',
  'toggle-leitura': 'apply-leitura-essencial',
  'toggle-imagens': 'describe-images',
  'toggle-reset': 'reset-all'
};

chrome.commands.onCommand.addListener(async (command) => {
  const action = commandActions[command];
  if (!action) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: anunciarAcao,
      args: [action]
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

function anunciarAcao(acao) {
  const nomes = {
    'summarize': 'Clarifica.ai: Resumindo página com inteligência artificial.',
    'apply-leitura-essencial': 'Clarifica.ai: Modo Leitura Essencial ativado. Ruídos silenciados.',
    'describe-images': 'Clarifica.ai: Iniciando descrição de imagens. Aguarde.',
    'reset-all': 'Clarifica.ai: Desativado. Página restaurada ao original.'
  };

  const antigo = document.getElementById('clarifica-anuncio');
  if (antigo) antigo.remove();

  const anuncio = document.createElement('div');
  anuncio.id = 'clarifica-anuncio';
  anuncio.setAttribute('role', 'status');
  anuncio.setAttribute('aria-live', 'assertive'); // Força o leitor de tela a ler
  anuncio.setAttribute('aria-atomic', 'true');
  anuncio.style.cssText = 'position:fixed; top:-9999px; left:-9999px; width:1px; height:1px; overflow:hidden;';
  anuncio.textContent = nomes[acao] || 'Clarifica.ai ativado.';
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
  }
  else if (acao === 'summarize' || acao === 'describe-images') {
    window.postMessage({ type: 'TRIGGER_ACTION', action: acao }, '*');
  }
}
