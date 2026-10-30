// Ferramentas de apoio ao fluxo. A nes não copia nenhuma delas: detecta, liga os papéis e indica o instalador oficial.
import fs from 'node:fs';
import path from 'node:path';

const lerJson = (arquivo) => { try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { return {}; } };

export const ADAPTADORES = {
  openspec: {
    nome: 'OpenSpec',
    pergunta: 'Usar o OpenSpec no fluxo (Maestro propõe com /opsx:propose, Executor aplica com /opsx:apply, Cronista arquiva com /opsx:archive)?',
    padrao: true,
    detectar: ({ raiz }) => fs.existsSync(path.join(raiz, 'openspec')) || fs.existsSync(path.join(raiz, '.claude', 'commands', 'opsx')),
    instalar: ['npm install -g @fission-ai/openspec@latest', 'openspec init'],
  },
  ponytail: {
    nome: 'Ponytail',
    pergunta: 'Usar o Ponytail no fluxo (Executor escreve só o necessário; Crivo roda /ponytail-review)?',
    padrao: true,
    detectar: ({ raiz, home }) => {
      const plugin = (nomes) => Object.keys(nomes ?? {}).some((k) => /^ponytail@/.test(k));
      return plugin(lerJson(path.join(home, '.claude', 'plugins', 'installed_plugins.json')).plugins)
        || plugin(lerJson(path.join(home, '.claude', 'settings.json')).enabledPlugins)
        || fs.existsSync(path.join(raiz, '.claude', 'skills', 'ponytail'))
        || fs.existsSync(path.join(raiz, 'skills', 'ponytail'));
    },
    manual: [
      'No Claude Code, em dois prompts: /plugin marketplace add DietrichGebert/ponytail  e  /plugin install ponytail@ponytail',
      'Codex, Cursor e outros: https://github.com/DietrichGebert/ponytail/blob/main/INSTALL.md',
    ],
  },
  harness: {
    nome: 'harness-toolkit',
    pergunta: 'Usar o harness-toolkit (gates allow/ask/deny nos eventos do editor) para o perímetro de autonomia?',
    padrao: false,
    detectar: ({ sis }) => sis.temComando('tlc'),
    manual: [
      'Licença Elastic 2.0: a instalação é sua, num terminal: npm i -g @tech-leads-club/harness-toolkit && tlc harness install',
    ],
  },
};
