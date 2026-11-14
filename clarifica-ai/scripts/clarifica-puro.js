// Lógica pura compartilhada do Clarifica.ai (v1.4.0) — Legendas ao Vivo.
//
// Fonte canônica das funções puras que cruzam fronteiras de contexto
// (popup ⇄ service worker ⇄ documento offscreen ⇄ página). Nenhuma função
// deste módulo depende de chrome.*, de DOM ou de rede — é exercitada em
// Node por tests/legendas.test.js (padrão css-filters/perfis: extração por
// marcadores) e importada como módulo ES pelo documento offscreen.
//
// Funções que também precisam rodar DENTRO de funções injetadas
// (chrome.scripting serializa apenas o corpo da função) existem aqui e em
// cópias inline marcadas em popup.js e background.js; a paridade das cópias
// com esta fonte canônica é garantida por teste (tests/legendas.test.js —
// comparação de fonte normalizada), mesma disciplina dos dicionários de
// mensagens do motor i18n (v1.1.0).
//
// Consumo em runtime:
//   offscreen/offscreen.js  → import ES módulo direto deste arquivo
//   popup/popup.js          → cópia inline de reamostrarPara16k (bloco
//                             "LÓGICA PURA DE ÁUDIO", v1.3.0, intocado) e
//                             de auditoriaLegendas (bloco marcado v1.4.0)
//   background.js           → cópia inline de seletorDeVideoAlvo (bloco
//                             marcado v1.4.0, dentro de prepararLegendasNaPagina)

// === INÍCIO DA LÓGICA PURA DE LEGENDAS (v1.4.0: exercitada em Node por
// legendas.test.js — sem DOM, sem chrome.*, sem rede) ===

// Janela de 7 s de áudio por requisição ao Whisper: equilíbrio entre latência
// (janelas curtas respondem antes) e custo de inferência (janelas curtas
// pagam mais overhead por segundo de fala). A sobreposição de 1 s preserva
// palavras cortadas na fronteira da janela. Medição real de latência
// documentada no TEST_REPORT.md (revisão 9).
const JANELA_PADRAO_SEGUNDOS = 7;
const SOBREPOSICAO_PADRAO_SEGUNDOS = 1;

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

// Plano de janelas contínuas para uma duração conhecida: cada janela dura
// até `janela` segundos e recua `sobreposicao` segundos em relação à
// anterior (passo = janela − sobreposição), preservando palavras cortadas
// na fronteira. A janela final pode ser curta — nunca ultrapassa a
// duração. Retorna uma lista de { inicio, fim } em segundos; duração
// inválida, zero ou não finita retorna [] (nada a janelar).
function planoDeJanelas(duracaoSegundos, opcoes = {}) {
  const janela = Math.max(1, Number(opcoes.janela) || JANELA_PADRAO_SEGUNDOS);
  // `||` no lugar de `??`: opções inválidas (NaN, null, 0 explícito) caem
  // no padrão — o contrato é "janelas com sobreposição" por padrão.
  const sobreposicao = Math.max(0, Math.min(janela - 1, Number(opcoes.sobreposicao) || SOBREPOSICAO_PADRAO_SEGUNDOS));
  const duracao = Number(duracaoSegundos);
  if (!Number.isFinite(duracao) || duracao <= 0) return [];
  if (duracao <= janela) return [{ inicio: 0, fim: duracao }];
  const passo = janela - sobreposicao;
  const janelas = [];
  for (let inicio = 0; inicio < duracao; inicio += passo) {
    const fim = Math.min(duracao, inicio + janela);
    janelas.push({ inicio, fim });
    if (fim >= duracao) break;
  }
  return janelas;
}

