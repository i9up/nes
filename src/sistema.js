import { spawnSync } from 'node:child_process';

// Só roda comandos fixos da própria nes (instaladores oficiais), sempre depois de perguntar. O shell é necessário no
// Windows, onde npm e openspec são .cmd.
export const sistemaReal = {
  rodar(comando, { cwd } = {}) {
    /* node:coverage ignore next */
    return spawnSync(comando, { cwd, shell: true, stdio: 'inherit' }).status ?? 1; // status null: morto por sinal
  },
  temComando(nome) {
    /* node:coverage ignore next */
    const busca = process.platform === 'win32' ? 'where' : 'which';
    return spawnSync(busca, [nome], { stdio: 'ignore' }).status === 0;
  },
};
