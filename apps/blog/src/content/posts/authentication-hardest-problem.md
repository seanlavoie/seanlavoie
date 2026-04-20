---
title: 'Authentication Is Still the Hardest Problem in Software'
description: "After years on Box's Identity & Security team, a case for why auth remains perpetually underestimated — not because the protocols are broken, but because the gap between \"we use OAuth\" and \"our auth actually works\" is enormous."
pubDate: '2026-03-28'
tags: ['security', 'infrastructure', 'opinion']
draft: true
---

Every few years someone declares that authentication is a solved problem. We have OAuth. We have OIDC. We have battle-tested libraries and cloud identity providers and passkeys and hardware tokens and SSO flows documented in excruciating detail. The primitives exist. The standards are mature. Why is auth still so hard?

I spent years on Box's Identity & Security team. I have reviewed more auth implementations than I can count and broken more of them than I want to admit. The problem is not the protocols. The problem is that the distance between "we implemented OAuth" and "our auth actually works" is enormous, and almost no one maps the whole distance before shipping.

## The solved-problem illusion

When engineers say auth is solved, they usually mean: there is a spec for this. And they are right. OAuth 2.0 has been stable for over a decade. SAML has been torturing enterprise developers since 2002. The cryptographic primitives are not the question.

The question is implementation. Not whether the spec exists — whether your implementation of the spec handles the edge cases that the spec mentions once in a footnote, and the cases the spec does not mention at all, and the cases that emerge when your implementation meets a non-compliant identity provider that is used by 40% of your enterprise customers.

Here is a representative sample of auth bugs I have personally seen in production systems, none of which were "the protocol was wrong":

The token expiry handler that only ran on the happy path. If a network call failed between token refresh and token storage, the next request would get a 401, the handler would try to use the already-rotated refresh token, get rejected, and silently log the user out. This was a timing window. It was also a support ticket every day for eight months.

The OAuth state parameter that was validated on the callback but generated without enough entropy. Eight hex characters. An attacker who could make a user visit an attacker-controlled page at the right moment could predict the state, complete the CSRF, and get a token bound to the victim's session. The state parameter exists precisely to prevent this. The check was there. It just was not checking enough.

The SSO integration with a customer's Okta tenant that worked perfectly in staging and fell over in production because the customer had configured a custom attribute mapping that changed the format of the `email` claim. We were normalizing email addresses before lookup. They were not. Eight hours of debugging a 403 that should have been a clear error.

The logout endpoint that invalidated the session in the database but did not clear the cookie correctly due to a domain mismatch between the cookie-setting domain and the clearing domain. Sessions that should have been invalidated were still valid on the client for the full session TTL. We found this one during a security review, not an incident. That was lucky.

None of these were protocol failures. All of them were in the gap between spec and implementation, in the parts of auth you have to get right that are not in the OAuth RFC.

## Token lifecycle is a distributed systems problem

The part of auth that consistently surprises engineers who have not lived in it: token management is a distributed systems problem with strong consistency requirements and a failure mode that directly affects security.

Think about what token refresh means at scale. You have a refresh token that is one-time-use. You have multiple instances of your service that can all receive requests from the same user session. Two instances can race on a refresh call. The first one succeeds and gets a new access token and refresh token. The second one, a millisecond later, tries to use the now-invalidated refresh token. What happens?

At best: the user gets a 401 and needs to reauthenticate. At worst, depending on your provider's behavior and your error handling: the user is silently logged out, or — if your error handling is wrong — the second instance caches the failed refresh response incorrectly and every subsequent request fails until the cache clears.

This is the classic distributed cache invalidation problem, except the cache entry controls access and the invalidation event is a cryptographic rotation that your identity provider enforces. You cannot just retry. The operation is not idempotent. The window matters.

The correct architecture is a token store with distributed locking on refresh operations, so only one instance does the refresh and others either wait or use the just-refreshed token. Most teams do not build this on the first pass because it sounds like premature optimization until you have multiple instances and a user base big enough to make the race happen regularly.

Session termination has the same shape. When a user logs out, or an admin terminates a session, or a security event triggers revocation: the session needs to be invalidated everywhere it might be valid. Access tokens are stateless. They are valid until they expire, regardless of what you put in your database, unless you maintain a blocklist — which is essentially a global cache that needs to be consistent across all service instances and needs to be checked on every authenticated request.

The more distributed your system, the harder this gets. The harder it gets, the more likely teams skip it and accept a window between "session revoked" and "session actually invalid." For most apps, that window is "until the access token expires." If your access tokens have a one-hour TTL and you are processing sensitive operations, you have a one-hour revocation gap. Whether that is acceptable is a product decision. Most teams do not make it explicitly.

## The enterprise identity provider gauntlet

Nothing tests your auth implementation like integrating with enterprise identity providers at scale. SAML in particular is a specification with enough surface area for every enterprise to interpret it differently and still be technically compliant.

I have seen: SAML assertions with `NotBefore` timestamps five minutes in the future because the IdP server clock was ahead. SAML responses signed with SHA-1 because the enterprise customer's Ping Federate installation was from 2014 and they were not upgrading it. SAML attribute names that were URIs in one customer's configuration and short names in another's, both valid, both requiring different parsing logic. A ForceAuthn flag that one customer required to be set and another required to not be set, both in the same multi-tenant system.

