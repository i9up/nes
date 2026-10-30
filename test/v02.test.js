// v0.2: modo agente (uma LLM conduz sem terminal), --declarar e os dois idiomas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { detectarIdioma, normalizarIdioma, definirIdioma, idioma, t, CHAVES } from '../src/i18n.js';
import { init, lerTeste } from '../src/init.js';
import { maturidade, lerDeclaracoes } from '../src/comando-maturidade.js';
import { CHAVES_DECLARADAS } from '../src/maturidade.js';
import { lerAgentes } from '../src/agentes.js';
import { lerConfigNes } from '../src/config.js';
import { executar, normalizar, opcoes } from '../src/cli.js';
import { PAPEIS } from '../src/papeis.js';
import { renderizar, lerModelo } from '../src/modelo.js';
import { avaliarContrato } from '../src/contrato.js';
import { frontmatter } from '../src/frontmatter.js';
import { estimarTokens } from '@i9up/fengshui/src/medir.js';
import { projeto, ler, existe, AGENTE_COMPLETO } from './ajuda.js';

const home = () => projeto();
const sis = { rodar: () => 0, temComando: () => false };
const emIngles = async (fn) => { definirIdioma('en'); try { return await fn(); } finally { definirIdioma('pt'); } };

test('i18n: detecção pelo ambiente e pelo sistema, normalização e chaves iguais nos dois idiomas', () => {
  assert.equal(detectarIdioma({ NES_IDIOMA: 'en' }, 'pt-BR'), 'en');
  assert.equal(detectarIdioma({ LC_ALL: 'pt_BR.UTF-8' }, 'en-US'), 'pt');
  assert.equal(detectarIdioma({ LC_MESSAGES: 'de_DE' }, 'pt-BR'), 'en');
  assert.equal(detectarIdioma({ LANG: 'pt_PT' }, 'en-US'), 'pt');
  assert.equal(detectarIdioma({}, 'pt-BR'), 'pt');
  assert.equal(detectarIdioma({}, 'ja-JP'), 'en');
  assert.equal(typeof detectarIdioma(), 'string');
  assert.equal(normalizarIdioma('pt-BR'), 'pt');
  assert.equal(normalizarIdioma('fr'), 'en');
  assert.deepEqual(CHAVES.en, CHAVES.pt);
  assert.equal(t('cc.resumo', { c: 1 }), '1 de {t} agente(s) com contrato completo.');
  assert.equal(idioma(), 'pt');
});

