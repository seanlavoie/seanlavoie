---
title: 'Agents Are Just Distributed Systems With Opinions'
description: 'Most of the hard problems in agentic systems are distributed systems problems you have been solving for years. The LLM is just a nondeterministic function in the middle.'
pubDate: '2026-04-18'
tags: ['agents', 'distributed-systems', 'infrastructure', 'opinion']
draft: false
---

The first time I debugged an agent system in production, I had the strangest feeling of deja vu.

An agent retried a tool call and created a duplicate record. I had fixed this bug before — in a payment pipeline. An agent lost its context mid-task after a process restart. I had fixed this one too — in a workflow engine. Two agents stepped on each other modifying the same resource. Classic distributed lock problem. An agent silently failed and nobody noticed for six hours. I have written that post-incident report more times than I want to admit.

Strip away the "AI" framing and you are left with distributed systems problems that have well-understood solutions. The hard part of building agents is not the AI. It is the infrastructure around it.

Here is the thesis: most of the problems you will hit building agentic systems are problems you have been solving for years. The LLM is just a nondeterministic function in the middle.

## I have fixed this bug before

If you have spent time operating backend systems, these failure modes will feel familiar:

**Agent retried a tool call and created a duplicate.** This is the idempotency problem. Same thing that happens when a payment gateway times out and your retry creates a double charge. Same failure, different costume.

**Agent lost context mid-task after a crash.** This is checkpointing. Every workflow engine from Temporal to Step Functions exists to solve exactly this: durable state that survives process failure. An agent accumulating context across tool calls is just a stateful workflow with an expensive orchestrator.

**Two agents stepped on each other's work.** Coordination failure. Distributed locking, optimistic concurrency, leader election — pick your pattern. The fact that the competing writers have opinions about what they are writing does not change the consistency problem.

**Agent silently failed and nobody noticed for hours.** Observability gap. A microservice that drops events without alerting is the same problem whether the service is running deterministic code or a language model. The failure is the missing instrumentation, not the thing being instrumented.

Four bugs, four well-known distributed systems problems. None of them required novel solutions. They required the discipline to apply the solutions that already exist.

## The distributed systems hiding in every agent

Once you see the mapping, it is everywhere. Every serious agent system is a distributed system whether the builders intended it that way or not. Here are the places the abstraction leaks:

### State management

Agents are stateful workflows. They accumulate context, make branching decisions, take side-effecting actions, and need to recover when things go wrong partway through. This is the exact problem space of durable execution.

The design questions are identical to what you would ask about any workflow engine: Where does state live? How do you checkpoint? What happens on partial failure — do you replay from the beginning or resume from the last successful step? What is your consistency guarantee when the agent has already taken an external action that cannot be rolled back?

If you are building an agent framework and not thinking about these questions, you are building a workflow engine that does not know it is a workflow engine. That is the most dangerous kind.

### Idempotency

When an LLM calls a tool and the HTTP request times out, you retry. But did the side effect already happen? Did the email send? Did the database write land? Did the API call go through?

This is at-least-once delivery. The same problem that makes payment systems hard, that makes webhook handlers hard, that makes event-driven architectures hard. The solutions are the same too: idempotency keys, deduplication layers, designing operations to be safely retriable.

The agents-specific wrinkle is that the LLM might not even remember it already tried. Your idempotency layer cannot rely on the caller being aware of previous attempts. It has to be structural.

### Observability

You cannot debug a nondeterministic system without traces. But the good news is that agent execution traces look almost exactly like distributed traces. Each tool call is a span. The LLM decision that triggered it is metadata on the parent span. The chain of decisions across a multi-step task is a trace.

The gap is not that we need some new category of "AI observability." It is that most agent builders are not applying the observability practices that backend engineers have been refining for a decade. Structured logging. Distributed tracing. Alerting on outcomes, not just errors. The tools exist. Use them.

### Coordination

Multi-agent systems are multi-service architectures with chattier interfaces. Everything about service-oriented coordination applies: who owns what resource? How do you handle conflicting writes? What is your consistency model? How do you prevent thundering herds when multiple agents wake up to handle the same event?

The CAP theorem does not care that your services have opinions about what they are doing. You still have to choose between consistency and availability when agents are collaborating across a shared state boundary.

## The one genuinely new thing

I am not going to pretend it is all old wine in new bottles. There is one thing that is genuinely different: the decision-maker is nondeterministic.

With deterministic code, same input produces same output. You can write assertions on exact behavior. You can reproduce bugs reliably. You can reason about code paths by reading the code.

With an LLM in the loop, none of that holds. The same prompt can produce different decisions. Your system can return 200 OK and still be completely wrong — the failure is semantic, not structural. Cost and latency per decision are variable in ways deterministic code paths never are.

This changes three things meaningfully:

**Testing.** You cannot assert on exact outputs. You test properties, boundaries, and invariants instead. Does the agent stay within its allowed actions? Does it respect the constraints you gave it? Does it converge on acceptable outcomes across a distribution of runs?

**Failure detection.** Health checks are necessary but not sufficient. A healthy agent can be confidently doing the wrong thing. You need semantic validation — checking that outcomes match intent, not just that the process is alive.

**Cost modeling.** A deterministic code path has predictable cost per execution. An agent might take three steps or thirty. Your capacity planning needs to account for variance, not just averages.

But even here, the mitigations are borrowed. Property-based testing is not new. Circuit breakers for expensive external calls are not new. Cost-aware routing is not new. The LLM is a novel component. The engineering discipline around it is not.

## Build it like infrastructure

If you accept the framing — agents are distributed systems — then the implications for how you build them are concrete:

**Treat the LLM as an unreliable external service.** Timeouts, retries with backoff, fallback behavior, circuit breakers. You would not build a payment system that crashes when Stripe is slow. Do not build an agent system that falls over when the model provider has a latency spike.

**Use durable execution patterns.** Checkpoint state between tool calls. Make every external action idempotent. Design for recovery from any point of failure, not just the happy path. If your agent cannot resume mid-task after a restart, you have a reliability problem that no amount of prompt engineering will fix.

**Instrument everything.** Traces, not just logs. You need to reconstruct the full chain of decisions that led to any given action — same as reconstructing a distributed transaction across services. When something goes wrong in production (and it will), "the agent decided to do that" is not a root cause. The trace that shows why it decided is.

**Do not invent new abstractions when existing ones work.** Task queues, workflow engines, pub/sub, saga patterns — these exist because distributed systems are hard and the industry spent decades getting the patterns right. The agent is the orchestrator. It is not a reason to throw away orchestration patterns.

## The punchline

The engineers who will build the best agent systems are not the ones who understand AI the most deeply. They are the ones who understand infrastructure the most deeply and happen to use AI as a component.

The industry is rediscovering distributed systems fundamentals and calling them "agent frameworks." That is fine — reinvention is how patterns spread. But if you already know the fundamentals, you are not behind. You are ahead. You just need to recognize the problems you are looking at.

The hard part was never the AI. The hard part is, and always has been, the system around it.