Every enterprise SSO integration is a negotiation with a different implementation of the same spec. The spec does not save you. Only thorough integration testing with the actual customer's IdP configuration saves you, and you often do not get access to do that until the deal is closed and go-live is in two weeks.

The enterprise auth problem is also a support problem. When an enterprise customer cannot log in, it is not a "user forgot their password" ticket. It is a conference call with their IT team, your security team, and potentially a third-party IdP vendor, debugging a SAML exchange by decoding base64 assertions and comparing claim values between environments. The mean time to resolution is measured in hours if you are fast. The blast radius is everyone in that enterprise. The pressure is extreme.

If you have not operated enterprise SSO at any meaningful scale, the first time you do it will recalibrate your confidence in auth being solved.

## The gap between authentication and authorization

Here is the conflation that causes at least half of the auth bugs I have reviewed: authentication and authorization are different problems, and building authentication well does not mean you have addressed authorization at all.

Authentication answers: who is this? Authorization answers: what can they do?

Most teams build authentication first and add authorization as a series of incremental patches. The result is an authorization model that grew up rather than being designed — permission checks scattered across different layers, inconsistent enforcement, and a steadily expanding surface area for privilege escalation bugs.

The auth system you built correctly will tell you the user is who they say they are. It will not tell you which of your four permission models applies to this request, whether the resource-level ACL on this object overrides the role-level permission granted to this user, whether the token was issued in the context that makes this action allowed, or whether the delegated permission chain between the OAuth client and the user is valid for this specific operation.

Box's permission model, if you have ever worked with enterprise file storage, is genuinely complex. Folder-level ACLs that inherit unless overridden. Collaboration roles with different capabilities. Service accounts with scoped permissions. Admin visibility that works differently from user visibility. Getting authentication right is the price of admission. Authorization is the actual hard part.

The reason I raise this in an auth post: most "auth is solved" arguments are actually only about authentication. The harder problem is authorization, and the hardest part of authorization is the intersection between your auth model and your data model when both are evolving and the access control requirements have been specified in legal documents and enterprise contracts.

That part is not solved.

## Agent authentication is the newest frontier

The industry has spent thirty years building identity infrastructure for humans. Those humans sometimes use machines to act on their behalf. Most of our current auth primitives reflect this: OAuth was designed for user delegation. API keys are designed for static service identities. JWTs carry claims about a principal that a human or a human administrator created.

None of this maps cleanly to agent-to-agent authentication. An agent acting autonomously is not a human. It is not a service with a static identity. It is a process that might be running on behalf of a user, or on behalf of another agent, or on its own initiative within bounds set by some policy document that no human is actively watching. Who is the principal? What claims should the token carry? What is the revocation model when the agent's behavior changes?

The surface area is new in ways that matter. An agent that can spawn sub-agents is a principal that can delegate to principals that do not exist yet at token-issuance time. An agent that can use tools is operating in a capability model where the question is not "can this user do this operation" but "can this agent, in this context, given these prior actions, initiate this effect on this resource." The scope of possible actions is dynamic in a way that static token scopes were not designed for.

I have watched teams building multi-agent systems reach for the obvious primitives — API keys for service-to-service calls, OAuth client credentials for agent-to-service calls — and those work well enough until the question becomes: how do I know that this agent is acting within the policy that authorized it to exist? How do I revoke the capability of an agent mid-run without revoking the capability of every other agent using the same service account? How do I audit the chain of delegation from the original human intent to the specific action this sub-agent took?

These are not solved problems. The specifications do not exist yet. The patterns are being worked out in production right now by teams who mostly built auth systems for humans and are discovering the edges.

## Why it keeps being underestimated

The pattern I have seen across every company where auth has bitten us: engineers treat auth as a feature to implement, not a system to operate. You implement the OAuth flow, it works in testing, you ship it, and you move on. The ongoing work — rotating secrets, monitoring for anomalous token usage, updating to new provider endpoints, handling the edge case that only shows up at your sixth enterprise customer — that is not planned for because the feature is done.

Auth is not done when the flow works. It is done when you have the operational discipline to keep it working as your system scales, as your threat model evolves, as your identity providers update their APIs, and as the people who understood the original implementation have long since left the company.

The solved-problem framing makes this maintenance discipline feel unnecessary. The protocols exist. We implemented them. Why would this require ongoing attention?

Because the threat model changes. Because your scale changes. Because the edge cases that did not matter at 10,000 users matter at 10,000,000. Because a new enterprise customer has an unusual IdP configuration that your original implementation did not anticipate. Because the person who understood your token rotation logic left and nobody updated the runbook.

The hardest thing about authentication is not the cryptography or the protocols or even the complex enterprise integrations. It is that auth sits at the intersection of security and usability and distributed systems and organizational process, and getting it right requires ongoing investment in all four dimensions simultaneously.

That is not a problem you solve. That is a problem you manage.

The engineers who treat it as the latter are the ones I want reviewing my auth code.
