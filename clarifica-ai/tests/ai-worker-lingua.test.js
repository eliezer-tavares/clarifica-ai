// Suíte: inferências REAIS da v2.0.0 (Versão final) — arquivo próprio.
//
// Separado do ai-worker.test.js por decisão de engenharia de MEMÓRIA: o
// worker de IA mantém os modelos RESIDENTES por desenho (testes de reuso),
// e a v2.0.0 soma o 6º modelo (QA). Com a suíte da v2.0.0 em um processo
// Node próprio, o pico de memória de cada execução de `npm test` fica
// distribuído — em máquinas modestas (4 GB) a bateria completa roda com
// `npm test -- --test-concurrency=1`, como já documentado no README.
//
// O código de scripts/ai-worker.js é executado de verdade em Node com a
// Transformers.js oficial (@xenova/transformers 2.14.0) e os pesos
// quantizados oficiais das revisões fixadas:
//   - Xenova/distilbert-base-cased-distilled-squad (QA extrativo ~70 MB) [v2.0.0]
//   - Xenova/opus-mt-en-ROMANCE (cadeia modelo→modelo para PT, ~115 MB)  [v1.3.0]
//   - Xenova/distilbart-cnn-12-6 (resumo claro, ~300 MB)                 [v1.0.0]
//   - Xenova/vit-gpt2-image-captioning (descrição PT, ~250 MB)           [v1.0.0]

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { readExt, ext } = require('./helpers/env');

const CODIGO_WORKER = readExt('scripts/ai-worker.js');
const TEXTO_RESUMO = `Digital accessibility is the practice of building websites and applications that can be used by everyone, including people with disabilities. It covers a wide range of conditions: visual impairments such as blindness and low vision, hearing impairments, motor limitations and cognitive differences. On the web, accessibility is materialized through concrete technical practices: semantic HTML that screen readers can interpret, alternative text on images, sufficient contrast between text and background, keyboard navigation for people who cannot use a mouse and captions for videos. Standards such as the WCAG, published by the W3C, define testable success criteria that guide these practices. Far from being an optional extra, accessibility is a matter of human rights and, in many countries, a legal requirement. It also benefits everyone else: captions help people in noisy environments, good contrast helps anyone under sunlight and clear navigation reduces cognitive load for all users. Tools that apply artificial intelligence locally, such as automatic summarization and image description, expand access to information while keeping the user's data on their own device.`;

const TEXTO_RESUMO_2 = `Edge artificial intelligence moves inference from remote data centers to the user's own device. Instead of sending text, images or audio to a server, the model runs next to the application, which reduces latency, works without an internet connection after the initial download and keeps personal data under the control of the user. Advances in model quantization, which shrink neural network weights from 32-bit floats to 8-bit integers, make it possible to run capable language and vision models on ordinary laptops and phones.`;

// --- Carregamento real do worker (uma única vez; inferência real depois) ---

let estado = null; // { mensagens }

async function workerReal() {
  if (!estado) {
    const tf = await import('@xenova/transformers');
    const codigo = CODIGO_WORKER.replace(
      /import\s*\{[^}]+\}\s*from\s*'__CLARIFICA_BIBLIOTECA__';/,
      `import { pipeline, env } from '@xenova/transformers';`
    );
    assert.notEqual(codigo, CODIGO_WORKER, 'placeholder da biblioteca localizado no ai-worker.js');
    assert.match(codigo, /Xenova\/distilbert-base-cased-distilled-squad/, 'worker real: modelo de QA do projeto (v2.0.0)');

    const arquivo = ext('tests', `.worker-lingua-${process.pid}.mjs`);
    fs.writeFileSync(arquivo, codigo);
    globalThis.self = globalThis;
    const mensagens = [];
    self.postMessage = (m) => mensagens.push(m);
    await import(pathToFileURL(arquivo).href);
    fs.rmSync(arquivo, { force: true });
    assert.equal(typeof self.onmessage, 'function', 'worker real registrou o listener de mensagens');

    tf.env.useBrowserCache = false;
    tf.env.cacheDir = ext('tests', '.cache');
    estado = { mensagens };
  }
  estado.mensagens.length = 0;
  return estado;
}

