---
title: 'Supply Chain Security Is a Trust Problem We Keep Solving Wrong'
description: 'Software supply chain attacks are not getting more sophisticated. Your dependency graph is getting bigger and the trust model underneath it was never designed for this.'
pubDate: '2026-04-22'
tags: ['security', 'infrastructure', 'opinion']
draft: true
---

In March 2024, a backdoor was discovered in xz-utils — a compression library so foundational that it sits in the dependency chain of SSH on most Linux distributions. The attacker spent two years building trust. They contributed patches. They pressured the original maintainer — who was burned out and maintaining the project alone — until commit access was handed over. Then they introduced a backdoor that would have given them remote code execution on most Linux servers on the internet.

It was caught by accident. A Microsoft engineer noticed SSH logins were taking 500 milliseconds longer than they should. That is the margin by which the entire internet's server infrastructure avoided a catastrophic compromise.

This is the state of software supply chain security. And the trend line is going in exactly one direction.

## The blast radius keeps growing

If you plot significant supply chain incidents over the last eight years, two things stand out: they are happening more often, and each one affects more systems than the last.

**2018: event-stream.** An npm package with two million weekly downloads. The maintainer, burned out and looking to hand it off, transferred ownership to someone who asked nicely. The new owner added a dependency that stole cryptocurrency wallets. It ran for two months before anyone noticed.

**2020: SolarWinds.** Attackers compromised the build system for Orion, a network monitoring tool used by 18,000 organizations including multiple US government agencies. The malicious update was signed with SolarWinds' own certificates. It looked legitimate because, from the build system's perspective, it was.

**2021: Codecov.** A CI tool's bash uploader script was modified to exfiltrate environment variables — API keys, tokens, credentials. Every project that ran Codecov in CI had its secrets siphoned for two months. The scope of downstream exposure has never been fully accounted for.

**2023: 3CX.** This one is worth pausing on. 3CX, a VoIP provider, was compromised through a supply chain attack. But the initial access vector was itself a supply chain attack — the attackers had previously compromised a trading software company, and used that foothold to reach 3CX. A supply chain attack used as the entry point for another supply chain attack. Cascading compromise.

**2024: xz-utils.** The two-year social engineering campaign I described above. Not a smash-and-grab. A long con targeting the most leveraged point in the entire Linux dependency graph.

**2024: Polyfill.io.** A CDN domain used by over 100,000 websites was sold to a new owner who injected malicious scripts into the polyfills served to end users. Every site loading a script tag from that domain became a malware distribution point overnight.

This is not a problem that is stabilizing. The incidents are getting more creative, more patient, and the blast radius of each one is larger.

## The trust model that does not exist

Here is the thing people get wrong: they look at these incidents and think "we need better scanning." More CVE databases. More SBOM tooling. More automated dependency audits.

Those tools are necessary. They are also solving the wrong problem.

Vulnerability scanning catches known bugs in known packages. Supply chain attacks are not bugs. They are intentional compromises introduced by someone with commit access. The package passes every scan because the malicious code was written to pass every scan. The signature is valid because the attacker had the signing key. The SBOM is accurate — it faithfully lists the compromised package.

The problem is not that we cannot detect malicious code. The problem is that the trust model underlying the entire ecosystem was never designed for the threat it now faces.

When you run `npm install` on a project with 1,200 transitive dependencies, you are making a trust decision about every maintainer of every one of those packages. You are trusting that none of them will go rogue, get compromised, burn out and hand off to a stranger, or have their credentials phished. You are trusting this across every update, forever.

Nobody makes that decision consciously. It happens in the background, one `package-lock.json` update at a time, until your application's security posture depends on the OpSec of a person you have never heard of maintaining a package you did not know you depended on.

## Why the attack surface grows on its own

The average JavaScript project had 60 transitive dependencies in 2016. By 2025, that number was north of 300. Python projects followed the same curve. So did Go, despite its reputation for smaller dependency trees.

This happens because dependencies have dependencies. When you add a library that adds five dependencies that each add three more, your trust surface expanded by twenty maintainers and you never saw a prompt asking if you were okay with that.

The supply chain attack surface is a function of graph depth and graph width. Both are growing. Neither shows up in your security dashboard. And the economic incentives push in exactly the wrong direction — small packages, deep specialization, lots of reuse — because that is what makes developers productive. The same structure that makes the ecosystem efficient makes it fragile.

This is the part that keeps me up at night. The attack surface is not static. It grows every time any dependency in your tree adds a new dependency. You do not have to do anything for your exposure to increase.

## What we keep getting wrong

The standard advice — pin your dependencies, scan for CVEs, generate SBOMs — addresses the symptoms. It does not address the structural problem.

**Pinning versions** stops you from pulling in new malicious code. It does not help when the version you pinned was already compromised, or when you eventually have to update because the pinned version has a real vulnerability.

**CVE scanning** catches known vulnerabilities in existing code. It does not catch intentionally introduced backdoors that are designed to look like normal code. The xz backdoor was hidden in test fixture files. It would not have triggered a single scanner.

**SBOMs** give you an inventory of what you depend on. They do not tell you whether any of it is trustworthy. Knowing you depend on a compromised package is useful after the compromise is discovered. It does nothing for the months it runs undetected.

None of these are bad practices. All of them are incomplete in the same way: they assume the packages in the ecosystem are either safe or have known problems. The entire threat model of supply chain attacks is that the packages are compromised and the problems are unknown.

## What actually changes the equation

I do not have a silver bullet. Nobody does. But the teams I have seen take supply chain security seriously — and not just check the compliance box — tend to do a few things differently:

**Treat dependency additions as security decisions.** Not in a rubber-stamp way. In a "someone reviews what this package does, who maintains it, and what it transitively pulls in" way. Most teams review code changes line by line and then add a package with 40 transitive dependencies without a second thought. The package addition is the higher-risk change.

**Minimize your dependency surface area.** This is unglamorous work. It means sometimes writing the sixty lines of code instead of pulling in a package. It means evaluating whether a utility library is worth the trust surface it adds. The JavaScript ecosystem in particular has a cultural norm of reaching for a package for everything. That norm has a security cost that is rarely accounted for.

**Monitor for maintainer changes.** The xz and event-stream attacks both involved ownership transfers. If a package in your dependency tree changes maintainers, that is a signal worth tracking. Tooling for this is still immature, but it exists, and it would have caught both of those incidents earlier.

**Vendor critical dependencies.** If your system's security depends on a package, copy it into your repository. Yes, you take on the maintenance burden. But you also take control of the trust boundary. You are no longer depending on a supply chain — you are depending on code you can read and audit.

**Assume compromise and build detection.** This is the defense-in-depth play. If a supply chain attack gets through — and given the trend line, you should plan for this — what does your detection look like? Do you have runtime monitoring that would notice unexpected network connections from your build pipeline? Unexpected file access patterns? Credential exfiltration? If your entire security model depends on the supply chain never being compromised, your security model is incomplete.

## The trend line

The software industry built an ecosystem where a single person maintaining a compression library in their spare time is a load-bearing pillar of global infrastructure security. Then we act surprised when that structure is exploited.

Supply chain attacks are not an anomaly. They are the natural consequence of a dependency model that trades trust for convenience at every layer. The attacks are getting more sophisticated because the payoff is enormous and the barriers to entry — one burnt-out maintainer, one phished credential, one compromised build system — are structurally low.

The teams that will be resilient are the ones that stop treating supply chain security as a scanning problem and start treating it as a trust architecture problem. That means fewer dependencies, more verification, and an honest accounting of who and what you are trusting every time you ship.

It is not a fun conclusion. It is the only honest one.
