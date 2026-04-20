---
title: 'Incident Response When the System Has Opinions'
description: 'Traditional incident response assumes deterministic systems. What changes when your system can creatively decide to do the wrong thing? A practical guide to runbooks and response patterns for agent failures.'
pubDate: '2026-03-07'
tags: ['agents', 'infrastructure', 'security', 'opinion']
draft: false
---

The page fires at 2am. You look at the alert description and your first instinct is to open the logs.

That instinct is wrong. Not because logs are useless — they are indispensable — but because in an agent system, the logs will show you a successful operation. The agent ran. It called tools. It returned a response. No exceptions. Exit code zero. The failure you are looking for is not in the error stream. It is in the semantic content of what the agent decided to do.

This is what makes incident response for agentic systems different from everything you have done before. The failure mode is not a crash. It is a decision.

## What incident response is designed for

The classical incident response playbook was written for deterministic systems. Something breaks. You find the break. You fix it or roll it back. The mental model is essentially forensic — trace backward from the symptom to a cause that can be located in code or config.

This works because traditional software systems do exactly what they are told. A bug is a divergence between the code's behavior and the programmer's intent — but the code itself is consistent. Given the same input it produces the same output. Run the reproduction steps in the postmortem and you see the same failure. Write the fix and verify it.

Agentic systems violate this assumption at the core. An LLM in the loop introduces a decision function that:

- Is nondeterministic — the same input does not guarantee the same output
- Has a large action space — the agent can choose from many possible responses and tool calls
- Reasons in ways that are difficult to predict before the fact and difficult to explain after it
- Can produce plausible-looking outputs that are subtly or dramatically wrong

When an agent misbehaves in production, you are not looking for a bug in the classical sense. You are looking for a decision — possibly a reasonable-seeming one — that had bad consequences. The question is not "what caused the error?" but "why did the agent choose to do that?"

## The new first question

In a traditional incident, the first question is: what is the error?

In an agent incident, the first question is: what did the agent decide, and why?

This sounds philosophical. It is actually operational. It dictates what you look at first.

In a deterministic system, you read the exception and the stack trace. The error tells you where the code went wrong.

In an agent system, you read the agent's reasoning trace. What context did it have when it made the decision? What tool calls did it make and in what order? What was the exact content of the prompt at the relevant step? If the agent has scratchpad or chain-of-thought output, what did that say?

This is why instrumentation is not optional. If you cannot reconstruct the full reasoning chain for any request — every tool call, every model input, every intermediate output — you cannot do incident response. You will be looking at a system that committed an action and cannot explain why, because you did not record the intermediate steps that led to it.

Build your traces before you need them. The 2am incident is not the time to discover your agent emits no structured spans.

## Two classes of failure

Once you are oriented toward the right questions, incident triage for agent systems splits cleanly into two categories. Treating them as the same category is the most common mistake I see.

**Infrastructure failures** are the ones classical incident response handles well. The model API is down. A tool is returning errors. Token limits are being exceeded. The orchestration framework is crashing. Context is being truncated incorrectly. These are ordinary software failures that happen to be in an agent system. Your existing runbooks mostly apply. You can find the failure, reproduce it, and fix it.

**Semantic failures** are the ones that require a different playbook entirely. The agent is running fine but making bad decisions. It is miscategorizing inputs. It is using tools in unintended combinations. It is following the letter of its instructions while violating their spirit. It is being manipulated by adversarial content in its context window. Nothing is broken in the infrastructure sense. The system is making choices that a reasonable person would judge as wrong.

When a page fires, your first triage question is: which class is this? The answer determines everything about how you respond.

A quick heuristic: if there are error logs or unhealthy health checks, investigate infrastructure first. If the system looks healthy but the outputs are wrong, you are in semantic failure territory and you need to change your approach immediately.

## Triage for semantic failures

Semantic failure triage starts with the reasoning trace. The questions to answer, in roughly this order:

**What was the agent asked to do?** Reconstruct the user input or triggering event. Sometimes semantic failures are actually prompt injection attacks — adversarial content in the environment that hijacked the agent's instructions. Check for this first because the remediation differs.

**What context did the agent have?** A common failure mode is retrieval that returned bad content, a conversation history that accumulated in a pathological direction, or a system prompt that was out of date. The agent's decision might have been locally reasonable given its context, even though the context was wrong.

**What was the decision point?** Identify the specific choice that led to the bad outcome. Was it a tool call with wrong parameters? A refusal when it should have acted? An action sequence that seemed locally reasonable but had bad global consequences? You need to isolate the exact step.

**Is this a pattern or a one-off?** A single bad decision may be noise. The same failure mode appearing across multiple requests is a systematic problem that needs a systematic fix. Pull the last few hours of traces and look for other instances of the same pattern.

The postmortem question for semantic failures is not "what was the bug?" It is "why was this decision reasonable given what the agent knew, and what do we need to change so that class of decision doesn't happen again?"

## Containment and the blast radius problem

Traditional incident response assumes you can bound the blast radius. The database corruption affected rows added in the last four hours. The wrong charge went to accounts created this week. You can identify the affected set and reason about remediation.

Agent systems can have effectively unbounded blast radius. An agent operating autonomously can make hundreds of decisions before a human notices anything is wrong. Each decision can have downstream consequences that are hard to enumerate. If the agent had write access to external systems — email, databases, APIs — those writes happened and cannot simply be rolled back by reverting a code deploy.

This requires thinking about containment before incidents happen, not during them.

