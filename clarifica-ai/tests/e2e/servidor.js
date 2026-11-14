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

// Página com vídeo — exercita o verificador WCAG 1.2.2 da v1.4.0 na
// página real: um vídeo SEM track de legendas, um COM <track kind=
// "captions"> servido pelo mesmo servidor e um com kind incorreto
// (chapters — não conta como legenda).
const PAGINA_VIDEO = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Portal de Exemplo — Vídeos</title></head>
<body>
  <main>
    <h2>Galeria de vídeos sem legendas</h2>
    <video id="sem-legenda" controls width="640" height="360">
      <source src="/video.mp4" type="video/mp4">
    </video>
    <video id="com-legenda" controls width="480" height="270" src="/video.mp4">
      <track kind="captions" srclang="pt-BR" src="/legendas.vtt" label="Legendas de teste">
    </video>
    <video id="com-capitulos" controls width="320" height="180" src="/video.mp4">
      <track kind="chapters" srclang="pt-BR" src="/legendas.vtt" label="Capítulos (não é legenda)">
    </video>
  </main>
</body>
</html>`;

// WebVTT servido por http:// — o track real do Chromium carrega estas
// legendas na página de teste (mesmo canal nativo do recurso).
const ARQUIVO_VTT = `WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nOlá do Clarifica.ai\n`;

// Bytes mínimos de MP4 — os vídeos não precisam tocar: o verificador lê
// o DOM (elementos e tracks), não a mídia.
const VIDEO_MP4 = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);

// Barreiras DELIBERADAS — exercita o painel de auditoria WCAG em tempo
// real (v2.0.0) na página real: imagem sem alt, botão vazio, link
// genérico, campo sem rótulo e iframe sem title (html com lang correto e
// títulos em ordem — as barreiras são contadas, não inventadas).
const PAGINA_BARRERAS = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Portal de Exemplo — Barreiras</title></head>
<body>
  <main>
    <h1>Página com barreiras para auditoria</h1>
    <p>Conteúdo do portal para contexto da auditoria automática.</p>
    <img src="/imagens/praca.svg" id="sem-alt">
    <button id="btn-vazio">   </button>
    <a href="/destino" id="link-generico">Clique aqui</a>
    <input type="text" id="campo-sem-label">
    <iframe src="/pagina-curta" id="frame-sem-title"></iframe>
  </main>
</body>
</html>`;

function iniciarServidor() {
  const servidor = http.createServer((req, res) => {
    const rota = (req.url || '/').split('?')[0];
    if (rota === '/legendas.vtt') {
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(ARQUIVO_VTT);
      return;
    }
    if (rota === '/video.mp4') {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Cache-Control', 'no-store');
      res.end(VIDEO_MP4);
      return;
    }
    const corpo =
      rota === '/pagina-curta' ? PAGINA_CURTA :
      rota === '/imagens/praca.svg' ? IMAGEM_PRAIA :
      rota === '/imagens/cidade.svg' ? IMAGEM_CIDADE :
      rota === '/video' ? PAGINA_VIDEO :
      rota === '/barreiras' ? PAGINA_BARRERAS :
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
