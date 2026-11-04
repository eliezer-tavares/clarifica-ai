// Cérebro de IA do Clarifica.ai. Roda isolado em Web Worker para não
// travar a thread principal do navegador durante a inferência.
//
// Versionamento: biblioteca e modelos são FIXADOS (sem branch flutuante) —
// a fonte de verdade das versões é o registry em VERSOES_MODELOS.md, na
// raiz, auditado por tests/versoes-modelos.test.js.

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0';

env.allowLocalModels = false;
// Cache do navegador só existe em contextos seguros (https / localhost);
// em páginas http o valor true faria a inferência falhar — degrada para
// cache em memória (modelo re-carregado por página) em vez de quebrar.
env.useBrowserCache = typeof caches !== 'undefined';

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
      self.postMessage({ status: "error", error: "Erro ao processar texto." });
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
      self.postMessage({ type: 'error', error: "Falha ao descrever imagem." });
    }
  }
};
