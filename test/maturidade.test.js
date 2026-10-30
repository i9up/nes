import test from 'node:test';
import assert from 'node:assert/strict';
import { criterios, nivel, proximoCriterio, porArea, temPoliticaDeSeguranca, trimestresDoCapital, respostaNegativa } from '../src/maturidade.js';
import { maturidade, perguntasPendentes } from '../src/comando-maturidade.js';
import { lerAgentes } from '../src/agentes.js';
import { lerConfigNes, gravarConfigNes } from '../src/config.js';
import { executar } from '../src/cli.js';
import { projeto, ler, AGENTE_COMPLETO } from './ajuda.js';

const agente = (nome, extra = '') => AGENTE_COMPLETO.replace('name: fiscal', `name: ${nome}`).replace('Emite notas fiscais.', `Agente ${nome}. ${extra}`);

/** Projeto que cumpre tudo o que é verificável até M5. */
function projetoCompleto() {
  return projeto({
    'CLAUDE.md': '# x',
    '.claude/agents/project-manager.md': agente('project-manager', 'Orquestrador do time.'),
    '.claude/agents/api.md': agente('api', 'Cuida de apps/api.'),
    '.claude/agents/web.md': agente('web', 'Cuida de apps/api e apps/web.'),
    '.claude/settings.json': JSON.stringify({ permissions: { deny: ['Bash(rm:*)'] } }),
    'openspec/changes/.keep': '',
    'docs/nes/CAPITAL-COGNITIVO.md': '- 2026-01-10 decisão\n- 2026-05-02 outra\n',
    'nes.json': JSON.stringify({ crivo: { comandos: [{ pasta: '.', comando: 'npm test' }] } }),
    'apps/api/package.json': '{}',
    'apps/web/package.json': '{}',
  });
}

const TUDO = { producao: 'PRs', coordenacao: 'roteador', abrangencia: 'todos os apps', metrica: 'bugs/mês' };

test('projeto vazio: M0, e o próximo critério é usar IA', () => {
  const raiz = projeto();
  const t = criterios(raiz, { agentes: [] });
  assert.equal(nivel(t), 'M0');
  assert.equal(proximoCriterio(t).transicao, 'M0→M1');
  assert.deepEqual(porArea(raiz, { agentes: [], transicoes: t }), []);
  const comApp = projeto({ 'apps/x/package.json': '{}' });
  assert.equal(porArea(comApp, { agentes: [], transicoes: criterios(comApp, { agentes: [] }) })[0].nivel, 'M0');
});

test('projeto completo: M5 com tudo declarado, e por área', () => {
  const raiz = projetoCompleto();
  const agentes = lerAgentes(raiz);
  const t = criterios(raiz, { agentes, config: lerConfigNes(raiz), declarado: TUDO });
  assert.equal(nivel(t), 'M5');
  assert.equal(proximoCriterio(t), null);
  assert.deepEqual(porArea(raiz, { agentes, transicoes: t }), [{ area: 'apps/api', nivel: 'M5', agentes: 2 }, { area: 'apps/web', nivel: 'M2', agentes: 1 }]);
});

test('sem declarações para no M1, e as áreas também', () => {
  const raiz = projetoCompleto();
  const agentes = lerAgentes(raiz);
  const t = criterios(raiz, { agentes, config: lerConfigNes(raiz) });
  assert.equal(nivel(t), 'M1');
  assert.equal(proximoCriterio(t).chave, 'producao');
  assert.ok(porArea(raiz, { agentes, transicoes: t }).every((a) => a.nivel === 'M1'));
  assert.deepEqual(perguntasPendentes(t), ['producao']);
});

test('M3 por área exige orquestração; maestro vindo do nes.json', () => {
  const raiz = projeto({ 'AGENTS.md': '#', '.claude/agents/a.md': agente('a', 'apps/x'), '.claude/agents/b.md': agente('b', 'apps/x'), 'apps/x/package.json': '{}' });
  const agentes = lerAgentes(raiz);
  let t = criterios(raiz, { agentes, declarado: { producao: 'sim', coordenacao: 'sim' } });
  assert.equal(nivel(t), 'M2');
  assert.equal(porArea(raiz, { agentes, transicoes: t })[0].nivel, 'M2');
  t = criterios(raiz, { agentes, config: { papeis: { maestro: ['a'] } }, declarado: { producao: 'sim', coordenacao: 'sim' } });
  assert.equal(nivel(t), 'M3');
  assert.equal(porArea(raiz, { agentes, transicoes: t })[0].nivel, 'M3');
});

