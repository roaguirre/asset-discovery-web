# Q&A Prep

## Ownership And Trust

### Why are these personal projects instead of organization-owned projects?

They started as personal prototypes to explore product and technical directions
quickly. To avoid conflicts of interest and keep the work inspectable, they are
being published as public open source repositories with explicit licenses.

### Why should the team trust a personal project?

Not because it is personal. The trust argument is the opposite: the work should
be evaluated openly on its reasoning, product quality, and architecture. The
demo is meant to earn trust through transparency and rigor.

## Why AI

### Why use AI at all?

Because some pivots are genuinely ambiguous. Deterministic parsing is still used
for extraction, normalization, and evidence gathering. AI is used where the
system must judge ownership or first-party relevance under incomplete evidence.

### Why not stay with heuristics only?

Heuristics are useful for generating candidates and support signals, but they
are weak at making final ownership decisions without becoming brittle or opaque.

### Why manual mode first?

Because manual mode proves the product can recommend strongly without demanding
blind trust. It is the right way to introduce AI judgment into a serious
workflow.

## Architecture

### Why does the scheduler own frontier expansion?

Because the DAG should stay acyclic. Collectors and enrichers should not manage
their own recursion. They emit evidence and discovered seeds; the scheduler
decides whether a later frontier should run.

### Why add bounded reconsideration?

Because the system gains context as the run progresses. Some discarded
candidates deserve one final review after the normal frontier is exhausted, but
the process still needs a strict bound.

### Why split assets, observations, and relations?

Because canonical results and raw provenance serve different needs. The split
lets the system add evidence across waves without duplicating the final asset
set.

## Product Direction

### Is this meant to replace the current workflow?

No. It is a proposal and a reference implementation for discussing higher-value
directions in discovery product design.

### What is the strongest product claim here?

That comprehensiveness and explainability should advance together, not trade off
against each other.

### What should happen next if the room responds well?

- identify the most valuable pivot types
- decide where AI judgment is worth the cost
- decide which trust surfaces should become product requirements
- validate whether the workflow should remain manual-first or expand autonomy
