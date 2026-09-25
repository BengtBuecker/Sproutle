<div align="center">

# 🌱 Sproutle

**A daily word puzzle in the Wordle format — but instead of guessing a single hidden word, you grow a whole family of words.**

[![Status: Design](https://img.shields.io/badge/status-%F0%9F%8C%B1%20design%20settled-8bc34a?style=flat-square)](#-status)
[![License: MIT](https://img.shields.io/badge/license-MIT-8bc34a?style=flat-square)](LICENSE)
[![Wordle format](https://img.shields.io/badge/format-Wordle--style-4caf50?style=flat-square)](#-game-principle)

</div>

---

## 🌾 The Concept

Every day, all players get the same **stem** (e.g. `PLAY` or `PORT`) — the puzzle rolls over at midnight UTC. The goal: find as many valid words as possible — any English dictionary word that contains the stem as a contiguous run of letters, with any letters allowed before, after, or both.

> **Stem: `PLAY`**
>
> | Word      | Grown as        |
> |-----------|-----------------|
> | `PLAY`    | 🌱 the root      |
> | `PLAYER`  | `PLAY` + `ER`   |
> | `REPLAY`  | `RE` + `PLAY`   |
> | `DISPLAY` | `DIS` + `PLAY`  |
> | `PLAYFUL` | `PLAY` + `FUL`  |

## 🌳 Visual Core

Found words (**Sprouts**) grow a living tree, with the stem as its **root**:

- An added **prefix chunk** extends a branch, an added **suffix chunk** extends a twig from it, and the leaf is labeled with the full word
- Similar words **share branches** (`PLAYER` and `PLAYERS`; `REPLAYED` hangs off the branch `REPLAY` grew)

```text
PLAY  ⌂  stem = the root
├── +ER ──── PLAYER
│        └── +S ──── PLAYERS
├── +FUL ─── PLAYFUL
├── RE+ ──── REPLAY          (prefix chunk)
│        └── +ED ─── REPLAYED
└── DIS+ ─── DISPLAY
```

## 🎮 Game Principle

Follows the Wordle format:

- 🗓️ **One puzzle per day**, rolling over at midnight UTC
- 🌍 **The same puzzle for all players**
- ✍️ **Free-form word entry**: no attempt limit, no fail state
- ❌ Invalid words shake and are rejected; already-found words pulse their leaf (_"already sprouted"_)
- 🏷️ **Points**: each word scores its full letter count; a daily streak is kept on the player's device
- 🔗 **Shareable results**: your tree plus a stats footer

## 📐 Design

- [`CONTEXT.md`](CONTEXT.md) — the domain vocabulary
- [`docs/adr/`](docs/adr/) — decision records, notably [ADR-0001](docs/adr/0001-static-client-side-no-backend.md): **fully static, no backend**, word families precomputed at build time

## 🚦 Status

Design settled, implementation not started. Working title: **Sproutle** 🌱 — stay tuned.

## 📄 License

MIT — see [LICENSE](LICENSE).

## 🙏 Credits

This project was developed with the help of AI, using [OpenCode](https://opencode.ai).
