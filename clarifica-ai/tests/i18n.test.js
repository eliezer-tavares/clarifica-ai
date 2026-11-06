// Suíte: integridade da internacionalização (chrome.i18n).
// pt_BR é o default_locale; en acompanha a distribuição. Este teste
// garante que o idioma nunca "quebra" na tela do usuário: chaves citadas
// no código existem nos dois locales, nenhuma chave fica órfã e os
// placeholders são estruturalmente corretos.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { readExt } = require('./helpers/env');

const pt = JSON.parse(readExt('_locales', 'pt_BR', 'messages.json'));
const en = JSON.parse(readExt('_locales', 'en', 'messages.json'));
const manifest = JSON.parse(readExt('manifest.json'));
const html = readExt('popup/popup.html');
const popupJs = readExt('popup/popup.js');
const backgroundJs = readExt('background.js');

test('i18n: default_locale aponta para pt_BR e os dois locales são JSON válidos', () => {
  assert.equal(manifest.default_locale, 'pt_BR');
  assert.ok(Object.keys(pt).length >= 30, 'pt_BR com conjunto completo de mensagens');
  assert.ok(Object.keys(en).length >= 30, 'en com conjunto completo de mensagens');
});

test('i18n: pt_BR e en cobrem EXATAMENTE o mesmo conjunto de chaves', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(pt).sort(),
    'chaves divergentes = tela meio traduzida ou com erro no idioma do usuário');
});

test('i18n: placeholders estruturalmente corretos ($nome$ declarado e resolúvel)', () => {
  for (const [locale, mensagens] of [['pt_BR', pt], ['en', en]]) {
    for (const [chave, def] of Object.entries(mensagens)) {
      const usados = [...def.message.matchAll(/\$(\w+)\$/g)].map((m) => m[1]);
      const declarados = Object.keys(def.placeholders || {});
      assert.deepEqual(usados.sort(), declarados.sort(),
        `${locale}/${chave}: placeholders no texto devem ser declarados e vice-versa`);
      for (const [nome, ph] of Object.entries(def.placeholders || {})) {
        assert.match(ph.content, /^\$\d+$/, `${locale}/${chave}/${nome}: content no formato $N`);
      }
    }
  }
});

test('i18n: toda chave usada no código e no HTML existe nos dois locales', () => {
  const citadas = new Set();
  for (const m of html.matchAll(/__MSG_(\w+)__/g)) citadas.add(m[1]);
  for (const fonte of [popupJs, backgroundJs]) {
    // chamadas diretas de mensagem/getMessage com literal: mensagem('statusPronto')
    for (const m of fonte.matchAll(/\b(?:mensagem|getMessage)\(\s*'(\w+)'/g)) citadas.add(m[1]);
    // mapas de tradução (códigos de erro → chaves; ações → chaves)
    for (const m of fonte.matchAll(/'(?:status|anuncio)\w*'\s*:\s*'(\w+)'/g)) citadas.add(m[1]);
    // literais de chaves em ternárias e defaults: ? 'btnTemaRotuloClaro' : ...
    for (const m of fonte.matchAll(/['"](status|anuncio|nome|btn|secao|subtitulo|titulo|aria|label|prefixo)\w*['"]/g)) citadas.add(m[0].replace(/['"]/g, ''));
  }
  // literais técnicos que coincidem com prefixos mas não são chaves i18n
  const naoSaoChaves = new Set(['status', 'statusText']);
  for (const nao of naoSaoChaves) citadas.delete(nao);
  assert.ok(citadas.size >= 25, `chaves detectadas no código: ${citadas.size}`);
  for (const chave of citadas) {
    assert.ok(pt[chave], `chave ausente em pt_BR: ${chave}`);
    assert.ok(en[chave], `chave ausente em en: ${chave}`);
  }
});

test('i18n: nenhuma chave dos locales fica órfã (toda é citada em html, popup.js ou background.js)', () => {
  const veiculo = `${html}\n${popupJs}\n${backgroundJs}`;
  for (const chave of Object.keys(pt)) {
    const citada = new RegExp(`['"\`]${chave}['"\`]`).test(veiculo) || veiculo.includes(`__MSG_${chave}__`);
    assert.ok(citada, `chave ${chave} declarada mas nunca usada — remover ou consumir`);
  }
});

test('i18n: mensagens-chave mantêm os textos contratados com o usuário', () => {
  assert.match(pt.anuncioResumo.message, /^Clarifica\.ai: Resumindo página/);
  assert.match(pt.statusResumoOk.message, /Concluído/);
  assert.match(pt.statusPronto.message, /^Pronto\./);
  assert.match(pt.prefixoAltIA.message, /^Descrição por IA: /);
  assert.match(en.anuncioResumo.message, /^Clarifica\.ai: Summarizing/);
  assert.match(en.statusResumoOk.message, /Done/);
});
