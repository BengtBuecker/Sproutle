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
The living visual the player grows during the puzzle; the Stem is its root, and a found word makes it grow.

**Branch**:
One added chunk of letters, grown as a limb off the path built so far; a valid word is the path from the Stem through its chunks.

**Sprout**:
A valid word the player has found in today's puzzle; it appears in the Tree as a Leaf.
_Avoid_: guess, found word, entry

**Leaf**:
The end of a branch path, labeled with the completed word.

### Progress

**Points**:
Awarded for each valid word, equal to the word's full letter count.

**Streak**:
The count of consecutive days played, kept on the player's device.
