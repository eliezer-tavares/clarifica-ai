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

// Sanidade real rápida (exercita encoder+decoder de verdade)
t = Date.now();
const amostra = 'Digital accessibility ensures that websites can be used by everyone, including people with disabilities. Screen readers, keyboard navigation and proper contrast are essential for inclusion.';
const saida = await summarizer(amostra, { max_new_tokens: 60, min_new_tokens: 20, do_sample: false });
console.log('✔ Sanidade de sumarização real:', JSON.stringify(saida[0].summary_text).slice(0, 120), `(${((Date.now() - t) / 1000).toFixed(0)}s)`);

console.log('Modelos reais em cache. Pronto para npm test.');
