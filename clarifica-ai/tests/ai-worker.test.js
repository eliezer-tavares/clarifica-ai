// Suíte REAL do ai-worker.js — sem simulacros de IA.
//
// O código de scripts/ai-worker.js é executado de verdade em Node com a
// Transformers.js oficial (@xenova/transformers 2.14.0 — a mesma versão que a
// extensão carrega) e os modelos quantizados oficiais do projeto:
//   - Xenova/distilbart-cnn-12-6        (sumarização, ~300 MB)      [v1.0.0]
//   - Xenova/vit-gpt2-image-captioning  (descrição de imagens, ~250 MB) [v1.0.0]
//   - Xenova/whisper-tiny               (transcrição, ~45 MB)           [v1.3.0]
//   - Xenova/trocr-small-printed        (OCR, ~60 MB)                   [v1.3.0]
//   - Xenova/opus-mt-en-ROMANCE         (tradução EN→PT, ~115 MB)       [v1.3.0]
//
// A única adaptação, necessária por rodar fora do navegador, é a ponte de
// mensagens do Worker (self.postMessage / self.onmessage); a biblioteca, os
// pesos e a inferência são 100% reais. A primeira execução em uma máquina
// nova baixa os modelos (requer internet); depois eles ficam em cache.
// Dica: node setup/preparar_modelos_ia.mjs pré-baixa os modelos.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { readExt, ext } = require('./helpers/env');

const VERSAO_TRANSFORMERS = '2.14.0';
const CODIGO_WORKER = readExt('scripts/ai-worker.js');
const IMAGEM_URL = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/football-match.jpg';
const IMAGEM_FIXTURE = ext('tests', 'fixtures', 'football-match.jpg');

// Reamostrador REAL do popup.js (lógica pura extraída por marcadores) —
// o fixture de áudio passa pelo MESMO pipeline da página antes do worker,
// então o teste de transcrição valida ponta a ponta o caminho do produto.
const POPUP_JS = readExt('popup/popup.js');
const MARCA_AUDIO_INICIO = '=== INÍCIO DA LÓGICA PURA DE ÁUDIO';
const MARCA_AUDIO_FIM = '=== FIM DA LÓGICA PURA DE ÁUDIO';
const reamostrarPara16k = (() => {
  const ini = POPUP_JS.indexOf(MARCA_AUDIO_INICIO);
  const fim = POPUP_JS.indexOf(MARCA_AUDIO_FIM);
  assert.ok(ini !== -1 && fim !== -1 && fim > ini, 'bloco de lógica pura de áudio delimitado em popup.js');
  const inicio = POPUP_JS.lastIndexOf('\n', ini) + 1;
  const fimLinha = POPUP_JS.indexOf('\n', fim) + 1;
  const fabrica = new Function(`${POPUP_JS.slice(inicio, fimLinha)}\nreturn reamostrarPara16k;`);
  return fabrica();
})();

/** Converte o fixture jfk.wav (estéreo 44,1 kHz 16-bit) em PCM mono 16 kHz —
 * o mesmo resultado que o AudioContext + reamostrarPara16k produzem na página. */
function audioJfk16k() {
  const wav = fs.readFileSync(ext('tests', 'fixtures', 'jfk.wav'));
  const dataIdx = wav.indexOf('data') + 8; // salta 'data' + tamanho do chunk
  const canais = wav.readUInt16LE(22);
  const taxa = wav.readUInt32LE(24);
  const amostras = Math.floor((wav.length - dataIdx) / 2 / canais);
  const pcm = new Float32Array(amostras); // canal 0 normalizado a [-1, 1]
  for (let i = 0; i < amostras; i++) pcm[i] = wav.readInt16LE(dataIdx + i * 2 * canais) / 32768;
  return reamostrarPara16k(pcm, taxa);
}

// Textos reais em inglês — idioma dos modelos quantizados do projeto.
const TEXTO_RESUMO = `Digital accessibility is the practice of building websites and applications that can be used by everyone, including people with disabilities. It covers a wide range of conditions: visual impairments such as blindness and low vision, hearing impairments, motor limitations and cognitive differences. On the web, accessibility is materialized through concrete technical practices: semantic HTML that screen readers can interpret, alternative text on images, sufficient contrast between text and background, keyboard navigation for people who cannot use a mouse and captions for videos. Standards such as the WCAG, published by the W3C, define testable success criteria that guide these practices. Far from being an optional extra, accessibility is a matter of human rights and, in many countries, a legal requirement. It also benefits everyone else: captions help people in noisy environments, good contrast helps anyone under sunlight and clear navigation reduces cognitive load for all users. Tools that apply artificial intelligence locally, such as automatic summarization and image description, expand access to information while keeping the user's data on their own device.`;

