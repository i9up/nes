// nes maturidade: M0–M5 com honestidade (cap. 21). Pergunta só o que o repositório não prova, e só quando importa.
import { lerAgentes } from './agentes.js';
import { lerConfigNes, gravarConfigNes, ARQUIVO_CONFIG } from './config.js';
import { criterios, nivel, proximoCriterio, porArea, NOMES, PERGUNTAS, respostaNegativa } from './maturidade.js';

const SIMBOLO = { ok: '✔', declarado: '◐', falta: '✘' };

/** Declarados que vale perguntar agora: os da primeira transição incompleta cujos critérios verificáveis já passam. */
export function perguntasPendentes(transicoes) {
  for (const t of transicoes) {
    if (t.itens.every((i) => i.estado !== 'falta')) continue;
    const verificaveis = t.itens.filter((i) => !i.chave);
    return verificaveis.every((i) => i.estado === 'ok') ? t.itens.filter((i) => i.chave && i.estado === 'falta').map((i) => i.chave) : [];
  }
  return [];
}

export async function maturidade(raiz, { json = false, perguntar = null } = {}) {
  const config = lerConfigNes(raiz) ?? {};
  if (config.invalido) return { texto: `${ARQUIVO_CONFIG} não é um JSON válido; corrija antes de continuar.`, codigo: 1 };
  const agentes = lerAgentes(raiz);
  const declarado = { ...(config.declarado ?? {}) };
  let transicoes = criterios(raiz, { agentes, config, declarado });

  // Cada resposta pode destravar a próxima transição, então pergunta em rodadas.
  let respondeu = false;
  for (let chaves = perguntar ? perguntasPendentes(transicoes) : []; chaves.length; chaves = perguntasPendentes(transicoes)) {
    let nova = false;
    for (const chave of chaves) {
      const resposta = String(await perguntar(`${PERGUNTAS[chave]}\n  (evidência em uma linha; Enter ou "não" para pular) › `)).trim();
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
  if (json) return { texto: JSON.stringify({ nivel: atual, nome: NOMES[atual], transicoes, areas, proximo }, null, 2), codigo: 0 };

  const l = ['NES · maturidade (cap. 21): ✔ verificado no repositório · ◐ declarado pela equipe · ✘ falta', ''];
  l.push(`Nível do projeto: ${atual} (${NOMES[atual]})`, '');
  for (const t of transicoes) {
    l.push(`  ${t.de} → ${t.para}  ${NOMES[t.para]}`);
    for (const i of t.itens) l.push(`    ${SIMBOLO[i.estado]} ${i.nome}: ${i.detalhe}`);
  }
  if (areas.length) {
    l.push('', 'Por área (agentes com contrato completo que citam a pasta):');
    for (const a of areas) l.push(`  ${a.area.padEnd(28)} ${a.nivel}  ${a.agentes} agente(s)`);
  }
  l.push('', proximo ? `Próximo critério (${proximo.transicao}): ${proximo.nome}. ${proximo.dica}.` : 'Todos os critérios de M5 estão satisfeitos.');
  if (respondeu) l.push(`Respostas gravadas em ${ARQUIVO_CONFIG} (declarado).`);
  return { texto: l.join('\n'), codigo: 0 };
}
