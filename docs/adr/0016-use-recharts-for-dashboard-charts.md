# ADR-0016: Use Recharts for dashboard charts

- Status: Accepted
- Date: 2026-10-15
- Task: SCC-1
- Deciders: engineering, with the product owner (chose Recharts over hand-built SVG)
- Area: web ui
- Reversibility: cheap: charts live in features/manager/Breakdown.tsx and UsageDialog.tsx only

## Context

The dashboard needs a daily spend chart stacked by purpose, and bar charts of calls, scores and flag rates by language, product and agent. Each needs tooltips, a legend, and correct colors in light and dark.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Recharts 3.10.1, MIT, React 19 ready (chosen) | about 35 transitive packages (redux toolkit, immer, victory-vendor); `Cell` is deprecated, so per-bar colors use the `shape` prop | standard business charts with little code |
| Hand-built SVG components | more code to own for tooltips, axes and responsive sizing | one or two fixed charts |

## Decision

Draw dashboard charts with Recharts. Series colors come from `--viz-1` to `--viz-4` in `index.css`: the dataviz reference palette's first four slots, run through its validator in light and dark.
- Each purpose or measure keeps a fixed slot, and a fifth purpose folds into "Other".
- One measure per chart: there are no dual axes.
- Every chart has a table view, because two light-mode colors sit below 3:1 contrast.

## Consequences

`recharts` and its peer `react-is` are pinned exactly; chart code renders nothing in jsdom, so tests assert on the tables and controls. Upgrading to Recharts 4 means checking for the removal of `Cell` (not used) and API changes.

## Commits us to

recharts 3.10.1 and react-is 19.3.0 in apps/web
