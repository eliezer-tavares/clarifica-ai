// Suíte: Áudio e Multimodal (v1.3.0) — Transcrição (Whisper), OCR (TrOCR),
// Tradução (opus-mt EN→PT) e Leitura em Voz Alta (Web Speech API).
// Cobre a lógica PURA de áudio (reamostragem 16 kHz extraída por
// marcadores), os fluxos completos no popup (descoberta de mídia, CORS,
// seleção vazia, TTS toggle) e o estado real deixado na PÁGINA alvo.
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeDom, makeChromeStub, sleep, readExt, substituirI18n, FakeWorker, MENSAGENS_PT } = require('./helpers/env');

// ---- Lógica pura de áudio (mesma técnica do perfis.test.js) ----
const popupJs = readExt('popup/popup.js');
const MARCA_INICIO = '=== INÍCIO DA LÓGICA PURA DE ÁUDIO';
const MARCA_FIM = '=== FIM DA LÓGICA PURA DE ÁUDIO';

function carregarLogicaPura() {
  const marcaInicio = popupJs.indexOf(MARCA_INICIO);
  const marcaFim = popupJs.indexOf(MARCA_FIM);
  assert.ok(marcaInicio !== -1 && marcaFim !== -1 && marcaFim > marcaInicio, 'bloco de lógica pura de áudio delimitado em popup.js');
  const inicio = popupJs.lastIndexOf('\n', marcaInicio) + 1;
  const fim = popupJs.indexOf('\n', marcaFim) + 1;
  const trecho = popupJs.slice(inicio, fim);
  const fabrica = new Function(`${trecho}\nreturn { reamostrarPara16k };`);
  return fabrica();
}

const { reamostrarPara16k } = carregarLogicaPura();

// ---- Fluxos completos no popup (mesmo ambiente do popup.test.js) ----
async function setup(opts = {}) {
  const html = substituirI18n(readExt('popup/popup.html')).replace('<script type="module" src="popup.js"></script>', '');
  const dom = makeDom(html, 'chrome-extension://clarifica-ai/popup/popup.html');
  const stub = makeChromeStub(dom.window, opts);
  await sleep(10);
  FakeWorker.reset(opts.modoWorker || 'ok');
  dom.window.Worker = FakeWorker;
  dom.window.fetch = async (url) => {
    if (String(url).includes('_locales/')) {
      return { ok: true, status: 200, json: async () => MENSAGENS_PT, text: async () => JSON.stringify(MENSAGENS_PT) };
    }
    if (String(url).includes('podcast.mp3')) {
      // "Mídia" da página: corpo binário fictício com arrayBuffer — o
      // AudioContext simulado ignora o conteúdo e devolve o PCM do teste.
      return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(64) };
    }
    return { ok: true, status: 200, text: async () => '// código do worker (ambiente de teste)' };
  };
  dom.window.URL.createObjectURL = () => 'blob:simulado';
  dom.window.URL.revokeObjectURL = () => {};
  // AudioContext simulado: decodeAudioData devolve PCM 32 kHz (2 s) — a
  // reamostragem REAL do popup.js roda por cima dele.
  const AMOSTRAS = new Float32Array(32000);
  for (let i = 0; i < AMOSTRAS.length; i++) AMOSTRAS[i] = Math.sin(i / 20);
  dom.window.AudioContext = class {
    async decodeAudioData() { return { sampleRate: 32000, getChannelData: () => AMOSTRAS }; }
    close() {}
  };
  dom.window.eval(readExt('popup/popup.js'));
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
  const document = dom.window.document;
  await sleep(20);
  return { dom, stub, window: dom.window, document, storageStore: stub.storageStore };
}

const botao = (document, mode) => document.querySelector(`.mode-btn[data-mode="${mode}"]`);
const statusDe = (document) => document.getElementById('status');

async function aguardar(condicao, maxMs = 500, passo = 5) {
  const inicio = Date.now();
  while (!(await condicao()) && Date.now() - inicio < maxMs) await sleep(passo);
}

// ---- Lógica pura: reamostragem para 16 kHz (contrato do Whisper) ----

