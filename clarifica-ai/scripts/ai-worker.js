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
//
// Tarefas (v1.3.0 — Áudio e Multimodal, registry_versao 3):
//   summarize        → sumarização (distilbart-cnn-12-6)      [desde v1.0.0]
//   describe-image   → descrição de imagens (vit-gpt2)         [desde v1.0.0]
//   transcribe-audio → transcrição (whisper-tiny, 16 kHz mono) [v1.3.0]
//   ocr-image        → OCR de texto impresso (trocr-small)     [v1.3.0]
//   translate-text   → tradução EN→PT (opus-mt-en-ROMANCE)     [v1.3.0]
// A leitura em voz alta (TTS) NÃO passa por este worker: usa a Web
// Speech API do próprio navegador (vozes do sistema, sem modelo e sem
// download) — decisão documentada no registry.
//
// v1.4.0 — Legendas ao Vivo e Bilinguismo: a tarefa transcribe-audio
// aceita `opcoes` na mensagem (nenhum modelo novo — o whisper-tiny do
// registry v3 já é multilíngue):
//   opcoes.tarefa = 'traduzir' → task: 'translate' do pipeline Whisper:
//     fala em qualquer idioma detectado vira TRANSCRIÇÃO EM INGLÊS
//     (legendas em inglês para falantes de inglês);
//   opcoes.idioma → hint opcional de idioma de origem (código Whisper,
//     ex.: 'pt'). Sem opcoes (transcrição pontual da v1.3.0), o
//     comportamento permanece exatamente o mesmo — detecção automática.

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
let transcritor = null;
let leitorDeTexto = null;
let tradutor = null;

// O modelo en-ROMANCE traduz para qualquer língua românica; o produto
// Clarifica.ai atende público pt-BR, então o código de destino é fixado
// como português no prefixo de origem (convenção dos modelos Marian
// multilíngues: ">>pt<< " força o alvo português). Documentado no
// VERSOES_MODELOS.md e exercitado por inferência real nos testes.
const CODIGO_ALVO_PT = '>>pt<< ';

self.onmessage = async (event) => {
  const { type, data, opcoes = {} } = event.data;

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

  if (type === 'transcribe-audio') {
    // `data` chega como Float32Array (PCM mono 16 kHz) já reamostrado na
    // página — ver reamostrarPara16k em scripts/clarifica-puro.js (fonte
    // canônica v1.4.0; o popup mantém a cópia inline que sempre usou).
    // Whisper aceita também URLs, mas aqui o áudio já foi decodificado/
    // reamostrado pela página (vídeo e podcast compartilham o caminho).
    try {
      if (!transcritor) {
        self.postMessage({ type: 'status', message: "Carregando modelo de transcrição (~45MB, 1ª vez só)..." });
        transcritor = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
          quantized: true,
          revision: '5332fcc35e32a33b86612b9a57a89be7906102b1'
        });
      }
      self.postMessage({ type: 'status', message: "Transcrevendo áudio..." });
      // chunk_length_s/stride_length_s viabilizam áudios longos (podcasts)
      // em janelas de 30 s com sobreposição — o idioma é detectado pelo
      // próprio Whisper (sem opção de idioma fixada).
      // v1.4.0: opcoes.tarefa = 'traduzir' ativa task: 'translate' do
      // Whisper (fala em qualquer idioma → texto em inglês); opcoes.idioma
      // é um hint opcional do idioma de origem. Sem opcoes, comportamento
      // idêntico ao da v1.3.0.
      const configJanelas = { chunk_length_s: 30, stride_length_s: 5 };
      if (opcoes.tarefa === 'traduzir') configJanelas.task = 'translate';
      if (typeof opcoes.idioma === 'string' && opcoes.idioma) configJanelas.language = opcoes.idioma;
      const output = await transcritor(data, configJanelas);
      self.postMessage({ type: 'transcription', transcript: output.text });
    } catch (error) {
      self.postMessage({ type: 'error', error: "erro-audio" });
    }
  }

  if (type === 'ocr-image') {
    // `data` é o src de uma <img> — mesmo contrato do describe-image.
    // trocr-small-printed lê TEXTO IMPRESSO; o resultado é aplicado como
    // alt/aria-label pela página (WCAG 1.4.5 — imagens de texto).
    try {
      if (!leitorDeTexto) {
        self.postMessage({ type: 'status', message: "Carregando modelo de OCR (~60MB, 1ª vez só)..." });
        leitorDeTexto = await pipeline('image-to-text', 'Xenova/trocr-small-printed', {
          quantized: true,
          revision: '56c1626ea0b4aab378f3228235be2e824d4256bd'
        });
      }
      const output = await leitorDeTexto(data);
      self.postMessage({ type: 'ocr-text', text: output[0].generated_text, imageUrl: data });
    } catch (error) {
      self.postMessage({ type: 'error', error: "erro-ocr" });
    }
  }

  if (type === 'translate-text') {
    try {
      if (!tradutor) {
        self.postMessage({ type: 'status', message: "Carregando modelo de tradução (~115MB, 1ª vez só)..." });
        tradutor = await pipeline('translation', 'Xenova/opus-mt-en-ROMANCE', {
          quantized: true,
          revision: '9d2ba69ac80c8e8453c3d9a1e2323a0e7b8ca3cd'
        });
      }
      self.postMessage({ type: 'status', message: "Traduzindo..." });
      const output = await tradutor(CODIGO_ALVO_PT + data);
      self.postMessage({ type: 'translation', translation: output[0].translation_text });
    } catch (error) {
      self.postMessage({ type: 'error', error: "erro-traducao" });
    }
  }
};
