# Contributing

Write code that explains itself. Add comments when it can't.

## Self-Documenting Code

Before writing a comment, ask: can I rename, extract a constant, or restructure to make this obvious? If not, comment the *why*.

```typescript
// Name for purpose, not implementation (applies to parameters too)
const round4 = (n: number) => ...                   // Describes how
const roundForSync = (n: number) => ...             // Describes why
const jitter = (hash: number, bitOffset: number, ...) => ...  // Exposes implementation
const jitter = (hash: number, index: number, ...) => ...      // Caller-friendly

// Extract magic numbers
if (nz > 0.5) { ... }                     // Unclear
if (nz > FACE_NORMAL_THRESHOLD) { ... }   // Clear

// Use intermediate variables for complex conditions
if (!!user && user.role === 'admin' && !user.suspended) { ... }   // Dense
const isActiveAdmin = Boolean(user) && user.role === 'admin' && !user.suspended;
if (isActiveAdmin) { ... }                                        // Readable

// Don't repeat types in names
const hashString = (s: string) => { ... }  // Redundant
const hash = (s: string) => { ... }        // Signature speaks for itself

// No single-letter variables except x/y/z and loop indices
const w = width / 2;          // Unclear
const halfWidth = width / 2;  // Clear

// Don't mutate parameters - treat them as read-only
const process = (items: Item[]) => { items.push(x); ... }  // Mutates caller's array
const process = (items: Item[]) => { const result = [...items, x]; ... }  // Safe
```

## When to Comment

Comments are valuable when code can't tell the whole story:

- **Domain knowledge**: "linen finish is the industry term for this texture"
- **Workarounds**: "Safari doesn't support X, so we do Y"
- **Non-obvious constraints**: "must be called before render due to Z"
- **Complex algorithms**: when the *what* genuinely needs explanation
- **Non-obvious function behavior**: what it returns, what the parameters mean

## After Implementation

Once a feature works, take a few refactoring passes to simplify and make it more idiomatic - don't stop at "it works." But don't:
- Sacrifice readability for brevity
- Remove "boilerplate" that makes code clearer
- Abstract things that are only used once

Sometimes repetition is better than a premature abstraction.

## Testing

- **Bug fixes**: Write the failing test first (TDD) - proves you've reproduced it and verifies the fix
- **New features**: Tests are valuable but not required upfront - don't let them slow down exploration
- **Visual/interaction bugs**: Use Playwright to reproduce and verify

## Linting

- Fix all warnings before merging
- Don't add new lint exceptions without explicit approval

## Commits

One concern per commit. Follow existing style (check `git log --oneline`).

## For AI Agents

- Never commit or push - wait for the user to ask
- Run lint, tests, and smoke tests before committing
- Run Playwright in headless mode only
- Do your own refactoring passes - don't wait to be asked
- Review your changes against these standards before committing
- Your training data may be outdated, especially for browser quirks and library APIs - search online for current information
