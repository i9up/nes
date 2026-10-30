// As 5 seções do contrato de agente (A Nova Engenharia de Software, cap. 8), conferidas pelos títulos do arquivo.
// Os títulos são reconhecidos em português e em inglês, qualquer que seja o idioma da saída.
import { frontmatter, listaFerramentas } from './frontmatter.js';
import { t } from './i18n.js';

export const SECOES = [
  { n: 1, titulo: /identidade|escopo|scope|prop[óo]sito|purpose|papel|role|identity/i },
  { n: 2, titulo: /ferramentas|tools/i },
  { n: 3, titulo: /contexto|context|antes de qualquer|leia antes|before/i },
  { n: 4, titulo: /aut[oô]nomia|per[íi]metro|autonomy|perimeter|escal/i },
  { n: 5, titulo: /crit[ée]rio de avalia|avalia[çc][ãa]o|m[ée]tricas?|evaluation|metrics/i },
];

export const nomeSecao = (n) => t(`secao.${n}`);

const NAO_COBRE = /n[ãa]o cobre|fora do escopo|n[ãa]o (faz|pode|use)|out of scope|does not|do not use|never/i;
const NIVEL = /n[íi]vel\s*[1-4]|level\s*[1-4]/i;
const ESCALA = /escal|pergunt|pare e|ask (the )?(human|user)|humano|human/i;
const TODAS = /^(\*|all( tools)?)$/i;

/** Seções do Markdown: cada título (#..######) com o texto até o próximo título. */
export function secoesDoTexto(corpo) {
  const secoes = [];
  let atual = null;
  let emCodigo = false;
  for (const linha of corpo.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(linha)) emCodigo = !emCodigo;
    const titulo = emCodigo ? null : /^#{1,6}\s+(.*)$/.exec(linha);
    if (titulo) {
      atual = { titulo: titulo[1].trim(), texto: '' };
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
  const add = (n, ok, motivo = '') => resultado.push({ n, nome: nomeSecao(n), ok, motivo: ok ? '' : motivo });

  const identidade = comTitulo(secoes, SECOES[0].titulo);
  if (!identidade.length && !dados.description) add(1, false, t('c.semIdentidade'));
  else add(1, NAO_COBRE.test(texto), t('c.naoCobre'));

  const ferramentas = comTitulo(secoes, SECOES[1].titulo);
  const lista = listaFerramentas(dados.tools);
  if (ferramentasNoArquivo && (!lista || lista.some((f) => TODAS.test(f)))) add(2, false, t('c.herdaTodas'));
  else add(2, ferramentas.some((s) => temItens(s.texto)), t('c.semJustificativa'));

  const contexto = comTitulo(secoes, SECOES[2].titulo);
  add(3, contexto.some((s) => s.texto.trim()), t(contexto.length ? 'c.contextoVazio' : 'c.semContexto'));

  const autonomia = comTitulo(secoes, SECOES[3].titulo).map((s) => `${s.titulo}\n${s.texto}`).join('\n');
  if (!autonomia) add(4, false, t('c.semAutonomia'));
  else if (!NIVEL.test(autonomia)) add(4, false, t('c.semNivel'));
  else add(4, ESCALA.test(autonomia), t('c.semEscalada'));

  add(5, comTitulo(secoes, SECOES[4].titulo).some((s) => s.texto.trim()), t('c.semAvaliacao'));

  return { secoes: resultado, completas: resultado.filter((r) => r.ok).length, descricao: dados.description ?? '', nome: dados.name ?? '' };
}

export const completo = (avaliacao) => avaliacao.completas === SECOES.length;
