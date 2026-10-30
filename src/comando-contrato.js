// nes contrato: confere as 5 seções do contrato de cada agente (cap. 8) e cria o esqueleto de um contrato novo.
import fs from 'node:fs';
import path from 'node:path';
import { lerAgentes, avaliarArquivo } from './agentes.js';
import { SECOES, completo } from './contrato.js';
import { lerModelo } from './modelo.js';

export function contrato(raiz, { alvo = '', json = false } = {}) {
  let agentes = lerAgentes(raiz);
  if (alvo) {
    const arquivo = path.resolve(raiz, alvo);
    agentes = fs.existsSync(arquivo) && fs.statSync(arquivo).isFile() ? [avaliarArquivo(arquivo, { raiz })] : agentes.filter((a) => a.nome === alvo);
    if (!agentes.length) return { texto: `Nenhum agente "${alvo}" em .claude/agents/ nem arquivo com esse caminho.`, codigo: 1 };
  }
  const completos = agentes.filter((a) => completo(a.avaliacao)).length;
  if (json) {
    const dados = agentes.map((a) => ({ nome: a.nome, arquivo: a.arquivo, completas: a.avaliacao.completas, secoes: a.avaliacao.secoes.map(({ n, nome, ok, motivo }) => ({ n, nome, ok, motivo })) }));
    return { texto: JSON.stringify({ agentes: dados, completos, total: agentes.length }, null, 2), codigo: 0, completos, total: agentes.length };
  }
  if (!agentes.length) return { texto: 'Nenhum agente em .claude/agents/. Rode `nes init` para montar o time, ou `nes contrato --modelo <nome>`.', codigo: 0, completos: 0, total: 0 };

  const l = ['NES · contrato de agente (cap. 8): 1 identidade e escopo · 2 ferramentas · 3 contexto · 4 autonomia · 5 avaliação', ''];
  for (const a of agentes) {
    const marcas = a.avaliacao.secoes.map((s) => (s.ok ? '✔' : '✘')).join(' ');
    l.push(`  ${marcas}  ${a.avaliacao.completas}/5  ${a.nome}`);
    if (alvo || agentes.length <= 8) for (const s of a.avaliacao.secoes.filter((x) => !x.ok)) l.push(`             ${s.n}. ${s.motivo}`);
  }
  const faltas = SECOES.map((s) => ({ ...s, qtd: agentes.filter((a) => !a.avaliacao.secoes[s.n - 1].ok).length })).filter((s) => s.qtd);
  l.push('', `${completos} de ${agentes.length} agente(s) com contrato completo.`);
  if (faltas.length) l.push(`O que mais falta: ${faltas.sort((x, y) => y.qtd - x.qtd).map((s) => `${s.nome} (${s.qtd})`).join(', ')}.`);
  if (completos < agentes.length) l.push('Detalhe de um agente: `nes contrato <nome>`. Esqueleto de contrato: `nes contrato --modelo <nome>`.');
  return { texto: l.join('\n'), codigo: 0, completos, total: agentes.length };
}

/** Cria .claude/agents/<nome>.md com as 5 seções em branco. Nunca sobrescreve. */
export function modeloDeContrato(raiz, nome) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(nome)) return { texto: 'Nome do agente: letras minúsculas, números e hífen (ex.: fiscal-especialista).', codigo: 1 };
  const arquivo = path.join(raiz, '.claude', 'agents', `${nome}.md`);
  if (fs.existsSync(arquivo)) return { texto: `Já existe ${path.relative(raiz, arquivo)}; nada foi alterado.`, codigo: 1 };
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, lerModelo('contrato.md').replaceAll('{{nome}}', nome), 'utf8');
  return { texto: `Criado ${path.relative(raiz, arquivo).split(path.sep).join('/')}. Preencha as 5 seções e confira com \`nes contrato ${nome}\`.`, codigo: 0 };
}
