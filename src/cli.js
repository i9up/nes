import path from 'node:path';
import { contrato, modeloDeContrato } from './comando-contrato.js';

export const AJUDA = `NES · A Nova Engenharia de Software aplicada ao repositório

Uso: nes <comando> [opções]   (ou: npx @i9up/nes <comando>)

  contrato [agente|arquivo]   confere as 5 seções do contrato de cada agente (cap. 8)
                                --modelo <nome>   cria .claude/agents/<nome>.md com as 5 seções em branco
                                --json            saída em JSON
                                --estrito         sai com código 1 se algum contrato estiver incompleto (CI)

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

export async function executar(args, { cwd = process.cwd() } = {}) {
  const comando = args[0] ?? 'ajuda';
  const raiz = path.resolve(cwd, opcao(args, '--pasta', '.'));
  switch (comando) {
    case 'contrato': {
      const modelo = opcao(args, '--modelo');
      if (modelo) return modeloDeContrato(raiz, modelo);
      const r = contrato(raiz, { alvo: posicional(args, ['--pasta', '--modelo']), json: args.includes('--json') });
      return { texto: r.texto, codigo: r.codigo || (args.includes('--estrito') && r.completos < r.total ? 1 : 0) };
    }
    case 'ajuda':
    case '--help':
    case '-h':
      return { texto: AJUDA, codigo: 0 };
    default:
      return { texto: `Comando desconhecido: ${comando}\n\n${AJUDA}`, codigo: 1 };
  }
}
