NES · protocolo para um agente de IA conduzir o método neste projeto

Regra de ouro (NES-002): o que o repositório não prova, você não inventa. Pergunte ao humano.

1. Leia o projeto: README, AGENTS.md/CLAUDE.md, .claude/agents/ e os manifestos (package.json, *.dproj, go.mod...).
   Escreva o que o projeto faz em uma frase e identifique o comando de teste de cada pasta.
2. Rode `npx @i9up/nes init`. Sem terminal interativo, ele diz o que falta e a opção de cada resposta.
3. Pergunte ao humano o que só ele sabe: quem aprova o que for escalado e o nível para começar (M2, M3 ou M4).
   Confirme com ele a frase do projeto e os comandos de teste que você deduziu.
4. Rode `npx @i9up/nes init --descricao "..." --aprovador "..." --nivel M2 --teste "pasta=comando"` e mostre o plano.
5. Com o OK do humano, repita com `--aplicar`. Instaladores listados (OpenSpec, Ponytail): só com a permissão dele.
6. Rode `npx @i9up/nes contrato --json`. Nos agentes adotados, complete as seções que faltam a partir do que o
   próprio arquivo e o projeto mostram. Nível de autonomia, gatilho de escalada e metas são decisões do humano:
   proponha e confirme. Repita até 5/5.
7. Rode `npx @i9up/nes maturidade --sem-perguntas`. Para cada pergunta pendente, pergunte ao humano e registre com
   `--declarar chave="evidência"`. Nunca declare sem a resposta dele.
8. Confira o contexto fixo com `npx @i9up/fengshui diagnostico` e apresente o resultado: nível, o que mudou e o
   próximo critério.
