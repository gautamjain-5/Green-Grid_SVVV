<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- App data lives in a browser-only demo store (src/lib/store.ts) seeded from src/lib/demo-data.ts; why: no backend connected yet, and demo data must stay clearly labeled.
- All sustainability formulas live in src/lib/metrics.ts and the rule engine in src/lib/recommendations.ts; why: pages stay consistent and formulas are testable.
- App pages sit under the client-only `_app` layout; why: data comes from browser storage.
- Sensor simulation, freshness validation and alert rules live in src/lib/sensors.ts as a shared in-memory external store; why: all monitoring views use consistent clearly simulated readings without claiming hardware or backend integration.