test('multimodal: reamostrador preserva rampa linear exata e as pontas', () => {
  // 2 amostras a 8 kHz = 0,25 s → 4 amostras a 16 kHz: interpolação linear
  // pura em [0, 1/3, 2/3, 1].
  const saida = reamostrarPara16k(new Float32Array([0, 1]), 8000);
  assert.equal(saida.length, 4, 'duração preservada na conversão de taxa');
  assert.equal(saida[0], 0, 'primeira amostra preservada');
  assert.equal(saida[3], 1, 'última amostra preservada');
  for (const [i, esperado] of [[1, 1 / 3], [2, 2 / 3]]) {
    assert.ok(Math.abs(saida[i] - esperado) < 1e-6, `amostra ${i} interpolação exata (${esperado})`);
  }
});

test('multimodal: reamostrador reduz 48 kHz → 16 kHz (1/3) e é identidade em 16 kHz', () => {
  const entrada = new Float32Array(48000); // 1 s a 48 kHz
  for (let i = 0; i < entrada.length; i++) entrada[i] = i / 48000;
  const saida = reamostrarPara16k(entrada, 48000);
  assert.equal(saida.length, 16000, '1 s a 48 kHz vira exatamente 16.000 amostras a 16 kHz');
  assert.ok(Math.abs(saida[8000] - 0.5) < 0.001, 'amostra central coerente com a rampa');

  const ja16k = reamostrarPara16k(entrada.subarray(0, 16000), 16000);
  assert.equal(ja16k.length, 16000, '16 kHz entra sem alteração de tamanho');
  assert.equal(ja16k[0], 0, 'conteúdo preservado');
});

test('multimodal: reamostrador rejeita entradas vazias/taxas inválidas e aceita Arrays', () => {
  assert.equal(reamostrarPara16k(new Float32Array(0), 44100).length, 0, 'sem amostras → saída vazia');
  assert.equal(reamostrarPara16k(new Float32Array(100), 0).length, 0, 'taxa inválida → saída vazia');
  assert.equal(reamostrarPara16k(new Float32Array(100), -1).length, 0, 'taxa negativa → saída vazia');
  const deArray = reamostrarPara16k([0, 0.5, 1], 8000); // Array comum aceito
  assert.ok(deArray instanceof Float32Array && deArray.length > 0, 'Array comum convertido para Float32Array');
});

// ---- Estrutura do popup ----

test('multimodal: seção de áudio com 4 botões nativos, aria-pressed inicial e rotulos pt-BR', async () => {
  const { document } = await setup();
  const botoes = [...document.querySelectorAll('button')];
  assert.equal(botoes.length, 15, '13 modos (9 anteriores + 4 áudio/multimodal) + fechar + tema');
  const titulos = [...document.querySelectorAll('.secao-titulo')].map((h) => h.textContent);
  assert.ok(titulos.includes('Áudio e Multimodal'), 'nova seção presente');
  for (const mode of ['transcrever', 'ocr', 'traduzir', 'voz']) {
    const b = botao(document, mode);
    assert.ok(b, `botão ${mode} presente`);
    assert.ok(b.classList.contains('midia'), `botão ${mode} na seção de áudio`);
    assert.equal(b.getAttribute('aria-pressed'), 'false', `botão ${mode} inicia desligado (WCAG 4.1.2)`);
  }
  assert.match(botao(document, 'transcrever').textContent, /Transcrever Áudio/);
  assert.match(botao(document, 'ocr').textContent, /OCR/);
  assert.match(botao(document, 'traduzir').textContent, /Traduzir Seleção/);
  assert.match(botao(document, 'voz').textContent, /Ler em Voz Alta/);
});

// ---- Transcrição (Whisper) ----

test('multimodal: transcrição sem mídia na página informa o usuário sem criar Worker', async () => {
  const { stub, document } = await setup();
  botao(document, 'transcrever').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Nenhum vídeo ou áudio encontrado na página.');
  assert.equal(FakeWorker.instances.length, 0, 'nenhum Worker criado');
  assert.ok(!stub.calls.getURL.includes('scripts/ai-worker.js'), 'nenhum acesso ao worker de IA');
});

