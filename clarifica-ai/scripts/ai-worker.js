// Cérebro de IA do Clarifica.ai. Roda isolado em Web Worker para não
// travar a thread principal do navegador durante a inferência.
//
// Versionamento (ver VERSOES_MODELOS.md, auditado por
// tests/versoes-modelos.test.js): biblioteca e modelos são FIXADOS, sem
// branch flutuante. Desde a v1.1.0 a biblioteca Transformers.js NÃO vem
// mais de CDN: o bundle oficial da versão fixada é vendado em
// vendor/transformers.min.js (com os binários WASM do onnxruntime em
// vendor/), e o import abaixo recebe uma URL injetada pelo popup antes da
// criação do Worker via Blob:
//
//   '__CLARIFICA_BIBLIOTECA__'  →  chrome.runtime.getURL('vendor/transformers.min.js')
//   '__CLARIFICA_VENDOR_BASE__' →  chrome.runtime.getURL('vendor/')
//
// Em Node (suíte de testes, ai-worker.test.js) o primeiro placeholder é
// trocado pelo pacote npm @xenova/transformers na MESMA versão fixada, e o
// segundo permanece intacto (em Node a inferência usa o ONNX Runtime
// nativo, sem WASM). O código nunca roda com os placeholders originais.

import { pipeline, env } from '__CLARIFICA_BIBLIOTECA__';

env.allowLocalModels = false;
// Cache do navegador só existe em contextos seguros (https / localhost);
// em páginas http o valor true faria a inferência falhar — degrada para
// cache em memória (modelo re-carregado por página) em vez de quebrar.
env.useBrowserCache = typeof caches !== 'undefined';

// Binários WASM do onnxruntime servidos pela própria extensão (sem CDN).
const baseVendor = '__CLARIFICA_VENDOR_BASE__';
if (!baseVendor.startsWith('__')) {
  env.backends.onnx.wasm.wasmPaths = baseVendor;
}

let summarizer = null;
let imageCaptioner = null;

self.onmessage = async (event) => {
  const { type, data } = event.data;

  if (type === 'summarize') {
    try {
      if (!summarizer) {
        self.postMessage({ status: "loading", message: "Carregando modelo de resumo (~300MB, 1ª vez só)..." });
        summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-12-6', {
          quantized: true,
          revision: 'a6c58857723a89bde6162f7cd64a80fd644711f6'
        });
      }
      self.postMessage({ status: "processing", message: "Analisando texto..." });
      const output = await summarizer(data, { max_new_tokens: 150, min_new_tokens: 50, do_sample: false });
      self.postMessage({ status: "success", summary: output[0].summary_text });
    } catch (error) {
      // Códigos de erro (não texto) para que o popup traduza no idioma da
      // interface — o Worker roda em página injetada, sem chrome.i18n.
      self.postMessage({ status: "error", error: "erro-resumo" });
    }
  }

  if (type === 'describe-image') {
    try {
      if (!imageCaptioner) {
        self.postMessage({ type: 'status', message: "Carregando modelo de visão (~250MB, 1ª vez só)..." });
        imageCaptioner = await pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning', {
          quantized: true,
          revision: '215b4edcb7ec1fad5905a18a03f7b2007f6fabd0'
        });
      }
      const output = await imageCaptioner(data);
      self.postMessage({ type: 'image-description', description: output[0].generated_text, imageUrl: data });
    } catch (error) {
      self.postMessage({ type: 'error', error: "erro-imagem" });
    }
  }
};
