// Ferramentas de apoio ao fluxo. A nes não copia nenhuma delas: detecta, liga os papéis e indica o instalador oficial.
import fs from 'node:fs';
import path from 'node:path';
import { t } from './i18n.js';

const lerJson = (arquivo) => { try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { return {}; } };

export const ADAPTADORES = {
  openspec: {
    nome: 'OpenSpec',
    pergunta: () => t('a.openspec'),
    padrao: true,
    detectar: ({ raiz }) => fs.existsSync(path.join(raiz, 'openspec')) || fs.existsSync(path.join(raiz, '.claude', 'commands', 'opsx')),
    instalar: ['npm install -g @fission-ai/openspec@latest', 'openspec init'],
  },
  ponytail: {
    nome: 'Ponytail',
    pergunta: () => t('a.ponytail'),
    padrao: true,
    detectar: ({ raiz, home }) => {
      const plugin = (nomes) => Object.keys(nomes ?? {}).some((k) => /^ponytail@/.test(k));
      return plugin(lerJson(path.join(home, '.claude', 'plugins', 'installed_plugins.json')).plugins)
        || plugin(lerJson(path.join(home, '.claude', 'settings.json')).enabledPlugins)
        || fs.existsSync(path.join(raiz, '.claude', 'skills', 'ponytail'))
        || fs.existsSync(path.join(raiz, 'skills', 'ponytail'));
    },
    manual: () => [t('a.ponytailClaude'), t('a.ponytailOutros')],
  },
  harness: {
    nome: 'harness-toolkit',
    padrao: false, // só entra com --com harness, sem pergunta
    detectar: ({ sis }) => sis.temComando('tlc'),
    manual: () => [t('a.harnessManual')],
  },
};
