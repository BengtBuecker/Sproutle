# Static client-side game, no backend

Sproutle is a daily, anonymous puzzle with a curated stem list and no accounts. Every word family is precomputed from the open word list at build time and shipped with the game; the player's browser validates entries locally against that data, and the site deploys as static files to free hosting.

## Considered options

- **Thin server API** (`/today`, `/check`): rejected for v1 — it would keep answers hidden and enable future features (global leaderboards, daily changes without a rebuild), at the cost of hosting, ops, and latency that a v1 without accounts does not need.

## Consequences

- Answers are technically extractable from the shipped data; accepted deliberately (Wordle's answer was derivable from the date).
- Adding any server-dependent feature later (leaderboards, live puzzle changes) is a migration, not a config change.
- The daily stem changes require a rebuild/redeploy, which the build pipeline handles.
- The puzzle rolls over at a fixed global moment (midnight UTC), keeping "same puzzle for all players" literally true.