for (const lingua of ['pt', 'en']) {
  test(`modelos em ${lingua}: os 5 papéis passam 5/5 e cabem no orçamento de descrições`, async () => {
    definirIdioma(lingua);
    try {
      let tokens = 0;
      for (const papel of PAPEIS) {
        for (const flags of [{ openspec: true, ponytail: true, arquiteto: true }, {}]) {
          const texto = renderizar(lerModelo(`papeis/${papel.id}.md`), { projeto: 'X', stack: 'node', aprovador: 'Ana', delegados: 'a', gate: '  - `npm test`', ...flags });
          assert.equal(avaliarContrato(texto).completas, 5, `${lingua}/${papel.id}`);
          assert.doesNotMatch(texto, /\{\{/);
        }
        tokens += estimarTokens(frontmatter(lerModelo(`papeis/${papel.id}.md`)).dados.description);
      }
      assert.ok(tokens <= 300, `${lingua}: ${tokens}`);
      assert.match(lerModelo('ajuda.txt'), /nes/);
      assert.match(lerModelo('agente.md'), /NES-002/);
    } finally {
      definirIdioma('pt');
    }
  });
}

test('modo agente: sem as respostas obrigatórias, lista o que perguntar ao humano (código 2) sem gravar nada', async () => {
  const raiz = projeto({ 'package.json': '{"scripts":{"test":"vitest"}}' });
  const r = await init(raiz, sis, { home: home() });
  assert.equal(r.codigo, 2);
  assert.match(r.texto, /--descricao/);
  assert.match(r.texto, /--aprovador/);
  assert.match(r.texto, /detectada: node/);
  assert.ok(!existe(raiz, 'nes.json'));
  const so = await init(raiz, sis, { dadas: { descricao: 'Loja' }, home: home() });
  assert.doesNotMatch(so.texto, /--descricao/);
  assert.match((await init(projeto(), sis, { home: home() })).texto, /detectada: nenhuma/);
});

test('modo agente: com as respostas mostra o plano sem gravar; com --aplicar grava e não instala nada', async () => {
  const raiz = projeto({ 'apps/api/Api.dproj': '<x/>', 'apps/web/package.json': '{"scripts":{"test":"vitest"}}' });
  const dadas = { descricao: 'ERP', aprovador: 'Ana', nivelAlvo: 'm3', stack: 'delphi, node' };
  const plano = await init(raiz, sis, { dadas, home: home() });
  assert.equal(plano.codigo, 0);
  assert.match(plano.texto, /Nada foi gravado/);
  assert.match(plano.texto, /⚠ apps\/api \(delphi\) sem comando de teste/);
  assert.ok(!existe(raiz, 'nes.json'));
  const feito = await init(raiz, { rodar: () => { throw new Error('não deveria instalar'); }, temComando: () => false }, { dadas, testes: [lerTeste('apps/api=Tests.exe')], aplicar: true, home: home() });
  assert.match(feito.texto, /só com a permissão do humano/);
  const c = lerConfigNes(raiz);
  assert.equal(c.nivelAlvo, 'M3');
  assert.equal(c.idioma, 'pt');
  assert.deepEqual(c.crivo.comandos.map((x) => x.pasta).sort(), ['apps/api', 'apps/web']);
  assert.ok(existe(raiz, '.claude/agents/nes-arquiteto.md'));
});

test('modo agente com nes.json existente: não pede as obrigatórias de novo e aceita trocar o nível', async () => {
  const raiz = projeto();
  await init(raiz, sis, { sim: true, home: home() });
  const r = await init(raiz, sis, { dadas: { nivelAlvo: 'M4' }, aplicar: true, home: home() });
  assert.equal(r.codigo, 0);
  assert.equal(lerConfigNes(raiz).nivelAlvo, 'M4');
  assert.ok(existe(raiz, '.claude/agents/nes-cronista.md'));
});

test('lerTeste: com e sem pasta', () => {
  assert.deepEqual(lerTeste(' npm test '), { pasta: '.', comando: 'npm test' });
  assert.deepEqual(lerTeste('apps/x = go test ./...'), { pasta: 'apps/x', comando: 'go test ./...' });
});

test('lerDeclaracoes: válidas, chave desconhecida, sem "=" e negativa', () => {
  assert.deepEqual(lerDeclaracoes(['producao=PRs no GitHub', 'outra=x', 'semigual', 'metrica=não'], CHAVES_DECLARADAS), { producao: 'PRs no GitHub' });
});

test('maturidade em modo agente: lista as pendências e grava o que for declarado', async () => {
  const raiz = projeto({ 'CLAUDE.md': '#', '.claude/agents/a.md': AGENTE_COMPLETO });
  const antes = await maturidade(raiz);
  assert.match(antes.texto, /Pergunte ao humano/);
  assert.match(antes.texto, /--declarar producao=/);
  assert.equal(JSON.parse((await maturidade(raiz, { json: true })).texto).pendentes[0].chave, 'producao');
  const depois = await maturidade(raiz, { declarar: { producao: 'PRs no GitHub' } });
  assert.match(depois.texto, /Nível do projeto: M2/);
  assert.match(depois.texto, /Respostas gravadas/);
  assert.equal(lerConfigNes(raiz).declarado.producao, 'PRs no GitHub');
});

test('em inglês: contrato, maturidade e init (arquivos com nomes em inglês)', () => emIngles(async () => {
  const raiz = projeto({ '.claude/agents/vago.md': '# vago', '.claude/agents/ok.md': AGENTE_COMPLETO });
  const c = (await executar(['contract', '--lang', 'en'], { cwd: raiz })).texto;
  assert.match(c, /agent contract \(ch\. 8\)/);
  assert.match(c, /no identity\/scope heading/);
  definirIdioma('en');
  const m = (await maturidade(raiz)).texto;
  assert.match(m, /Project level: M1 \(Assistants\)/);
  assert.match(m, /Ask the human/);
  assert.match(m, /nes maturity --declare producao=/);
  const nova = projeto();
  const r = await init(nova, sis, { sim: true, home: home() });
  assert.match(r.texto, /NES team M2/);
  assert.ok(existe(nova, 'docs/nes/METHODOLOGY.md'));
  assert.ok(existe(nova, 'docs/nes/COGNITIVE-CAPITAL.md'));
  assert.match(ler(nova, 'AGENTS.md'), /## NES team \(M2\)/);
  assert.equal(lerConfigNes(nova).idioma, 'en');
  assert.ok(lerAgentes(nova).every((a) => a.avaliacao.completas === 5));
  assert.match((await init(projeto(), sis, { home: home() })).texto, /Agent mode/);
}));

test('cli: nomes em inglês, opções repetidas, idioma do nes.json e do ambiente, agente e modo agente', async () => {
  assert.deepEqual(normalizar(['maturity', '--apply', '--dir', 'x', '--json']), ['maturidade', '--aplicar', '--pasta', 'x', '--json']);
  assert.deepEqual(opcoes(['init', '--teste', 'a=1', '--teste', 'b=2', '--teste'], '--teste'), ['a=1', 'b=2']);
  const raiz = projeto({ 'nes.json': JSON.stringify({ idioma: 'en' }) });
  assert.match((await executar(['help'], { cwd: raiz })).texto, /^NES · The New Software Engineering/);
  assert.match((await executar(['agent'], { cwd: projeto(), env: { NES_IDIOMA: 'pt' } })).texto, /protocolo para um agente/);
  assert.match((await executar(['ajuda'], { cwd: projeto({ 'nes.json': '{x' }), env: { NES_IDIOMA: 'en' } })).texto, /^NES · The New/);
  definirIdioma('pt');
  const alvo = projeto({ 'CLAUDE.md': '#' });
  const agente = await executar(['init', '--descricao', 'Loja', '--aprovador', 'Ana', '--nivel', 'M2', '--stack', 'node', '--teste', 'npm test', '--aplicar'], { cwd: alvo, sis, env: { NES_IDIOMA: 'pt' } });
  assert.equal(agente.codigo, 0);
  assert.deepEqual(lerConfigNes(alvo).crivo.comandos, [{ pasta: '.', comando: 'npm test' }]);
  const declarado = await executar(['maturidade', '--declarar', 'producao=PRs'], { cwd: alvo, env: { NES_IDIOMA: 'pt' } });
  assert.match(declarado.texto, /Respostas gravadas/);
});