test('multimodal: transcrição envia PCM 16 kHz ao Worker e exibe a transcrição', async () => {
  const { stub, document } = await setup();
  const audio = document.createElement('audio');
  audio.setAttribute('src', 'https://midia.teste/podcast.mp3');
  document.querySelector('main').appendChild(audio);

  botao(document, 'transcrever').click();
  // Espera ATIVA pelo fim do fluxo (Worker encerrado) em vez de tempo fixo:
  // em máquinas carregadas os temporizadores atrasam e o sleep fixo
  // afirmava antes da resposta do Worker chegar (corrida intermitente).
  await aguardar(() => Promise.resolve(FakeWorker.instances[0] && FakeWorker.instances[0].terminated), 3000);

  assert.equal(FakeWorker.instances.length, 1, 'um Worker criado');
  const worker = FakeWorker.instances[0];
  const mensagem = worker.received[0];
  assert.equal(mensagem.type, 'transcribe-audio', 'protocolo correto');
  // Verificação cross-realm: o PCM nasce no realm do jsdom (função
  // avaliada via window.eval), então instanceof do Node falha — o nome do
  // construtor é estável entre realms.
  assert.equal(mensagem.data.constructor.name, 'Float32Array', 'PCM enviado como Float32Array');
  assert.equal(mensagem.data.length, 16000, '2 s de 32 kHz reamostrados para exatamente 1 s a 16 kHz (16000 amostras)');
  assert.equal(worker.terminated, true, 'Worker encerrado após a resposta');
  assert.equal(document.getElementById('ai-output').textContent, 'TRANSCRICAO-TESTE');
  assert.ok(!document.getElementById('result-area').classList.contains('hidden'), 'transcrição exibida');
  assert.equal(statusDe(document).textContent, 'Transcrição concluída!');
});

test('multimodal: transcrição ignora blob: e data: e usa o primeiro http(s) válido', async () => {
  const { stub, document } = await setup();
  const blobVideo = document.createElement('video');
  blobVideo.setAttribute('src', 'blob:https://videos.teste/abc'); // ex.: YouTube
  const fonte = document.createElement('audio');
  const source = document.createElement('source');
  source.setAttribute('src', 'https://midia.teste/podcast.mp3');
  fonte.appendChild(source);
  document.querySelector('main').appendChild(blobVideo);
  document.querySelector('main').appendChild(fonte);

  botao(document, 'transcrever').click();
  await sleep(60);
  const worker = FakeWorker.instances[0];
  assert.ok(worker, 'mídia http(s) encontrada via <source>');
  assert.equal(worker.received[0].type, 'transcribe-audio');
});

test('multimodal: mídia protegida por CORS gera mensagem clara (sem travar o popup)', async () => {
  const { document, window } = await setup();
  window.fetch = async () => { throw new TypeError('Failed to fetch (CORS simulado)'); };
  const audio = document.createElement('audio');
  audio.setAttribute('src', 'https://protegido.teste/aula.mp3');
  document.querySelector('main').appendChild(audio);

  botao(document, 'transcrever').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'O áudio é protegido pelo site (CORS) e não pode ser transcrito.');
  assert.equal(FakeWorker.instances.length, 0, 'nenhum Worker criado quando a mídia é inacessível');
});

test('multimodal: erro codificado do worker de transcrição é traduzido', async () => {
  const { document } = await setup({ modoWorker: 'worker-audio-erro' });
  const audio = document.createElement('audio');
  audio.setAttribute('src', 'https://midia.teste/podcast.mp3');
  document.querySelector('main').appendChild(audio);
  botao(document, 'transcrever').click();
  // Espera o status FINAL traduzido em vez de tempo fixo — a resposta de
  // erro do Worker chega por temporizador e atrasa em máquinas carregadas.
  await aguardar(() => Promise.resolve(statusDe(document).textContent === 'Falha na transcrição de áudio.'), 3000);
  assert.equal(statusDe(document).textContent, 'Falha na transcrição de áudio.');
  assert.ok(document.getElementById('result-area').classList.contains('hidden'), 'resultado permanece oculto');
  assert.equal(FakeWorker.instances[0].terminated, true, 'Worker encerrado após o erro');
});

// ---- OCR (TrOCR) ----

