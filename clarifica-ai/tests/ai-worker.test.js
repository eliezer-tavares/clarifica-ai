// Suíte REAL do ai-worker.js — sem simulacros de IA.
//
// O código de scripts/ai-worker.js é executado de verdade em Node com a
// Transformers.js oficial (@xenova/transformers 2.14.0 — a mesma versão que a
// extensão carrega via CDN) e os modelos quantizados oficiais do projeto:
//   - Xenova/distilbart-cnn-12-6        (sumarização, ~300 MB)
//   - Xenova/vit-gpt2-image-captioning  (descrição de imagens, ~250 MB)
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

/** Servidor HTTP efêmero com a imagem real — o worker recebe uma URL http,
 * exatamente como o popup real passa o `src` de uma <img> da página. */
let servidorImagem = null;
async function urlImagemReal() {
  if (!fs.existsSync(IMAGEM_FIXTURE)) {
    const r = await fetch(IMAGEM_URL);
    if (!r.ok) throw new Error(`Falha ao baixar imagem de teste: ${r.status}`);
    fs.mkdirSync(path.dirname(IMAGEM_FIXTURE), { recursive: true });
    fs.writeFileSync(IMAGEM_FIXTURE, Buffer.from(await r.arrayBuffer()));
  }
  if (!servidorImagem) {
    servidorImagem = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(fs.readFileSync(IMAGEM_FIXTURE));
    });
    await new Promise((resolver) => servidorImagem.listen(0, '127.0.0.1', resolver));
  }
  const { port } = servidorImagem.address();
  return `http://127.0.0.1:${port}/football-match.jpg`;
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
  const urlImagem = await urlImagemReal();
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
