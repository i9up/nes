// nes init: entrevista de 4 perguntas, adoção dos agentes que já existem, fluxo com OpenSpec/Ponytail e gate do Crivo.
// Mostra o plano e pergunta antes de gravar. Nunca sobrescreve arquivo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { medirProjeto, estimarTokens } from '@i9up/fengshui/src/medir.js';
import { resumo } from '@i9up/fengshui/src/relatorio.js';
import { lerAgentes } from './agentes.js';
import { lerConfigNes, gravarConfigNes, ARQUIVO_CONFIG } from './config.js';
import { papeisDoNivel, adotar, nomePapel, NIVEIS_ALVO } from './papeis.js';
import { detectarStacks, nomesDasStacks } from './stack.js';
import { ADAPTADORES } from './adaptadores.js';
import { renderizar, lerModelo, ARQUIVOS_DOCS } from './modelo.js';
import { frontmatter } from './frontmatter.js';
import { t, idioma } from './i18n.js';

export const TETO_TOKENS = 600;
const MARCA_SECAO = '<!-- nes:inicio -->';
const SIM = /^(s|sim|y|yes)$/i;

const contextoFixo = (raiz, home) => resumo(medirProjeto(raiz, { home })).fixoRaiz;
const crase = (nomes) => nomes.map((n) => `\`${n}\``).join(', ');
const nivelValido = (n) => (NIVEIS_ALVO.includes(String(n).toUpperCase()) ? String(n).toUpperCase() : 'M2');

async function simOuNao(perguntar, texto, padrao) {
  const r = String(await perguntar(`${texto} ${t(padrao ? 'i.simNao' : 'i.naoSim')} › `)).trim();
  return r ? SIM.test(r) : padrao;
}

/** As 4 perguntas do método, uma por vez, só para o que não veio por opção (`dadas`). Com --sim, os padrões. */
export async function entrevista(raiz, { perguntar, sim, stacks, dadas = {} }) {
  const padrao = { descricao: path.basename(raiz), stack: nomesDasStacks(stacks) || t('i.naoDetectada'), nivelAlvo: 'M2', aprovador: t('i.aprovadorPadrao') };
  const r = { ...padrao, ...dadas };
  if (!sim) {
    const p = async (campo, chave) => { if (!dadas[campo]) r[campo] = String(await perguntar(`${t(chave)} [${padrao[campo]}] › `)).trim() || padrao[campo]; };
    await p('descricao', 'i.q1');
    await p('stack', 'i.q2');
    await p('nivelAlvo', 'i.q3');
    await p('aprovador', 'i.q4');
  }
  return { ...r, nivelAlvo: nivelValido(r.nivelAlvo) };
}

/** "--teste apps/api=Tests.exe" vira { pasta, comando }; sem "=", vale para a raiz. */
export function lerTeste(valor) {
  const i = valor.indexOf('=');
  return i < 0 ? { pasta: '.', comando: valor.trim() } : { pasta: valor.slice(0, i).trim(), comando: valor.slice(i + 1).trim() };
}

/** O que só o humano sabe e a LLM não pode inventar (NES-002). */
const OBRIGATORIAS = { descricao: 'i.obrigDescricao', aprovador: 'i.obrigAprovador' };

/** OpenSpec e Ponytail entram no fluxo por padrão (pergunta uma vez); o harness só com --com harness. */
export async function escolherFluxo({ perguntar, sim, com = [], sem = [], contexto }) {
  const fluxo = {};
  const detectados = {};
  for (const [id, a] of Object.entries(ADAPTADORES)) {
    detectados[id] = a.detectar(contexto);
    if (sem.includes(id) || (!a.padrao && !com.includes(id))) fluxo[id] = false;
    else if (sim || com.includes(id)) fluxo[id] = true;
    else fluxo[id] = await simOuNao(perguntar, `${a.pergunta()} (${t(detectados[id] ? 'i.instalado' : 'i.naoInstalado')})`, true);
  }
  return { fluxo, detectados };
}

/** Comandos de teste do Crivo. Stack sem runner padrão (Delphi) pergunta o comando; sem perguntas, fica de fora. */
export async function montarGate(stacks, { perguntar, sim }) {
  const comandos = [];
  for (const s of stacks) {
    let comando = s.comando;
    if (!comando && s.confirmar && !sim) comando = String(await perguntar(t('i.qTeste', { pasta: s.pasta, stack: s.stack, dica: s.confirmar }))).trim();
    if (comando) comandos.push({ pasta: s.pasta, comando });
  }
  return comandos;
}

