// Servidor HTTP efêmero com a página de teste usada pelos testes E2E.
//
// Uma página servida por http:// real (e não um data: ou about:blank) é
// obrigatória para que a extensão possa injetar scripts: as
// host_permissions do manifest ("<all_urls>") não se aplicam a esquemas
// especiais, e o fluxo real de injeção (chrome.scripting.executeScript)
// precisa de uma origem HTTP como qualquer página da web.

'use strict';
const http = require('node:http');

// Artigo com mais de 200 caracteres (gate do resumo) e estruturas de ruído
// reais: navegação, propaganda, barra lateral e cabeçalhos.
const PAGINA_ARTIGO = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Portal de Exemplo — Artigo</title></head>
<body>
  <header><h1>Portal de Exemplo</h1></header>
  <nav aria-label="Navegação principal">
    <a href="/a">Editorias</a> <a href="/b">Economia</a> <a href="/c">Esportes</a>
  </nav>
  <div class="ads">Publicidade: banner do anunciante</div>
  <main>
    <article>
      <h2>Acessibilidade digital avança na web brasileira</h2>
      <p>Acessibilidade digital é a prática de construir sites e aplicativos que possam ser usados por todas as pessoas, incluindo pessoas com deficiência visual, auditiva, motora e cognitiva. Na prática, isso significa HTML semântico, texto alternativo em imagens, contraste suficiente entre texto e fundo, navegação completa por teclado e legendas em vídeos. As diretrizes WCAG, publicadas pelo W3C, definem critérios de sucesso testáveis que orientam essas decisões técnicas em todo o mundo.</p>
      <p>Longe de ser um enfeite opcional, a acessibilidade é uma questão de direitos humanos e, em muitos países, inclusive no Brasil, um requisito legal. A Lei Brasileira de Inclusão estabelece que aplicações devem ser acessíveis, e o benefício alcança a todos: legendas ajudam quem está em ambientes ruidosos, o bom contraste ajuda quem usa o celular sob o sol e a navegação clara reduz a carga cognitiva de qualquer usuário.</p>
      <p>Ferramentas que aplicam inteligência artificial localmente, como a sumarização automática de textos e a descrição automática de imagens, ampliam o acesso à informação mantendo os dados do usuário no próprio dispositivo. Essa abordagem, conhecida como Edge AI, move a inferência dos data centers para o navegador, reduz a latência, funciona sem conexão após o download inicial dos modelos e preserva a privacidade, já que nenhum dado pessoal é enviado a servidores remotos.</p>
    </article>
  </main>
  <aside>Barra lateral: links patrocinados e widgets</aside>
  <footer>Rodapé com informações institucionais</footer>
</body>
</html>`;

// Página com texto curto — exercita o caminho de erro real do resumo
// (gate de 200 caracteres executado dentro da própria página).
const PAGINA_CURTA = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Página curta</title></head>
<body><main><p>Texto insuficiente para sumarização.</p></main></body></html>`;

// Imagens SVG servidas por http:// — URLs reais que o worker de visão
// consegue buscar, no mesmo fluxo do navegador.
const IMAGEM_PRAIA = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="120" fill="#87ceeb"/><rect y="120" width="320" height="80" fill="#f4d58d"/><circle cx="260" cy="40" r="22" fill="#ffd700"/></svg>`;
const IMAGEM_CIDADE = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#dfe7ef"/><rect x="30" y="70" width="50" height="130" fill="#7f8ea3"/><rect x="100" y="40" width="60" height="160" fill="#5b6b7f"/><rect x="180" y="90" width="45" height="110" fill="#93a5b8"/></svg>`;

function iniciarServidor() {
  const servidor = http.createServer((req, res) => {
    const rota = (req.url || '/').split('?')[0];
    const corpo =
      rota === '/pagina-curta' ? PAGINA_CURTA :
      rota === '/imagens/praca.svg' ? IMAGEM_PRAIA :
      rota === '/imagens/cidade.svg' ? IMAGEM_CIDADE :
      PAGINA_ARTIGO;
    const tipo = rota.endsWith('.svg') ? 'image/svg+xml' : 'text/html; charset=utf-8';
    res.setHeader('Content-Type', tipo);
    res.setHeader('Cache-Control', 'no-store');
    res.end(corpo);
  });

  return new Promise((resolve) => {
    servidor.listen(0, '127.0.0.1', () => {
      const { port } = servidor.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        fechar: () => new Promise((ok) => servidor.close(ok))
      });
    });
  });
}

module.exports = { iniciarServidor };
