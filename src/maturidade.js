// Maturidade NES (cap. 21): critérios mínimos e verificáveis de cada transição, separando o que o repositório prova
// (verificado) do que só a equipe sabe (declarado). Partes do projeto podem estar em níveis diferentes.
import fs from 'node:fs';
import path from 'node:path';
import { encontrarApps, lerConfig } from '@i9up/fengshui/src/medir.js';
import { completo } from './contrato.js';
import { PAPEIS, casaComPapel } from './papeis.js';
import { ARQUIVOS_DOCS } from './modelo.js';
import { t } from './i18n.js';

export const nomeNivel = (n) => t(`nivel.${n}`);
export const pergunta = (chave) => t(`p.${chave}`);
export const CHAVES_DECLARADAS = ['producao', 'coordenacao', 'abrangencia', 'metrica'];

const INSTRUCOES_IA = ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md', '.cursorrules', '.cursor/rules', '.github/copilot-instructions.md', '.claude'];
const BACKLOG = ['openspec/changes', 'openspec/specs', 'tasks', '.specs', 'backlog'];
const NEGATIVA = /^(n|n[ãa]o|no|none|nenhum[a]?|-)?$/i;

const existe = (raiz, rel) => fs.existsSync(path.join(raiz, rel));
const lerJson = (arquivo) => { try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { return {}; } };

/** Política de segurança formal: hooks antes da ferramenta ou regras de negação nas configurações do Claude Code. */
export function temPoliticaDeSeguranca(raiz) {
  return ['settings.json', 'settings.local.json'].some((f) => {
    const s = lerJson(path.join(raiz, '.claude', f));
    return Boolean(s.hooks?.PreToolUse?.length || s.permissions?.deny?.length);
  });
}

/** Trimestres distintos com registros datados (AAAA-MM-DD) no Capital Cognitivo (o arquivo de qualquer idioma). */
export function trimestresDoCapital(raiz) {
  const texto = Object.values(ARQUIVOS_DOCS).map(({ capital }) => {
    try { return fs.readFileSync(path.join(raiz, 'docs', 'nes', capital), 'utf8'); } catch { return ''; }
  }).join('\n');
  const trimestres = new Set([...texto.matchAll(/\b(20\d\d)-(\d\d)-\d\d\b/g)].map(([, a, m]) => `${a}T${Math.ceil(Number(m) / 3)}`));
  return trimestres.size;
}

const ehMaestro = (a) => a.nome === 'nes-maestro' || casaComPapel(PAPEIS[0], a);

/** Critérios de cada transição. estado: 'ok' (verificado), 'declarado' ou 'falta'. */
export function criterios(raiz, { agentes, config = {}, declarado = {} }) {
  const completos = agentes.filter((a) => completo(a.avaliacao));
  const verif = (ok, detalhe, dica) => ({ estado: ok ? 'ok' : 'falta', detalhe, dica });
  const decl = (chave) => (declarado[chave] ? { estado: 'declarado', detalhe: declarado[chave], chave } : { estado: 'falta', detalhe: t('m.naoDeclarado'), chave, dica: t('m.dicaDeclarar', { chave }) });
  const presentes = INSTRUCOES_IA.filter((f) => existe(raiz, f));
  const backlog = BACKLOG.filter((f) => existe(raiz, f));
  const gate = config.crivo?.comandos ?? [];
  const trimestres = trimestresDoCapital(raiz);
  const maestro = Boolean(config.papeis?.maestro?.length) || completos.some(ehMaestro);
  const seguranca = temPoliticaDeSeguranca(raiz);
  return [
    { de: 'M0', para: 'M1', itens: [
      { nome: t('m.usaIA'), ...verif(presentes.length, presentes.join(', ') || t('m.semInstrucoes'), t('m.dicaInstrucoes')) },
    ] },
    { de: 'M1', para: 'M2', itens: [
      { nome: t('m.contrato'), ...verif(completos.length >= 1, t('m.deAgentes', { c: completos.length, t: agentes.length }), t('m.dicaContrato')) },
      { nome: t('m.producao'), ...decl('producao') },
    ] },
    { de: 'M2', para: 'M3', itens: [
      { nome: t('m.dois'), ...verif(completos.length >= 2, t('m.comContrato', { c: completos.length }), t('m.dicaMaisUm')) },
      { nome: t('m.orquestracao'), ...verif(maestro, t(maestro ? 'm.haOrquestrador' : 'm.semOrquestrador'), t('m.dicaOrquestrador')) },
      { nome: t('m.coordenacao'), ...decl('coordenacao') },
    ] },
    { de: 'M3', para: 'M4', itens: [
      { nome: t('m.backlog'), ...verif(backlog.length, backlog.join(', ') || t('m.semBacklog'), t('m.dicaBacklog')) },
      { nome: t('m.gate'), ...verif(gate.length, gate.map((g) => g.comando).join('; ') || t('m.semGate'), t('m.dicaGate')) },
      { nome: t('m.seguranca'), ...verif(seguranca, t(seguranca ? 'm.comSeguranca' : 'm.semSeguranca'), t('m.dicaSeguranca')) },
      { nome: t('m.abrangencia'), ...decl('abrangencia') },
    ] },
    { de: 'M4', para: 'M5', itens: [
      { nome: t('m.capital'), ...verif(trimestres >= 2, t('m.trimestres', { n: trimestres }), t('m.dicaCapital')) },
      { nome: t('m.metrica'), ...decl('metrica') },
    ] },
  ];
}

/** Nível = última transição em que todos os critérios estão satisfeitos, em sequência. */
export function nivel(transicoes) {
  let atual = 'M0';
  for (const t of transicoes) {
    if (!t.itens.every((i) => i.estado !== 'falta')) break;
    atual = t.para;
  }
  return atual;
}

export function proximoCriterio(transicoes) {
  for (const t of transicoes) {
    const falta = t.itens.find((i) => i.estado === 'falta');
    if (falta) return { transicao: `${t.de}→${t.para}`, ...falta };
  }
  return null;
}

/** Nível de cada área (apps/, packages/, services/): agentes com contrato completo que citam a pasta. */
export function porArea(raiz, { agentes, transicoes }) {
  const apps = encontrarApps(raiz, lerConfig(raiz).ignorarApps);
  const global = nivel(transicoes);
  const m1 = transicoes[0].itens[0].estado === 'ok';
  const producao = transicoes[1].itens[1].estado !== 'falta';
  const orquestrado = transicoes[2].itens[1].estado === 'ok' && transicoes[2].itens[2].estado !== 'falta';
  return apps.map((app) => {
    const cobrem = agentes.filter((a) => completo(a.avaliacao) && a.texto.includes(app.relativo)).length;
    let n = m1 ? 'M1' : 'M0';
    if (n === 'M1' && cobrem >= 1 && producao) n = 'M2';
    if (n === 'M2' && cobrem >= 2 && orquestrado) n = 'M3';
    if (n === 'M3' && global > 'M3') n = global;
    return { area: app.relativo, nivel: n, agentes: cobrem };
  });
}

export const respostaNegativa = (texto) => NEGATIVA.test(String(texto ?? '').trim());
