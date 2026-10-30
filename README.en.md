# NES · The New Software Engineering, applied to your repository

[![npm](https://img.shields.io/npm/v/@i9up/nes)](https://www.npmjs.com/package/@i9up/nes) · Node 20+ · MIT · [Português](README.md)

Almost everything said about AI in software development is about tools; almost nothing is about **organization**. The
NES method, from the book *A Nova Engenharia de Software* ("The New Software Engineering", Alessandro Medeiros, NES
Collection, Vol. 1), organizes people, specialized agents and knowledge into one coordinated system. This library
applies the method to your repository. It is language-agnostic: it reads what the project already has (stack, agents,
backlog) and organizes around it.

```bash
npx @i9up/nes init        # builds the agent team, with contracts, and puts OpenSpec and Ponytail in the flow
npx @i9up/nes contract    # checks the 5 sections of each agent's contract
npx @i9up/nes maturity    # M0–M5 for the project and each area, with the next criterion to meet
npx @i9up/nes agent       # protocol for an LLM to drive all of this in the project
```

English or Portuguese: the language comes from your system, from `nes.json` or from `--lang en|pt`.

## With an AI agent

Ask your agent (Claude Code, Codex, Cursor): *"run `npx @i9up/nes agent` and follow the protocol"*. Without an
interactive terminal, `nes` switches to agent mode:

1. The LLM reads the repository and answers what it can prove: what the project does, the stack, the test command
   for each folder.
2. `init` returns what only the human knows (who approves what gets escalated, the starting level). The LLM asks you
   and does not make it up (NES-002).
3. It runs `nes init --description "..." --approver "..." --test "folder=command"` and shows the plan. Nothing is
   written without `--apply`, which it only uses with your approval. Installers, too, only with your permission.
4. It completes the contracts of the agents you already had until they reach 5/5, confirming autonomy level and
   targets with you.
5. It runs `nes maturity`; whatever the repository cannot prove becomes a question for you, recorded with
   `--declare key="evidence"`.

The goal is not 100% autonomy: it is as much autonomy as possible **within explicit perimeters**, which grow with the
metrics. Decisions with no written rule and merging to production stay with a person.

## The 3 principles

- **NES-001 · Organization before automation.** You do not automate chaos.
- **NES-002 · Automate explicit decisions, not hidden ambiguity.** What is not written down, the agent does not
  decide: it escalates to a human.
- **NES-003 · Specialization produces quality.** A team of specialists beats the do-everything agent.

## `nes init` · the team

Asks 4 questions, one at a time (the project, the stack, the starting level and who approves escalations), and builds
a team of the right size:

| Level | Roles |
|---|---|
| M2 · getting started | Maestro (orchestrates), Executor (implements), Crivo (QA, review and security) |
| M3 · coordinated team | + Architect (structure and contracts) |
| M4 · factory | + Cronista (Cognitive Capital) |

- **Adopts before creating.** If the project already has an orchestrator, specialists or a QA agent in
  `.claude/agents/`, they take the roles. Only what is missing becomes `nes-<role>.md`.
- **A contract in every generated role.** Each agent ships with the 5 sections of ch. 8 and minimal tools, and scores
  5/5 in `nes contract`.
- **A Crivo gate based on the stack.** `init` detects the stack of each folder (node, python, go, .NET, Java, Rust,
  Delphi) and sets up the test command. When there is no standard command, you provide it with
  `--test "folder=command"`.
- **Context Diet.** The whole team costs at most ~600 fixed tokens per session (around 250 in a new project). The
  method lives in `docs/nes/`, read only when needed.
- **Never overwrites.** `init` shows the plan and asks before writing. Running it again only creates what is missing.

### OpenSpec and Ponytail in the flow

Both tools join the flow by default (`init` asks once) and become rules in the role contracts:

```
Maestro breaks it down (/opsx:propose) → Architect decides the structure → Executor implements (/opsx:apply) with
Ponytail on → Crivo runs the gate and /ponytail-review → Cronista records and archives (/opsx:archive)
```

`nes` copies neither of them. It detects whether they are installed and offers the official
[OpenSpec](https://github.com/Fission-AI/openspec) installer. For [Ponytail](https://github.com/dietrichgebert/ponytail),
which installs from inside the agent, it prints the commands.
[harness-toolkit](https://github.com/tech-leads-club/harness-toolkit) joins with `--with harness`; since it is Elastic
2.0, you install it yourself.

## `nes contract` · does each agent have a contract?

Checks the 5 sections of the agent contract (ch. 8):

1. **Identity and scope**, including what the agent does **not** cover.
2. **Granted tools**, each with a reason. An agent without `tools:` in its frontmatter inherits all of them.
3. **Required context**: what to consult before deciding.
4. **Autonomy perimeter**: level 1 to 4 (ch. 9) and the exact escalation trigger.
5. **Evaluation criteria**: metrics and targets defined before use.

`nes contract <agent>` shows one agent in detail, `--template <name>` creates the skeleton and `--strict` fails CI if
any contract is incomplete. Headings are recognized in English and Portuguese.

## `nes maturity` · where we are, honestly

Applies the objective transition criteria of ch. 21, for the project and for each area (`apps/`, `packages/`,
`services/`), because parts of a project sit at different levels at the same time. Each criterion shows its source:
**✔ verified** in the repository, **◐ declared** by the team (`nes` asks only what the repository cannot prove and
saves it in `nes.json`) or **✘ missing**. The output ends with the next criterion to meet.

## And fengshui?

[`@i9up/fengshui`](https://github.com/i9up/fengshui) is NES-001 as a tool: it organizes the context agents carry (the
Context Diet). `nes` uses fengshui internally: `init` measures the fixed context before and after. In practice,
**just run `nes`**. fengshui also works on its own; in a project already loaded with instructions, run
`npx @i9up/fengshui diagnostico` first.

## A real case

Born at Pontoix (ERP, POS and tax APIs, 9 apps, 33 agents). The first honest measurement came out at **M1**: the
project already had M3–M4 practices (an OpenSpec backlog, a task dispatcher), but none of the 33 agents had a complete
contract, and without contracts ch. 21 does not let you past M1. The most common gaps were the autonomy-perimeter and
evaluation-criteria sections, missing from all 33 agents. That became the first piece of work.

Method from the book *A Nova Engenharia de Software* (NES Collection, Vol. 1), by Alessandro Medeiros. MIT license.