const TEXTO_RESUMO_2 = `Edge artificial intelligence moves inference from remote data centers to the user's own device. Instead of sending text, images or audio to a server, the model runs next to the application, which reduces latency, works without an internet connection after the initial download and keeps personal data under the control of the user. Advances in model quantization, which shrink neural network weights from 32-bit floats to 8-bit integers, make it possible to run capable language and vision models on ordinary laptops and phones.`;

// --- Carregamento real do worker (uma única vez; inferência real depois) ---

let estado = null; // { mensagens, version }

async function workerReal() {
  if (!estado) {
    const tf = await import('@xenova/transformers');

    // O código do worker é real; o placeholder da biblioteca é substituído
    // pelo pacote npm na MESMA versão fixada, já instalado localmente pelo
    // npm (a extensão real injeta a URL do vendor — ver versoes-modelos).
    const codigo = CODIGO_WORKER.replace(
      /import\s*\{[^}]+\}\s*from\s*'__CLARIFICA_BIBLIOTECA__';/,
      `import { pipeline, env } from '@xenova/transformers';`
    );
    assert.notEqual(codigo, CODIGO_WORKER, 'placeholder da biblioteca localizado no ai-worker.js');
    assert.doesNotMatch(CODIGO_WORKER, /https:\/\/cdn\.jsdelivr\.net/,
      'v1.1.0: o worker não pode referenciar CDN (biblioteca vendada)');
    assert.match(codigo, /Xenova\/distilbart-cnn-12-6/, 'worker real: modelo de sumarização do projeto');
    assert.match(codigo, /Xenova\/vit-gpt2-image-captioning/, 'worker real: modelo de visão do projeto');
    assert.match(codigo, /Xenova\/whisper-tiny/, 'worker real: modelo de transcrição do projeto (v1.3.0)');
    assert.match(codigo, /Xenova\/trocr-small-printed/, 'worker real: modelo de OCR do projeto (v1.3.0)');
    assert.match(codigo, /Xenova\/opus-mt-en-ROMANCE/, 'worker real: modelo de tradução do projeto (v1.3.0)');
    assert.match(codigo, /Xenova\/distilbert-base-cased-distilled-squad/, 'worker real: modelo de QA do projeto (v2.0.0)');
    assert.match(codigo, />>pt<</, 'worker real: código de destino português fixado no prefixo Marian');

    // Dentro da árvore do projeto para que o import resolva o node_modules local.
    const arquivo = ext('tests', `.worker-real-${process.pid}.mjs`);
    fs.writeFileSync(arquivo, codigo);

    // Ponte de mensagens: no navegador o escopo global do worker já é `self`.
    globalThis.self = globalThis;
    const mensagens = [];
    self.postMessage = (m) => mensagens.push(m);
    await import(pathToFileURL(arquivo).href);
    fs.rmSync(arquivo, { force: true });
    assert.equal(typeof self.onmessage, 'function', 'worker real registrou o listener de mensagens');

    // Adaptação de ambiente (não de lógica): o worker usa `env.useBrowserCache = true`,
    // correto no navegador; fora dele a Transformers.js exige cache em disco. O objeto
    // `env` é o singleton compartilhado com o worker — inferência, pesos e código real.
    // O cache fica em tests/.cache (fora de node_modules): sobrevive a npm ci e é
    // reaproveitado pelo CI e pelo script setup/preparar_modelos_ia.mjs.
    tf.env.useBrowserCache = false;
    tf.env.cacheDir = ext('tests', '.cache');

    estado = { mensagens, version: tf.env.version };
  }
  estado.mensagens.length = 0;
  return estado;
}

/** Servidor HTTP efêmero com as imagens/áudio reais — o worker recebe URLs
 * http, exatamente como o popup real passa o `src` de uma <img> da página. */
