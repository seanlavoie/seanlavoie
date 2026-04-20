---
title: 'The Case for Boring Infrastructure in AI Systems'
description: 'The model is the innovation. Everything around it should be as predictable as possible. A complexity-budget argument for choosing PostgreSQL over the hot new vector database.'
pubDate: '2025-11-03'
tags: ['infrastructure', 'agents', 'opinion', 'architecture']
draft: false
---

There is a mental model from software infrastructure that goes like this: you have a finite budget of novelty to spend across your stack. Every new technology you adopt is a withdrawal. When your budget is exhausted, each additional unfamiliar system makes the whole harder to debug, operate, and reason about. Spend your novelty budget on the parts that are actually your product. Spend nothing on the rest.

That idea predates LLMs. But it applies to AI systems more forcefully than almost anywhere else, because most teams have already spent their entire novelty budget on the model — and then keep spending.

## Your complexity budget is already overdrawn

The model itself is a novel component. It is nondeterministic. Its failure modes are unfamiliar. Its behavior changes with phrasing, context window pressure, model version updates, and factors you do not fully control. Debugging it requires different skills than debugging code. Monitoring it requires different metrics than monitoring a service. Operating it in production is genuinely hard in ways that take time to learn.

This is the one place in your stack where novelty is unavoidable. The model is the product. You cannot choose boring here.

But a surprising number of teams then build their AI systems on top of a new vector database, a new orchestration layer, a new streaming pipeline, a new observability tool built specifically for LLM traces, and a new authentication model for agent-to-agent communication. Every one of those choices is a withdrawal from a budget that was already empty.

When something breaks — and something always breaks — you are debugging your novel model behavior through a novel infrastructure layer using a novel observability tool. You have no intuition for which layer is lying to you. You have no prior incidents to pattern-match against. You have no one on your team who has operated any of these components in production before. You are on your own in every dimension at once.

## What boring actually buys you

Boring technology is not bad technology. PostgreSQL is not boring because it is old or simple. PostgreSQL is boring because it is extraordinarily well understood. Its failure modes are documented. Its performance characteristics are known. When it does something unexpected, there is a decade of Stack Overflow answers and a community of people who have seen your problem before.

The same applies across the stack. Redis is boring. S3 is boring. Cron is boring. An HTTPS webhook is boring. None of these are simple — PostgreSQL can do things that would take months to build from scratch — but they are predictable. You know what you are getting.

Predictability is the thing that boring technology buys you. And predictability is worth more in a system that already has a nondeterministic LLM in the hot path than almost anywhere else.

## Where the novelty trap bites hardest

**Vector databases.** The pitch is seductive: store your embeddings natively, get semantic search, avoid an impedance mismatch. The reality is that most vector search workloads fit fine in PostgreSQL with pgvector. You get ACID semantics, you can join against your existing tables, you have one database to operate, and every PostgreSQL runbook you already own still applies.

The new vector database might be faster at pure ANN query throughput. At the scale where that matters, you probably have enough traffic that you have other problems to solve first. At the scale where most AI systems actually run, you are optimizing for operational simplicity, not query speed.

**Event-driven agent pipelines.** The argument is that agents should react to events, fan out in parallel, and communicate through a message bus. Sometimes this is true. But the majority of agent workflows I have seen are sequential tasks with human-readable inputs and outputs. A cron job that polls a queue and processes items one at a time is not a performance problem for that workload. It is the simplest thing that works. It also means your agent pipeline is debuggable with standard tools: check the queue depth, look at the processing log, replay a failed item by re-queuing it.

Introduce a distributed event streaming platform and your debugging story changes entirely. Now you are asking: did the event get produced? Did the consumer receive it? Was it committed to the offset? Did the consumer crash before or after processing? These are answerable questions, but they require knowledge of the platform, and they add investigation steps every time something goes wrong.

**Novel agent communication protocols.** Agent-to-agent communication is a real problem. It is also a solved problem in several boring ways: an HTTP endpoint, a database row, a message queue entry, a shared filesystem. None of these require a custom protocol or a specialized agent coordination layer. They all have existing authorization models, existing monitoring, and existing runbooks. The interesting work is in the agent logic, not in the transport.

## When novelty is actually justified

There are legitimate reasons to reach for something new. The test is whether the novel technology provides a capability that is genuinely unavailable in the boring alternative, and whether that capability is load-bearing for your product.

A purpose-built vector database is probably justified if you are doing billion-scale semantic search with complex filtering requirements and your latency budget is tight. It is not justified because someone on the team thinks it is more elegant or because the demo looked impressive.

A streaming event platform is justified if your agents genuinely need sub-second reaction to high-volume event streams with strict ordering guarantees. It is not justified because your architects have experience with Kafka and want to use it.

The question to ask: if we used the boring alternative, what specifically would not work? If the answer is "it would be a little slower" or "the architecture would be less clean," that is not a justification. If the answer is "we would exceed the row limit in PostgreSQL" or "we cannot get the latency we need with polling," you have found a real constraint. Spend your novelty budget there.

## Resume-driven development, revisited

There is a less charitable explanation for why AI infrastructure ends up overengineered. Engineers want to work with new technology. New technology looks good on a resume. There is a selection effect where the engineers most excited to work on AI infrastructure are also the engineers most interested in novel systems.

This is not a character flaw. It is a normal incentive. But it is worth naming explicitly, because it is a significant driver of the pattern. A team building their third AI system tends to make much more conservative infrastructure choices than a team building their first. The novelty premium has worn off. They know what broke last time.

If you are building your first production AI system, try to reason as if you are building your third. What would you have learned by then? Almost certainly: that the model behavior is the interesting problem, and everything around it should be as quiet as possible.

## The differentiator is in the prompt, not the plumbing

The teams shipping AI products that work are, with surprising frequency, running them on infrastructure that is aggressively conventional. PostgreSQL with pgvector. AWS Lambda or ECS. An SQS queue. Standard application logging with Datadog or similar. The thing that differentiates them is not infrastructure architecture. It is prompt engineering, evaluation harness quality, fine-tuning choices, and domain understanding.

The teams that are still debugging production incidents six months in are often the ones who spent the first three months building a bespoke infrastructure platform. Their ops burden is high. Their debugging surface area is enormous. Their engineers spend time on infrastructure problems that have nothing to do with the AI capabilities they set out to build.

The LLM is already the most novel component in your system. It demands your attention, your operational investment, and your limited capacity for managing unfamiliar failure modes. There is nothing left in the budget for a stack of novel infrastructure underneath it.

Choose boring. Save your novelty budget for the model. That is where the leverage is.