/** Arquivos a criar (só os que não existem), a seção do AGENTS.md e o custo em tokens fixos. */
export function planejar(raiz, config) {
  const papeis = papeisDoNivel(config.nivelAlvo);
  const nomes = (id) => config.papeis[id];
  const comandos = config.crivo.comandos;
  const docs = ARQUIVOS_DOCS[idioma()];
  const vars = {
    ...config.fluxo,
    ...Object.fromEntries(papeis.map((p) => [p.id, true])),
    projeto: config.projeto,
    stack: config.stack,
    aprovador: config.aprovador,
    nivel: config.nivelAlvo,
    delegados: papeis.filter((p) => p.id !== 'maestro').map((p) => crase(nomes(p.id))).join(', '),
    papeis: papeis.map((p) => `- ${nomePapel(p)}: ${crase(nomes(p.id))}`).join('\n'),
    gate: comandos.length ? comandos.map((c) => `  - \`${c.comando}\` (${c.pasta})`).join('\n') : t('i.gateVazio'),
    gateLinha: comandos.length ? crase(comandos.map((c) => c.comando)) : t('i.gateLinhaVazia'),
  };
  const arquivos = [
    ...papeis.filter((p) => nomes(p.id)[0] === `nes-${p.id}`).map((p) => ({ rel: `.claude/agents/nes-${p.id}.md`, conteudo: renderizar(lerModelo(`papeis/${p.id}.md`), vars) })),
    { rel: `docs/nes/${docs.metodologia}`, conteudo: lerModelo('METODOLOGIA.md') },
    { rel: `docs/nes/${docs.capital}`, conteudo: lerModelo('CAPITAL-COGNITIVO.md') },
    { rel: '.cursor/rules/nes.mdc', conteudo: lerModelo('nes.mdc') },
  ].filter((a) => !fs.existsSync(path.join(raiz, a.rel)));
  let agentsMd = '';
  try { agentsMd = fs.readFileSync(path.join(raiz, 'AGENTS.md'), 'utf8'); } catch { /* AGENTS.md ainda não existe */ }
  const secao = agentsMd.includes(MARCA_SECAO) ? '' : renderizar(lerModelo('agents-secao.md'), vars);
  const tokens = estimarTokens(secao) + arquivos.filter((a) => a.rel.startsWith('.claude/agents/')).reduce((s, a) => s + estimarTokens(frontmatter(a.conteudo).dados.description), 0);
  return { arquivos, secao, agentsMd, tokens };
}

/**
 * Três modos: interativo (perguntar), padrões (--sim) e agente (sem terminal: uma LLM passa as respostas por opções,
 * recebe a lista do que só o humano sabe e só grava com --aplicar).
 */
