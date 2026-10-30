# The NES method, in short

An operational summary of *A Nova Engenharia de Software* ("The New Software Engineering", Alessandro Medeiros, NES
Collection, Vol. 1). The chapters cited go deeper. This file is read on demand, not in every session.

## The 3 principles

- **NES-001 · Organization before automation.** You do not automate chaos (ch. 1).
- **NES-002 · Automate explicit decisions, not hidden ambiguity.** A decision that is not written down is not made by
  the agent: it escalates to a human (ch. 2).
- **NES-003 · Specialization produces quality.** A team of specialists with a clear scope beats the do-everything agent (ch. 3).

## Agent contract (ch. 8)

1. **Identity and scope**, including what the agent does not cover.
2. **Granted tools**, each with a reason (least privilege).
3. **Required context**: what to consult, where it lives, how it is kept up to date.
4. **Autonomy perimeter**: the level and the exact escalation trigger.
5. **Evaluation criteria**: metrics and targets defined before use.

Check with `nes contract`.

## Autonomy levels (ch. 9)

| Level | The agent |
|---|---|
| 1 · Suggestion | analyzes and recommends; a human executes |
| 2 · Execution with prior approval | prepares the action; runs it after approval, case by case |
| 3 · Execution with later audit | acts within the perimeter; oversight is by sampling |
| 4 · Autonomous with flagged exceptions | acts freely; escalates only what falls outside the perimeter |

Moving up a level needs an objective metric, a pilot in a lower-risk area, a rollback criterion defined beforehand and
someone accountable for the transition.

## Maturity (ch. 21)

| Level | Minimum criterion to reach it |
|---|---|
| M1 · Assistants | part of the team uses AI regularly |
| M2 · Specialized Agents | one agent with a documented contract, in real use, with minimal observability |
| M3 · Agent Teams | two or more specialists formally coordinated, without heroic coordination |
| M4 · Intelligent Software Factory | smart backlog, safe refactoring and formal security beyond the first area |
| M5 · Cognitive Organization | the learning loops active and measured over several quarters |

Different parts of a project can sit at different levels. Check with `nes maturity`.

## The team

| Role | Does | Does not |
|---|---|---|
| Maestro | breaks down, delegates, escalates | code, approval, architecture alone |
| Architect | structure and contracts between modules | implementation |
| Executor | implements the task, with tests | widen the scope, approve its own delivery |
| Crivo | runs the gate and approves or blocks with a reason | fix the code |
| Cronista | records the decision in the Cognitive Capital | judge the decision |

Invariant rule: **nothing reaches production without human approval** ("manual merge always").
