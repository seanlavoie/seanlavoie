---
title: 'Why Every Data Pipeline Eventually Becomes a DAG'
description: 'No matter how simple your data pipeline starts, it converges on a directed acyclic graph. Fighting that convergence is how you get architectural debt. Embracing it is how you get reliability.'
pubDate: '2026-04-18'
tags: ['data', 'infrastructure', 'architecture']
draft: false
---

Every data pipeline starts with a lie.

The lie sounds like this: "We just need to pull records from the source, do a little transformation, and load them into the warehouse. One script. Maybe two. Nothing fancy."

Three months later you have eleven scripts, four of them undocumented, two of them running in a cron job that someone set up and immediately forgot about, and a Slack message from analytics saying that the user counts in the dashboard do not match the user counts in the report. You have a pipeline. You do not have a system.

What you actually have — buried under the shell scripts and the ad-hoc SQL and the "temporary" Python file that has been in production for eighteen months — is a DAG. It just does not know it yet.

## The shape data takes when you are not looking

A directed acyclic graph is not an architectural choice. It is what you get when you describe data dependencies honestly.

Data flows in one direction because side-effecting loops in data processing are almost always bugs. Cycles in a pipeline mean you are computing something in terms of itself, which either diverges or converges to something you could have computed directly. The "acyclic" property is not a constraint you impose. It is a constraint that reality imposes.

The "directed" and "graph" parts follow from the same place. Real data does not move in a line. It fans out — one source feeds multiple derived tables. It fans in — one aggregation pulls from multiple upstream tables. You have parallelism you want to exploit and dependencies you have to respect. That is a graph.

The only question is whether you make the graph explicit.

If you do not, the graph still exists. It lives in the implied ordering of your cron jobs, in the undocumented assumption that script B always runs after script A, in the load-bearing comment that says "DO NOT RUN THIS BEFORE THE DAILY IMPORT COMPLETES." The structure is there. You have just hidden it somewhere that cannot be reasoned about, monitored, or recovered from when something goes wrong.

## The compounding cost of "just add a step"

The failure mode is incremental. No one sits down and decides to build an unmanageable pipeline. They decide to add one step.

Add a step to filter out test accounts. Add a step to join in the product catalog. Add a step to compute a derived metric someone asked for in a meeting. Add a step to handle the new data format the third-party vendor switched to without telling you. Each step is reasonable. The compounding is not.

The first time you add a step in the middle of a sequence, you have a dependency problem. You need something that ran later to wait on something that is now earlier. If the pipeline is a linear script, you move some code around. Fine. But the next time, and the time after that, the rearrangements get more expensive because the implicit structure has grown more complex. By the time you have a real dependency graph, you are maintaining it by reading the code and reasoning about ordering in your head. That is the worst of all worlds: the complexity of a graph without the tooling.

Schema evolution makes this worse. Every upstream schema change propagates through every downstream consumer. In a pipeline you own, that is a coordination problem. In a pipeline with multiple teams feeding into it, it is a coordination nightmare. You end up with transformations that exist primarily to paper over schema drift — layers of "fix the data here because upstream changed something there" — and those layers accumulate fastest when the structure of the pipeline is hardest to see.

The real cost is not the steps themselves. It is the hidden coupling between them. Steps that look independent often share an implicit assumption about the shape of the data flowing between them. When that assumption breaks — and it always breaks, eventually — the failure is invisible until it surfaces downstream, often in a dashboard or a report, usually at the worst possible time.

## Backfills expose everything you refused to make explicit

Nothing makes the hidden structure of a pipeline more visible than a backfill.

Backfilling is reprocessing historical data through the current pipeline — either because you changed the logic and want historical data to reflect the new definition, or because something upstream was wrong and you are correcting the record. It sounds simple. It is not.

The first problem is parallelism. A well-structured DAG lets you parallelize backfill work across time windows or data partitions. An implicit pipeline with unclear dependency ordering either forces you to run sequentially (slow) or exposes race conditions you did not know existed. When you are trying to backfill three months of data and it takes a week, it is usually because the pipeline was implicitly sequential all along and nobody noticed because forward processing only handles one day at a time.

