NES · protocol for an AI agent to drive the method in this project

Golden rule (NES-002): what the repository cannot prove, you do not make up. Ask the human.

1. Read the project: README, AGENTS.md/CLAUDE.md, .claude/agents/ and the manifests (package.json, *.dproj, go.mod...).
   Write what the project does in one sentence and find the test command for each folder.
2. Run `npx @i9up/nes init`. Without an interactive terminal it says what is missing and the option for each answer.
3. Ask the human what only they know: who approves what gets escalated, and the starting level (M2, M3 or M4).
   Confirm with them the project sentence and the test commands you inferred.
4. Run `npx @i9up/nes init --description "..." --approver "..." --level M2 --test "folder=command"` and show the plan.
5. Once the human approves, run it again with `--apply`. Listed installers (OpenSpec, Ponytail): only with their permission.
6. Run `npx @i9up/nes contract --json`. For adopted agents, fill in the missing sections from what the file itself and
   the project show. Autonomy level, escalation trigger and targets are the human's decisions: propose and confirm.
   Repeat until 5/5.
7. Run `npx @i9up/nes maturity --no-questions`. For each pending question, ask the human and record it with
   `--declare key="evidence"`. Never declare without their answer.
8. Check the fixed context with `npx @i9up/fengshui diagnostico` and present the result: level, what changed and the
   next criterion.
