---
title: 'Observability for Systems That Lie to You'
description: 'Your agent returns 200 OK and is confidently wrong. Traditional health checks catch crashes. They do not catch a system doing the wrong thing with full conviction.'
pubDate: '2025-12-09'
tags: ['agents', 'observability', 'security', 'infrastructure']
draft: false
---

Your agent is healthy. It processed 2,400 requests in the last hour. P99 latency is 1.2 seconds. No errors in the logs. Your dashboards are green.

Your agent has also been wrong about a third of its answers since the prompt cache warmed up with a stale system prompt three hours ago. You will not find out until a customer files a ticket.

This is the gap nobody talks about enough. We have good tooling for watching systems that crash. We have almost no culture around watching systems that succeed confidently while doing the wrong thing.

## The 200 OK lie

In a traditional service, a 200 response means the operation completed. The database write landed. The payment processed. You can verify this — there are hard invariants, and violations show up as exceptions.

With an LLM in the path, a 200 response means the model returned a string. That is all. Whether that string is correct, helpful, safe, or consistent with your last hundred responses is a completely separate question that the status code does not touch.

This is not a subtle distinction. It is a category error to treat agent health and agent correctness as the same observable. You can have one without the other in every combination:

- Healthy and correct — what you want
- Unhealthy and incorrect — what your alerts catch
- Unhealthy and correct — odd but possible, not your biggest problem
- **Healthy and incorrect — what actually kills you in production**

The fourth case is the one your existing monitoring infrastructure cannot see. It is also the most common way agent systems fail in subtle, sustained ways.

## Borrowing from detection engineering

Detection engineering — the discipline of building systems to identify malicious behavior — has spent decades thinking about exactly this problem in a different domain. The frame transfers well.

Every detection has a false positive rate and a false negative rate. Too many false positives and your analysts are drowning in noise, stop trusting the signal, and start ignoring alerts. Too many false negatives and real incidents slip through. The craft is finding the threshold that balances both — and being honest about which direction you are erring in.

The same tradeoff exists in agent monitoring. Consider the two failure modes:

**False positive (alert fires when nothing is wrong).** You check whether every response mentions the word "error" and page on-call when it does. Your agent is fine — it is accurately telling users about an error state in the data they asked about. Your on-call engineer gets paged at 2am, investigates, finds nothing wrong, and starts ignoring that alert class. You have trained your team not to trust your monitoring.

**False negative (alert does not fire when something is wrong).** Your agent starts confidently misclassifying a category of input after a model version update. No error logs. No latency spike. No threshold crossed. The issue runs for days until someone notices the downstream effects.

Neither failure mode is acceptable in a production system. But most teams building agents only have tooling for the false negative case where the agent also crashes — which is actually the easiest case to detect. The hard cases are the ones where the agent stays healthy while being wrong.

## What confident wrongness looks like in practice

A few patterns I have seen in production or seen written up as incidents:

**Prompt drift.** A system prompt is updated but the change is semantically subtle — maybe a scope constraint was softened or a persona instruction was reworded. The model behavior shifts. Requests that used to be correctly declined are now handled. No exception is thrown. No metric moves. The drift is invisible until someone audits the outputs.

**Model regression.** Provider releases a new version. Your pinned model is deprecated or silently aliases to a new checkpoint. Behavior changes on edge cases the provider did not flag. Your model version monitoring (if you have it) says "same model ID." The capability regression is below the noise floor of coarse-grained metrics.

**Context corruption.** A multi-turn conversation accumulates state that puts the model in an odd mode. Responses become technically valid but subtly off — more aggressive, less careful, outside the intended persona. Each individual response passes the health check. The pattern across the session is the problem.

**Embedding or retrieval mismatch.** Your RAG pipeline returns plausible but wrong context. The model synthesizes a confident answer from bad source material. Retrieval metrics look fine. Answer quality is quietly degraded for a subset of queries.

None of these show up as errors. All of them show up as correctness problems.

## Eval-driven alerting

The most useful shift in thinking: your evaluation suite is your alerting infrastructure.

Evals — the test cases you run against your model to measure whether outputs meet your quality bar — are usually treated as a CI/CD artifact. You run them before a deploy. You look at aggregate pass rates. You gate on regressions. This is good. It is not enough.

The same eval harness that gates deploys can run continuously against production traffic. Sample a slice of real requests. Run them through your eval suite — or through a separate judge model scoring for correctness, safety, and policy adherence. Alert when the pass rate drops below your threshold.

This is the agent equivalent of synthetic monitoring. You are not waiting for the system to report a failure. You are actively measuring whether the outputs you care about are still meeting your bar.

A few things that make this work in practice:

**Score on properties, not exact matches.** You cannot assert on exact LLM output. You can assert that the response stays within scope, does not contain disallowed content, correctly follows the format contract, or reaches the right conclusion class. Define your invariants as checkable properties.

**Keep the eval suite close to real failure modes.** Eval suites written before a system ships tend to cover happy paths. The most valuable test cases are the ones added after a real incident: the input class that caused the problem, the constraint that was violated, the edge case that was missed. Your eval suite should grow with your incident history.

**Separate semantic evals from functional evals.** Does the tool call have the right parameters? (Functional — easy to check mechanically.) Is the overall response helpful and correct? (Semantic — needs a judge or human label.) Both matter. Conflating them makes it easy to have high functional pass rates while the semantic quality has degraded.

**Alert on distribution shift, not just threshold breach.** A single bad response is noise. A change in the distribution of response types — more refusals, shorter answers, different topic mix — can be signal before any per-response threshold fires. Track the shape of your outputs, not just the quality of each one.

## The instrumentation hierarchy

Putting this together, there is a rough hierarchy of what you need to instrument:

**Layer 1 — Operational health.** Latency, error rates, availability, token usage. This is table stakes. Most teams have it. It catches crashes, not correctness.

**Layer 2 — Behavioral traces.** Every tool call, every model decision, every branch in the execution path. You need to be able to reconstruct the full reasoning chain for any given request. Not summaries — actual spans with inputs and outputs at each step.

**Layer 3 — Output quality metrics.** Continuous eval runs against production traffic. Pass rates on your property suite. Tracked over time, with alerting on degradation.

**Layer 4 — Anomaly detection on distributions.** Response length distributions, topic mix, refusal rates, confidence score distributions (if your outputs include them). These catch subtle shifts before they show up in quality metrics.

Most teams building agents have Layer 1. Good teams have Layers 1 and 2. Layer 3 is where the correctness monitoring lives, and most teams are missing it entirely. Layer 4 is advanced and worth adding once Layers 1–3 are solid.

## The uncomfortable truth

The reason this is hard is not technical. The observability tools to do all of this exist — tracing pipelines, judge models, eval frameworks, statistical process control for distribution monitoring. None of this is exotic.

The reason it is hard is that it requires admitting that "the service is running" and "the service is working" are not the same claim. That requires a different relationship with your monitoring than most engineering cultures have built.

Traditional monitoring is defensive. Watch for failure. Respond to failure. Agent monitoring has to be affirmative. Actively measure correctness. Treat degradation as an ongoing process, not a binary event. Your system is not correct because it has not crashed. It is correct because you are continuously measuring it and the measurements are green.

That is a harder posture to sustain. It is the only one that works.
