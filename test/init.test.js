import test from 'node:test';
import assert from 'node:assert/strict';
import { init, entrevista, escolherFluxo, montarGate, planejar, TETO_TOKENS } from '../src/init.js';
import { detectarStacks, nomesDasStacks } from '../src/stack.js';
import { ADAPTADORES } from '../src/adaptadores.js';
import { sistemaReal } from '../src/sistema.js';
import { renderizar } from '../src/modelo.js';
import { lerConfigNes } from '../src/config.js';
import { lerAgentes } from '../src/agentes.js';
import { executar } from '../src/cli.js';
import { projeto, ler, existe, AGENTE_COMPLETO } from './ajuda.js';

const home = () => projeto();
const sisFalso = (codigos = {}) => ({ rodados: [], rodar(cmd) { this.rodados.push(cmd); return codigos[cmd] ?? 0; }, temComando: () => false });
/** perguntar que responde em ordem e guarda as perguntas. */
function roteiro(respostas) {
  const feitas = [];
  const fn = async (q) => { feitas.push(q); return respostas[feitas.length - 1] ?? ''; };
  fn.feitas = feitas;
  return fn;
}

test('renderizar: blocos de flags diferentes um dentro do outro', () => {
  assert.equal(renderizar('{{#a}}A{{#b}}B{{/b}}{{/a}}', { a: true, b: true }), 'AB');
  assert.equal(renderizar('{{#a}}A{{#b}}B{{/b}}{{/a}}', { a: true, b: false }), 'A');
  assert.equal(renderizar('{{#a}}A{{#b}}B{{/b}}{{/a}}', { a: false, b: true }), '');
});

test('detectarStacks: cada stack, com e sem teste, na raiz e nos apps', () => {
  const raiz = projeto({
    'package.json': '{"scripts":{"test":"node --test"}}',
    'apps/sem-teste/package.json': '{"scripts":{"test":"echo \\"Error: no test specified\\" && exit 1"}}',
    'apps/quebrado/package.json': '{x',
    'apps/web/package.json': '{"scripts":{"test":"vitest"}}',
    'apps/api/Api.dproj': '<x/>',
    'apps/py/pyproject.toml': '',
    'apps/go/go.mod': '',
    'apps/net/App.csproj': '',
    'apps/java/pom.xml': '',
    'apps/rs/Cargo.toml': '',
  });
  const s = detectarStacks(raiz);
  const por = Object.fromEntries(s.map((x) => [x.pasta, x]));
  assert.equal(por['.'].comando, 'npm test');
  assert.equal(por['apps/sem-teste'].comando, null);
  assert.equal(por['apps/quebrado'].comando, null);
  assert.equal(por['apps/web'].comando, 'npm --prefix apps/web test');
  assert.equal(por['apps/api'].stack, 'delphi');
  assert.match(por['apps/api'].confirmar, /DUnitX/);
  assert.equal(por['apps/py'].comando, 'pytest apps/py');
  assert.equal(por['apps/go'].comando, 'go test ./apps/go/...');
  assert.equal(por['apps/net'].comando, 'dotnet test apps/net');
  assert.equal(por['apps/java'].comando, 'mvn -f apps/java test');
  assert.equal(por['apps/rs'].comando, 'cargo test --manifest-path apps/rs/Cargo.toml');
  assert.deepEqual(nomesDasStacks(s).split(', ').sort(), ['delphi', 'dotnet', 'go', 'java', 'node', 'python', 'rust']);
  for (const [arquivo, comando] of [['pyproject.toml', 'pytest'], ['go.mod', 'go test ./...'], ['x.sln', 'dotnet test'], ['pom.xml', 'mvn test'], ['Cargo.toml', 'cargo test']]) {
    assert.equal(detectarStacks(projeto({ [arquivo]: '' }))[0].comando, comando);
  }
  assert.deepEqual(detectarStacks(projeto({ 'leia.txt': '' })), []);
});

