// Pré-baixa os modelos REAIS usados pelo Clarifica.ai (mesmos do ai-worker.js,
// MESMAS REVISÕES fixadas em VERSOES_MODELOS.md), para que a suíte de testes
// rode com inferência real sem download durante o teste.
// O cache fica em tests/.cache (fora de node_modules) para sobreviver a
// npm ci e ser reaproveitado pelo CI.
// Uso: npm run preparar:modelos  (a partir da pasta tests/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.cacheDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.cache');

console.log('Baixando Xenova/distilbart-cnn-12-6 (sumarização, quantizado, revisão a6c58857)...');
let t = Date.now();
const summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-12-6', {
  quantized: true,
  revision: 'a6c58857723a89bde6162f7cd64a80fd644711f6'
});
console.log(`✔ Sumarizador pronto em ${((Date.now() - t) / 1000).toFixed(0)}s`);

console.log('Baixando Xenova/vit-gpt2-image-captioning (visão, quantizado, revisão 215b4edc)...');
t = Date.now();
const captioner = await pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning', {
  quantized: true,
  revision: '215b4edcb7ec1fad5905a18a03f7b2007f6fabd0'
});
console.log(`✔ Descritor de imagens pronto em ${((Date.now() - t) / 1000).toFixed(0)}s`);

console.log('Baixando Xenova/whisper-tiny (transcrição, quantizado, revisão 5332fcc3)...');
t = Date.now();
const transcritor = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
  quantized: true,
  revision: '5332fcc35e32a33b86612b9a57a89be7906102b1'
});
console.log(`✔ Transcritor pronto em ${((Date.now() - t) / 1000).toFixed(0)}s`);

console.log('Baixando Xenova/trocr-small-printed (OCR, quantizado, revisão 56c1626e)...');
t = Date.now();
const ocr = await pipeline('image-to-text', 'Xenova/trocr-small-printed', {
  quantized: true,
  revision: '56c1626ea0b4aab378f3228235be2e824d4256bd'
});
console.log(`✔ Leitor de texto impresso pronto em ${((Date.now() - t) / 1000).toFixed(0)}s`);

console.log('Baixando Xenova/opus-mt-en-ROMANCE (tradução EN→PT, quantizado, revisão 9d2ba69a)...');
t = Date.now();
const tradutor = await pipeline('translation', 'Xenova/opus-mt-en-ROMANCE', {
  quantized: true,
  revision: '9d2ba69ac80c8e8453c3d9a1e2323a0e7b8ca3cd'
});
console.log(`✔ Tradutor pronto em ${((Date.now() - t) / 1000).toFixed(0)}s`);

// Fixture real de imagem para o teste de descrição (mesma dos exemplos da transformers.js)
const FIXTURE = new URL('../fixtures/football-match.jpg', import.meta.url);
if (!fs.existsSync(FIXTURE)) {
  console.log('Baixando imagem de teste (football-match.jpg)...');
  const r = await fetch('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/football-match.jpg');
  if (!r.ok) throw new Error(`Falha ao baixar imagem de teste: ${r.status}`);
  fs.mkdirSync(new URL('../fixtures/', import.meta.url), { recursive: true });
  fs.writeFileSync(FIXTURE, Buffer.from(await r.arrayBuffer()));
  console.log('✔ Imagem de teste salva em tests/fixtures/football-match.jpg');
} else {
  console.log('✔ Imagem de teste já presente em tests/fixtures/');
}

// Fixture real de fala para o teste de transcrição (v1.3.0) — o discurso do
// JFK usado nos exemplos oficiais da Transformers.js (11 s, 44,1 kHz estéreo).
const AUDIO_FIXTURE = new URL('../fixtures/jfk.wav', import.meta.url);
if (!fs.existsSync(AUDIO_FIXTURE)) {
  console.log('Baixando áudio de teste (jfk.wav)...');
  const r = await fetch('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav');
  if (!r.ok) throw new Error(`Falha ao baixar áudio de teste: ${r.status}`);
  fs.mkdirSync(new URL('../fixtures/', import.meta.url), { recursive: true });
  fs.writeFileSync(AUDIO_FIXTURE, Buffer.from(await r.arrayBuffer()));
  console.log('✔ Áudio de teste salvo em tests/fixtures/jfk.wav');
} else {
  console.log('✔ Áudio de teste já presente em tests/fixtures/');
}

// Fixture de texto impresso para o teste de OCR (v1.3.0) — versionado no
// repositório (gerado com fonte livre DejaVu Sans); nunca é baixado.
const OCR_FIXTURE = new URL('../fixtures/texto-ocr.png', import.meta.url);
if (!fs.existsSync(OCR_FIXTURE)) {
  throw new Error('Fixture tests/fixtures/texto-ocr.png ausente — versionado no repositório; restaure-o do git antes de rodar a suíte.');
}
console.log('✔ Imagem de texto para OCR presente em tests/fixtures/');

// Sanidade real rápida (exercita encoder+decoder de verdade)
t = Date.now();
const amostra = 'Digital accessibility ensures that websites can be used by everyone, including people with disabilities. Screen readers, keyboard navigation and proper contrast are essential for inclusion.';
const saida = await summarizer(amostra, { max_new_tokens: 60, min_new_tokens: 20, do_sample: false });
console.log('✔ Sanidade de sumarização real:', JSON.stringify(saida[0].summary_text).slice(0, 120), `(${((Date.now() - t) / 1000).toFixed(0)}s)`);

console.log('Modelos reais em cache. Pronto para npm test.');
