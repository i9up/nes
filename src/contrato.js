// As 5 seções do contrato de agente (A Nova Engenharia de Software, cap. 8), conferidas pelos títulos do arquivo.
import { frontmatter, listaFerramentas } from './frontmatter.js';

export const SECOES = [
  { n: 1, nome: 'Identidade e escopo', titulo: /identidade|escopo|scope|prop[óo]sito|purpose|papel|role/i },
  { n: 2, nome: 'Ferramentas concedidas', titulo: /ferramentas|tools/i },
  { n: 3, nome: 'Contexto obrigatório', titulo: /contexto|context|antes de qualquer|leia antes|before/i },
  { n: 4, nome: 'Perímetro de autonomia', titulo: /aut[oô]nomia|per[íi]metro|autonomy|escal/i },
  { n: 5, nome: 'Critério de avaliação', titulo: /crit[ée]rio de avalia|avalia[çc][ãa]o|m[ée]tricas?|evaluation|metrics/i },
];

const NAO_COBRE = /n[ãa]o cobre|fora do escopo|n[ãa]o (faz|pode|use)|out of scope|does not|do not use|never/i;
const NIVEL = /n[íi]vel\s*[1-4]|level\s*[1-4]/i;
const ESCALA = /escal|pergunt|pare e|ask (the )?(human|user)|humano/i;
const TODAS = /^(\*|all( tools)?)$/i;

/** Seções do Markdown: cada título (#..######) com o texto até o próximo título. */
export function secoesDoTexto(corpo) {
  const secoes = [];
  let atual = null;
  let emCodigo = false;
  for (const linha of corpo.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(linha)) emCodigo = !emCodigo;
    const t = emCodigo ? null : /^#{1,6}\s+(.*)$/.exec(linha);
    if (t) {
      atual = { titulo: t[1].trim(), texto: '' };
      secoes.push(atual);
    } else if (atual) {
      atual.texto += `${linha}\n`;
    }
  }
  return secoes;
}

const comTitulo = (secoes, regex) => secoes.filter((s) => regex.test(s.titulo));
const temItens = (texto) => /^\s*([-*]|\d+\.)\s+\S/m.test(texto);

/** Avalia um agente. `ferramentasNoArquivo`: true para formatos em que o frontmatter `tools:` define o acesso (Claude Code). */
export function avaliarContrato(texto, { ferramentasNoArquivo = true } = {}) {
  const { dados, corpo } = frontmatter(texto);
  const secoes = secoesDoTexto(corpo);
  const resultado = [];
  const add = (n, ok, motivo = '') => resultado.push({ ...SECOES[n - 1], ok, motivo });

  const identidade = comTitulo(secoes, SECOES[0].titulo);
  if (!identidade.length && !dados.description) add(1, false, 'sem título de identidade/escopo nem descrição');
  else if (!NAO_COBRE.test(texto)) add(1, false, 'não diz o que o agente NÃO cobre');
  else add(1, true);

  const ferramentas = comTitulo(secoes, SECOES[1].titulo);
  const lista = listaFerramentas(dados.tools);
  if (ferramentasNoArquivo && (!lista || lista.some((f) => TODAS.test(f)))) add(2, false, 'sem `tools:` restrito no frontmatter: o agente herda todas as ferramentas');
  else if (!ferramentas.some((s) => temItens(s.texto))) add(2, false, 'sem a lista de ferramentas com justificativa');
  else add(2, true);

  const contexto = comTitulo(secoes, SECOES[2].titulo);
  add(3, contexto.some((s) => s.texto.trim()), contexto.length ? 'seção de contexto vazia' : 'sem a seção de contexto obrigatório');

  const autonomia = comTitulo(secoes, SECOES[3].titulo).map((s) => `${s.titulo}\n${s.texto}`).join('\n');
  if (!autonomia) add(4, false, 'sem a seção de perímetro de autonomia');
  else if (!NIVEL.test(autonomia)) add(4, false, 'sem o nível de autonomia (1 a 4, cap. 9)');
  else if (!ESCALA.test(autonomia)) add(4, false, 'sem o gatilho de escalada para o humano');
  else add(4, true);

  const avaliacao = comTitulo(secoes, SECOES[4].titulo);
  add(5, avaliacao.some((s) => s.texto.trim()), 'sem o critério de avaliação (métricas e metas)');

  for (const r of resultado) if (r.ok) r.motivo = '';
  return { secoes: resultado, completas: resultado.filter((r) => r.ok).length, descricao: dados.description ?? '', nome: dados.name ?? '' };
}

export const completo = (avaliacao) => avaliacao.completas === SECOES.length;