test('adaptadores: detecção do OpenSpec, do Ponytail (plugin, settings, skill) e do harness', () => {
  const h = home();
  const ctx = (raiz, casa = h, sis = sisFalso()) => ({ raiz, home: casa, sis });
  assert.equal(ADAPTADORES.openspec.detectar(ctx(projeto())), false);
  assert.equal(ADAPTADORES.openspec.detectar(ctx(projeto({ 'openspec/x': '' }))), true);
  assert.equal(ADAPTADORES.openspec.detectar(ctx(projeto({ '.claude/commands/opsx/a.md': '' }))), true);
  assert.equal(ADAPTADORES.ponytail.detectar(ctx(projeto())), false);
  assert.equal(ADAPTADORES.ponytail.detectar(ctx(projeto(), projeto({ '.claude/plugins/installed_plugins.json': '{"plugins":{"ponytail@ponytail":[]}}' }))), true);
  assert.equal(ADAPTADORES.ponytail.detectar(ctx(projeto(), projeto({ '.claude/settings.json': '{"enabledPlugins":{"ponytail@x":true}}' }))), true);
  assert.equal(ADAPTADORES.ponytail.detectar(ctx(projeto({ '.claude/skills/ponytail/SKILL.md': '' }))), true);
  assert.equal(ADAPTADORES.ponytail.detectar(ctx(projeto({ 'skills/ponytail/SKILL.md': '' }))), true);
  assert.equal(ADAPTADORES.harness.detectar(ctx(projeto(), h, { temComando: (n) => n === 'tlc' })), true);
});

test('sistema real: comando existente, inexistente e execução', () => {
  assert.equal(sistemaReal.temComando('node'), true);
  assert.equal(sistemaReal.temComando('comando-que-nao-existe-nes'), false);
  assert.equal(sistemaReal.rodar('node -e "process.exit(0)"'), 0);
  assert.equal(sistemaReal.rodar('node -e "process.exit(3)"'), 3);
});

test('entrevista: padrões com --sim, respostas, Enter e nível inválido', async () => {
  const raiz = projeto();
  assert.deepEqual(await entrevista(raiz, { sim: true, stacks: [] }), { descricao: raiz.split(/[\\/]/).pop(), stack: 'não detectada', nivelAlvo: 'M2', aprovador: 'o responsável pelo projeto' });
  const r = await entrevista(raiz, { perguntar: roteiro(['Loja online', '', 'm4', 'Ana']), stacks: [{ stack: 'node' }] });
  assert.deepEqual(r, { descricao: 'Loja online', stack: 'node', nivelAlvo: 'M4', aprovador: 'Ana' });
  assert.equal((await entrevista(raiz, { perguntar: roteiro(['', '', 'M9', '']), stacks: [] })).nivelAlvo, 'M2');
});

test('escolherFluxo: pergunta OpenSpec e Ponytail; harness só com --com; --sem e --sim', async () => {
  const contexto = { raiz: projeto({ 'openspec/x': '' }), home: home(), sis: sisFalso() };
  const p = roteiro(['', 'n']);
  const r = await escolherFluxo({ perguntar: p, contexto });
  assert.deepEqual(r.fluxo, { openspec: true, ponytail: false, harness: false });
  assert.deepEqual(r.detectados, { openspec: true, ponytail: false, harness: false });
  assert.match(p.feitas[0], /OpenSpec.*\(instalado\)/);
  assert.match(p.feitas[1], /Ponytail.*\(não instalado\)/);
  assert.deepEqual((await escolherFluxo({ sim: true, com: ['harness'], sem: ['ponytail'], contexto })).fluxo, { openspec: true, ponytail: false, harness: true });
});

