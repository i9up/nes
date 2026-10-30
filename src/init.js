// nes init: entrevista de 4 perguntas, adoção dos agentes que já existem, fluxo com OpenSpec/Ponytail e gate do Crivo.
// Mostra o plano e pergunta antes de gravar. Nunca sobrescreve arquivo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { medirProjeto, estimarTokens } from '@i9up/fengshui/src/medir.js';
import { resumo } from '@i9up/fengshui/src/relatorio.js';
import { lerAgentes } from './agentes.js';
import { lerConfigNes, gravarConfigNes, ARQUIVO_CONFIG } from './config.js';
import { papeisDoNivel, adotar, NIVEIS_ALVO } from './papeis.js';
import { detectarStacks, nomesDasStacks } from './stack.js';
import { ADAPTADORES } from './adaptadores.js';
import { renderizar, lerModelo } from './modelo.js';
import { frontmatter } from './frontmatter.js';

export const TETO_TOKENS = 600;
const MARCA_SECAO = '<!-- nes:inicio -->';
const SIM = /^(s|sim|y|yes)$/i;

const contextoFixo = (raiz, home) => resumo(medirProjeto(raiz, { home })).fixoRaiz;
const crase = (nomes) => nomes.map((n) => `\`${n}\``).join(', ');

async function simOuNao(perguntar, texto, padrao) {
  const r = String(await perguntar(`${texto} [${padrao ? 'S/n' : 's/N'}] › `)).trim();
  return r ? SIM.test(r) : padrao;
}

/** As 4 perguntas do método, uma por vez. Com --sim, os padrões. */
export async function entrevista(raiz, { perguntar, sim, stacks }) {
  const padrao = { descricao: path.basename(raiz), stack: nomesDasStacks(stacks) || 'não detectada', nivelAlvo: 'M2', aprovador: 'o responsável pelo projeto' };
  if (sim) return padrao;
  const p = async (q, valor) => String(await perguntar(`${q} [${valor}] › `)).trim() || valor;
  const descricao = await p('1/4 Qual é o projeto e o que ele faz, em uma frase?', padrao.descricao);
  const stack = await p('2/4 Qual é a stack principal?', padrao.stack);
  const nivel = (await p('3/4 Nível para começar: M2 (Maestro, Executor, Crivo), M3 (+ Arquiteto) ou M4 (+ Cronista)? Na dúvida, M2.', 'M2')).toUpperCase();
  const aprovador = await p('4/4 Quem aprova o que for escalado (nome ou papel)?', padrao.aprovador);
  return { descricao, stack, nivelAlvo: NIVEIS_ALVO.includes(nivel) ? nivel : 'M2', aprovador };
}

/** OpenSpec e Ponytail entram no fluxo por padrão (pergunta uma vez); o harness só com --com harness. */
export async function escolherFluxo({ perguntar, sim, com = [], sem = [], contexto }) {
  const fluxo = {};
  const detectados = {};
  for (const [id, a] of Object.entries(ADAPTADORES)) {
    detectados[id] = a.detectar(contexto);
    if (sem.includes(id) || (!a.padrao && !com.includes(id))) fluxo[id] = false;
    else if (sim || com.includes(id)) fluxo[id] = true;
    else fluxo[id] = await simOuNao(perguntar, `${a.pergunta} (${detectados[id] ? 'instalado' : 'não instalado'})`, true);
  }
  return { fluxo, detectados };
}

/** Comandos de teste do Crivo. Delphi (sem runner padrão) pergunta o comando; com --sim, fica de fora. */
export async function montarGate(stacks, { perguntar, sim }) {
  const comandos = [];
  for (const s of stacks) {
    let comando = s.comando;
    if (!comando && s.confirmar && !sim) comando = String(await perguntar(`Comando de teste de ${s.pasta} (${s.stack}; ${s.confirmar})? Enter para pular › `)).trim();
    if (comando) comandos.push({ pasta: s.pasta, comando });
  }
  return comandos;
}

/** Arquivos a criar (só os que não existem), a seção do AGENTS.md e o custo em tokens fixos. */
export function planejar(raiz, config) {
  const papeis = papeisDoNivel(config.nivelAlvo);
  const nomes = (id) => config.papeis[id];
  const comandos = config.crivo.comandos;
  const vars = {
    ...config.fluxo,
    ...Object.fromEntries(papeis.map((p) => [p.id, true])),
    projeto: config.projeto,
    stack: config.stack,
    aprovador: config.aprovador,
    nivel: config.nivelAlvo,
    delegados: papeis.filter((p) => p.id !== 'maestro').map((p) => crase(nomes(p.id))).join(', '),
    papeis: papeis.map((p) => `- ${p.nome}: ${crase(nomes(p.id))}`).join('\n'),
    gate: comandos.length ? comandos.map((c) => `  - \`${c.comando}\` (${c.pasta})`).join('\n') : '  - nenhum comando ainda: preencha `crivo.comandos` em nes.json',
    gateLinha: comandos.length ? crase(comandos.map((c) => c.comando)) : 'a definir em nes.json',
  };
  const arquivos = [
    ...papeis.filter((p) => nomes(p.id)[0] === `nes-${p.id}`).map((p) => ({ rel: `.claude/agents/nes-${p.id}.md`, conteudo: renderizar(lerModelo(`papeis/${p.id}.md`), vars) })),
    { rel: 'docs/nes/METODOLOGIA.md', conteudo: lerModelo('METODOLOGIA.md') },
    { rel: 'docs/nes/CAPITAL-COGNITIVO.md', conteudo: lerModelo('CAPITAL-COGNITIVO.md') },
    { rel: '.cursor/rules/nes.mdc', conteudo: lerModelo('nes.mdc') },
  ].filter((a) => !fs.existsSync(path.join(raiz, a.rel)));
  let agentsMd = '';
  try { agentsMd = fs.readFileSync(path.join(raiz, 'AGENTS.md'), 'utf8'); } catch { /* AGENTS.md ainda não existe */ }
  const secao = agentsMd.includes(MARCA_SECAO) ? '' : renderizar(lerModelo('agents-secao.md'), vars);
  const tokens = estimarTokens(secao) + arquivos.filter((a) => a.rel.startsWith('.claude/agents/')).reduce((s, a) => s + estimarTokens(frontmatter(a.conteudo).dados.description), 0);
  return { arquivos, secao, agentsMd, tokens };
}

