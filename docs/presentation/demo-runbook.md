# Demo Runbook

## Goal

Deliver a website-first demo that starts with the public story page and then
hands off into the live Asset Discovery workspace.

## Recommended Flow

1. Open the public story page.
2. Use the hero and problem sections to frame the thesis.
3. Scroll to the product promise and current demo scope sections.
4. Switch into the live workspace.
5. Use a manual run as the primary demo path.
6. Walk through run overview, pivots, judge analysis, assets, and trace.
7. End with the architecture section and the DAG visualizer from the sibling
   `asset-discovery` project.

## Preferred Run Mode

- Default: `manual`
- Why: it demonstrates AI recommendation quality while preserving human control

## Exact Workspace Walkthrough

### A. Create the run

- Open `New Run`
- Use a compact seed set
- Keep the company and one or two domains visible to the audience
- Launch in manual mode

### B. Stop at run overview

- Call out wave count
- Call out seed count and asset count
- Call out judge accepted and discarded counts
- Call out pending pivots
- Mention downloadable artifacts only briefly

### C. Open pivots

- Start in `Review`
- Show recommendation reason and score
- Accept or reject one pivot deliberately
- Explain that this is follow-up discovery control, not simple UI approval

### D. Switch to judge analysis

- Show accepted candidates
- Show discarded candidates
- Read one support item out loud
- Make the point that the product exposes both positive and negative judgment

### E. Open assets

- Show grouped domains first
- Point out ownership state
- Point out inclusion reason
- Use one filter to demonstrate that the dataset stays navigable

### F. Open trace

- Pick an asset with clear supporting context
- Show contributors, seed context, relations, and related assets
- Land the line: "This is how the run justifies why the asset exists."

### G. Close with architecture

- Open the DAG visualization from the sibling `asset-discovery` repo
- Explain scheduler-managed frontier expansion
- Explain bounded reconsideration
- Keep this technical section shorter than the product walkthrough

## Fallback Plan

If the live run is slow or incomplete:

1. Stay on the public story page longer.
2. Open a previously completed run in the workspace.
3. Use stable states for pivots, judge analysis, assets, and trace.
4. If needed, switch entirely to screenshots.
5. Keep the same narrative order even when the walkthrough is not fully live.

## Demo Hygiene

- Do not imply organization ownership of the repositories
- Keep the wording "personal project" and "open source" explicit
- Avoid deep implementation details before the product story lands
- Do not overuse the activity feed; it is supporting evidence, not the center of
  the demo