// Monta um documento WebVTT a partir da lista de legendas { inicio, fim,
// texto }: entradas inválidas e textos vazios são descartadas, duplicatas
// (mesmo instante inicial + mesmo texto) entram uma única vez, e a saída
// é ordenada temporalmente. Carimbos no formato HH:MM:SS.mmm exigido pela
// especificação WebVTT.
function montadorVtt(legendas) {
  const lista = Array.isArray(legendas) ? legendas : [];
  const vistas = new Set();
  const validas = [];
  for (const legenda of lista) {
    if (!legenda || typeof legenda.texto !== 'string') continue;
    const texto = legenda.texto.trim();
    if (!texto) continue;
    const inicio = Math.max(0, Number(legenda.inicio) || 0);
    const fim = Math.max(inicio, Number(legenda.fim) || inicio);
    const chave = `${inicio.toFixed(3)}|${texto}`;
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    validas.push({ inicio, fim, texto });
  }
  validas.sort((a, b) => a.inicio - b.inicio || a.fim - b.fim || (a.texto < b.texto ? -1 : a.texto > b.texto ? 1 : 0));
  const carimbo = (segundos) => {
    const totalMs = Math.round(Math.max(0, segundos) * 1000);
    const horas = Math.floor(totalMs / 3600000);
    const minutos = Math.floor((totalMs % 3600000) / 60000);
    const seg = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;
    const dois = (n) => String(n).padStart(2, '0');
    return `${dois(horas)}:${dois(minutos)}:${dois(seg)}.${String(ms).padStart(3, '0')}`;
  };
  const blocos = validas.map((l) => `${carimbo(l.inicio)} --> ${carimbo(l.fim)}\n${l.texto}`);
  return ['WEBVTT', '', ...blocos].join('\n\n') + (blocos.length ? '\n' : '');
}

// Seleciona o vídeo alvo das legendas a partir dos descritores coletados
// na página (mesma ordem do document.querySelectorAll): regra do produto é
// "o vídeo VISÍVEL de maior área renderizada"; em empate vence o primeiro
// na ordem do documento. Retorna o ÍNDICE do descritor vencedor — ou null
// quando não há vídeo utilizável (páginas com apenas <audio>, por exemplo).
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

// Auditoria mínima do critério WCAG 1.2.2 (Legendas ou Alternativa):
// a partir dos descritores de <video> coletados na página, conta quantos
// possuem <track kind="captions"> ou kind="subtitles" (via DOM ou API
// textTracks). Tracks de outros kinds (chapters, descriptions, metadata)
// NÃO contam como legenda. Sem IA e sem rede: leitura pura de estado.
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

// === FIM DA LÓGICA PURA DE LEGENDAS ===

// === INÍCIO DA LÓGICA PURA DE AUDITORIA WCAG (v2.0.0: exercitada em Node por
// auditoria.test.js — sem DOM, sem chrome.*, sem rede) ===
//
// Painel de auditoria de acessibilidade em tempo real: a COLETA de dados
// na página (funções injetadas) extrai descritores planos; o JULGAMENTO
// (quais critérios WCAG são violados e com que gravidade) vive aqui —
// mesmo contrato das legendas: código idêntico em Node e no navegador,
// com cópias inline marcadas no popup.js e paridade garantida por teste.

// Textos de âncora que não descrevem o destino (WCAG 2.4.4 — Purpose of
// Links). Lista fechada e minúscula; o texto chega já normalizado.
const TEXTOS_LINK_GENERICOS = [
  'clique aqui', 'aqui', 'leia mais', 'saiba mais', 'continue lendo',
  'ver mais', 'mais', 'link', 'click here', 'here', 'read more', 'more',
  'learn more', 'this link', 'link para', 'link para:'
];

function ehTextoLinkGenerico(texto) {
  const t = String(texto || '').trim().toLowerCase();
  if (!t) return false;
  return TEXTOS_LINK_GENERICOS.includes(t);
}

// Pulo de nível de título (ex.: h1 → h4) viola a ordem hierárquica esperada
// por leitores de tela (WCAG 1.3.1 — Info and Relationships). O PRIMEIRO
// título da página pode ser h1 OU h2 (padrão comum e legítimo); só os
// saltos para baixo de mais de um nível são sinalizados. Retorna true no
// primeiro salto encontrado (uma ocorrência basta para o achado).
function headingsForaDeOrdem(niveis) {
  const lista = Array.isArray(niveis) ? niveis.map((n) => Number(n)).filter((n) => n >= 1 && n <= 6) : [];
  let anterior = 0;
  for (const nivel of lista) {
    if (anterior > 0 && nivel > anterior + 1) return true;
    anterior = nivel;
  }
  return false;
}

