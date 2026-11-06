// Suíte: validação estrutural do manifest.json (Manifest V3)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { readExt, ext } = require('./helpers/env');

const manifest = JSON.parse(readExt('manifest.json'));

test('manifest: JSON válido com essenciais do Manifest V3', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'Clarifica.ai');
  assert.equal(manifest.version, '1.1.0', 'versão da release corrente (atualizar o teste ao subir versão)');
  assert.ok(manifest.description.length > 20, 'descrição significativa');
  assert.match(manifest.description, /offline/i);
});

test('manifest: default_locale pt_BR com _locales pt_BR e en presentes', () => {
  assert.equal(manifest.default_locale, 'pt_BR');
  assert.ok(fs.existsSync(ext('_locales', 'pt_BR', 'messages.json')), 'locale padrão existe');
  assert.ok(fs.existsSync(ext('_locales', 'en', 'messages.json')), 'locale inglês existe');
});

test('manifest: todos os arquivos referenciados existem no pacote', () => {
  assert.ok(fs.existsSync(ext(manifest.action.default_popup)), 'popup existe');
  assert.ok(fs.existsSync(ext(manifest.background.service_worker)), 'service worker existe');
  assert.ok(fs.existsSync(ext(manifest.icons['128'])), 'ícone existe');
});

test('manifest: ícone é um PNG real de 128×128 (cabeçalho binário)', () => {
  const buf = fs.readFileSync(ext(manifest.icons['128']));
  assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'assinatura PNG');
  assert.equal(buf.readUInt32BE(16), 128, 'largura 128');
  assert.equal(buf.readUInt32BE(20), 128, 'altura 128');
});

test('manifest: os 4 atalhos de teclado existem e são válidos', () => {
  const cmds = Object.keys(manifest.commands).sort();
  assert.deepEqual(cmds, ['toggle-imagens', 'toggle-leitura', 'toggle-reset', 'toggle-resumo']);
  const esperados = { 'toggle-resumo': 'Ctrl+Shift+R', 'toggle-leitura': 'Ctrl+Shift+L', 'toggle-imagens': 'Ctrl+Shift+A', 'toggle-reset': 'Ctrl+Shift+X' };
  for (const [nome, atalho] of Object.entries(esperados)) {
    assert.equal(manifest.commands[nome].suggested_key.default, atalho, `atalho de ${nome}`);
    assert.ok(manifest.commands[nome].description.length >= 10, `descrição de ${nome}`);
  }
});

test('manifest: permissões mínimas e CSP restritiva', () => {
  for (const p of ['activeTab', 'scripting', 'storage']) {
    assert.ok(manifest.permissions.includes(p), `permissão ${p}`);
  }
  assert.equal(manifest.permissions.length, 3, 'nenhuma permissão excessiva');
  assert.deepEqual(manifest.host_permissions, ['<all_urls>']);
  const csp = manifest.content_security_policy.extension_pages;
  assert.ok(csp.includes("script-src 'self'"), 'script-src restrito à origem própria');
  assert.ok(csp.includes('wasm-unsafe-eval'), 'suporte a WASM para inferência local');
  assert.ok(!csp.includes('unsafe-inline'), 'sem unsafe-inline');
});

test('manifest: worker de IA e vendor publicados como recursos web acessíveis', () => {
  const recursos = (manifest.web_accessible_resources || []).flatMap((w) => w.resources || []);
  assert.ok(recursos.includes('scripts/ai-worker.js'), 'ai-worker.js precisa ser web_accessible para páginas criarem o Worker');
  assert.ok(recursos.includes('vendor/*'), 'vendor/* (biblioteca vendada + WASM) precisa ser web_accessible (import do Worker)');
});

test('manifest: autoria (e-mail de contato) e versão mínima do Chrome', () => {
  assert.equal(manifest.author.email, 'contact@eliezertavaresdeoliveira.com');
  assert.ok(parseInt(manifest.minimum_chrome_version, 10) >= 102, 'Chrome 102+ (atributo inert)');
});