let servidorImagem = null;
const ROTAS_FIXTURES = {
  '/football-match.jpg': { arquivo: ext('tests', 'fixtures', 'football-match.jpg'), tipo: 'image/jpeg' },
  '/texto-ocr.png': { arquivo: ext('tests', 'fixtures', 'texto-ocr.png'), tipo: 'image/png' }
};
async function urlFixture(caminho) {
  const rota = ROTAS_FIXTURES[caminho];
  if (!fs.existsSync(rota.arquivo)) throw new Error(`fixture ausente: ${rota.arquivo}`);
  if (!servidorImagem) {
    servidorImagem = http.createServer((req, res) => {
      const fix = ROTAS_FIXTURES[req.url];
      if (!fix) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': fix.tipo });
      res.end(fs.readFileSync(fix.arquivo));
    });
    await new Promise((resolver) => servidorImagem.listen(0, '127.0.0.1', resolver));
  }
  const { port } = servidorImagem.address();
  return `http://127.0.0.1:${port}${caminho}`;
}

test.after(() => {
  if (servidorImagem) servidorImagem.close();
});

// --- Testes (inferência 100% real) ---

test('Transformers.js REAL na versão exata vendada pela extensão (vendor/)', async () => {
  const { version } = await workerReal();
  assert.equal(version, VERSAO_TRANSFORMERS);
});

test('sumarização REAL: worker carrega Xenova/distilbart-cnn-12-6 e resume o texto', async () => {
  const { mensagens } = await workerReal();
  await self.onmessage({ data: { type: 'summarize', data: TEXTO_RESUMO } });

  const status = mensagens.map((m) => m.status);
  assert.ok(status.includes('loading'), 'anuncia carregamento do modelo na 1ª execução');
  assert.ok(status.includes('processing'), 'anuncia processamento');
  const sucesso = mensagens.find((m) => m.status === 'success');
  assert.ok(sucesso, 'finaliza com status success');
  assert.ok(typeof sucesso.summary === 'string' && sucesso.summary.trim().length > 0, 'resumo não vazio');
  assert.ok(sucesso.summary.length < TEXTO_RESUMO.length, 'resumo é mais curto que o original');
  assert.ok(sucesso.summary.trim().split(/\s+/).length >= 10, 'resumo substantivo (não vazio/truncado): ' + sucesso.summary.slice(0, 100));
});

test('reuso REAL: segunda sumarização não recarrega o modelo', async () => {
  const { mensagens } = await workerReal();
  await self.onmessage({ data: { type: 'summarize', data: TEXTO_RESUMO_2 } });

  assert.ok(!mensagens.some((m) => m.status === 'loading'), 'modelo já em memória: sem novo carregamento');
  const sucesso = mensagens.find((m) => m.status === 'success');
  assert.ok(sucesso && sucesso.summary.trim().length > 0, 'segunda inferência real concluída');
});

test('descrição REAL de imagem: worker carrega Xenova/vit-gpt2-image-captioning e descreve a imagem', async () => {
  const { mensagens } = await workerReal();
  const urlImagem = await urlFixture('/football-match.jpg');
  await self.onmessage({ data: { type: 'describe-image', data: urlImagem } });

  const carregamento = mensagens.find((m) => m.type === 'status');
  assert.ok(carregamento && /Carregando modelo de visão/.test(carregamento.message), 'anuncia carregamento do modelo de visão');
  const desc = mensagens.find((m) => m.type === 'image-description');
  assert.ok(desc, 'responde com type=image-description');
  assert.equal(desc.imageUrl, urlImagem, 'ecoA o endereço da imagem processada');
  const texto = (desc.description || '').trim();
  assert.ok(texto.split(/\s+/).length >= 3, 'descrição substantiva gerada pela inferência real: ' + texto);
});

test('mensagem desconhecida é ignorada pelo worker real', async () => {
  const { mensagens } = await workerReal();
  await self.onmessage({ data: { type: 'inexistente', data: 'qualquer coisa' } });
  assert.equal(mensagens.length, 0);
});

// --- Inferências reais da v1.3.0 (Áudio e Multimodal) ---

test('transcrição REAL: worker carrega Xenova/whisper-tiny e transcreve a fala do fixture', async () => {
  const { mensagens } = await workerReal();
  const audio = audioJfk16k();
  assert.ok(audio instanceof Float32Array, 'áudio convertido para Float32Array');
  assert.ok(Math.abs(audio.length / 16000 - 11) < 0.5, '11 s de fala reamostrados a 16 kHz');

  await self.onmessage({ data: { type: 'transcribe-audio', data: audio } });

  const status = mensagens.filter((m) => m.type === 'status');
  assert.ok(status.some((m) => /Carregando modelo de transcrição/.test(m.message)), 'anuncia carregamento do modelo de transcrição');
  assert.ok(status.some((m) => /Transcrevendo/.test(m.message)), 'anuncia processamento do áudio');
  const transcricao = mensagens.find((m) => m.type === 'transcription');
  assert.ok(transcricao, 'responde com type=transcription');
  const texto = String(transcricao.transcript || '').trim();
  assert.ok(texto.length > 20, 'transcrição substantiva gerada por inferência real: ' + texto.slice(0, 120));
  assert.match(texto, /Americans/i, 'palavra esperada do discurso reconhecida pelo Whisper');
});

