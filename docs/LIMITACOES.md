# ⚠️ Limitações conhecidas e recursos complementares — Clarifica.ai

> Complemento do [`README.md`](../README.md): lista completa e honesta das limitações declaradas do produto e as ferramentas complementares recomendadas. Estado da documentação: v2.0.0.

## Limitações conhecidas

- O modelo de **perguntas e respostas** é o distilbert-squad (treinado em inglês): páginas em **inglês** têm as melhores respostas; em páginas em português os recortes são menos confiáveis (limitação do modelo, declarada na interface e nas notas da release).
- O **Português Claro** é assistido por modelo (geração com parâmetros de simplicidade + tradução neural) e **não substitui revisão humana**.
- Os modelos de **resumo e descrição de imagens geram texto em inglês**; com o seletor em "Português", a tradução pela cadeia modelo→modelo é automática e aproximada (o OCR reproduz o texto que está na imagem).
- A transcrição processa o **primeiro** `<video>`/`<audio>` da página com fonte http(s) e até **120 segundos** de áudio — mídias protegidas por CORS (ex.: plataformas de vídeo em streaming) recebem mensagem clara e não são transcritas.
- **Legendas ao vivo:** são **aproximadas em tempo real** (atraso típico de 5 a 15 s); buscas (seek) no vídeo podem dessincronizar o track; a qualidade da **tradução para inglês** pelo modelo tiny é aproximada; plataformas com **DRM** (Netflix, Prime Video) produzem silêncio na captura — limitação do próprio Chrome; em algumas configurações a captura pode alterar o áudio da aba.
- **Firefox:** todas as funções funcionam, **exceto as legendas ao vivo** — a captura de aba (`chrome.tabCapture`) e o documento offscreen não existem no Firefox; os controles correspondentes ficam ocultos com mensagem clara (ver [`FIREFOX.md`](FIREFOX.md)).
- O **painel de auditoria WCAG** é detecção ESTÁTICA (leitura de estado do DOM): cobre 7 critérios objetivos e não substitui teste com leitores de tela nem avaliação humana completa (WCAG tem ~87 critérios de sucesso).
- O OCR lê **texto impresso** (não manuscrito) e funciona melhor em imagens com poucas linhas; páginas inteiras não são convertidas — só as imagens sem `alt`.
- A leitura em voz alta depende das **vozes instaladas no sistema**; sem voz compatível, o navegador usa a voz padrão.
- Páginas restritas (`chrome://`, Chrome Web Store) não permitem injeção de scripts — comportamento de segurança do próprio navegador.
- Textos com menos de 200 caracteres não são resumidos e páginas com menos de 50 caracteres não recebem perguntas (proteção contra resultados sem contexto).
- A primeira execução de cada recurso de IA baixa o modelo correspondente e exige conexão; o uso posterior é offline.
- A **sincronização** aplica filtro e perfil (camada de estilo completa + elementos e listeners essenciais); páginas dinâmicas que reconstruem o corpo após o carregamento podem exigir um clique para reaplicar — o estado continua salvo.

## Recursos complementares recomendados

O Clarifica.ai é uma camada local de acessibilidade; para necessidades além do escopo do produto, estas ferramentas maduras se complementam bem (nenhuma integração de código — recomendação documentada):

- **VLibras** — suíte pública do governo brasileiro para tradução de conteúdo para **Libras** (a partir de português); distribuída como extensão própria, o que no Manifest V3 não pode ser disparada por outra extensão de forma suportada. Detecção e sugestão de instalação não entraram na v2.0.0; podem ser reavaliadas em uma versão futura se houver demanda registrada.
- **NVDA** — leitor de tela livre para Windows; os anúncios `aria-live` da extensão foram projetados e testados para o fluxo dele.
- **JAWS** — leitor de tela comercial amplamente usado no Brasil; o Modo Leitura Essencial e os atalhos de teclado seguem os padrões que ele e o NVDA melhor navegam.
