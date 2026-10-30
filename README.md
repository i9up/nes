# NES · A Nova Engenharia de Software, aplicada ao repositório

[![npm](https://img.shields.io/npm/v/@i9up/nes)](https://www.npmjs.com/package/@i9up/nes) · Node 20+ · MIT · [English](README.en.md)

Quase todo o discurso sobre IA no desenvolvimento fala de ferramentas; quase nada fala de **organização**. O método
NES, do livro *A Nova Engenharia de Software* (Alessandro Medeiros, Coleção NES, Vol. 1), organiza pessoas, agentes
especializados e conhecimento num sistema coordenado. Esta biblioteca aplica o método ao seu repositório. Ela não
depende de linguagem: lê o que o projeto já tem (stack, agentes, backlog) e se organiza a partir disso.

```bash
npx @i9up/nes init          # monta o time de agentes, com contrato, e põe OpenSpec e Ponytail no fluxo
npx @i9up/nes contrato      # confere as 5 seções do contrato de cada agente
npx @i9up/nes maturidade    # M0–M5 do projeto e de cada área, com o próximo critério a cumprir
npx @i9up/nes agente        # protocolo para uma LLM conduzir tudo isso no projeto
```

Português ou inglês: o idioma vem do sistema, do `nes.json` ou de `--idioma pt|en`. Os comandos também aceitam os
nomes em inglês (`nes contract`, `nes maturity`, `--apply`).

## Com um agente de IA

Peça ao seu agente (Claude Code, Codex, Cursor): *"rode `npx @i9up/nes agente` e siga o protocolo"*. Sem terminal
interativo, a `nes` entra no modo agente:

1. A LLM lê o repositório e responde o que ele prova: o que o projeto faz, a stack, o comando de teste de cada pasta.
2. O `init` devolve o que só o humano sabe (quem aprova o que for escalado, o nível para começar). A LLM pergunta a
   você, e não inventa (NES-002).
3. Ela roda `nes init --descricao "..." --aprovador "..." --teste "pasta=comando"` e mostra o plano. Nada é gravado
   sem `--aplicar`, que ela só usa com o seu OK. Instaladores, também só com a sua permissão.
4. Completa os contratos dos agentes que já existiam até 5/5, confirmando com você o nível de autonomia e as metas.
5. Roda `nes maturidade`; o que o repositório não prova vira pergunta para você, registrada com
   `--declarar chave="evidência"`.

O objetivo não é 100% de autonomia: é a maior autonomia possível **dentro de perímetros explícitos**, que crescem
com as métricas. Decisão sem regra escrita e merge em produção continuam com uma pessoa.

## Os 3 princípios

- **NES-001 · Organização antes da automação.** Não se automatiza o caos.
- **NES-002 · Automatize decisões explícitas, não ambiguidades ocultas.** O que não está escrito, o agente não decide:
  escala ao humano.
- **NES-003 · Especialização produz qualidade.** Um time de especialistas supera o agente faz-tudo.

## `nes init` · o time

Faz 4 perguntas, uma por vez (o projeto, a stack, o nível para começar e quem aprova o que for escalado), e monta o
time do tamanho certo:

| Nível | Papéis |
|---|---|
| M2 · começando | Maestro (orquestra), Executor (implementa), Crivo (QA, revisão e segurança) |
| M3 · time coordenado | + Arquiteto (estrutura e contratos) |
| M4 · fábrica | + Cronista (Capital Cognitivo) |

- **Adota antes de criar.** Se o projeto já tem um orquestrador, especialistas ou um agente de QA em
  `.claude/agents/`, eles assumem os papéis. Só o que falta vira `nes-<papel>.md`.
- **Contrato em todo papel gerado.** Cada agente sai com as 5 seções do cap. 8 e ferramentas mínimas, e passa 5/5 no
  `nes contrato`.
- **Gate do Crivo pela stack.** O `init` detecta a stack de cada pasta (node, python, go, .NET, Java, Rust, Delphi) e
  configura o comando de teste. Quando não há comando padrão (o runner do DUnitX, uma stack que ele não conhece), você
  informa com `--teste "pasta=comando"`.
- **Dieta de Contexto.** O time inteiro custa no máximo ~600 tokens fixos por sessão (fica em ~240 num projeto novo).
  O método fica em `docs/nes/`, lido só quando precisa.
- **Nunca sobrescreve.** O `init` mostra o plano e pergunta antes de gravar. Rodar de novo só cria o que falta.

Arquivos criados: `nes.json` (as decisões do time), `.claude/agents/nes-*.md`, a seção "Time NES" do `AGENTS.md`
(para Codex, Cursor e outros), `.cursor/rules/nes.mdc`, `docs/nes/METODOLOGIA.md` e `docs/nes/CAPITAL-COGNITIVO.md`.

### OpenSpec e Ponytail no fluxo

As duas ferramentas entram no fluxo por padrão (o `init` pergunta uma vez) e viram regra nos contratos dos papéis:

```
Maestro decompõe (/opsx:propose) → Arquiteto decide a estrutura → Executor implementa (/opsx:apply) com o
Ponytail ativo → Crivo roda o gate e o /ponytail-review → Cronista registra e arquiva (/opsx:archive)
```

A `nes` não copia nenhuma delas. Ela detecta se estão instaladas e oferece o instalador oficial do
[OpenSpec](https://github.com/Fission-AI/openspec). Para o [Ponytail](https://github.com/dietrichgebert/ponytail),
que se instala de dentro do agente, ela mostra os comandos. O
[harness-toolkit](https://github.com/tech-leads-club/harness-toolkit) entra com `--com harness`; por ser Elastic 2.0, a
instalação fica com você.

## `nes contrato` · cada agente tem contrato?

Confere as 5 seções do contrato de agente (cap. 8):

1. **Identidade e escopo**, incluindo o que o agente **não** cobre.
2. **Ferramentas concedidas**, com justificativa. Um agente sem `tools:` no frontmatter herda todas.
3. **Contexto obrigatório**: o que consultar antes de decidir.
4. **Perímetro de autonomia**: nível 1 a 4 (cap. 9) e o gatilho exato de escalada.
5. **Critério de avaliação**: métricas e metas definidas antes do uso.

`nes contrato <agente>` detalha um agente, `--modelo <nome>` cria o esqueleto e `--estrito` falha no CI se algum
contrato estiver incompleto.

## `nes maturidade` · onde estamos, com honestidade

Aplica os critérios objetivos de transição do cap. 21, no projeto e em cada área (`apps/`, `packages/`, `services/`),
porque partes de um projeto ficam em níveis diferentes ao mesmo tempo. Cada critério diz a origem: **✔ verificado** no
repositório, **◐ declarado** pela equipe (a `nes` pergunta só o que o repositório não prova e grava em `nes.json`) ou
**✘ falta**. A saída termina com o próximo critério a cumprir.

## E o fengshui?

O [`@i9up/fengshui`](https://github.com/i9up/fengshui) é o NES-001 em forma de ferramenta: organiza o contexto que os
agentes carregam (a Dieta de Contexto). A `nes` usa o fengshui por dentro: o `init` mede o contexto fixo antes e
depois. Na prática, **rode só a `nes`**. O fengshui também funciona sozinho, sem a `nes`; num projeto já carregado de
instruções, vale passar antes pelo `npx @i9up/fengshui diagnostico`.

## Caso real

Nasceu no Pontoix (ERP, PDV e APIs fiscais, 9 apps, 33 agentes). A primeira medição honesta deu **M1**: o projeto já
tinha práticas de M3–M4 (backlog no OpenSpec, um despachante de tarefas), mas nenhum dos 33 agentes tinha contrato
completo, e sem contrato o cap. 21 não deixa passar de M1. O que mais faltava eram as seções de perímetro de autonomia e
de critério de avaliação, presentes em nenhum dos 33 agentes. Esse virou o primeiro trabalho.

Método do livro *A Nova Engenharia de Software* (Coleção NES, Vol. 1), de Alessandro Medeiros. Licença MIT.
