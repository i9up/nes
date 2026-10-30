import test from 'node:test';
import assert from 'node:assert/strict';
import { contrato, modeloDeContrato } from '../src/comando-contrato.js';
import { lerAgentes, avaliarArquivo } from '../src/agentes.js';
import { executar, posicional, opcao } from '../src/cli.js';
import { projeto, ler, existe, AGENTE_COMPLETO } from './ajuda.js';
import path from 'node:path';

const MUITOS = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`.claude/agents/a${i}.md`, '---\nname: a' + i + '\n---\n# x\n']));

test('lerAgentes: sem pasta, e com agentes (gerado ou não)', () => {
  assert.deepEqual(lerAgentes(projeto()), []);
  const raiz = projeto({ '.claude/agents/fiscal.md': AGENTE_COMPLETO, '.claude/agents/b.md': '<!-- gerado por @i9up/nes -->\n# b', '.claude/agents/leia.txt': 'x' });
  const ag = lerAgentes(raiz);
  assert.deepEqual(ag.map((a) => [a.nome, a.gerado, a.arquivo]), [['b', true, '.claude/agents/b.md'], ['fiscal', false, '.claude/agents/fiscal.md']]);
});

test('avaliarArquivo fora de .claude/agents não exige tools e usa a pasta atual por padrão', () => {
  const raiz = projeto({ 'docs/papel.md': AGENTE_COMPLETO.replace('tools: Read, Bash\n', '') });
  assert.equal(avaliarArquivo(path.join(raiz, 'docs/papel.md'), { raiz }).avaliacao.completas, 5);
  assert.equal(avaliarArquivo(path.join(raiz, 'docs/papel.md')).nome, 'fiscal');
});

test('contrato: projeto sem agentes', () => {
  const r = contrato(projeto());
  assert.match(r.texto, /Nenhum agente/);
  assert.equal(r.total, 0);
});

test('contrato: lista com motivos (até 8 agentes) e resumo do que mais falta', () => {
  const raiz = projeto({ '.claude/agents/fiscal.md': AGENTE_COMPLETO, '.claude/agents/vago.md': '---\nname: vago\n---\n# Vago\n' });
  const r = contrato(raiz);
  assert.match(r.texto, /✔ ✔ ✔ ✔ ✔ {2}5\/5 {2}fiscal/);
  assert.match(r.texto, /✘ ✘ ✘ ✘ ✘ {2}0\/5 {2}vago/);
  assert.match(r.texto, /1\. sem título/);
  assert.match(r.texto, /1 de 2 agente\(s\)/);
  assert.match(r.texto, /O que mais falta/);
  assert.equal(r.completos, 1);
});

test('contrato: com mais de 8 agentes não detalha os motivos; todos completos não sugere nada', () => {
  assert.doesNotMatch(contrato(projeto(MUITOS)).texto, /1\. sem título/);
  const r = contrato(projeto({ '.claude/agents/fiscal.md': AGENTE_COMPLETO }));
  assert.doesNotMatch(r.texto, /O que mais falta|Detalhe de um agente/);
});

test('contrato: alvo por nome, por arquivo, inexistente; e JSON', () => {
  const raiz = projeto({ ...MUITOS, '.claude/agents/fiscal.md': AGENTE_COMPLETO, 'docs/papel.md': '# solto' });
  assert.match(contrato(raiz, { alvo: 'a1' }).texto, /1\. sem título/);
  assert.match(contrato(raiz, { alvo: 'docs/papel.md' }).texto, /0\/5 {2}papel/);
  assert.equal(contrato(raiz, { alvo: 'nao-existe' }).codigo, 1);
  const json = JSON.parse(contrato(raiz, { json: true }).texto);
  assert.equal(json.total, 10);
  assert.equal(json.completos, 1);
  assert.equal(json.agentes.find((a) => a.nome === 'fiscal').secoes.length, 5);
});

test('modeloDeContrato: cria o esqueleto, recusa nome inválido e nunca sobrescreve', () => {
  const raiz = projeto();
  assert.equal(modeloDeContrato(raiz, 'Nome Ruim').codigo, 1);
  assert.equal(modeloDeContrato(raiz, 'fiscal').codigo, 0);
  assert.match(ler(raiz, '.claude/agents/fiscal.md'), /name: fiscal/);
  assert.equal(modeloDeContrato(raiz, 'fiscal').codigo, 1);
  assert.ok(existe(raiz, '.claude/agents/fiscal.md'));
  assert.equal(contrato(raiz, { alvo: 'fiscal' }).completos, 0);
});

test('cli: opcao, posicional, ajuda, desconhecido, contrato, --modelo, --estrito e --pasta', async () => {
  assert.equal(opcao(['x', '--pasta', 'p'], '--pasta'), 'p');
  assert.equal(opcao(['x', '--pasta', '--json'], '--pasta', 'd'), 'd');
  assert.equal(posicional(['contrato', '--pasta', 'p', '--json', 'alvo']), 'alvo');
  assert.equal(posicional(['contrato']), '');
  assert.match((await executar([])).texto, /^NES · A Nova Engenharia/);
  assert.equal((await executar(['-h'])).codigo, 0);
  assert.equal((await executar(['--help'])).codigo, 0);
  assert.equal((await executar(['xyz'])).codigo, 1);
  const raiz = projeto({ '.claude/agents/vago.md': '# vago' });
  assert.equal((await executar(['contrato'], { cwd: raiz })).codigo, 0);
  assert.equal((await executar(['contrato', '--estrito', '--pasta', raiz])).codigo, 1);
  assert.equal((await executar(['contrato', '--estrito', '--pasta', projeto({ '.claude/agents/f.md': AGENTE_COMPLETO })])).codigo, 0);
  assert.equal((await executar(['contrato', 'nada'], { cwd: raiz })).codigo, 1);
  assert.equal((await executar(['contrato', '--modelo', 'novo'], { cwd: raiz })).codigo, 0);
  assert.equal((await executar(['contrato', '--json'], { cwd: raiz })).codigo, 0);
  assert.equal((await executar(['contrato'])).codigo, 0);
});