test('nes-maestro conta como orquestrador; áreas ignoradas no fengshui.json ficam de fora', () => {
  const raiz = projeto({
    'AGENTS.md': '#',
    '.claude/agents/nes-maestro.md': agente('nes-maestro'),
    '.claude/agents/b.md': agente('b'),
    'fengshui.json': JSON.stringify({ ignorarApps: ['apps/velho'] }),
    'apps/velho/package.json': '{}',
  });
  const agentes = lerAgentes(raiz);
  const t = criterios(raiz, { agentes, declarado: { producao: 'sim', coordenacao: 'sim' } });
  assert.equal(nivel(t), 'M3');
  assert.deepEqual(porArea(raiz, { agentes, transicoes: t }), []);
});

test('perguntasPendentes: nada quando o verificável da transição ainda falta', () => {
  const raiz = projeto({ 'CLAUDE.md': '#' });
  assert.deepEqual(perguntasPendentes(criterios(raiz, { agentes: [] })), []);
  assert.deepEqual(perguntasPendentes(criterios(projetoCompleto(), { agentes: [], declarado: TUDO })), []);
});

test('segurança formal: hooks, deny, JSON inválido e ausência', () => {
  assert.equal(temPoliticaDeSeguranca(projeto()), false);
  assert.equal(temPoliticaDeSeguranca(projeto({ '.claude/settings.local.json': '{x' })), false);
  assert.equal(temPoliticaDeSeguranca(projeto({ '.claude/settings.local.json': JSON.stringify({ hooks: { PreToolUse: [{}] } }) })), true);
});

test('trimestres do Capital Cognitivo', () => {
  assert.equal(trimestresDoCapital(projeto()), 0);
  assert.equal(trimestresDoCapital(projeto({ 'docs/nes/CAPITAL-COGNITIVO.md': '2026-01-01 2026-03-31 2026-04-01' })), 2);
});

test('respostaNegativa', () => {
  for (const r of ['', 'n', 'não', 'Nao', 'no', 'nenhum', '-', null]) assert.ok(respostaNegativa(r), String(r));
  assert.equal(respostaNegativa('PRs no GitHub'), false);
});

test('config: inexistente, inválido e gravação', () => {
  const raiz = projeto({ 'nes.json': '{x' });
  assert.deepEqual(lerConfigNes(raiz), { invalido: true });
  assert.equal(lerConfigNes(projeto()), null);
  gravarConfigNes(raiz, { a: 1 });
  assert.equal(ler(raiz, 'nes.json'), '{\n  "a": 1\n}\n');
});

test('maturidade: texto, JSON e nes.json inválido', async () => {
  const raiz = projetoCompleto();
  const r = await maturidade(raiz);
  assert.match(r.texto, /Nível do projeto: M1 \(Assistentes\)/);
  assert.match(r.texto, /Por área/);
  assert.match(r.texto, /Próximo critério \(M1→M2\)/);
  assert.equal(JSON.parse((await maturidade(raiz, { json: true })).texto).nivel, 'M1');
  assert.equal((await maturidade(projeto({ 'nes.json': '{x' }))).codigo, 1);
  assert.doesNotMatch((await maturidade(projeto())).texto, /Por área/);
});

test('maturidade interativa: pergunta em rodadas, grava o declarado e chega a M5', async () => {
  const raiz = projetoCompleto();
  const feitas = [];
  const respostas = { producao: 'PRs no GitHub', coordenacao: 'roteador', abrangencia: 'todos', metrica: 'bugs por mês' };
  const perguntar = async (q) => Object.values(respostas)[feitas.push(q) - 1];
  const r = await maturidade(raiz, { perguntar });
  assert.equal(feitas.length, 4);
  assert.match(r.texto, /Nível do projeto: M5/);
  assert.match(r.texto, /Todos os critérios de M5/);
  assert.match(r.texto, /Respostas gravadas/);
  assert.deepEqual(lerConfigNes(raiz).declarado, respostas);
  assert.equal(lerConfigNes(raiz).crivo.comandos[0].comando, 'npm test');
});

test('maturidade interativa: "não" não grava nada e para de perguntar', async () => {
  const raiz = projetoCompleto();
  let n = 0;
  const r = await maturidade(raiz, { perguntar: async () => { n++; return 'não'; } });
  assert.equal(n, 1);
  assert.doesNotMatch(r.texto, /Respostas gravadas/);
  assert.equal(lerConfigNes(raiz).declarado, undefined);
});

test('cli: maturidade com e sem perguntas', async () => {
  const raiz = projetoCompleto();
  let n = 0;
  const perguntar = async () => { n++; return ''; };
  await executar(['maturidade', '--sem-perguntas'], { cwd: raiz, perguntar });
  assert.equal(n, 0);
  await executar(['maturidade'], { cwd: raiz, perguntar });
  assert.equal(n, 1);
  assert.equal((await executar(['maturidade', '--json'], { cwd: raiz })).codigo, 0);
});
