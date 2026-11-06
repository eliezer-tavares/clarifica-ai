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
    'falha-injecao': 'statusInjecaoErro'
  };
  const CICLO_TEMA = ['auto', 'claro', 'escuro'];

  const textoDeErro = (codigo) => mensagem(TRADUCAO_ERROS[codigo] || 'statusFalhaIA');

  let intensidadeAtual = 100;
  let ultimoFiltro = null;

  const mensagem = (chave, args) => mensagemResolvida(mensagensCache, chave, args);

  // ---- Configurações persistidas (chrome.storage.local) ----
  // Falhas de storage nunca devem derrubar a UI: o estado padrão já está
  // aplicado e o try/catch mantém o popup funcional sem persistência.
  async function salvarConfig(parcial) {
    try { await chrome.storage.local.set(parcial); } catch (e) { /* sem persistência */ }
  }
  async function carregarConfig() {
    try {
      const cfg = await chrome.storage.local.get({ tema: 'auto', intensidade: 100, ultimoFiltro: null });
      aplicarTema(cfg.tema);
      definirIntensidade(cfg.intensidade);
      if (TIPOS_FILTRO.includes(cfg.ultimoFiltro)) destacarFiltro(cfg.ultimoFiltro);
    } catch (e) { /* mantém os padrões */ }
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
        const resultado = await enviarParaContent('summarize');
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
          prefixoAltIA: mensagem('prefixoAltIA')
        });
        if (resultado?.error) statusEl.textContent = textoDeErro(resultado.error);
        else if (typeof resultado?.totalSemAlt === 'number') {
          statusEl.textContent = resultado.totalSemAlt === 0
            ? mensagem('statusImagensCompletas')
            : mensagem('statusImagensIniciando', [String(resultado.totalSemAlt)]);
        }
        else statusEl.textContent = mensagem('statusSemResposta');
      }
      else if (TIPOS_FILTRO.includes(mode)) {
        await aplicarFiltro(mode);
      }
    });
  });

  document.getElementById('close-result').addEventListener('click', () => {
    resultArea.classList.add('hidden');
    statusEl.textContent = mensagem('statusPronto');
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

      const anuncio = document.createElement('div');
      anuncio.setAttribute('role', 'status');
      anuncio.setAttribute('aria-live', 'assertive');
      anuncio.textContent = (extras && extras.anuncioFiltro) || '';
      document.body.appendChild(anuncio);
      setTimeout(() => anuncio.remove(), 3000);

      return { success: true };
    }

    if (acao === 'summarize') {
      const texto = (document.querySelector('main, article, #content') || document.body).innerText;
      if (texto.length < 200) return { error: 'texto-curto' };

      try {
        const { worker, urlBlob } = await criarWorkerIA();
        const encerrar = () => { worker.terminate(); URL.revokeObjectURL(urlBlob); };
        return await new Promise((resolve) => {
          worker.postMessage({ type: 'summarize', data: texto.substring(0, 3000) });
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
        setTimeout(() => worker.postMessage({ type: 'describe-image', data: img.src }), i * 500);
      });

      return { totalSemAlt: imagens.length };
    }
  }
});