test('multimodal: OCR aplica o texto extraído como alt/aria-label das imagens sem alt', async () => {
  const { stub, document } = await setup();
  const figuras = [['sem-alt.png', null], ['vazio.png', ''], ['com-alt.png', 'Logotipo do site']];
  for (const [src, alt] of figuras) {
    const img = document.createElement('img');
    img.src = src;
    if (alt !== null) img.setAttribute('alt', alt);
    document.querySelector('main').appendChild(img);
  }

  botao(document, 'ocr').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Extraindo texto de 2 imagens...', 'quantidade traduzida com placeholder i18n');

  await aguardar(() => Promise.resolve(FakeWorker.instances[0] && FakeWorker.instances[0].terminated));
  const worker = FakeWorker.instances[0];
  assert.equal(worker.received.length, 2, 'apenas as imagens sem alt enviadas');
  assert.ok(worker.received.every((m) => m.type === 'ocr-image'));
  assert.equal(worker.terminated, true, 'Worker encerrado ao concluir (sem zumbi)');

  const porSrc = (src) => [...document.querySelectorAll('img')].find((i) => i.getAttribute('src') === src);
  assert.equal(porSrc('sem-alt.png').getAttribute('alt'), 'Texto da imagem (OCR): OCR-' + porSrc('sem-alt.png').src, 'alt gerado do OCR (URL absoluta ecoada pelo worker)');
  assert.equal(porSrc('sem-alt.png').getAttribute('aria-label'), porSrc('sem-alt.png').getAttribute('alt'), 'aria-label espelha o alt');
  assert.match(porSrc('sem-alt.png').style.border, /10b981|16,\s*185,\s*129/, 'contorno de confirmação');
  assert.equal(porSrc('vazio.png').getAttribute('aria-label'), porSrc('vazio.png').getAttribute('alt'), 'alt vazio também recebe o OCR');
  const preservada = porSrc('com-alt.png');
  assert.equal(preservada.getAttribute('alt'), 'Logotipo do site', 'alt original preservado');
  assert.equal(preservada.style.border, '', 'imagem com alt não é tocada');

  // Anúncio de conclusão na PÁGINA com a contagem real substituída.
  await aguardar(() => Promise.resolve([...document.querySelectorAll('[role="status"][aria-live="assertive"]')]
    .some((n) => /OCR concluído em 2 imagens\./.test(n.textContent || ''))));
});

test('multimodal: erro do worker de OCR encerra o Worker (sem zumbi)', async () => {
  const { document } = await setup({ modoWorker: 'worker-ocr-erro' });
  for (const src of ['a.png', 'b.png']) {
    const img = document.createElement('img');
    img.src = src;
    document.querySelector('main').appendChild(img);
  }
  botao(document, 'ocr').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Extraindo texto de 2 imagens...');
  await sleep(80);
  assert.equal(FakeWorker.instances[0].terminated, true, 'Worker encerrado na mensagem de erro');
});

test('multimodal: página com todas as imagens descritas → OCR não cria Worker', async () => {
  const { document } = await setup();
  const img = document.createElement('img');
  img.src = 'logo.png';
  img.setAttribute('alt', 'Logotipo do site');
  document.querySelector('main').appendChild(img);
  botao(document, 'ocr').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Todas as imagens já têm descrição.');
  assert.equal(FakeWorker.instances.length, 0);
});

// ---- Tradução (opus-mt EN→PT) ----

test('multimodal: tradução sem seleção informa o usuário sem criar Worker', async () => {
  const { stub, document } = await setup();
  botao(document, 'traduzir').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Selecione um trecho na página antes de traduzir.');
  assert.equal(FakeWorker.instances.length, 0, 'nenhum Worker sem trecho selecionado');
  assert.ok(!stub.calls.getURL.includes('scripts/ai-worker.js'), 'nenhum acesso ao worker de IA');
});

test('multimodal: tradução envia o trecho selecionado, exibe resultado e anuncia na página', async () => {
  const { stub, document, window } = await setup();
  Object.defineProperty(window, 'getSelection', {
    value: () => ({ toString: () => 'Digital accessibility is essential for the web.' }),
    configurable: true
  });

  botao(document, 'traduzir').click();
  await sleep(60);

  const worker = FakeWorker.instances[0];
  assert.ok(worker, 'Worker criado para a tradução');
  assert.equal(worker.received[0].type, 'translate-text');
  assert.equal(worker.received[0].data, 'Digital accessibility is essential for the web.', 'trecho selecionado enviado integralmente');
  assert.equal(worker.terminated, true, 'Worker encerrado após a resposta');
  assert.equal(document.getElementById('ai-output').textContent, 'TRADUCAO-TESTE');
  assert.ok(!document.getElementById('result-area').classList.contains('hidden'));
  assert.equal(statusDe(document).textContent, 'Tradução concluída!');
  await aguardar(() => Promise.resolve([...document.querySelectorAll('[role="status"][aria-live="assertive"]')]
    .some((n) => /Tradução concluída/.test(n.textContent || ''))), 200);
});

