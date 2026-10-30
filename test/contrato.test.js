import test from 'node:test';
import assert from 'node:assert/strict';
import { frontmatter, listaFerramentas } from '../src/frontmatter.js';
import { avaliarContrato, secoesDoTexto, completo } from '../src/contrato.js';
import { AGENTE_COMPLETO } from './ajuda.js';

const motivo = (texto, n, opcoes) => avaliarContrato(texto, opcoes).secoes[n - 1].motivo;

test('frontmatter: chaves, listas, texto dobrado e aspas', () => {
  const { dados, corpo } = frontmatter('---\nname: "x"\ndescription: >-\n  linha um\n  linha dois\ntools:\n  - Read\n  - Bash\nsolta\n---\ncorpo');
  assert.equal(dados.name, 'x');
  assert.equal(dados.description, 'linha um linha dois');
  assert.deepEqual(dados.tools, ['Read', 'Bash']);
  assert.equal(corpo, 'corpo');
  assert.deepEqual(frontmatter('sem frontmatter'), { dados: {}, corpo: 'sem frontmatter' });
  assert.deepEqual(frontmatter('---\n  - orfao\n---\n').dados, {});
});

test('listaFerramentas: lista, texto com vírgulas e ausência', () => {
  assert.deepEqual(listaFerramentas(['Read']), ['Read']);
  assert.equal(listaFerramentas([]), null);
  assert.deepEqual(listaFerramentas('Read, Edit ,'), ['Read', 'Edit']);
  assert.equal(listaFerramentas(''), null);
  assert.equal(listaFerramentas(undefined), null);
});

test('secoesDoTexto ignora # dentro de bloco de código', () => {
  const s = secoesDoTexto('antes\n## A\ntexto\n```bash\n# comentario\n```\n### B\n');
  assert.deepEqual(s.map((x) => x.titulo), ['A', 'B']);
});

test('contrato completo passa as 5 seções', () => {
  const a = avaliarContrato(AGENTE_COMPLETO);
  assert.equal(a.completas, 5);
  assert.ok(completo(a));
  assert.equal(a.nome, 'fiscal');
  assert.ok(a.secoes.every((s) => s.motivo === ''));
});

test('seção 1: sem identidade, ou sem dizer o que não cobre', () => {
  assert.match(motivo('## Outra coisa\n', 1), /sem título/);
  assert.match(motivo('---\ndescription: faz tudo\n---\n', 1), /NÃO cobre/);
});

test('seção 2: tools ausente, "*", ou sem justificativa; fora do Claude não exige tools', () => {
  assert.match(motivo('---\nname: a\n---\n## Ferramentas\n- Read: x\n', 2), /herda todas/);
  assert.match(motivo('---\ntools: *\n---\n## Ferramentas\n- Read: x\n', 2), /herda todas/);
  assert.match(motivo('---\ntools: Read\n---\n## Ferramentas\nsó texto\n', 2), /justificativa/);
  assert.equal(motivo('## Ferramentas\n- Read: x\n', 2, { ferramentasNoArquivo: false }), '');
});

test('seção 3: ausente ou vazia', () => {
  assert.match(motivo('# x\n', 3), /sem a seção/);
  assert.match(motivo('## Contexto obrigatório\n\n## Outra\n', 3), /vazia/);
});

test('seção 4: ausente, sem nível, sem escalada', () => {
  assert.match(motivo('# x\n', 4), /sem a seção/);
  assert.match(motivo('## Perímetro de autonomia\nfaz sozinho\n', 4), /nível/);
  assert.match(motivo('## Perímetro de autonomia\nNível 3, sempre.\n', 4), /escalada/);
});

test('seção 5: ausente', () => {
  assert.match(motivo('# x\n', 5), /critério de avaliação/);
});
