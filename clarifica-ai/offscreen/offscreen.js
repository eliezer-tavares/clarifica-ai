// Documento offscreen do Clarifica.ai (v1.4.0) — Legendas ao Vivo.
//
// O único módulo totalmente novo da stack. Papel na arquitetura MV3:
//
//   service worker (background.js)
//     └─ chrome.tabCapture.getMediaStreamId()  → identificador de uso único
//     └─ garante ESTE documento offscreen (chrome.offscreen, motivo USER_MEDIA)
//     └─ entrega o identificador via chrome.runtime.sendMessage
//         └─ ESTE documento:
//             1. troca o identificador por um MediaStream real
//                (getUserMedia com chromeMediaSource 'tab' — funciona para
//                blob:/CORS, inclusive YouTube);
//             2. conecta o fluxo a um AudioContext e alimenta janelas
//                contínuas de áudio (7 s com 1 s de sobreposição — ver
//                scripts/clarifica-puro.js);
//             3. devolve o áudio da aba ao usuário reconectando o fluxo
//                ao destino do AudioContext (o documento offscreen tem
//                saída de áudio — algumas configurações silenciam a aba
//                durante a captura; este reconexão preserva quem ouve);
//             4. reamostra cada janela para PCM mono 16 kHz
//                (reamostrarPara16k do módulo puro) e envia ao worker
//                Whisper criado pelo MESMO padrão de Blob do popup;
//             5. cada transcrição parcial vira legenda: acumulada e
//                montada como WebVTT (montadorVtt do módulo puro) e
//                devolvida ao service worker, que entrega à página
//                (track <kind=captions> com Blob URL, com fallback de
//                sobreposição) e ao popup (transcrição ao vivo).
//
// Ciclo de vida: o service worker é o supervisor — cria, recria e fecha
// este documento (idempotente). O fim do fluxo de mídia (aba fechada,
// navegação, fim da captura pelo próprio Chrome) dispara a limpeza e
// notifica o service worker ('legendas-encerradas').

import {
  reamostrarPara16k,
  planoDeJanelas,
  montadorVtt,
  JANELA_PADRAO_SEGUNDOS,
  SOBREPOSICAO_PADRAO_SEGUNDOS
} from '../scripts/clarifica-puro.js';

// Tamanho do buffer do ScriptProcessorNode (múltiplo de 128 exigido pela
// API; 4096 amostras ≈ 85 ms a 48 kHz — granularidade fina sem sobrecarga).
const BLOCOS_AMOSTRAS = 4096;
// Janela mínima útil: menos de 1 s de fala produz transcrição vazia na
// prática — a janela é descartada sem gastar inferência.
const JANELA_MINIMA_16K = 16000;
// Teto de legendas acumuladas no WebVTT: contexto suficiente para o
// leitor de tela reler as últimas falas sem crescer sem limite.
const TETO_LEGENDAS = 60;

let estado = null;

chrome.runtime.onMessage.addListener((mensagem, remetente, responder) => {
  if (!mensagem || mensagem.target !== 'offscreen') return; // mensagens de outros destinos
  if (mensagem.type === 'legendas-iniciar-captura') {
    iniciarCaptura(mensagem.data || {})
      .then(() => responder({ ok: true }))
      .catch((erro) => {
        // Falha parcial (ex.: worker não criado após fluxo aberto): limpa
        // TUDO antes de responder — nunca deixa captura órfã rodando.
        pararCaptura('captura-encerrada');
        responder({ error: codigoDeErro(erro) });
      });
    return true; // resposta assíncrona
  }
  if (mensagem.type === 'legendas-parar') {
    pararCaptura('parada-pedida');
    responder({ ok: true });
    return;
  }
});

// Converte falhas de captura em códigos de erro traduzidos no popup
// (padrão da casa: códigos atravessam a fronteira, nunca texto cru).
function codigoDeErro(erro) {
  const nome = String((erro && erro.name) || erro || '');
  if (nome.includes('NotAllowedError')) return 'captura-negada';
  if (nome.includes('NotFoundError')) return 'aba-sem-midia';
  return 'falha-legendas';
}

