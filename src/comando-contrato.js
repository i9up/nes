// nes contrato: confere as 5 seções do contrato de cada agente (cap. 8) e cria o esqueleto de um contrato novo.
import fs from 'node:fs';
import path from 'node:path';
import { lerAgentes, avaliarArquivo } from './agentes.js';
import { SECOES, completo, nomeSecao } from './contrato.js';
import { lerModelo } from './modelo.js';
import { t } from './i18n.js';

const rel = (raiz, arquivo) => path.relative(raiz, arquivo).split(path.sep).join('/');

export function contrato(raiz, { alvo = '', json = false } = {}) {
  let agentes = lerAgentes(raiz);
  if (alvo) {
    const arquivo = path.resolve(raiz, alvo);
    agentes = fs.existsSync(arquivo) && fs.statSync(arquivo).isFile() ? [avaliarArquivo(arquivo, { raiz })] : agentes.filter((a) => a.nome === alvo);
    if (!agentes.length) return { texto: t('cc.alvoNaoEncontrado', { alvo }), codigo: 1 };
  }
  const completos = agentes.filter((a) => completo(a.avaliacao)).length;
  if (json) {
    const dados = agentes.map((a) => ({ nome: a.nome, arquivo: a.arquivo, completas: a.avaliacao.completas, secoes: a.avaliacao.secoes }));
    return { texto: JSON.stringify({ agentes: dados, completos, total: agentes.length }, null, 2), codigo: 0, completos, total: agentes.length };
  }
  if (!agentes.length) return { texto: t('cc.nenhum'), codigo: 0, completos: 0, total: 0 };

  const l = [t('cc.cabecalho'), ''];
  for (const a of agentes) {
    const marcas = a.avaliacao.secoes.map((s) => (s.ok ? '✔' : '✘')).join(' ');
    l.push(`  ${marcas}  ${a.avaliacao.completas}/5  ${a.nome}`);
    if (alvo || agentes.length <= 8) for (const s of a.avaliacao.secoes.filter((x) => !x.ok)) l.push(`             ${s.n}. ${s.motivo}`);
  }
  const faltas = SECOES.map((s) => ({ nome: nomeSecao(s.n), qtd: agentes.filter((a) => !a.avaliacao.secoes[s.n - 1].ok).length })).filter((s) => s.qtd);
  l.push('', t('cc.resumo', { c: completos, t: agentes.length }));
  if (faltas.length) l.push(t('cc.maisFalta', { lista: faltas.sort((x, y) => y.qtd - x.qtd).map((s) => `${s.nome} (${s.qtd})`).join(', ') }));
  if (completos < agentes.length) l.push(t('cc.dica'));
  return { texto: l.join('\n'), codigo: 0, completos, total: agentes.length };
}

/** Cria .claude/agents/<nome>.md com as 5 seções em branco. Nunca sobrescreve. */
export function modeloDeContrato(raiz, nome) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(nome)) return { texto: t('cc.nomeInvalido'), codigo: 1 };
  const arquivo = path.join(raiz, '.claude', 'agents', `${nome}.md`);
  if (fs.existsSync(arquivo)) return { texto: t('cc.jaExiste', { arq: rel(raiz, arquivo) }), codigo: 1 };
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, lerModelo('contrato.md').replaceAll('{{nome}}', nome), 'utf8');
  return { texto: t('cc.criado', { arq: rel(raiz, arquivo), nome }), codigo: 0 };
}
