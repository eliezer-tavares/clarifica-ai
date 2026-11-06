// Consistência do registry de versões (VERSOES_MODELOS.md) — v1.1.0.
//
// Desde a v1.1.0 a biblioteca Transformers.js NÃO vem de CDN: o bundle
// oficial da versão fixada é VENDADO em vendor/ (com os binários WASM do
// onnxruntime). Os MODELOS continuam baixados do Hugging Face na revisão
// (SHA) fixada. Este teste garante que os pontos onde versões vivem
// permanecem sincronizados com o registry:
//   scripts/ai-worker.js  → placeholders + revisões (sem nenhum CDN)
//   popup/popup.js        → injeta as URLs locais do vendor
//   manifest.json         → vendor publicado como web_accessible_resource
//   vendor/               → bundle + WASM realmente presentes no pacote
//   tests/setup + package.json → mesma versão para inferência real em Node
//   .github/workflows/ci.yml → cache dos pesos chaveado pelos SHAs fixados

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { readExt, ext, ROOT } = require('./helpers/env');

const registry = (() => {
  const md = readExt('VERSOES_MODELOS.md');
  const bloco = md.match(/```json\s*\n([\s\S]*?)\n```/);
  assert.ok(bloco, 'VERSOES_MODELOS.md contém bloco ```json do registry');
  return JSON.parse(bloco[1]);
})();

test('registry v2 declara a biblioteca vendada e os dois modelos com revisão (SHA) fixada', () => {
  assert.equal(registry.registry_versao, 2);
  assert.match(registry.transformers_js.versao, /^\d+\.\d+\.\d+$/, 'versão semântica da biblioteca');
  assert.equal(registry.transformers_js.origem, 'pacote vendado (sem CDN)');
  assert.equal(registry.transformers_js.arquivo_local, 'vendor/transformers.min.js');
  assert.ok(Array.isArray(registry.transformers_js.binarios_wasm) && registry.transformers_js.binarios_wasm.length === 4,
    'registry lista os 4 binários WASM vendados');

  for (const [nome, modelo] of Object.entries(registry.modelos)) {
    assert.match(modelo.id, /^[^/]+\/[^/]+$/, `${nome}: id repositório/arquivo`);
    assert.match(modelo.revisao, /^[0-9a-f]{40}$/, `${nome}: revisão é o SHA completo do commit`);
    assert.ok(modelo.tamanho_aproximado, `${nome}: tamanho declarado`);
  }
  assert.ok(registry.modelos.sumarizacao && registry.modelos.visao, 'registry cobre os dois modelos do produto');
});

test('ai-worker.js carrega a biblioteca pela URL injetada (ZERO CDN) e as revisões do registry', () => {
  const worker = readExt('scripts', 'ai-worker.js');

  assert.doesNotMatch(worker, /https:\/\/cdn\.jsdelivr\.net/,
    'v1.1.0: nenhuma referência a CDN pode voltar ao worker (MV3 + reprodutibilidade)');
  assert.match(worker, /import\s*\{[^}]+\}\s*from\s*'__CLARIFICA_BIBLIOTECA__';/,
    'import da biblioteca via placeholder injetado pelo popup');
  assert.match(worker, /'__CLARIFICA_VENDOR_BASE__'/,
    'base dos binários WASM também injetada');
  assert.match(worker, /env\.backends\.onnx\.wasm\.wasmPaths = baseVendor/,
    'onnxruntime busca os WASM vendados, não o CDN');

  for (const modelo of Object.values(registry.modelos)) {
    const chamada = worker.match(new RegExp(`pipeline\\('${modelo.tarefa}',\\s*'${modelo.id}',\\s*\\{[^}]*\\}`));
    assert.ok(chamada, `pipeline('${modelo.tarefa}', '${modelo.id}') presente no worker`);
    const trecho = chamada[0];
    assert.ok(trecho.includes(`revision: '${modelo.revisao}'`), `revisão ${modelo.revisao.slice(0, 8)} fixada no worker para ${modelo.id}`);
    assert.ok(trecho.includes('quantized: true'), `quantização int8 preservada para ${modelo.id}`);
  }
});

test('popup.js resolve as URLs locais do vendor antes de criar o Worker', () => {
  const popup = readExt('popup', 'popup.js');
  assert.match(popup, /replace\(\/__CLARIFICA_BIBLIOTECA__\/g,\s*chrome\.runtime\.getURL\('vendor\/transformers\.min\.js'\)\)/,
    'placeholder da biblioteca → chrome-extension://.../vendor/transformers.min.js');
  assert.match(popup, /replace\(\/__CLARIFICA_VENDOR_BASE__\/g,\s*chrome\.runtime\.getURL\('vendor\/'\)\)/,
    'placeholder da base WASM → chrome-extension://.../vendor/');
});

test('manifest publica o worker e o vendor como recursos web acessíveis', () => {
  const manifest = JSON.parse(readExt('manifest.json'));
  const recursos = (manifest.web_accessible_resources || []).flatMap((w) => w.resources || []);
  assert.ok(recursos.includes('scripts/ai-worker.js'), 'ai-worker.js precisa ser web_accessible');
  assert.ok(recursos.includes('vendor/*'), 'vendor/* (bundle + WASM) precisa ser web_accessible para o Worker importar');
});

test('vendor real: bundle Transformers.js e os 4 WASM estão presentes no pacote', () => {
  const bundle = fs.readFileSync(ext('vendor', 'transformers.min.js'));
  assert.ok(bundle.length > 500_000, `bundle vendado presente (${(bundle.length / 1024).toFixed(0)} KB)`);
  assert.ok(bundle.includes('2.14.0'), 'bundle é o da versão fixada no registry');

  for (const arquivo of registry.transformers_js.binarios_wasm) {
    const caminho = ext(...arquivo.split('/'));
    const binario = fs.readFileSync(caminho);
    assert.ok(binario.length > 1_000_000, `${arquivo} presente (${(binario.length / 1024 / 1024).toFixed(1)} MB)`);
    // Cabeçalho WASM real: \0asm
    assert.deepEqual([...binario.subarray(0, 4)], [0x00, 0x61, 0x73, 0x6d], `${arquivo} é um binário WASM válido`);
  }
});

test('pré-baixa e devDependency usam as MESMAS versões do registry', () => {
  const setup = readExt('tests', 'setup', 'preparar_modelos_ia.mjs');
  for (const modelo of Object.values(registry.modelos)) {
    assert.ok(setup.includes(`'${modelo.id}'`), `setup pré-baixa ${modelo.id}`);
    assert.ok(setup.includes(`revision: '${modelo.revisao}'`), `setup usa a revisão fixada de ${modelo.id}`);
  }

  const pkg = JSON.parse(readExt('tests', 'package.json'));
  const dev = pkg.devDependencies['@xenova/transformers'];
  assert.ok(dev, 'package.json fixa @xenova/transformers como devDependency');
  assert.ok(dev.includes(registry.transformers_js.versao), `devDependency (${dev}) coincide com a versão vendada (${registry.transformers_js.versao})`);

  // O CI cacheia os pesos por SHA — mudou o registry, o cache invalida.
  // O workflow vive no .github/ da RAIZ do repositório (uma pasta acima
  // da extensão) — é lá que o GitHub Actions executa workflows.
  const ci = fs.readFileSync(path.resolve(ROOT, '..', '.github', 'workflows', 'ci.yml'), 'utf8');
  for (const modelo of Object.values(registry.modelos)) {
    assert.ok(ci.includes(modelo.revisao.slice(0, 8)), `chave de cache do CI embute o SHA curto de ${modelo.id}`);
  }
});