test('montarGate: comando detectado, Delphi perguntado, pulado e --sim', async () => {
  const stacks = [{ pasta: '.', comando: 'npm test' }, { pasta: 'apps/api', stack: 'delphi', comando: null, confirmar: 'DUnitX' }, { pasta: 'apps/x', comando: null }];
  assert.deepEqual(await montarGate(stacks, { perguntar: roteiro(['Tests.exe']) }), [{ pasta: '.', comando: 'npm test' }, { pasta: 'apps/api', comando: 'Tests.exe' }]);
  assert.deepEqual(await montarGate(stacks, { perguntar: roteiro(['']) }), [{ pasta: '.', comando: 'npm test' }]);
  assert.deepEqual(await montarGate(stacks, { sim: true }), [{ pasta: '.', comando: 'npm test' }]);
});

test('init --sim num projeto vazio: cria o time, passa 5/5 e cabe no teto', async () => {
  const raiz = projeto({ 'package.json': '{"scripts":{"test":"node --test"}}' });
  const r = await init(raiz, sisFalso(), { sim: true, home: home() });
  assert.equal(r.codigo, 0);
  for (const f of ['nes.json', '.claude/agents/nes-maestro.md', '.claude/agents/nes-executor.md', '.claude/agents/nes-crivo.md', 'docs/nes/METODOLOGIA.md', 'docs/nes/CAPITAL-COGNITIVO.md', '.cursor/rules/nes.mdc', 'AGENTS.md']) assert.ok(existe(raiz, f), f);
  assert.ok(lerAgentes(raiz).every((a) => a.avaliacao.completas === 5));
  assert.match(ler(raiz, 'AGENTS.md'), /`\/opsx:propose`[\s\S]*`\/ponytail-review`/);
  assert.match(ler(raiz, '.claude/agents/nes-crivo.md'), /`npm test` \(\.\)/);
  assert.match(r.texto, /OpenSpec está no fluxo, mas não instalado/);
  assert.match(r.texto, /Ponytail está no fluxo, mas não instalado/);
  const c = lerConfigNes(raiz);
  assert.deepEqual(c.papeis, { maestro: ['nes-maestro'], executor: ['nes-executor'], crivo: ['nes-crivo'] });
  assert.ok(planejar(projeto(), c).tokens <= TETO_TOKENS);
});

