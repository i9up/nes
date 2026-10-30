import test from 'node:test';
import assert from 'node:assert/strict';
import { PAPEIS, papeisDoNivel, adotar } from '../src/papeis.js';
import { renderizar, lerModelo } from '../src/modelo.js';
import { avaliarContrato } from '../src/contrato.js';
import { frontmatter } from '../src/frontmatter.js';
import { estimarTokens } from '@i9up/fengshui/src/medir.js';

const VARS = { projeto: 'Loja', stack: 'node', aprovador: 'Ana', delegados: 'executor e crivo', gate: '  - `npm test`' };

test('renderizar: variáveis, blocos se/se-não e linhas em branco', () => {
  const t = 'a {{x}} {{falta}}\n{{#sim}}S{{/sim}}{{^sim}}N{{/sim}}\n\n\n\nfim';
  assert.equal(renderizar(t, { x: 1, sim: true }), 'a 1 \nS\n\nfim');
  assert.equal(renderizar(t, { x: 1, sim: false }), 'a 1 \nN\n\nfim');
});

test('papeisDoNivel: M2, M3, M4 e nível desconhecido', () => {
  assert.deepEqual(papeisDoNivel('M2').map((p) => p.id), ['maestro', 'executor', 'crivo']);
  assert.equal(papeisDoNivel('M3').length, 4);
  assert.equal(papeisDoNivel('M4').length, 5);
  assert.equal(papeisDoNivel('M9').length, 3);
});

for (const papel of PAPEIS) {
  for (const flags of [{ openspec: true, ponytail: true, arquiteto: true }, { openspec: false, ponytail: false, arquiteto: false }]) {
    test(`modelo ${papel.id} passa 5/5 no próprio nes contrato (${flags.openspec ? 'com' : 'sem'} OpenSpec/Ponytail)`, () => {
      const texto = renderizar(lerModelo(`papeis/${papel.id}.md`), { ...VARS, ...flags });
      const a = avaliarContrato(texto);
      assert.equal(a.completas, 5, JSON.stringify(a.secoes.filter((s) => !s.ok)));
      assert.doesNotMatch(texto, /\{\{/);
      assert.equal(frontmatter(texto).dados.name, `nes-${papel.id}`);
    });
  }
}

test('Dieta de Contexto: as descrições dos 5 papéis somam no máximo 300 tokens', () => {
  const total = PAPEIS.reduce((s, p) => s + estimarTokens(frontmatter(renderizar(lerModelo(`papeis/${p.id}.md`), VARS)).dados.description), 0);
  assert.ok(total <= 300, `descrições: ${total} tokens`);
});

test('adotar: mapeia agentes existentes; Executor aceita vários e fica por último', () => {
  const agentes = [
    { nome: 'project-manager', descricao: 'orquestra' },
    { nome: 'qa-specialist', descricao: 'testes' },
    { nome: 'api-specialist', descricao: '' },
    { nome: 'web-specialist', descricao: '' },
    { nome: 'nes-arquiteto', descricao: 'architect', gerado: true },
  ];
  const mapa = adotar(agentes, papeisDoNivel('M4'));
  assert.deepEqual(mapa, { maestro: ['project-manager'], crivo: ['qa-specialist'], executor: ['api-specialist', 'web-specialist'] });
});
