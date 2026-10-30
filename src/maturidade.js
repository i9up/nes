// Maturidade NES (cap. 21): critérios mínimos e verificáveis de cada transição, separando o que o repositório prova
// (verificado) do que só a equipe sabe (declarado). Partes do projeto podem estar em níveis diferentes.
import fs from 'node:fs';
import path from 'node:path';
import { encontrarApps, lerConfig } from '@i9up/fengshui/src/medir.js';
import { completo } from './contrato.js';
import { PAPEIS } from './papeis.js';

export const NOMES = { M0: 'Sem IA', M1: 'Assistentes', M2: 'Agentes Especializados', M3: 'Times de Agentes', M4: 'Software Factory Inteligente', M5: 'Organização Cognitiva' };

export const PERGUNTAS = {
  producao: 'Algum agente com contrato completo roda em trabalho real? Onde se vê o resultado (PRs, log, painel)?',
  coordenacao: 'A coordenação entre os agentes acontece sem alguém repassar o trabalho à mão? Como?',
  abrangencia: 'Backlog, gate de qualidade e segurança valem além da primeira área do projeto? Em quais?',
  metrica: 'Que métrica mostra a qualidade subindo pelo próprio uso, trimestre a trimestre?',
};

const INSTRUCOES_IA = ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md', '.cursorrules', '.cursor/rules', '.github/copilot-instructions.md', '.claude'];
const BACKLOG = ['openspec/changes', 'openspec/specs', 'tasks', '.specs', 'backlog'];
const NEGATIVA = /^(n|n[ãa]o|no|nenhum[a]?|-)?$/i;

const existe = (raiz, rel) => fs.existsSync(path.join(raiz, rel));
const lerJson = (arquivo) => { try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { return {}; } };

/** Política de segurança formal: hooks antes da ferramenta ou regras de negação nas configurações do Claude Code. */
export function temPoliticaDeSeguranca(raiz) {
  return ['settings.json', 'settings.local.json'].some((f) => {
    const s = lerJson(path.join(raiz, '.claude', f));
    return Boolean(s.hooks?.PreToolUse?.length || s.permissions?.deny?.length);
  });
}

/** Trimestres distintos com registros datados (AAAA-MM-DD) no Capital Cognitivo. */
export function trimestresDoCapital(raiz) {
  let texto = '';
  try { texto = fs.readFileSync(path.join(raiz, 'docs', 'nes', 'CAPITAL-COGNITIVO.md'), 'utf8'); } catch { return 0; }
  const trimestres = new Set([...texto.matchAll(/\b(20\d\d)-(\d\d)-\d\d\b/g)].map(([, a, m]) => `${a}T${Math.ceil(Number(m) / 3)}`));
  return trimestres.size;
}

const ehMaestro = (a) => a.nome === 'nes-maestro' || PAPEIS[0].adotar.test(`${a.nome} ${a.descricao}`);

/** Critérios de cada transição. estado: 'ok' (verificado), 'declarado' ou 'falta'. */
export function criterios(raiz, { agentes, config = {}, declarado = {} }) {
  const completos = agentes.filter((a) => completo(a.avaliacao));
  const verif = (ok, detalhe, dica) => ({ estado: ok ? 'ok' : 'falta', detalhe, dica });
  const decl = (chave) => (declarado[chave] ? { estado: 'declarado', detalhe: declarado[chave], chave } : { estado: 'falta', detalhe: 'não declarado', chave, dica: 'responda em `nes maturidade` (modo interativo)' });
  const presentes = INSTRUCOES_IA.filter((f) => existe(raiz, f));
  const backlog = BACKLOG.filter((f) => existe(raiz, f));
  const gate = config.crivo?.comandos ?? [];
  const trimestres = trimestresDoCapital(raiz);
  const maestro = Boolean(config.papeis?.maestro?.length) || completos.some(ehMaestro);
  const seguranca = temPoliticaDeSeguranca(raiz);
  return [
    { de: 'M0', para: 'M1', itens: [
      { nome: 'parte da equipe usa IA regularmente', ...verif(presentes.length, presentes.join(', ') || 'nenhum arquivo de instruções para IA', 'crie CLAUDE.md ou AGENTS.md') },
    ] },
    { de: 'M1', para: 'M2', itens: [
      { nome: 'agente com contrato completo (5 seções)', ...verif(completos.length >= 1, `${completos.length} de ${agentes.length} agente(s)`, 'rode `nes contrato` e complete as seções') },
      { nome: 'em uso real, com observabilidade mínima', ...decl('producao') },
    ] },
    { de: 'M2', para: 'M3', itens: [
      { nome: 'dois ou mais especialistas com contrato', ...verif(completos.length >= 2, `${completos.length} com contrato completo`, 'complete o contrato de mais um especialista') },
      { nome: 'orquestração formal (Maestro)', ...verif(maestro, maestro ? 'há um orquestrador' : 'nenhum orquestrador com contrato', 'rode `nes init` ou complete o contrato do orquestrador') },
      { nome: 'coordenação sem repasse heroico', ...decl('coordenacao') },
    ] },
    { de: 'M3', para: 'M4', itens: [
      { nome: 'backlog estruturado', ...verif(backlog.length, backlog.join(', ') || 'sem openspec/ nem tasks/', 'use o OpenSpec (`openspec init`)') },
      { nome: 'gate de qualidade do Crivo', ...verif(gate.length, gate.map((g) => g.comando).join('; ') || 'sem comandos em nes.json', 'rode `nes init` para configurar o gate') },
      { nome: 'segurança formal', ...verif(seguranca, seguranca ? 'hooks PreToolUse ou permissions.deny em .claude/' : 'nenhuma regra de negação nem hook antes das ferramentas', 'configure permissions.deny ou o harness-toolkit') },
      { nome: 'aplicado além da primeira área', ...decl('abrangencia') },
    ] },
    { de: 'M4', para: 'M5', itens: [
      { nome: 'Capital Cognitivo com histórico de 2+ trimestres', ...verif(trimestres >= 2, `${trimestres} trimestre(s) com registro`, 'o Cronista registra em docs/nes/CAPITAL-COGNITIVO.md') },
      { nome: 'qualidade melhora pelo uso, com métrica', ...decl('metrica') },
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
