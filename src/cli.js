import path from 'node:path';
import { contrato, modeloDeContrato } from './comando-contrato.js';
import { maturidade } from './comando-maturidade.js';
import { init } from './init.js';
import { sistemaReal } from './sistema.js';

export const AJUDA = `NES · A Nova Engenharia de Software aplicada ao repositório

Uso: nes <comando> [opções]   (ou: npx @i9up/nes <comando>)

  init                        monta o time NES: 4 perguntas, adota os agentes que já existem, põe OpenSpec e
                              Ponytail no fluxo e configura o gate do Crivo. Mostra o plano; nunca sobrescreve.
                                --sim             usa os padrões, sem perguntar (não instala nada)
                                --com harness     inclui o harness-toolkit no fluxo
                                --sem openspec,ponytail   deixa ferramentas de fora
                                --refazer         refaz a entrevista mesmo com nes.json
  contrato [agente|arquivo]   confere as 5 seções do contrato de cada agente (cap. 8)
                                --modelo <nome>   cria .claude/agents/<nome>.md com as 5 seções em branco
                                --json            saída em JSON
                                --estrito         sai com código 1 se algum contrato estiver incompleto (CI)
  maturidade                  nível M0–M5 do projeto e de cada área, com o próximo critério a cumprir (cap. 21)
                                --sem-perguntas   não pergunta o que o repositório não prova
                                --json            saída em JSON

Opção comum: --pasta <dir>  (padrão: a pasta atual)`;

export function opcao(args, nome, padrao = '') {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : padrao;
}

/** Primeiro argumento posicional depois do comando (ignora opções e o valor delas). */
export function posicional(args, comValor = []) {
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) { if (comValor.includes(args[i])) i++; continue; }
    return args[i];
  }
  return '';
}

export async function executar(args, { cwd = process.cwd(), perguntar = null, sis = sistemaReal } = {}) {
  const comando = args[0] ?? 'ajuda';
  const raiz = path.resolve(cwd, opcao(args, '--pasta', '.'));
  switch (comando) {
    case 'contrato': {
      const modelo = opcao(args, '--modelo');
      if (modelo) return modeloDeContrato(raiz, modelo);
      const r = contrato(raiz, { alvo: posicional(args, ['--pasta', '--modelo']), json: args.includes('--json') });
      return { texto: r.texto, codigo: r.codigo || (args.includes('--estrito') && r.completos < r.total ? 1 : 0) };
    }
    case 'init':
      return init(raiz, sis, {
        perguntar,
        sim: args.includes('--sim'),
        refazer: args.includes('--refazer'),
        com: opcao(args, '--com').split(',').filter(Boolean),
        sem: opcao(args, '--sem').split(',').filter(Boolean),
      });
    case 'maturidade':
      return maturidade(raiz, { json: args.includes('--json'), perguntar: args.includes('--sem-perguntas') ? null : perguntar });
    case 'ajuda':
    case '--help':
    case '-h':
      return { texto: AJUDA, codigo: 0 };
    default:
      return { texto: `Comando desconhecido: ${comando}\n\n${AJUDA}`, codigo: 1 };
  }
}