async function iniciarCaptura(dados) {
  if (estado) pararCaptura('reiniciada');

  const identificadorFluxo = String(dados.streamId || '');
  if (!identificadorFluxo) throw new Error('captura-negada');

  // 1. Identificador de uso único → MediaStream real da aba.
  const fluxo = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: identificadorFluxo
      }
    }
  });

  const ContextoAudio = window.AudioContext || window.webkitAudioContext;
  if (typeof ContextoAudio !== 'function') {
    fluxo.getTracks().forEach((t) => t.stop());
    throw new Error('falha-legendas');
  }
  const contexto = new ContextoAudio();
  const fonte = contexto.createMediaStreamSource(fluxo);

  // 2. Devolução do áudio: a captura pode silenciar a saída da aba em
  //    algumas configurações; reconectar o fluxo ao destino preserva quem
  //    ainda quer OUVIR (comportamento a validar empiricamente no M1 —
  //    degradação graciosa se o destino recusar).
  try { fonte.connect(contexto.destination); } catch (e) { /* segue sem devolução */ }

  // 3. Coletor de amostras: ScriptProcessorNode (API estável nos contextos
  //    de extensão; AudioWorklet exige arquivo adicional sem benefício
  //    aqui). O nó precisa alcançar o destino para o callback disparar —
  //    passa por um ganho ZERO para não dobrar o áudio devolvido.
  const coletor = contexto.createScriptProcessor(BLOCOS_AMOSTRAS, 1, 1);
  const ganhoMudo = contexto.createGain();
  ganhoMudo.gain.value = 0;

  const novoEstado = {
    fluxo,
    contexto,
    fonte,
    coletor,
    ganhoMudo,
    taxa: contexto.sampleRate || 48000,
    tarefa: dados.tarefa === 'traduzir' ? 'traduzir' : 'transcrever',
    worker: null,
    urlBlob: null,
    chunks: [],
    totalAmostras: 0,
    janelasEmitidas: 0,
    janelasEmVoo: [],
    legendas: [],
    encerrado: false
  };
  estado = novoEstado;

  coletor.onaudioprocess = (evento) => {
    if (!estado || estado.encerrado) return;
    try { acumularAmostras(evento.inputBuffer.getChannelData(0)); } catch (e) { /* janela seguinte */ }
  };

  fonte.connect(coletor);
  coletor.connect(ganhoMudo);
  ganhoMudo.connect(contexto.destination);

  // Fim do fluxo (aba fechada, navegação, fim da captura pelo Chrome):
  // limpeza completa + notificação do service worker.
  const faixa = fluxo.getAudioTracks && fluxo.getAudioTracks()[0];
  if (faixa && typeof faixa.addEventListener === 'function') {
    faixa.addEventListener('ended', () => pararCaptura('captura-encerrada'), { once: true });
  }

  // 4. Worker Whisper via Blob — o mesmo padrão consagrado no popup
  //    (o código é buscado da extensão e os placeholders do vendor são
  //    resolvidos antes da criação; aqui a origem é a própria extensão).
  const resposta = await fetch(chrome.runtime.getURL('scripts/ai-worker.js'));
  if (!resposta.ok) throw new Error('falha-legendas');
  const codigo = (await resposta.text())
    .replace(/__CLARIFICA_BIBLIOTECA__/g, chrome.runtime.getURL('vendor/transformers.min.js'))
    .replace(/__CLARIFICA_VENDOR_BASE__/g, chrome.runtime.getURL('vendor/'));
  novoEstado.urlBlob = URL.createObjectURL(new Blob([codigo], { type: 'text/javascript' }));
  novoEstado.worker = new Worker(novoEstado.urlBlob, { type: 'module' });
  novoEstado.worker.onmessage = (evento) => receberTranscricao(evento.data || {});
  novoEstado.worker.onerror = () => pararCaptura('captura-encerrada');
}

// 5. Acumula amostras e emite janelas conforme o plano puro
//    (planoDeJanelas): a lista cresce quando o áudio acumulado cruza a
//    duração da próxima janela; a janela emitida é fatiada dos chunks
//    retidos (memória limitada a janela + sobreposição).
function acumularAmostras(dados) {
  estado.chunks.push({ dados: new Float32Array(dados), inicio: estado.totalAmostras });
  estado.totalAmostras += dados.length;

  const decorrido = estado.totalAmostras / estado.taxa;
  const plano = planoDeJanelas(decorrido, {
    janela: JANELA_PADRAO_SEGUNDOS,
    sobreposicao: SOBREPOSICAO_PADRAO_SEGUNDOS
  });

  while (estado && estado.janelasEmitidas < plano.length) {
    const janela = plano[estado.janelasEmitidas];
    const pcm = fatiarJanela(janela);
    estado.janelasEmitidas++;
    if (pcm.length >= JANELA_MINIMA_16K) enviarJanela(pcm, janela);
    descartarAte(janela.fim - SOBREPOSICAO_PADRAO_SEGUNDOS);
  }
}

