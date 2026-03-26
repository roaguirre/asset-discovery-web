# Presenter Script

## Framing

### Opening line

Asset discovery should improve comprehensiveness without asking the team to
trust a black box.

### What this demo is trying to prove

This demo is not trying to argue that a specific implementation is finished. It
is trying to show a higher standard for how we can build discovery products:
broader coverage, explicit judgment, and results that remain explainable.

### Ownership and boundaries

Before I start, one important note: these repositories are personal projects.
They are not organization-owned projects, and I am publishing them as public
open source repositories with explicit licenses. I want the work evaluated in
the open, on its technical and product merits.

## Mainline Script

### 1. Problem

When we push asset discovery toward comprehensiveness, we usually create a new
problem at the same time: more ambiguous pivots, more noisy results, and less
confidence in what deserves attention.

The interesting challenge is not just how to collect more data. It is how to
expand coverage while keeping the reasoning visible enough that people trust the
result set.

Transition:
That is the design center for this demo.

### 2. Product Promise

The demo is built around three ideas.

First, use AI to judge ambiguous pivots instead of silently promoting them with
hardcoded heuristics.

Second, use scheduler-managed frontier expansion so newly discovered seeds can
open follow-up waves without turning the pipeline into uncontrolled recursion.

Third, make the run explain itself through pivot review, judge analysis,
ownership state, inclusion reason, and trace context.

Transition:
I will show that in the product first, then I will connect it back to the
architecture.

### 3. Start The Live Demo

I start with a compact seed set on purpose. I want the audience to see that the
system does not need a giant input file to become useful. It can begin from a
small, understandable starting point and expand from there.

I use manual mode first because it proves something important: the system can
recommend strongly without removing human control.

Short version:
Manual mode is the trust-building mode.

Longer version:
If the team cannot understand and review the recommendations, autonomy is not a
feature. It is just hidden risk.

### 4. Run Overview

Once the run starts, I stop here first.

I want the team to notice the metrics that matter: current wave, seeds, assets,
judge accepted and discarded counts, pending pivots, and exports.

This is the first product claim: the system does not only collect. It shows the
shape of the work it is doing.

Transition:
Now I move to the decisions the system wants me to trust.

### 5. Pivot Review

Here, the system surfaces recommended pivots instead of applying them
implicitly. I can see the root, the collector context, the recommendation
reason, and the score.

This is where I would say:

The point is not that AI is making magic decisions. The point is that the
system is elevating ambiguous expansion points into a reviewable product
surface.

If I accept a pivot, the audience should understand that I am approving a
follow-up discovery path, not simply clicking through a queue.

Transition:
But review is only half of trust. The other half is seeing what was discarded.

### 6. Judge Analysis

This view matters because it shows that the system is not only presenting what
it liked. It is also presenting what it evaluated and rejected.

That is a big difference from heuristic-heavy systems. Usually you only see the
survivors. Here, you can inspect accepted and discarded candidates together,
with support and confidence attached.

Key line:
If we want teams to trust automated judgment, we need to show the losing cases
too.

### 7. Assets View

After that, I move to the asset table.

This is where I show that comprehensiveness can stay usable. The table is not
just a dump of domains and IPs. It carries ownership state, inclusion reason,
grouping, sources, and filters.

This is where I would say:

The output should not force the analyst to reverse-engineer why an asset is
present. The product should carry that explanation forward.

Transition:
If someone asks, "Why is this row here?" I do not answer verbally. I open the
trace.

### 8. Trace View

The trace view is the answer to the most important trust question in the demo:
why is this asset here?

I walk through contributors, seed context, discovery relations, enrichment, and
related assets. The goal is to show that the system can justify itself with
context, not only with confidence scores.

Key line:
Trace is where comprehensiveness becomes defensible.

### 9. Technical Proof

Only after the product story lands do I switch to architecture.

I explain that the pipeline stays acyclic. Collectors and enrichers do not own
recursion. They hand discovered seeds back to the scheduler, and the scheduler
decides whether another frontier should run.

I also mention the bounded reconsideration pass over discarded candidates. This
shows that the system is willing to revisit ambiguity, but still within a
controlled execution model.

Key line:
The architecture is designed to support disciplined expansion, not uncontrolled
reach.

### 10. Close

I end by restating the claim:

This is an argument for discovery products that improve both coverage and
explainability.

Then I turn the room toward discussion:

Where should AI judgment sit in this workflow? Which pivots are highest
leverage? What would make this trustworthy enough for broader adoption?

## Timing

### 25 minute version

- 3 min: framing and problem
- 4 min: product promise
- 12 min: live walkthrough
- 4 min: architecture
- 2 min: close

### 35 minute version

- 4 min: framing and problem
- 5 min: product promise
- 16 min: live walkthrough
- 7 min: architecture and alternatives
- 3 min: close

## Backup Lines

### If the room is skeptical about AI

I am not proposing that AI replaces review. I am proposing that AI helps decide
which ambiguous pivots deserve structured attention.

### If the room wants more technical detail earlier

I can go there, but I want to anchor the product surface first because the
architecture only matters if it improves how the team experiences and trusts the
workflow.

### If time gets tight

Skip activity and exports. Keep run overview, pivot review, judge analysis, one
asset view, one trace, and the scheduler explanation.