/** Servidor HTTP efêmero com as imagens reais (mesmo padrão do ai-worker.test.js). */
let servidorImagem = null;
const ROTAS_FIXTURES = {
  '/football-match.jpg': { arquivo: ext('tests', 'fixtures', 'football-match.jpg'), tipo: 'image/jpeg' }
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

// --- Inferências reais da v2.0.0 (Versão final) ---

test('QA REAL (v2.0.0): worker carrega distilbert-squad e EXTRAÍ a resposta do contexto', async () => {
  // A resposta é um TRECHO do texto enviado (modelo extrativo — sem geração
  // livre): o caminho exato do assistente de perguntas da v2.0.0.
  const { mensagens } = await workerReal();
  await self.onmessage({
    data: {
      type: 'question-answering',
      data: { pergunta: 'What moves inference from data centers to the user device?', contexto: TEXTO_RESUMO_2 }
    }
  });
  const status = mensagens.filter((m) => m.type === 'status');
  assert.ok(status.some((m) => /Carregando modelo de perguntas e respostas/.test(m.message)), 'anuncia carregamento do modelo de QA');
  assert.ok(status.some((m) => /Procurando a resposta/.test(m.message)), 'anuncia busca da resposta');
  const resposta = mensagens.find((m) => m.type === 'qa-answer');
  assert.ok(resposta, 'responde com type=qa-answer');
  const texto = String(resposta.answer || '').trim();
  assert.ok(texto.length > 3, 'resposta substantiva extraída por inferência real: ' + texto);
  assert.ok(typeof resposta.score === 'number' && resposta.score > 0, 'score de confiança presente');
  // Extratividade: a resposta DEVE existir no contexto enviado
  assert.ok(TEXTO_RESUMO_2.includes(texto), 'a resposta é um trecho do próprio contexto (sem alucinação)');
});

test('QA REAL: entrada inválida (sem pergunta) responde com código erro-qa, sem lançar', async () => {
  const { mensagens } = await workerReal();
  await self.onmessage({ data: { type: 'question-answering', data: { pergunta: '', contexto: 'qualquer coisa' } } });
  const erro = mensagens.find((m) => m.type === 'error');
  assert.ok(erro, 'responde com type=error');
  assert.equal(erro.error, 'erro-qa', 'código de erro do QA');
});

test('resumo em PORTUGUÊS REAL (v2.0.0): cadeia modelo→modelo traduz o resumo no mesmo worker', async () => {
  // A opção de idioma cruza o protocolo: resumo gerado em inglês pelo
  // distilbart e traduzido pelo opus-mt-en-ROMANCE (já fixado) — ZERO
  // modelos novos para a saída em português.
  const { mensagens } = await workerReal();
  await self.onmessage({
    data: { type: 'summarize', data: TEXTO_RESUMO, opcoes: { idioma: 'pt' } }
  });
  const status = mensagens.filter((m) => m.status);
  assert.ok(status.some((m) => /Traduzindo para português/.test(m.message)), 'anuncia a tradução da cadeia modelo→modelo');
  const sucesso = mensagens.find((m) => m.status === 'success');
  assert.ok(sucesso, 'finaliza com status success');
  const texto = String(sucesso.summary || '').trim();
  assert.ok(texto.length > 30, 'resumo substantivo em português: ' + texto.slice(0, 160));
  assert.match(texto.toLowerCase(), /(de|da|do|que|com|para)\s/, 'estrutura de português real presente');
  assert.ok(!/^Digital accessibility/i.test(texto), 'a saída não permaneceu em inglês');
});

test('resumo CLARO REAL (v2.0.0): opcoes.claro executa geração com parâmetros do modo claro', async () => {
  const { mensagens } = await workerReal();
  await self.onmessage({
    data: { type: 'summarize', data: TEXTO_RESUMO_2, opcoes: { claro: true } }
  });
  assert.equal(mensagens.some((m) => m.status === 'error'), false, 'geração clara não quebra o pipeline');
  const sucesso = mensagens.find((m) => m.status === 'success');
  assert.ok(sucesso && String(sucesso.summary).trim().length > 20, 'resumo claro produzido por inferência real: ' + String(sucesso && sucesso.summary).slice(0, 140));
});

test('descrição em PORTUGUÊS REAL (v2.0.0): vit-gpt2 → opus-mt no mesmo worker', async () => {
  const { mensagens } = await workerReal();
  const urlImagem = await urlFixture('/football-match.jpg');
  await self.onmessage({
    data: { type: 'describe-image', data: urlImagem, opcoes: { idioma: 'pt' } }
  });
  const status = mensagens.filter((m) => m.type === 'status');
  assert.ok(status.some((m) => /Traduzindo para português/.test(m.message)), 'anuncia a tradução da descrição');
  const desc = mensagens.find((m) => m.type === 'image-description');
  assert.ok(desc, 'responde com type=image-description');
  const texto = String(desc.description || '').trim();
  assert.ok(texto.length > 10, 'descrição substantiva em português: ' + texto);
  assert.match(texto.toLowerCase(), /(grupo|homens|pessoas|jogando|futebol|jogo|campo)/, 'vocabulário em português reconhecido pela inferência real');
  assert.ok(!/^a group/i.test(texto), 'a saída não permaneceu em inglês');
});
