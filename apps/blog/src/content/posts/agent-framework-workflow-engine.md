---
title: 'Your Agent Framework Is a Workflow Engine in Denial'
description: 'Every serious agent framework eventually reinvents Temporal. The ones that do it badly are the ones that do not know that is what they are doing.'
pubDate: '2026-04-17'
tags: ['agents', 'distributed-systems', 'architecture', 'opinion']
draft: true
---

Every serious agent framework eventually builds a workflow engine. The ones that do it badly are the ones that do not realize that is what they are doing.

I keep seeing the same pattern: a team ships an agent framework, the framework gets real workloads, the real workloads require durability and recovery, and the team finds itself adding checkpointing, retry logic, and state persistence to something that was originally just a function call loop. Three months later they have a workflow engine with an LLM attached — one that has none of the guarantees of Temporal, Step Functions, or Airflow, but all of the complexity.

This is not a knock on agent builders. It is a description of a predictable path when you start from the LLM and work outward instead of starting from execution semantics and working inward.

## What a workflow engine actually is

Strip away the product names and a workflow engine is a runtime that:

1. Persists execution state durably so it survives process failure
2. Replays execution history to reconstruct state after recovery
3. Guarantees at-least-once or exactly-once execution of steps
4. Provides compensation — the ability to undo partial work when a downstream step fails

These properties are not nice-to-haves. They are what makes a workflow engine suitable for real workloads where partial failure is the normal case, not the exception.

Now look at what every agent framework eventually needs: agents that survive process crashes mid-task. Retry behavior when tools fail. Some way of knowing which steps already ran so you do not re-send the email. Some way of cleaning up when a multi-step task fails partway through.

That is the same list. Agent frameworks and workflow engines solve the same reliability problem. The question is whether they solve it well.

## Where the abstraction leaks

**State persistence.** Most agent frameworks store state in the context window. The conversation history, tool call results, and accumulated facts live in the prompt. When the process dies, the context dies with it. When you want to resume, you are starting over.

A workflow engine solves this differently. State is checkpointed to durable storage at every step boundary. Recovery means replaying the execution log to reconstruct where you were — not re-running the work, just fast-forwarding through already-completed steps to reach the point of failure.

The agent framework version of this is usually: "save the conversation history to a database and reload it." That is checkpointing, but it has a subtle flaw. If your agent was in the middle of a tool call when it crashed — call sent, result not received — how do you know? The database has no record of an in-flight operation. You reload the context, the agent re-evaluates, and it re-runs the tool call. If that tool call was `send_email` or `create_charge`, you now have a correctness problem.

Temporal's event sourcing model handles this because the event log captures "tool call started" as a discrete event before "tool call completed." Recovery knows the difference between "never tried" and "tried but did not record the result."

**Replay semantics.** When a workflow engine replays execution history, it does not re-execute side-effecting operations. It fast-forwards through recorded results. This is the insight that makes durable execution actually durable: replay is cheap because it skips the work.

Agent frameworks that bolt on checkpointing usually do not get this right. They save state at checkpoints but replay by re-running everything up to the checkpoint. If you have a ten-step task and crashed at step nine, you are re-running the nine steps to get back there. If any of those steps are slow or side-effecting, your recovery is expensive and potentially incorrect.

**Compensation.** A saga is a sequence of transactions where each step has a compensating action — the operation that undoes its effects if a later step fails. Book the flight, book the hotel, book the car. If the car booking fails, cancel the hotel and the flight. The compensating actions are first-class citizens of the workflow definition.

I have not seen a single mainstream agent framework with a native compensation model. The common pattern is: the agent calls a bunch of tools, something fails, and the agent is prompted to "clean up." The cleanup is ad-hoc LLM reasoning about what needs to be undone. This is not a compensation pattern. It is improvised undo that relies on the model correctly remembering and reversing its prior actions.

In a financial system or a resource provisioning workflow, "the model tried to clean up" is not an acceptable guarantee. The compensation logic needs to be in code, not in a prompt.

## The tool loop is a workflow step

Here is the mapping that makes this concrete. An agent's tool loop is a workflow step. An LLM deciding which tool to call next is a workflow branch. A multi-step agent task is a workflow. These are not analogies — they are the same computational structure.

In a workflow engine, you define activities (the side-effecting operations), a workflow function (the orchestration logic), and let the engine handle the reliability guarantees. Your workflow function is deterministic code. The engine replays it on recovery.

In an agent framework, the tool calls are activities, the LLM is the orchestration logic, and you write the reliability guarantees yourself. The key difference is that LLM orchestration is nondeterministic — same input does not guarantee same execution path — which makes replay harder. You cannot replay an LLM decision by re-running the LLM. You have to record the decisions and replay only the outcomes.

This is actually solvable. Temporal's "workflow code must be deterministic" constraint exists because replay depends on it. For LLM orchestration, you satisfy the same constraint by recording every LLM output to the event log and replaying the recorded output on recovery instead of re-querying the model. Some frameworks are starting to do this. Most are not.

## When to reach for the real thing

Not every agent needs Temporal under it. But there are clear signals that you do:

**Tasks longer than a few minutes.** If your agent might run for ten minutes, the probability of a transient failure during that window is non-trivial. You need durable state.

**Tasks with irreversible side effects.** Email, payments, provisioning, notifications. Any action that cannot be easily undone needs at-least-once semantics with deduplication. Idempotency keys at the HTTP layer are table stakes — they do not solve the "did the agent record that it already sent this" problem.

**Tasks requiring human-in-the-loop.** Pause, wait for approval, resume. This is trivially modeled as a workflow waiting on a signal. In an agent framework, it requires you to serialize the entire agent state, store it somewhere, and correctly deserialize it when the human responds. You are building workflow engine pause/resume by hand.

**Tasks that need an audit trail.** Compliance requirements, financial operations, anything where "what happened and why" is a legal question. The event log in a workflow engine is that audit trail, by construction. In an agent framework, you are one logging bug away from having no record of what the agent decided to do.

**Coordinating multiple agents.** The moment you have agents handing off work to other agents, you need the same primitives that make service-to-service coordination reliable: delivery guarantees, ordering, visibility into what is in flight. This is message queues and workflow orchestration. It is not just agent A calling agent B.

## Start from the primitives

The engineers building the most reliable agent systems I have seen are not the ones who started with a framework and bolted on reliability. They are the ones who started with workflow-engine primitives and put the LLM in the position of orchestration logic, not infrastructure logic.

The LLM decides what to do next. The workflow engine makes sure it actually happens and can be recovered from. Each component does what it is good at.

The appeal of starting with a high-level agent framework is real. Less setup, faster iteration, better demos in the first week. But every team that takes a serious agent workload to production discovers they need the primitives that workflow engines provide. The only question is whether they build them from scratch or reach for something that already has them.

Building your own Temporal is a bad use of your time. The correct move is to realize you want Temporal, reach for Temporal (or Step Functions, or Hatchet, or whatever fits your stack), and spend your engineering time on the actual differentiator: the agent logic and the domain-specific tools.

## The punchline

Your agent framework is a workflow engine. It just has not admitted it yet.

Every retry mechanism, every checkpoint, every state serialization layer added to an agent framework is a workflow engine primitive being discovered the hard way. The frameworks that survive production workloads will either integrate with real workflow engines or become them.

If you are designing an agent system today, start with the workflow semantics. Decide how state persists, how recovery works, and how compensation is defined before you write a single prompt. The LLM is not the hard part. The hard part is, and always has been, getting the execution model right.
