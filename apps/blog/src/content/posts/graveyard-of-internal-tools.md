---
title: "The Graveyard of Internal Tools I've Built"
description: 'A retrospective on eight years of developer tooling across four companies. What survived a reorg. What died when the champion left. What I got wrong about why tools fail.'
pubDate: '2026-04-18'
tags: ['developer-tooling', 'career', 'opinion']
draft: true
---

Two years after leaving a job, I found my tool in the codebase. The README still had my name in it. The last commit was from three months after I left — a one-line fix from someone who had clearly read nothing except the error message. Below that: nothing. A graveyard marker with my initials.

I have built a lot of internal tools. Across four companies, eight years, probably a dozen serious tools and twice as many small ones. Deployment dashboards. Dev environment bootstrappers. PR automation bots. A metrics pipeline that I was genuinely proud of. An oncall rotation tool that saved the team hours every quarter until it quietly stopped working and nobody noticed for two months.

Most of them are dead.

I used to think the ones that died failed because they were not good enough. That is not what I think anymore.

## The lifecycle

Every internal tool follows roughly the same arc. You build it because you are personally feeling the pain. It works well enough. You demo it at a team meeting and there is a little spike of adoption — three people actually use it, four more install it intending to. Six months in, half those people have moved on to other things. The ones who stayed either integrated it deeply into their workflow or forgot about it entirely.

Two years later: one of three outcomes. The tool is still running because it became load-bearing — it got embedded somewhere that nobody wants to touch. Or it is dead, preserved in version control like a fossil. Or, worst case, it is still running but nobody knows what it does or why, and it is subtly wrong in ways that have accumulated over years of changes around it.

The fast-moving startup variant compresses this timeline to about six months.

## The tool champion problem

Here is the thing they do not tell you: an internal tool's half-life is roughly equal to its champion's tenure on the team.

I have watched this happen too many times to doubt it. The person who built the tool is also the person who fields questions about it, fixes bugs in it on weekends, advocates for maintenance time in sprint planning, and quietly knows the three undocumented edge cases that would break everything. When they leave, the tool enters hospice care.

This is not a documentation problem. I have written extensive READMEs. I have done handoff sessions. I have added monitoring. The tools still die.

The problem is that internal tools exist in a maintenance economics context where they will almost always lose. There is no on-call rotation for the dev environment bootstrapper. There is no quarterly roadmap review for the PR bot. The incentive structure for a new team member is to work around the tool, not invest in it. Every workaround is a small vote for abandonment.

The only tools that survive champion departure are the ones that no longer need a champion — either because they are completely automated, because they are so deeply embedded in the workflow that not fixing them is impossible, or because they are so simple that anyone can fix them.

## Adoption is the only metric that matters

I built a metrics pipeline at one company that I still think was technically excellent. Proper schema, great ergonomics, solid documentation, easy to extend. It had a small, enthusiastic user base of exactly four people including me. Three years later: dead.

At the same company, a colleague built a Slack bot to look up on-call schedules. It was held together with duct tape and cheerful ignorance. The error handling was "crash and print a stack trace in Slack." It is still running. I checked.

The bot won because it was in the communication channel where everyone already lived. Every time someone needed an on-call lookup, they used it. That usage generated fixes, features, and a small community of people who cared whether it worked. The metrics pipeline was excellent in a folder that nobody opened.

The lesson I keep having to re-learn: a mediocre tool that is in the flow beats an excellent tool that is not. Adoption is not a marketing problem you solve after you build the thing. It is a design constraint from the first line of code.

## What survived

Looking back at the tools that actually held up across company changes and team turnover, the pattern is consistent:

**They were load-bearing.** The surviving tools were the ones that broke something important when they stopped working. The CI check that gated merges. The deploy pipeline that nobody wanted to work around. Inconvenience is an underrated preservation mechanism.

**They required no maintenance.** The best internal tool I ever built was a code generation script. You ran it once when you started a new service, it output a directory structure and some boilerplate, and then it was done. It did not need to be updated. It did not need to be maintained. It just needed to exist. It survived four years of churn because it had nothing to break.

**They solved universal pain.** The tools that spread across teams were the ones where the problem was not specific to our workflow. Slow local development, confusing deployment steps, hard-to-find on-call information — these are problems everywhere. Specific tooling for our particular branching convention: not so much.

## Honest postmortems

The deployment dashboard I built: died because I built a UI when the team would have been happy with a Slack notification. I was proud of the interface. Nobody wanted to open another browser tab.

The dev environment bootstrapper: died because it assumed an architecture that we restructured eighteen months later. I had not made it modular enough to survive the assumption changing. Every internal tool makes assumptions about the environment it lives in. The good ones make those assumptions explicit and minimal.

The metrics pipeline: died because I optimized for the producer experience and not the consumer experience. Adding a new metric was elegant. Querying existing metrics required knowledge I had not documented well enough. The people who needed to use it gave up before they got value out of it.

The oncall rotation tool: died because I hard-coded the rotation interval. Reader, I cannot explain why I did this.

## The thing I got wrong

For most of my career I thought internal tools failed because of technical debt, or lack of documentation, or insufficient maintenance time. Those things matter, but they are symptoms.

The real failure mode is building for yourself and expecting others to maintain. The tool you built to scratch your itch will be maintained by you — and only you — until you leave. If it survives that, it is because it escaped your authorship and became genuinely shared. That transition is the only one that matters.

The tools in my graveyard mostly never made it. They were excellent code with no community. Some of them were the best work I did at those companies. They are still dead.

Build for the workflow, not the problem. Get it in the path of people who will break things when it stops working. Make the maintenance cost so low that a stranger can pick it up. Accept that good enough and adopted beats excellent and ignored every time.

The tombstones in my graveyard mostly read: here lies a tool that solved the right problem the wrong way.