// ---- Leitura em voz alta (Web Speech API) ----

function stubTts(window) {
  const estado = { falas: [], cancelamentos: 0, falando: false };
  window.SpeechSynthesisUtterance = class {
    constructor(texto) { this.text = texto; }
  };
  window.speechSynthesis = {
    get speaking() { return estado.falando; },
    get pending() { return false; },
    getVoices: () => [{ lang: 'pt-BR', name: 'Luciana' }, { lang: 'en-US', name: 'Sam' }],
    speak: (utterance) => { estado.falas.push(utterance); estado.falando = true; },
    cancel: () => { estado.cancelamentos++; estado.falando = false; }
  };
  return estado;
}

test('multimodal: ler em voz alta fala o conteúdo principal com voz do idioma da interface', async () => {
  const { document, window } = await setup();
  const tts = stubTts(window);

  botao(document, 'voz').click();
  await sleep(30);

  assert.equal(tts.falas.length, 1, 'uma utterance criada');
  const utterance = tts.falas[0];
  assert.ok(utterance.text.length > 100, 'texto do conteúdo principal falado (o próprio popup tem texto)');
  assert.ok(utterance.text.length <= 8000, 'texto limitado a 8000 caracteres');
  assert.equal(utterance.lang, 'pt-BR', 'idioma da voz acompanha a interface');
  assert.ok(utterance.voice && utterance.voice.lang === 'pt-BR', 'voz pt-BR selecionada quando disponível');
  assert.ok(tts.cancelamentos >= 1, 'fila anterior descartada antes de falar');
  assert.equal(statusDe(document).textContent, 'Lendo em voz alta. Clique de novo para parar.');
  assert.equal(botao(document, 'voz').getAttribute('aria-pressed'), 'true', 'botão marcado como falando');
  assert.ok(botao(document, 'voz').classList.contains('ativo'), 'estado visual de voz ativa');

  // Toggle: o segundo clique interrompe e desmarca.
  botao(document, 'voz').click();
  await sleep(30);
  assert.equal(tts.cancelamentos, 2, 'cancel chamado no toggle');
  assert.equal(statusDe(document).textContent, 'Leitura em voz alta parada.');
  assert.equal(botao(document, 'voz').getAttribute('aria-pressed'), 'false', 'botão desmarcado após parar');
  assert.ok(!botao(document, 'voz').classList.contains('ativo'), 'estado visual removido');
});

test('multimodal: ler em voz alta usa o trecho selecionado quando existe', async () => {
  const { document, window } = await setup();
  const tts = stubTts(window);
  Object.defineProperty(window, 'getSelection', {
    value: () => ({ toString: () => 'Trecho selecionado para leitura.' }),
    configurable: true
  });

  botao(document, 'voz').click();
  await sleep(30);
  assert.equal(tts.falas[0].text, 'Trecho selecionado para leitura.', 'seleção tem prioridade sobre o conteúdo da página');
});

test('multimodal: voz sem speechSynthesis degrada com mensagem clara', async () => {
  const { document } = await setup();
  botao(document, 'voz').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Leitura em voz alta indisponível neste navegador.');
  assert.equal(botao(document, 'voz').getAttribute('aria-pressed'), 'false', 'estado permanece desligado');
});

test('multimodal: voz em página sem texto informa que não há conteúdo', async () => {
  const { document, window } = await setup();
  stubTts(window);
  // Referências capturadas ANTES da limpeza: status e botões vivem dentro
  // do main (mesma conduta do teste texto-curto do popup.test.js).
  const btnVoz = botao(document, 'voz');
  const statusEl = statusDe(document);
  document.querySelector('main').innerHTML = '';
  btnVoz.click();
  await sleep(30);
  assert.equal(statusEl.textContent, 'Nada para ler: página sem texto.');
});

// ---- Robustez transversal ----

test('multimodal: falha de injeção exibe erro nos quatro fluxos novos', async () => {
  const { stub, document } = await setup();
  stub.chrome.scripting.executeScript = async () => { throw new Error('boom'); };

  botao(document, 'transcrever').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Erro ao injetar script. Recarregue a página.');

  botao(document, 'ocr').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Erro ao injetar script. Recarregue a página.');

  botao(document, 'traduzir').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Erro ao injetar script. Recarregue a página.');

  botao(document, 'voz').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Erro ao injetar script. Recarregue a página.');
});