test('init interativo: adota agentes, acrescenta ao AGENTS.md, instala o OpenSpec e grava', async () => {
  const raiz = projeto({
    'AGENTS.md': '# Projeto\n',
    '.claude/agents/project-manager.md': AGENTE_COMPLETO.replace('name: fiscal', 'name: project-manager'),
    '.claude/agents/qa-specialist.md': '---\nname: qa-specialist\n---\n# QA',
    'apps/api/Api.dproj': '<x/>',
  });
  const sis = sisFalso();
  const p = roteiro(['Loja', 'delphi', 'M4', 'Ana', 's', '', 'Tests.exe', '', 's']);
  const r = await init(raiz, sis, { perguntar: p, home: home() });
  assert.equal(r.codigo, 0);
  assert.deepEqual(sis.rodados, ['npm install -g @fission-ai/openspec@latest', 'openspec init']);
  assert.match(r.texto, /✔ OpenSpec instalado/);
  assert.match(r.texto, /adotados mantêm o próprio arquivo/);
  assert.doesNotMatch(r.texto, /Arquivos:/);
  assert.match(p.feitas[7], /Aplicar\?/);
  const c = lerConfigNes(raiz);
  assert.equal(c.aprovador, 'Ana');
  assert.deepEqual(c.papeis.maestro, ['project-manager']);
  assert.deepEqual(c.papeis.crivo, ['qa-specialist']);
  assert.deepEqual(c.crivo.comandos, [{ pasta: 'apps/api', comando: 'Tests.exe' }]);
  assert.ok(!existe(raiz, '.claude/agents/nes-maestro.md'));
  assert.ok(existe(raiz, '.claude/agents/nes-cronista.md'));
  assert.match(ler(raiz, 'AGENTS.md'), /^# Projeto\n\n<!-- nes:inicio -->/);
  assert.match(ler(raiz, 'AGENTS.md'), /Cronista registra e arquiva/);
});

test('init: instalação que falha, recusa do plano e recusa de instalar', async () => {
  const raiz = projeto();
  const r = await init(raiz, sisFalso({ 'openspec init': 1 }), { perguntar: roteiro(['', '', '', '', '', 'n', '', 's']), home: home() });
  assert.match(r.texto, /✘ OpenSpec: falhou em "openspec init"/);
  const outra = projeto();
  assert.equal((await init(outra, sisFalso(), { perguntar: roteiro(['', '', '', '', 'n', 'n', 'n']), home: home() })).texto, 'Nada foi alterado.');
  assert.ok(!existe(outra, 'nes.json'));
  const terceira = projeto();
  const r3 = await init(terceira, sisFalso(), { perguntar: roteiro(['', '', '', '', '', 'n', '', 'n']), home: home() });
  assert.match(r3.texto, /npm install -g @fission-ai\/openspec@latest/);
});

test('init de novo: reaproveita o nes.json, não duplica a seção nem sobrescreve; --refazer pergunta de novo', async () => {
  const raiz = projeto({ 'package.json': '{"scripts":{"test":"node --test"}}' });
  await init(raiz, sisFalso(), { sim: true, home: home() });
  const antes = ler(raiz, 'AGENTS.md');
  const r = await init(raiz, sisFalso(), { sim: true, home: home() });
  assert.equal(ler(raiz, 'AGENTS.md'), antes);
  assert.match(r.texto, /nes\.json \(atualizado\)/);
  assert.doesNotMatch(r.texto, /\.claude\/agents\/nes-maestro\.md/);
  const p = roteiro(['', '', 'M3', '', 'n', 'n', 's']);
  await init(raiz, sisFalso(), { perguntar: p, refazer: true, home: home() });
  assert.equal(lerConfigNes(raiz).nivelAlvo, 'M3');
  assert.ok(existe(raiz, '.claude/agents/nes-arquiteto.md'));
  assert.equal(p.feitas.length, 7);
});

test('init: nes.json com fluxo e gate ausentes ainda pergunta essas partes', async () => {
  const raiz = projeto({ 'nes.json': JSON.stringify({ nivelAlvo: 'M2', descricao: 'x', stack: 'node', aprovador: 'Ana' }) });
  const p = roteiro(['n', 'n', 's']);
  await init(raiz, sisFalso(), { perguntar: p, home: home() });
  assert.equal(p.feitas.length, 3);
  assert.deepEqual(lerConfigNes(raiz).fluxo, { openspec: false, ponytail: false, harness: false });
});

test('init: acima do teto avisa; nes.json inválido e sem terminal recusam', async () => {
  const raiz = projeto();
  const config = { projeto: 'x', stack: 'node', aprovador: 'A'.repeat(4000), nivelAlvo: 'M4', fluxo: {}, crivo: { comandos: [] }, papeis: { maestro: ['nes-maestro'], executor: ['nes-executor'], crivo: ['nes-crivo'], arquiteto: ['nes-arquiteto'], cronista: ['nes-cronista'] } };
  assert.ok(planejar(raiz, config).tokens > TETO_TOKENS);
  const r = await init(projeto({ 'nes.json': JSON.stringify(config) }), sisFalso(), { sim: true, home: home() });
  assert.match(r.texto, /acima do teto/);
  assert.equal((await init(projeto({ 'nes.json': '{x' }), sisFalso(), { sim: true, home: home() })).codigo, 1);
});

test('cli: init com --sim, --com e --sem', async () => {
  const raiz = projeto();
  const r = await executar(['init', '--sim', '--com', 'harness', '--sem', 'ponytail'], { cwd: raiz, sis: sisFalso() });
  assert.equal(r.codigo, 0);
  assert.deepEqual(lerConfigNes(raiz).fluxo, { openspec: true, ponytail: false, harness: true });
  assert.match(r.texto, /Licença Elastic 2\.0/);
});
