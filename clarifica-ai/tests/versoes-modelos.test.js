// Consistência do registry de versões (VERSOES_MODELOS.md).
//
// A estratégia de versionamento fixa biblioteca e modelos em um único
// lugar — o bloco JSON do VERSOES_MODELOS.md — e este teste garante que
// os quatro pontos onde versões vivem no código permanecem sincronizados:
// ai-worker.js (CDN + revision), setup/preparar_modelos_ia.mjs (pré-baixa)
// e package.json (devDependency usada pelo teste de inferência real).
// É um teste de integridade de configuração, na mesma linha do
// manifest.test.js: se divergir, o CI quebra antes do usuário perceber.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { readExt, ROOT } = require('./helpers/env');

const registry = (() => {
  const md = readExt('VERSOES_MODELOS.md');
  const bloco = md.match(/```json\s*\n([\s\S]*?)\n```/);
  assert.ok(bloco, 'VERSOES_MODELOS.md contém bloco ```json do registry');
  return JSON.parse(bloco[1]);
})();

test('registry declara Transformers.js e os dois modelos com revisão (SHA) fixada', () => {
  assert.equal(registry.registry_versao, 1);
  assert.match(registry.transformers_js.versao, /^\d+\.\d+\.\d+$/, 'versão semântica da biblioteca');
  assert.ok(registry.transformers_js.cdn.includes('@' + registry.transformers_js.versao), 'CDN fixa a mesma versão');

  for (const [nome, modelo] of Object.entries(registry.modelos)) {
    assert.match(modelo.id, /^[^/]+\/[^/]+$/, `${nome}: id repositório/arquivo`);
    assert.match(modelo.revisao, /^[0-9a-f]{40}$/, `${nome}: revisão é o SHA completo do commit`);
    assert.ok(modelo.tamanho_aproximado, `${nome}: tamanho declarado`);
  }
  assert.ok(registry.modelos.sumarizacao && registry.modelos.visao, 'registry cobre os dois modelos do produto');
});

test('ai-worker.js carrega exatamente a biblioteca e as revisões do registry', () => {
  const worker = readExt('scripts', 'ai-worker.js');

  const importCdn = worker.match(/import\s*\{[^}]+\}\s*from\s*'([^']+)'/);
  assert.ok(importCdn, 'worker importa a biblioteca de CDN fixa');
  assert.equal(importCdn[1], registry.transformers_js.cdn, 'URL do CDN idêntica ao registry (versão fixada, sem flutuar)');

  for (const modelo of Object.values(registry.modelos)) {
    const chamada = worker.match(new RegExp(`pipeline\\('${modelo.tarefa}',\\s*'${modelo.id}',\\s*\\{[^}]*\\}`));
    assert.ok(chamada, `pipeline('${modelo.tarefa}', '${modelo.id}') presente no worker`);
    const trecho = chamada[0];
    assert.ok(trecho.includes(`revision: '${modelo.revisao}'`), `revisão ${modelo.revisao.slice(0, 8)} fixada no worker para ${modelo.id}`);
    assert.ok(trecho.includes('quantized: true'), `quantização int8 preservada para ${modelo.id}`);
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
  assert.ok(dev.includes(registry.transformers_js.versao), `devDependency (${dev}) coincide com a versão do CDN (${registry.transformers_js.versao})`);

  // O CI cacheia os pesos por SHA — mudou o registry, o cache invalida.
  // O workflow vive no .github/ da RAIZ do repositório (uma pasta acima
  // da extensão) — é lá que o GitHub Actions executa workflows.
  const ci = fs.readFileSync(path.resolve(ROOT, '..', '.github', 'workflows', 'ci.yml'), 'utf8');
  for (const modelo of Object.values(registry.modelos)) {
    assert.ok(ci.includes(modelo.revisao.slice(0, 8)), `chave de cache do CI embute o SHA curto de ${modelo.id}`);
  }
});
