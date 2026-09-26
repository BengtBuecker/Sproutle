# Sproutle

A daily word puzzle in the Wordle format where players grow a tree of words from a single stem. One puzzle per day, shared by all players.

## Language

### The puzzle

**Stem**:
The root word of the day; every valid word contains it as a contiguous run of letters, with any letters allowed before or after it.
_Avoid_: word stem, target word (it is not guessed, it is grown from)

**Puzzle**:
The daily challenge: one Stem, the same for all players, changing once per day.

**Word family**:
The full set of valid words that can be grown from one Stem.

### Validity

**Valid word**:
An English dictionary word that contains the Stem as a contiguous substring; letters may be added before, after, or both.

### The tree

**Tree**:
The living visual the player grows during the puzzle; it grows upward from the Ground, the Stem is its conceptual origin, and a found word makes it grow.
_Avoid_: root (for the Stem's role)

**Branch**:
One added chunk of letters, grown as a limb off the path built so far; a valid word is the path from the Stem through its chunks.

**Twig**:
The decorative terminal segment between a Branch and its Leaf; purely visual, carries no game meaning.
_Avoid_: small branch

**Sprout**:
A valid word the player has found in today's puzzle; it appears in the Tree as a Leaf.
_Avoid_: guess, found word, entry

**Leaf**:
The end of a branch path, labeled with the completed word.

**Ground**:
The grass line at the Tree's base that separates the Tree from its Roots.

**Roots**:
The visual underground part of the Tree at its base; purely visual, not the Stem.
_Avoid_: root

### Progress

**Points**:
Awarded for each valid word, equal to the word's full letter count.

**Height**:
The Tree's growth in meters; each Branch generation above the Ground adds a fixed amount.
_Avoid_: size

**Complete**:
The state reached when every Sprout of today's Word family has been found; the Tree reaches the stars.
_Avoid_: finished, solved

**Streak**:
The count of consecutive days played, kept on the player's device.