export async function init(raiz, sis, { perguntar = null, sim = false, com = [], sem = [], refazer = false, dadas = {}, testes = [], aplicar = false, home = os.homedir() } = {}) {
  const existente = lerConfigNes(raiz);
  if (existente?.invalido) return { texto: t('config.invalido', { arq: ARQUIVO_CONFIG }), codigo: 1 };
  const agente = !sim && !perguntar;
  const stacks = detectarStacks(raiz);
  const reaproveita = existente?.nivelAlvo && !refazer;

  const faltam = agente && !reaproveita ? Object.keys(OBRIGATORIAS).filter((c) => !dadas[c]) : [];
  if (faltam.length) {
    return {
      codigo: 2,
      texto: [t('i.modoAgente'), ...faltam.map((c) => `  ${t(OBRIGATORIAS[c])}`), t('i.opcionais', { stack: nomesDasStacks(stacks) || t('i.nenhuma') }), t('i.protocolo')].join('\n'),
    };
  }

  const l = [];
  const antes = contextoFixo(raiz, home);
  l.push(t('i.antes', { n: antes }));
  const semPerguntas = sim || agente;
  const respostas = reaproveita ? { ...existente, ...dadas, nivelAlvo: nivelValido(dadas.nivelAlvo ?? existente.nivelAlvo) } : await entrevista(raiz, { perguntar, sim: semPerguntas, stacks, dadas });
  const { fluxo, detectados } = reaproveita && existente.fluxo
    ? { fluxo: existente.fluxo, detectados: Object.fromEntries(Object.entries(ADAPTADORES).map(([id, a]) => [id, a.detectar({ raiz, home, sis })])) }
    : await escolherFluxo({ perguntar, sim: semPerguntas, com, sem, contexto: { raiz, home, sis } });
  const porPasta = new Map((reaproveita && existente.crivo?.comandos ? existente.crivo.comandos : await montarGate(stacks, { perguntar, sim: semPerguntas })).map((c) => [c.pasta, c]));
  for (const teste of testes) porPasta.set(teste.pasta, teste);
  const comandos = [...porPasta.values()];
  const semTeste = stacks.filter((s) => s.confirmar && !porPasta.has(s.pasta));

  const papeis = papeisDoNivel(respostas.nivelAlvo);
  const adotados = reaproveita && existente.papeis ? existente.papeis : adotar(lerAgentes(raiz), papeis);
  const config = {
    ...(existente ?? {}),
    versao: 1,
    idioma: idioma(),
    projeto: path.basename(raiz),
    descricao: respostas.descricao,
    stack: respostas.stack,
    nivelAlvo: respostas.nivelAlvo,
    aprovador: respostas.aprovador,
    papeis: Object.fromEntries(papeis.map((p) => [p.id, adotados[p.id] ?? [`nes-${p.id}`]])),
    fluxo,
    crivo: { ...(existente?.crivo ?? {}), comandos },
  };

  const plano = planejar(raiz, config);
  l.push('', t('i.time', { nivel: config.nivelAlvo, projeto: config.projeto }));
  for (const p of papeis) l.push(`  ${nomePapel(p).padEnd(10)} ${crase(config.papeis[p.id])}${config.papeis[p.id][0] === `nes-${p.id}` ? '' : t('i.adotado')}`);
  l.push(t('i.fluxo', { lista: Object.entries(fluxo).filter(([, v]) => v).map(([id]) => ADAPTADORES[id].nome).join(', ') || t('i.semApoio') }));
  l.push(t('i.gate', { lista: comandos.map((c) => c.comando).join('; ') || t('i.semComando') }));
  l.push('', t('i.arquivos'), `  ${ARQUIVO_CONFIG} (${t(existente ? 'i.atualizado' : 'i.novo')})`);
  for (const a of plano.arquivos) l.push(`  ${a.rel}`);
  if (plano.secao) l.push(`  AGENTS.md (${t(plano.agentsMd ? 'i.agentsAcrescenta' : 'i.agentsNovo')})`);
  l.push(t('i.custo', { n: plano.tokens }) + t(plano.tokens > TETO_TOKENS ? 'i.acimaTeto' : 'i.teto', { teto: TETO_TOKENS }));
  for (const s of semTeste) l.push(t('i.semTeste', { pasta: s.pasta, stack: s.stack, dica: s.confirmar }));

  if (agente && !aplicar) {
    l.push('', t('i.naoGravado'));
    return { texto: l.join('\n'), codigo: 0 };
  }
  if (!semPerguntas && !(await simOuNao(perguntar, `${l.join('\n')}\n\n${t('i.aplicar')}`, true))) return { texto: t('i.nadaAlterado'), codigo: 0 };
  if (!semPerguntas) l.length = 0; // no modo interativo o plano já apareceu na pergunta

  gravarConfigNes(raiz, config);
  for (const a of plano.arquivos) {
    fs.mkdirSync(path.dirname(path.join(raiz, a.rel)), { recursive: true });
    fs.writeFileSync(path.join(raiz, a.rel), a.conteudo, 'utf8');
  }
  if (plano.secao) fs.writeFileSync(path.join(raiz, 'AGENTS.md'), plano.agentsMd ? `${plano.agentsMd.trimEnd()}\n\n${plano.secao}` : plano.secao, 'utf8');

  for (const [id, a] of Object.entries(ADAPTADORES)) {
    if (!fluxo[id] || detectados[id]) continue;
    if (a.instalar && !semPerguntas && (await simOuNao(perguntar, t('i.instalarAgora', { nome: a.nome, cmds: a.instalar.join(t('i.eDepois')) }), false))) {
      const falhou = a.instalar.find((cmd) => sis.rodar(cmd, { cwd: raiz }) !== 0);
      l.push(falhou ? t('i.falhou', { nome: a.nome, cmd: falhou }) : t('i.instaladoOk', { nome: a.nome }));
    } else {
      l.push(t('i.noFluxo', { nome: a.nome }), ...(a.instalar ?? a.manual()).map((c) => `    ${c}`));
    }
  }
  const adotou = papeis.some((p) => config.papeis[p.id][0] !== `nes-${p.id}`);
  l.push('', t('i.depois', { n: contextoFixo(raiz, home), antes }));
  if (adotou) l.push(t('i.adotados'));
  if (agente) l.push(t('i.instaladoresAgente'));
  l.push(t('i.proximo'));
  return { texto: l.join('\n'), codigo: 0 };
}