export async function init(raiz, sis, { perguntar = null, sim = false, com = [], sem = [], refazer = false, home = os.homedir() } = {}) {
  const existente = lerConfigNes(raiz);
  if (existente?.invalido) return { texto: `${ARQUIVO_CONFIG} não é um JSON válido; corrija antes de continuar.`, codigo: 1 };
  if (!sim && !perguntar) return { texto: 'Sem terminal interativo: rode com --sim para usar os padrões, ou num terminal.', codigo: 1 };
  const l = [];
  const antes = contextoFixo(raiz, home);
  l.push(`Contexto fixo antes: ~${antes} tokens por sessão (fengshui).`);

  const stacks = detectarStacks(raiz);
  const reaproveita = existente?.nivelAlvo && !refazer;
  const respostas = reaproveita ? existente : await entrevista(raiz, { perguntar, sim, stacks });
  const { fluxo, detectados } = reaproveita && existente.fluxo
    ? { fluxo: existente.fluxo, detectados: Object.fromEntries(Object.entries(ADAPTADORES).map(([id, a]) => [id, a.detectar({ raiz, home, sis })])) }
    : await escolherFluxo({ perguntar, sim, com, sem, contexto: { raiz, home, sis } });
  const comandos = reaproveita && existente.crivo?.comandos ? existente.crivo.comandos : await montarGate(stacks, { perguntar, sim });

  const papeis = papeisDoNivel(respostas.nivelAlvo);
  const adotados = reaproveita && existente.papeis ? existente.papeis : adotar(lerAgentes(raiz), papeis);
  const config = {
    ...(existente ?? {}),
    versao: 1,
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
  l.push('', `Time NES ${config.nivelAlvo} para ${config.projeto}:`);
  for (const p of papeis) l.push(`  ${p.nome.padEnd(10)} ${crase(config.papeis[p.id])}${config.papeis[p.id][0] === `nes-${p.id}` ? '' : ' (adotado)'}`);
  l.push(`  Fluxo: ${Object.entries(fluxo).filter(([, v]) => v).map(([id]) => ADAPTADORES[id].nome).join(', ') || 'sem ferramentas de apoio'}`);
  l.push(`  Gate do Crivo: ${comandos.map((c) => c.comando).join('; ') || 'nenhum comando (preencha crivo.comandos em nes.json)'}`);
  l.push('', 'Arquivos:', `  ${ARQUIVO_CONFIG} (${existente ? 'atualizado' : 'novo'})`);
  for (const a of plano.arquivos) l.push(`  ${a.rel}`);
  if (plano.secao) l.push(`  AGENTS.md (${plano.agentsMd ? 'acrescenta a seção "Time NES"' : 'novo, com a seção "Time NES"'})`);
  l.push(`Custo no contexto fixo: ~${plano.tokens} tokens${plano.tokens > TETO_TOKENS ? ` (acima do teto de ${TETO_TOKENS}: enxugue as descrições)` : ` (teto ${TETO_TOKENS})`}.`);

  if (!sim && !(await simOuNao(perguntar, `${l.join('\n')}\n\nAplicar?`, true))) return { texto: 'Nada foi alterado.', codigo: 0 };
  if (!sim) l.length = 0; // no modo interativo o plano já apareceu na pergunta

  gravarConfigNes(raiz, config);
  for (const a of plano.arquivos) {
    fs.mkdirSync(path.dirname(path.join(raiz, a.rel)), { recursive: true });
    fs.writeFileSync(path.join(raiz, a.rel), a.conteudo, 'utf8');
  }
  if (plano.secao) fs.writeFileSync(path.join(raiz, 'AGENTS.md'), plano.agentsMd ? `${plano.agentsMd.trimEnd()}\n\n${plano.secao}` : plano.secao, 'utf8');

  for (const [id, a] of Object.entries(ADAPTADORES)) {
    if (!fluxo[id] || detectados[id]) continue;
    if (a.instalar && !sim && (await simOuNao(perguntar, `Instalar o ${a.nome} agora (${a.instalar.join(' e depois ')})?`, false))) {
      const falhou = a.instalar.find((cmd) => sis.rodar(cmd, { cwd: raiz }) !== 0);
      l.push(falhou ? `✘ ${a.nome}: falhou em "${falhou}". Rode à mão.` : `✔ ${a.nome} instalado.`);
    } else {
      l.push(`→ ${a.nome} está no fluxo, mas não instalado:`, ...(a.instalar ?? a.manual).map((c) => `    ${c}`));
    }
  }
  const adotou = papeis.some((p) => config.papeis[p.id][0] !== `nes-${p.id}`);
  l.push('', `Contexto fixo depois: ~${contextoFixo(raiz, home)} tokens (antes ~${antes}).`);
  if (adotou) l.push('Os agentes adotados mantêm o próprio arquivo: confira o contrato deles com `nes contrato`.');
  l.push('Próximo passo: `nes maturidade`.');
  return { texto: l.join('\n'), codigo: 0 };
}
