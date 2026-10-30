import path from 'node:path';
import { contrato, modeloDeContrato } from './comando-contrato.js';
import { maturidade, lerDeclaracoes } from './comando-maturidade.js';
import { CHAVES_DECLARADAS } from './maturidade.js';
import { init, lerTeste } from './init.js';
import { sistemaReal } from './sistema.js';
import { lerConfigNes } from './config.js';
import { lerModelo } from './modelo.js';
import { t, definirIdioma, detectarIdioma } from './i18n.js';

// Comandos e opções em inglês viram os nomes canônicos (em português).
const COMANDOS = { contract: 'contrato', maturity: 'maturidade', agent: 'agente', help: 'ajuda', '--help': 'ajuda', '-h': 'ajuda' };
const OPCOES = {
  '--dir': '--pasta', '--template': '--modelo', '--strict': '--estrito', '--no-questions': '--sem-perguntas', '--yes': '--sim',
  '--with': '--com', '--without': '--sem', '--redo': '--refazer', '--apply': '--aplicar', '--description': '--descricao',
  '--approver': '--aprovador', '--level': '--nivel', '--test': '--teste', '--declare': '--declarar', '--lang': '--idioma',
};
const COM_VALOR = ['--pasta', '--modelo', '--com', '--sem', '--descricao', '--aprovador', '--nivel', '--stack', '--teste', '--declarar', '--idioma'];

export const normalizar = (args) => args.map((a, i) => (i === 0 ? COMANDOS[a] ?? a : OPCOES[a] ?? a));

export function opcao(args, nome, padrao = '') {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : padrao;
}

/** Todos os valores de uma opção que pode se repetir (--teste a=1 --teste b=2). */
export function opcoes(args, nome) {
  return args.flatMap((a, i) => (a === nome && args[i + 1] && !args[i + 1].startsWith('--') ? [args[i + 1]] : []));
}

/** Primeiro argumento posicional depois do comando (ignora opções e o valor delas). */
export function posicional(args) {
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) { if (COM_VALOR.includes(args[i])) i++; continue; }
    return args[i];
  }
  return '';
}

const lista = (args, nome) => opcao(args, nome).split(',').filter(Boolean);

export async function executar(argv, { cwd = process.cwd(), perguntar = null, sis = sistemaReal, env = process.env } = {}) {
  const args = normalizar(argv);
  const comando = args[0] ?? 'ajuda';
  const raiz = path.resolve(cwd, opcao(args, '--pasta', '.'));
  const config = lerConfigNes(raiz);
  definirIdioma(opcao(args, '--idioma') || (config && !config.invalido && config.idioma) || detectarIdioma(env));
  switch (comando) {
    case 'contrato': {
      const modelo = opcao(args, '--modelo');
      if (modelo) return modeloDeContrato(raiz, modelo);
      const r = contrato(raiz, { alvo: posicional(args), json: args.includes('--json') });
      return { texto: r.texto, codigo: r.codigo || (args.includes('--estrito') && r.completos < r.total ? 1 : 0) };
    }
    case 'init': {
      const dadas = Object.fromEntries([['descricao', '--descricao'], ['aprovador', '--aprovador'], ['nivelAlvo', '--nivel'], ['stack', '--stack']]
        .map(([campo, nome]) => [campo, opcao(args, nome)]).filter(([, v]) => v));
      return init(raiz, sis, {
        perguntar,
        dadas,
        sim: args.includes('--sim'),
        refazer: args.includes('--refazer'),
        aplicar: args.includes('--aplicar'),
        com: lista(args, '--com'),
        sem: lista(args, '--sem'),
        testes: opcoes(args, '--teste').map(lerTeste),
      });
    }
    case 'maturidade':
      return maturidade(raiz, {
        json: args.includes('--json'),
        perguntar: args.includes('--sem-perguntas') ? null : perguntar,
        declarar: lerDeclaracoes(opcoes(args, '--declarar'), CHAVES_DECLARADAS),
      });
    case 'agente':
      return { texto: lerModelo('agente.md').trimEnd(), codigo: 0 };
    case 'ajuda':
      return { texto: lerModelo('ajuda.txt').trimEnd(), codigo: 0 };
    default:
      return { texto: `${t('cli.desconhecido', { cmd: comando })}\n\n${lerModelo('ajuda.txt').trimEnd()}`, codigo: 1 };
  }
}
