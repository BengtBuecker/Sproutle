# Sproutle

A daily word puzzle in the Wordle format — but instead of guessing a single hidden word, you grow a whole family of words.

## Concept

Every day, all players get the same word stem (e.g. `PLAY` or `PORT`); the puzzle rolls over at midnight UTC. The goal: find as many valid words as possible — any English dictionary word that contains the stem as a contiguous run of letters, with any letters allowed before, after, or both.

**Example (stem: PLAY):**
- PLAYER
- REPLAY
- DISPLAY
- PLAYFUL

## Visual Core

A tree grows with every word found:
- The word stem forms the **root**
- Each found word (**Sprout**) grows the tree: an added prefix chunk extends a branch, an added suffix chunk extends a twig from it, and the leaf is labeled with the full word
- Similar words share branches (PLAYER and PLAYERS; REPLAYED hangs off the branch REPLAY grew)

## Game Principle

Follows the Wordle format:
- One puzzle per day, rolling over at midnight UTC
- The same puzzle for all players
- Free-form word entry: no attempt limit, no fail state
- Invalid words shake and are rejected; already-found words pulse their leaf ("already sprouted")
- Points: each word scores its full letter count; a daily streak is kept on the player's device
- Shareable results: your tree plus a stats footer

## Design

The domain vocabulary lives in [CONTEXT.md](CONTEXT.md); decisions in [docs/adr/](docs/adr/) — notably [ADR-0001](docs/adr/0001-static-client-side-no-backend.md): fully static, no backend, word families precomputed at build time.

## Status

Design settled; implementation not started. Working title: **Sproutle**.

## License

MIT (see [LICENSE](LICENSE))

## Credits

This project was developed with the help of AI, using [OpenCode](https://opencode.ai).

