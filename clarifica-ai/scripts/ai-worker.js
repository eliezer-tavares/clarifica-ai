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
//
// v2.0.0 — Versão final (registry_versao 4, um modelo novo):
//   question-answering → perguntas e respostas sobre a página
//     (distilbert-base-cased-distilled-squad, ~70 MB) [v2.0.0].
//     A mensagem carrega data = { pergunta, contexto } — extrair a
//     resposta do PRÓPRIO texto da página (sem alucinação: o modelo só
//     recorta trecho existente).
//   E as tarefas summarize e describe-image aceitam `opcoes` —
//     opcoes.idioma = 'pt' → o resultado em inglês dos modelos é
//     TRADUZIDO no mesmo worker pelo opus-mt-en-ROMANCE (já fixado no
//     registry desde a v1.3.0 — cadeia modelo→modelo, ZERO modelos
//     novos para a saída em português);
//     opcoes.claro = true  → Português Claro assistido por MODELO:
//     parâmetros de geração com teto menor de tokens (frases curtas e
//     ordem direta), via parametrosDeGeracao de scripts/clarifica-puro.js
//     (mesma fonte canônica, extraída por marcadores nos testes).
//     Sem opcoes, o comportamento permanece idêntico ao da v1.0.0.

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
let respondedor = null;

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
      // v2.0.0: opcoes.claro ativa o modo Português Claro assistido por
      // modelo (teto menor de tokens — frases curtas e ordem direta).
      // Sem opcoes, os parâmetros são exatamente os da v1.0.0.
      const params = parametrosDeGeracao(opcoes.claro === true);
      const output = await summarizer(data, params);
      let resumo = output[0].summary_text;
      // v2.0.0: cadeia modelo→modelo para a saída em português — o resumo
      // em inglês é traduzido pelo opus-mt-en-ROMANCE JÁ fixado no registry
      // (v1.3.0): nenhum modelo novo. Sem opcoes.idioma, nada acontece.
      if (opcoes.idioma === 'pt') {
        self.postMessage({ status: "processing", message: "Traduzindo para português..." });
        if (!tradutor) {
          self.postMessage({ status: "loading", message: "Carregando modelo de tradução (~115MB, 1ª vez só)..." });
          tradutor = await pipeline('translation', 'Xenova/opus-mt-en-ROMANCE', {
            quantized: true,
            revision: '9d2ba69ac80c8e8453c3d9a1e2323a0e7b8ca3cd'
          });
        }
        const traduzido = await tradutor(CODIGO_ALVO_PT + resumo);
        resumo = traduzido[0].translation_text;
      }
      self.postMessage({ status: "success", summary: resumo });
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
      let descricao = output[0].generated_text;
      // v2.0.0: mesmo contrato do resumo — descrição em inglês traduzida
      // no próprio worker pela cadeia modelo→modelo (opus-mt, zero modelos
      // novos). Sem opcoes.idioma, comportamento idêntico ao da v1.0.0.
      if (opcoes.idioma === 'pt') {
        self.postMessage({ type: 'status', message: "Traduzindo para português..." });
        if (!tradutor) {
          self.postMessage({ type: 'status', message: "Carregando modelo de tradução (~115MB, 1ª vez só)..." });
          tradutor = await pipeline('translation', 'Xenova/opus-mt-en-ROMANCE', {
            quantized: true,
            revision: '9d2ba69ac80c8e8453c3d9a1e2323a0e7b8ca3cd'
          });
        }
        const traduzido = await tradutor(CODIGO_ALVO_PT + descricao);
        descricao = traduzido[0].translation_text;
      }
      self.postMessage({ type: 'image-description', description: descricao, imageUrl: data });
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

  if (type === 'question-answering') {
    // v2.0.0 — Assistente de perguntas e respostas sobre a página: modelo
    // de QA EXTRATIVO (distilbert-base-cased-distilled-squad, ~70 MB). O
    // modelo só recorta um trecho do CONTEXTO enviado pela página — sem
    // geração livre, sem alucinação: a resposta existe no texto da página.
    // `data` chega como { pergunta, contexto } (contexto limitado a 4000
    // caracteres pela página — corpo de main/article/body).
    try {
      if (!respondedor) {
        self.postMessage({ type: 'status', message: "Carregando modelo de perguntas e respostas (~70MB, 1ª vez só)..." });
        respondedor = await pipeline('question-answering', 'Xenova/distilbert-base-cased-distilled-squad', {
          quantized: true,
          revision: 'bdbb0a5e9c617c3c7ea9f3cbaf2be3ad871bcd7d'
        });
      }
      self.postMessage({ type: 'status', message: "Procurando a resposta na página..." });
      const pergunta = String((data && data.pergunta) || '').trim();
      const contexto = String((data && data.contexto) || '');
      if (!pergunta || !contexto.trim()) throw new Error('qa-entrada-invalida');
      const output = await respondedor(pergunta, contexto);
      self.postMessage({ type: 'qa-answer', answer: output.answer, score: output.score });
    } catch (error) {
      self.postMessage({ type: 'error', error: "erro-qa" });
    }
  }
};

// parametrosDeGeracao vive na FONTE CANÔNICA scripts/clarifica-puro.js
// (v2.0.0). O worker roda como módulo ES no navegador, mas o bundle
// vendado é avaliado sem bundler — a cópia inline abaixo garante o
// funcionamento e a paridade com a fonte canônica é garantida por teste
// (tests/qa.test.js compara a fonte normalizada).
function parametrosDeGeracao(claro) {
  return claro === true
    ? { max_new_tokens: 90, min_new_tokens: 30, do_sample: false }
    : { max_new_tokens: 150, min_new_tokens: 50, do_sample: false };
}