test('reuso REAL da transcrição: segunda chamada não recarrega o modelo', async () => {
  const { mensagens } = await workerReal();
  await self.onmessage({ data: { type: 'transcribe-audio', data: audioJfk16k().subarray(0, 80000) } }); // 5 s
  assert.ok(!mensagens.some((m) => m.type === 'status' && /Carregando/.test(m.message)), 'modelo já em memória: sem novo carregamento');
  const transcricao = mensagens.find((m) => m.type === 'transcription');
  assert.ok(transcricao && String(transcricao.transcript).trim().length > 0, 'segunda inferência real concluída');
});

test('tarefa de TRADUÇÃO do Whisper REAL (v1.4.0): opcoes.tarefa=traduzir executa task:translate sem quebrar o pipeline', async () => {
  // A opção de bilinguismo das legendas atravessa o protocolo de mensagens
  // e ativa a task 'translate' do Whisper — fala em qualquer idioma →
  // texto em inglês. Inferência real (mesmo modelo, nenhuma dependência
  // nova): o caminho exato do recurso de legendas em inglês.
  const { mensagens } = await workerReal();
  await self.onmessage({
    data: {
      type: 'transcribe-audio',
      data: audioJfk16k().subarray(0, 80000), // 5 s
      opcoes: { tarefa: 'traduzir' }
    }
  });
  assert.ok(!mensagens.some((m) => m.type === 'status' && /Carregando/.test(m.message)), 'mesma instância do modelo (sem recarregar)');
  assert.equal(mensagens.some((m) => m.type === 'error'), false, 'task translate não quebra o pipeline da 2.14.0');
  const transcricao = mensagens.find((m) => m.type === 'transcription');
  assert.ok(transcricao && String(transcricao.transcript).trim().length > 0,
    'saída de legendas produzida pela inferência real: ' + String(transcricao && transcricao.transcript).slice(0, 120));
});

test('OCR REAL: worker carrega Xenova/trocr-small-printed e extrai o texto impresso da imagem', async () => {
  const { mensagens } = await workerReal();
  const urlImagem = await urlFixture('/texto-ocr.png');
  await self.onmessage({ data: { type: 'ocr-image', data: urlImagem } });

  const status = mensagens.filter((m) => m.type === 'status');
  assert.ok(status.some((m) => /Carregando modelo de OCR/.test(m.message)), 'anuncia carregamento do modelo de OCR');
  const resultado = mensagens.find((m) => m.type === 'ocr-text');
  assert.ok(resultado, 'responde com type=ocr-text');
  assert.equal(resultado.imageUrl, urlImagem, 'ecoA o endereço da imagem processada');
  const texto = String(resultado.text || '').trim();
  assert.ok(texto.length >= 4, 'texto extraído substantivo: ' + texto);
  assert.match(texto.toUpperCase(), /ACCESSIBILITY/, 'texto impresso reconhecido pela inferência real');
});

test('tradução REAL EN→PT: worker carrega Xenova/opus-mt-en-ROMANCE e produz português', async () => {
  const { mensagens } = await workerReal();
  await self.onmessage({ data: { type: 'translate-text', data: 'Digital accessibility ensures that websites can be used by everyone.' } });

  const status = mensagens.filter((m) => m.type === 'status');
  assert.ok(status.some((m) => /Carregando modelo de tradução/.test(m.message)), 'anuncia carregamento do modelo de tradução');
  const resultado = mensagens.find((m) => m.type === 'translation');
  assert.ok(resultado, 'responde com type=translation');
  const texto = String(resultado.translation || '').trim();
  assert.ok(texto.length > 10, 'tradução substantiva: ' + texto);
  assert.match(texto.toLowerCase(), /acessibilidade/, 'saída em português real (palavra-chave reconhecida)');
  assert.ok(!/^Digital accessibility/.test(texto), 'a saída não permaneceu em inglês');
});