**Scope limits.** The principle of least privilege, applied to agents. An agent that only needs to read a calendar should not have write access to it. An agent that manages scheduling should not have access to financial systems. The more an agent is constrained to a minimal set of capabilities, the more bounded the damage when it makes bad decisions.

**Reversibility bias.** Design your agent's action space to prefer reversible operations. Draft before send. Stage before apply. Queue before execute. Every place where you can introduce a human review step before an irreversible action is a place where a semantic failure can be caught before it has consequences.

**Rate limiting on consequence.** An agent that sends one email per session can only send one wrong email. An agent that can send unlimited emails and chooses to interpret an instruction liberally can create a significant problem in minutes. Think about natural rate limits on the most consequential actions.

**Audit trails you can actually use.** Every consequential action an agent takes should be logged in a format where you can answer "what did this agent do, in what order, on whose behalf, and with what stated reasoning?" This is your blast radius enumeration tool when something goes wrong.

## Kill switches are not optional

The kill switch is the most important piece of agent infrastructure that most teams do not build until after their first serious incident.

A kill switch is a mechanism to stop an agent's consequential actions immediately, without a code deploy and without destroying state. The operational requirement: any on-call engineer should be able to stop the agent from taking new actions within sixty seconds of deciding to do so.

In practice this usually means one or both of:

**Feature flags.** A dynamic flag that the agent checks before taking any consequential action. When flipped, the agent continues processing but does not execute writes, sends, or other external actions. It can queue actions for human review or simply decline them. The flag can be flipped by the on-call engineer without touching code.

**Hard circuit breakers.** In the vein of distributed systems circuit breakers — a pattern where the agent stops calling a particular tool or class of tools after a threshold of errors or anomalies, and remains in that stopped state until a human explicitly re-enables it.

The second piece is a quarantine mode: the ability to take an agent offline for a specific user or context while it continues running normally for others. This lets you limit further exposure while investigating without a full shutdown.

Both of these need to exist before you need them. Trying to build a kill switch during a live incident is a terrible experience.

## Human-in-the-loop escalation

There is a class of agent failure where the right response is not to fix the agent and let it continue — it is to route the request to a human.

This is uncomfortable to design for because it feels like admitting the agent is not good enough. That framing is wrong. The question is not whether the agent is good enough in general. The question is whether you have confidence in the agent's decision in this specific context. When you do not, the right answer is to ask a human.

The patterns for escalation worth building into your runbooks:

**Uncertainty escalation.** If the agent's reasoning trace shows high uncertainty — repeated hedging, multiple contradictory tool calls, explicit reasoning about edge cases — treat that as a signal. Some uncertainty is normal. High uncertainty in a high-stakes context should trigger escalation, not a guess.

**Anomaly escalation.** If the agent is being asked to do something it has never done before — a novel input type, a request outside its typical distribution, a context with unusual characteristics — that novelty is a risk factor. Novel situations are where agents fail in unexpected ways.

**Consequence escalation.** Some actions are consequential enough that human review is warranted regardless of agent confidence. Sending external communications on behalf of a user. Making purchases. Modifying permissions. The right threshold is whatever your organization's risk tolerance is — but the threshold should be explicit and enforced, not aspirational.

The practical implementation: build a concept of "hold for review" into your agent's action repertoire. When escalation criteria are met, the agent packages the context, explains what it was about to do and why, and puts the action in a queue. A human reviews it and either approves, modifies, or cancels.

This is slower. It is correct.

## Writing runbooks for a nondeterministic system

Classic runbooks are decision trees. Symptom A → check B → if yes, do C. This works when the system is deterministic enough that the same symptom has a reliable cause.

Agent runbooks need a different structure because the same symptom — "agent is doing bad things" — can have many causes with different remediations.

The structure that works:

**Triage section.** A fast path to answer: is this infrastructure or semantic? Is this affecting one user or many? Is the agent doing anything irreversible right now? The first ten minutes of any agent incident should be spent on containment if needed, then triage. In that order.

**Containment procedures.** Step-by-step instructions to use the kill switches and quarantine mechanisms, written for someone who has never used them before and is stressed. Linked from every other section. If the agent is doing something harmful, containment first, investigation second.

**Investigation by failure class.** Separate sections for infrastructure failures (check these logs, these metrics, these health checks) and semantic failures (pull this trace format, check these reasoning steps, look for these patterns).

**Remediation by failure class.** For infrastructure failures: the usual rollback and fix procedures. For semantic failures: the options are usually prompt modification, model version change, retrieval pipeline fix, or capability restriction. Each has different lead times and different risks. Know which ones can be applied without a code deploy and which ones cannot.

**Escalation contacts.** For semantic failures involving safety concerns, prompt injection, or potential adversarial use, the escalation path is different than for ordinary reliability incidents. Have it written down.

## The posture shift

The fundamental shift in incident response for agent systems is from "find the thing that broke" to "understand the decision that went wrong."

This is harder. It requires better instrumentation, more investment in tooling before incidents happen, and a different mental model during triage. It also requires accepting that not every agent failure has a clean root cause. Sometimes the agent made a locally reasonable decision given bad inputs, and the fix is upstream of the agent itself. Sometimes the decision was in the tail of a distribution and would be hard to reproduce.

What it does not require is giving up on systematic response. The failure modes are different, but they are analyzable. The decisions are nondeterministic, but they are traceable. The blast radius is potentially large, but it can be bounded with the right architecture.

Build the kill switches. Write the runbooks before the incidents. Instrument the reasoning chains. Then your 2am page becomes something you can respond to with a process instead of a prayer.

That is the standard to hold yourself to.