// Auditoria completa: recebe os descritores coletados na página e devolve
// os achados por critério, com contagem, mensagem (CHAVE i18n — a página
// resolve com strings já traduzidas, como em todo o produto) e dica de
// ação. Sem IA e sem rede: leitura pura de estado, executada a cada
// mutação relevante da página (painel em tempo real).
function auditarAcessibilidade(descritores) {
  const d = descritores && typeof descritores === 'object' ? descritores : {};
  const imagens = Array.isArray(d.imagens) ? d.imagens : [];
  const controles = Array.isArray(d.controles) ? d.controles : [];
  const links = Array.isArray(d.links) ? d.links : [];
  const iframes = Array.isArray(d.iframes) ? d.iframes : [];
  const videos = Array.isArray(d.videos) ? d.videos : [];
  const achados = [];

  const imagensSemAlt = imagens.filter((img) => img && !img.temAlt).length;
  if (imagensSemAlt > 0) {
    achados.push({ criterio: '1.1.1', chaveMensagem: 'dicaCriterio111', contagem: imagensSemAlt });
  }

  const legenda = auditoriaLegendas(videos);
  if (legenda.semLegenda > 0) {
    achados.push({ criterio: '1.2.2', chaveMensagem: 'dicaCriterio122', contagem: legenda.semLegenda });
  }

  const controlesSemNome = controles.filter((c) => c && !c.nome).length;
  if (controlesSemNome > 0) {
    achados.push({ criterio: '4.1.2', chaveMensagem: 'dicaCriterio412', contagem: controlesSemNome });
  }

  const genericos = links.filter((texto) => ehTextoLinkGenerico(texto)).length;
  if (genericos > 0) {
    achados.push({ criterio: '2.4.4', chaveMensagem: 'dicaCriterio244', contagem: genericos });
  }

  const iframesSemTitle = iframes.filter((f) => f && !f.temTitle).length;
  if (iframesSemTitle > 0) {
    achados.push({ criterio: '2.4.1', chaveMensagem: 'dicaCriterio241', contagem: iframesSemTitle });
  }

  if (!String(d.htmlLang || '').trim()) {
    achados.push({ criterio: '3.1.1', chaveMensagem: 'dicaCriterio311', contagem: 1 });
  }

  if (headingsForaDeOrdem(d.headings)) {
    achados.push({ criterio: '1.3.1', chaveMensagem: 'dicaCriterio131', contagem: 1 });
  }

  const totalBarreiras = achados.reduce((soma, a) => soma + a.contagem, 0);
  return { achados, totalBarreiras, criterios: achados.length };
}

// Parâmetros de geração do resumo: o modo Português Claro (v2.0.0) favorece
// frases curtas e ordem direta via geração do MODELO (teto menor de tokens
// de saída), nunca por regras de reescrita de texto. O padrão é o
// comportamento da v1.0.0 — a opção é aditiva.
function parametrosDeGeracao(claro) {
  return claro === true
    ? { max_new_tokens: 90, min_new_tokens: 30, do_sample: false }
    : { max_new_tokens: 150, min_new_tokens: 50, do_sample: false };
}

// === FIM DA LÓGICA PURA DE AUDITORIA WCAG ===

// Exportação ESM — o documento offscreen (página de extensão) importa as
// funções diretamente; os testes em Node extraem o bloco marcado acima
// (padrão css-filters/perfis) e exercitam as MESMAS linhas que o navegador.
export {
  JANELA_PADRAO_SEGUNDOS,
  SOBREPOSICAO_PADRAO_SEGUNDOS,
  reamostrarPara16k,
  planoDeJanelas,
  montadorVtt,
  seletorDeVideoAlvo,
  auditoriaLegendas,
  TEXTOS_LINK_GENERICOS,
  ehTextoLinkGenerico,
  headingsForaDeOrdem,
  auditarAcessibilidade,
  parametrosDeGeracao
};