function fatiarJanela(janela) {
  const inicioAmostra = Math.floor(janela.inicio * estado.taxa);
  const fimAmostra = Math.floor(janela.fim * estado.taxa);
  const saida = new Float32Array(Math.max(0, fimAmostra - inicioAmostra));
  let escritos = 0;
  for (const chunk of estado.chunks) {
    const fimChunk = chunk.inicio + chunk.dados.length;
    if (fimChunk <= inicioAmostra || chunk.inicio >= fimAmostra) continue;
    const de = Math.max(0, inicioAmostra - chunk.inicio);
    const ate = Math.min(chunk.dados.length, fimAmostra - chunk.inicio);
    saida.set(chunk.dados.subarray(de, ate), escritos);
    escritos += ate - de;
  }
  return saida.subarray(0, escritos);
}

function descartarAte(segundos) {
  const corte = Math.max(0, Math.floor(segundos * estado.taxa));
  estado.chunks = estado.chunks.filter((chunk) => chunk.inicio + chunk.dados.length > corte);
}

function enviarJanela(pcm, janela) {
  if (!estado || !estado.worker) return;
  const pcm16k = reamostrarPara16k(pcm, estado.taxa);
  // Fila de janelas em voo: as respostas do worker chegam na MESMA ordem
  // dos envios (fila única de inferência) — o par transcrição↔janela usa
  // a fila, não um "último estado" (duas janelas podem estar em voo).
  estado.janelasEmVoo.push({ inicio: janela.inicio, fim: janela.fim });
  estado.worker.postMessage({
    type: 'transcribe-audio',
    data: pcm16k,
    opcoes: { tarefa: estado.tarefa }
  });
}

// 6. Transcrição parcial → legenda: acumulada, montada como WebVTT pelo
//    módulo puro e devolvida ao service worker (que entrega à página e
//    ao popup). Texto vazio (trecho sem fala) não vira legenda.
function receberTranscricao(mensagem) {
  if (!estado) return;
  if (mensagem.type === 'error') { pararCaptura('captura-encerrada'); return; }
  if (mensagem.type !== 'transcription') return;

  const janela = estado.janelasEmVoo.shift();
  const texto = String(mensagem.transcript || '').trim();
  if (!janela || !texto) return;

  estado.legendas.push({ inicio: janela.inicio, fim: janela.fim, texto });
  if (estado.legendas.length > TETO_LEGENDAS) {
    estado.legendas.splice(0, estado.legendas.length - TETO_LEGENDAS);
  }

  try {
    chrome.runtime.sendMessage({
      target: 'background',
      type: 'legenda-pronta',
      texto,
      vtt: montadorVtt(estado.legendas)
    }).catch(() => { /* service worker dormindo; a próxima janela retenta */ });
  } catch (e) { /* runtime indisponível: encerra com limpeza */ }
}

// 7. Limpeza completa e idempotente — chamada pelo toggle do popup, pelo
//    Ctrl+Shift+X (via service worker), pelo fim do fluxo de mídia e por
//    erro do worker. Libera TODOS os recursos (faixas, nós, AudioContext,
//    worker, Blob) e notifica o service worker para que ele feche este
//    documento e desmonte o host de legendas da página.
function pararCaptura(motivo) {
  const anterior = estado;
  estado = null;
  if (!anterior) return;

  liberarRecursos(anterior);

  try {
    chrome.runtime.sendMessage({
      target: 'background',
      type: 'legendas-encerradas',
      motivo: motivo === 'captura-encerrada' ? 'captura-encerrada' : 'parada-pedida'
    }).catch(() => {});
  } catch (e) { /* runtime indisponível */ }
}

// Liberação dos recursos de um estado já desanexado (ordem fixa: faixas de
// mídia primeiro — interrompe a captura de verdade —, depois nós, contexto
// de áudio, worker e Blob; cada passo tolera o recurso já fechado).
function liberarRecursos(antigo) {
  try { antigo.fluxo && antigo.fluxo.getTracks().forEach((t) => t.stop()); } catch (e) {}
  try { antigo.coletor && antigo.coletor.disconnect(); } catch (e) {}
  try { antigo.ganhoMudo && antigo.ganhoMudo.disconnect(); } catch (e) {}
  try { antigo.fonte && antigo.fonte.disconnect(); } catch (e) {}
  try { antigo.contexto && antigo.contexto.close(); } catch (e) {}
  try { antigo.worker && antigo.worker.terminate(); } catch (e) {}
  try { antigo.urlBlob && URL.revokeObjectURL(antigo.urlBlob); } catch (e) {}
}