The second problem is side effects. Every step that writes somewhere besides the warehouse — sends an event, updates a cache, triggers a notification — becomes a liability in a backfill. Did you want to re-send those events? Did you want to re-trigger those notifications? In a well-modeled pipeline, you have already thought about idempotency and made the side effects explicit. In an ad-hoc pipeline, you find out about the side effects the hard way, usually by looking at why your cache has three years of history in it or why some external system got a flood of synthetic events.

The third problem is time. Historical data is not the same shape as current data. Schemas changed. Business logic changed. The backfill forces you to reason about which version of the transformation should apply to which window of data, which is versioning, which is hard. Pipelines that do not model time explicitly have to solve this problem from scratch every time. Pipelines that model it explicitly — partition by ingestion date, track schema versions, design transformations to be time-parameterized — handle it gracefully.

The backfill is the stress test that the pipeline was never designed to pass. Everything the pipeline was pretending was fine becomes immediately visible.

## Schema evolution without losing your mind

The best thing you can do for schema evolution is to make it a first-class part of your data model instead of an emergency you respond to.

At the source boundary, this means versioning your schemas and being explicit about what changes are backwards-compatible. Additive changes — new nullable columns, new optional fields — can be handled transparently if downstream consumers are written to tolerate unexpected fields. Destructive changes — renaming a column, changing a type, removing a field — need coordination, which means making the dependency graph visible so you know who to coordinate with.

In the transformation layer, the anti-pattern is implicit column references. `SELECT *` propagates schema changes downstream automatically, which sounds convenient until you realize it means any column rename or deletion in the source silently changes the output of every downstream transformation. Explicit column references force you to update the transformation when the schema changes, which is annoying and also correct.

At the destination boundary, the question is how much enforcement you want. Strict schema validation catches problems early but requires every schema change to be an explicit migration. Flexible schemas tolerate drift but make it harder to reason about what the warehouse actually contains. The right answer depends on your use case, but the wrong answer is to not have an answer — to let the warehouse accumulate schema uncertainty until it becomes unmanageable.

None of this requires a particular tool. It requires thinking about schema evolution as an expected condition rather than an exceptional one, and designing the pipeline to handle it deliberately.

## When to embrace the DAG, when to simplify

There is a version of this argument that leads you toward maximum sophistication at every step. That is not the right lesson.

A single-source, single-destination pipeline with no fan-in and no fan-out does not need a DAG orchestrator. A linear sequence of transformations that always runs in order does not need dependency tracking. There is a real cost to adopting complex tooling before you need it: the learning curve, the operational overhead, the time spent configuring scheduling when you could have been building features.

The right heuristic is: make the structure explicit before the implicit structure becomes load-bearing.

You need a real DAG when any of these are true. You have dependencies between pipeline steps that are not obvious from reading the code. You have steps that can run in parallel and the sequential version is noticeably slow. You have multiple teams or systems feeding into or reading from the pipeline. You have backfill requirements that expose sequencing or idempotency problems. You need to know when a step failed, how long it took, and what the downstream impact was.

If none of those are true, a well-documented linear script is probably fine. The mistake is holding onto the linear script once any of them become true, because that is when the hidden complexity starts compounding.

The transition point comes earlier than most teams expect. The moment you start needing to run step B before step A because something changed, you have a dependency. The moment you need to debug why the numbers are wrong and the answer is "we ran step C before step D finished," you have an untracked dependency. At that point, the question is not whether you have a DAG. The question is whether you are willing to admit it.

## The graph was always there

Data infrastructure follows the same pattern as most infrastructure problems: the complexity is inherent in the problem, not in the solution. The pipeline that "just moves some data" is masking the same dependencies, the same ordering constraints, the same schema coupling, the same backfill requirements as the pipeline running on a proper orchestration layer. The difference is whether those concerns are visible.

The teams that build reliable data infrastructure do not build it by finding a way to avoid DAGs. They build it by accepting the graph-shaped nature of data flow early, making the structure explicit in something that can be reasoned about and monitored, and then treating schema evolution and backfills as engineering problems with well-understood solutions rather than emergencies to heroically recover from.

The lie at the beginning — "it is just a simple pipeline" — is not malicious. Most pipelines really do start simple. The trap is that simplicity is not a stable state. Data pipelines grow, dependencies accumulate, and the structure that was fine for one source and one destination becomes a liability at ten sources and a dozen consumers.

Make the graph explicit before you are forced to. The complexity is coming either way.
