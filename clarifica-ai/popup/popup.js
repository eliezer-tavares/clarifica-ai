// Controlador do popup: orquestra a comunicação com a página ativa,
// aplica os filtros de daltonismo e exibe os resultados da IA.
//
// Nota de engenharia (encontrada por teste E2E em navegador real): não é
// possível construir `new Worker('chrome-extension://...')` a partir de uma
// página web — o Chrome bloqueia com SecurityError mesmo com o recurso em
// web_accessible_resources. O worker de IA é então criado a partir de um
// Blob com o código buscado da extensão, como módulo (o ai-worker.js usa
// `import` do CDN, sintaxe de módulo ES).
// Além disso, quando a função injetada rejeita, o chrome.scripting
// devolve result=null (não propaga a rejeição) — por isso TODO resultado
// é validado antes de exibir sucesso ao usuário.

document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const resultArea = document.getElementById('result-area');
  const aiOutput = document.getElementById('ai-output');

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mode = btn.dataset.mode;
      statusEl.textContent = "Processando...";

      if (mode === 'leitura') {
        const r = await enviarParaContent('apply-leitura-essencial');
        statusEl.textContent = (r && r.success) ? "Modo Leitura Essencial ativado!"
          : (r && r.error) ? r.error : "Erro ao injetar script. Recarregue a página.";
      }
      else if (mode === 'resumo') {
        const resultado = await enviarParaContent('summarize');
        if (resultado?.error) statusEl.textContent = resultado.error;
        else if (resultado?.summary) {
          statusEl.textContent = "Concluído!";
          aiOutput.textContent = resultado.summary;
          resultArea.classList.remove('hidden');
        }
        else statusEl.textContent = "Não foi possível concluir o resumo.";
      }
      else if (mode === 'imagens') {
        const resultado = await enviarParaContent('describe-images');
        if (resultado?.error) statusEl.textContent = resultado.error;
        else statusEl.textContent = resultado?.message || "Não foi possível iniciar a descrição de imagens.";
      }
      else if (['protanopia', 'deuteranopia', 'tritanopia'].includes(mode)) {
        const r = await enviarParaContent(`daltonismo-${mode}`);
        statusEl.textContent = (r && r.success) ? `Filtro de daltonismo ativado.`
          : (r && r.error) ? r.error : "Erro ao injetar script. Recarregue a página.";
      }
    });
  });

  document.getElementById('close-result').addEventListener('click', () => {
    resultArea.classList.add('hidden');
    statusEl.textContent = "Pronto.";
  });

  async function enviarParaContent(acao) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      const response = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: manipularPagina,
        args: [acao]
      });
      return response[0].result;
    } catch (e) {
      return { error: "Erro ao injetar script. Recarregue a página." };
    }
  }

  async function manipularPagina(acao) {
    // Cria o worker de IA a partir de um Blob com o código buscado da
    // extensão (web_accessible_resources): a via direta
    // new Worker('chrome-extension://...') é bloqueada pelo Chrome com
    // SecurityError quando a origem é uma página web. É criado como
    // módulo porque o ai-worker.js usa `import` do CDN (sintaxe ESM).
    //
    // IMPORTANTE: o Chrome serializa apenas o CORPO desta função ao
    // injetá-la na página — toda dependência deve viver aqui dentro.
    // Além disso, quando a função injetada rejeita, o chrome.scripting
    // devolve result=null (não propaga a rejeição) — por isso nenhum
    // caminho lança exceção: sempre resolve com sucesso ou { error }.
    async function criarWorkerIA() {
      const resposta = await fetch(chrome.runtime.getURL('scripts/ai-worker.js'));
      if (!resposta.ok) throw new Error(`Falha ao buscar o worker: ${resposta.status}`);
      const codigo = await resposta.text();
      const urlBlob = URL.createObjectURL(new Blob([codigo], { type: 'text/javascript' }));
      const worker = new Worker(urlBlob, { type: 'module' });
      return { worker, urlBlob };
    }

    if (acao === 'apply-leitura-essencial') {
      document.querySelectorAll('nav, footer, aside, .ads').forEach(el => {
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('inert', '');
      });
      const main = document.querySelector('main, article, #content') || document.body;
      main.setAttribute('role', 'main');
      main.setAttribute('tabindex', '-1'); // necessário para focus() funcionar em elementos não interativos
      main.focus();
      return { success: true };
    }

    if (acao.startsWith('daltonismo-')) {
      const tipo = acao.replace('daltonismo-', '');
      document.documentElement.style.filter = ''; // Limpa anterior

      const filtros = {
        'protanopia': 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'p\'><feColorMatrix type=\'matrix\' values=\'0.567, 0.433, 0, 0, 0 0.558, 0.442, 0, 0, 0 0, 0.242, 0.758, 0, 0 0, 0, 0, 1, 0\'/></filter></svg>#p")',
        'deuteranopia': 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'d\'><feColorMatrix type=\'matrix\' values=\'0.625, 0.375, 0, 0, 0 0.7, 0.3, 0, 0, 0 0, 0.3, 0.7, 0, 0 0, 0, 0, 1, 0\'/></filter></svg>#d")',
        'tritanopia': 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'t\'><feColorMatrix type=\'matrix\' values=\'0.95, 0.05, 0, 0, 0 0, 0.433, 0.567, 0, 0 0, 0.475, 0.525, 0, 0 0, 0, 0, 1, 0\'/></filter></svg>#t")'
      };

      document.documentElement.style.filter = filtros[tipo];

      const nomes = { 'protanopia': 'Protanopia', 'deuteranopia': 'Deuteranopia', 'tritanopia': 'Tritanopia' };
      const anuncio = document.createElement('div');
      anuncio.setAttribute('role', 'status');
      anuncio.setAttribute('aria-live', 'assertive');
      anuncio.textContent = `Filtro de daltonismo ${nomes[tipo]} ativado.`;
      document.body.appendChild(anuncio);
      setTimeout(() => anuncio.remove(), 3000);

      return { success: true };
    }

    if (acao === 'summarize') {
      const texto = (document.querySelector('main, article, #content') || document.body).innerText;
      if (texto.length < 200) return { error: "Texto muito curto." };

      try {
        const { worker, urlBlob } = await criarWorkerIA();
        const encerrar = () => { worker.terminate(); URL.revokeObjectURL(urlBlob); };
        return await new Promise((resolve) => {
          worker.postMessage({ type: 'summarize', data: texto.substring(0, 3000) });
          // O worker emite mensagens de progresso ("loading"/"processing") antes
          // do resultado final: só encerra na mensagem de success (ou erro),
          // nunca no primeiro sinal de vida.
          worker.onmessage = (e) => {
            if (e.data.status === 'success') {
              encerrar();
              resolve(e.data);
            } else if (e.data.status === 'error') {
              encerrar();
              resolve({ error: e.data.error || "Erro ao processar texto." });
            }
          };
          worker.onerror = () => { encerrar(); resolve({ error: "Falha na IA." }); };
        });
      } catch (e) {
        return { error: "Falha ao iniciar a IA. Recarregue a página e tente novamente." };
      }
    }

    if (acao === 'describe-images') {
      const imagens = Array.from(document.querySelectorAll('img')).filter(img => {
        const alt = img.getAttribute('alt');
        return !alt || alt.trim() === '' || alt === 'image';
      });

      if (imagens.length === 0) return { message: "Todas as imagens já têm descrição." };

      let worker, urlBlob;
      try {
        ({ worker, urlBlob } = await criarWorkerIA());
      } catch (e) {
        return { error: "Falha ao iniciar a IA. Recarregue a página e tente novamente." };
      }

      let processadas = 0;

      worker.onmessage = (e) => {
        if (e.data.type === 'image-description') {
          const img = imagens.find(i => i.src === e.data.imageUrl);
          if (img) {
            img.setAttribute('alt', e.data.description);
            img.setAttribute('aria-label', `Descrição por IA: ${e.data.description}`);
            img.style.border = '2px solid #10b981';
          }
          processadas++;
          if (processadas === imagens.length) {
            worker.terminate();
            URL.revokeObjectURL(urlBlob);
          }
        }
      };

      imagens.forEach((img, i) => {
        setTimeout(() => worker.postMessage({ type: 'describe-image', data: img.src }), i * 500);
      });

      return { message: `Descrevendo ${imagens.length} imagens...` };
    }
  }
});
