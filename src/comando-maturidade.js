// nes maturidade: M0–M5 com honestidade (cap. 21). Pergunta só o que o repositório não prova, e só quando importa.
// Sem terminal (modo agente), lista essas perguntas com a opção --declarar para a LLM levar ao humano.
import { lerAgentes } from './agentes.js';
import { lerConfigNes, gravarConfigNes, ARQUIVO_CONFIG } from './config.js';
import { criterios, nivel, proximoCriterio, porArea, nomeNivel, pergunta, respostaNegativa } from './maturidade.js';
import { t } from './i18n.js';

const SIMBOLO = { ok: '✔', declarado: '◐', falta: '✘' };

/** Declarados que vale perguntar agora: os da primeira transição incompleta cujos critérios verificáveis já passam. */
export function perguntasPendentes(transicoes) {
  for (const tr of transicoes) {
    if (tr.itens.every((i) => i.estado !== 'falta')) continue;
    const verificaveis = tr.itens.filter((i) => !i.chave);
    return verificaveis.every((i) => i.estado === 'ok') ? tr.itens.filter((i) => i.chave && i.estado === 'falta').map((i) => i.chave) : [];
  }
  return [];
}

/** "--declarar producao=PRs no GitHub" vira ['producao', 'PRs no GitHub']; chaves desconhecidas são ignoradas. */
export function lerDeclaracoes(valores, validas) {
  const saida = {};
  for (const v of valores) {
    const i = v.indexOf('=');
    const chave = i < 0 ? '' : v.slice(0, i).trim();
    const texto = i < 0 ? '' : v.slice(i + 1).trim();
    if (validas.includes(chave) && !respostaNegativa(texto)) saida[chave] = texto;
  }
  return saida;
}

export async function maturidade(raiz, { json = false, perguntar = null, declarar = {} } = {}) {
  const config = lerConfigNes(raiz) ?? {};
  if (config.invalido) return { texto: t('config.invalido', { arq: ARQUIVO_CONFIG }), codigo: 1 };
  const agentes = lerAgentes(raiz);
  const declarado = { ...(config.declarado ?? {}), ...declarar };
  let respondeu = Object.keys(declarar).length > 0;
  let transicoes = criterios(raiz, { agentes, config, declarado });

  // Cada resposta pode destravar a próxima transição, então pergunta em rodadas.
  for (let chaves = perguntar ? perguntasPendentes(transicoes) : []; chaves.length; chaves = perguntasPendentes(transicoes)) {
    let nova = false;
    for (const chave of chaves) {
      const resposta = String(await perguntar(t('cm.pergunta', { p: pergunta(chave) }))).trim();
      if (respostaNegativa(resposta)) continue;
      declarado[chave] = resposta;
      nova = respondeu = true;
    }
    transicoes = criterios(raiz, { agentes, config, declarado });
    if (!nova) break;
  }
  if (respondeu) gravarConfigNes(raiz, { ...config, declarado });

  const atual = nivel(transicoes);
  const areas = porArea(raiz, { agentes, transicoes });
  const proximo = proximoCriterio(transicoes);
  const pendentes = perguntar ? [] : perguntasPendentes(transicoes).map((chave) => ({ chave, pergunta: pergunta(chave) }));
  if (json) return { texto: JSON.stringify({ nivel: atual, nome: nomeNivel(atual), transicoes, areas, proximo, pendentes }, null, 2), codigo: 0 };

  const l = [t('cm.cabecalho'), ''];
  l.push(t('cm.nivel', { n: atual, nome: nomeNivel(atual) }), '');
  for (const tr of transicoes) {
    l.push(`  ${tr.de} → ${tr.para}  ${nomeNivel(tr.para)}`);
    for (const i of tr.itens) l.push(`    ${SIMBOLO[i.estado]} ${i.nome}: ${i.detalhe}`);
  }
  if (areas.length) {
    l.push('', t('cm.porArea'));
    for (const a of areas) l.push(`  ${a.area.padEnd(28)} ${a.nivel}  ${t('cm.agentes', { n: a.agentes })}`);
  }
  l.push('', proximo ? t('cm.proximo', { t: proximo.transicao, nome: proximo.nome, dica: proximo.dica }) : t('cm.tudo'));
  if (pendentes.length) l.push('', t('cm.pendentes'), ...pendentes.map((p) => t('cm.declarar', { chave: p.chave, pergunta: p.pergunta })));
  if (respondeu) l.push(t('cm.gravadas', { arq: ARQUIVO_CONFIG }));
  return { texto: l.join('\n'), codigo: 0 };
}
