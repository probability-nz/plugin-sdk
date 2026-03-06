# Presence: groupBy + extensible state + delegation

## Status: Research complete, implementation pending

The `identity` → `delegation` rename is done (commit `9211eb6`).

## Why we need BOTH groupBy and Beelay delegation

They solve different problems:

- **groupBy**: a read-side `GROUP BY` on the peer list. Collapses multiple peers into one entry by an arbitrary key. It's not about identity — it's a query/view tool. Use cases: multi-device dedup, group by team, group by role.
- **Beelay delegation**: cryptographic proof of identity via Ed25519 delegation chains. Each device has its own keypair; the delegation chain links device keys back to a root user key. Replaces honour-system self-identification with verified identity.

**Why both**: Even with Beelay, each device gets a unique peerId (its device key). To dedup by user, you still need `groupBy` to extract the root user identity from the delegation chain: `groupBy: (peer) => getRootPubkey(peer.delegation)`.

## Key design decisions from discussion

### groupBy (not groupingFn)
- Expose as `groupBy` — familiar from SQL/lodash, no identity connotation
- It's opt-in. Default: one entry per peerId (no grouping)
- Automerge's `PeerStateView.getStates({ groupingFn })` supports this already — we just pass it through
- Default `summaryFn` is `getLastActivePeer` (picks most recently active in group) — good enough
- **Note**: groupingFn has zero tests/examples in automerge-repo. We'd be the first users.

### No auto-filtering by plugin URL
- Considered filtering peers to same-plugin-only by default (using `window.location.origin + pathname`)
- Rejected: most plugins (lobby, cursor tracker, chess clock) want to see ALL peers, not just same-plugin
- Filtering is trivial in userland — `Object.values(peers).filter(...)`

### Extensible presence state
- Current `PresenceState` is locked to `{ cursor?, op? }` — too restrictive
- Every plugin scenario needs custom fields: team, role, hoveredCard, camera, typing, userId
- Needs to become generic/extensible for groupBy to be useful (otherwise there's nothing interesting to group by)
- Blocked: gap #9 in PLUGIN-SCENARIOS.md ("Plugin presence state")

### Delegation in the hash (not localStorage)
- Plugins run in sandboxed iframes — no localStorage access
- The **host** provides the delegation string in the hash URL: `#doc=...&delegation=...`
- SDK reads it automatically from HashContext
- For the example: use `@keyhive/keyhive` WASM package to generate real `Signed<Delegation>` data — real Ed25519, real bincode format, structurally valid
- When Beelay transport lands, the same delegation format is already compatible

### Multi-plugin presence scenario (from discussion)
Desktop with 4 plugins + tablet with 2 plugins + peers with other plugins = many peerIds on one doc.
Each plugin iframe = separate automerge connection = separate peerId.
Plugins broadcast delegation in presence → groupBy delegation → dedup by user across devices and tabs.

## TODO (implementation order)

1. **Make PresenceState extensible** — generic type parameter on useEphemeralState
2. **Add `groupBy` option** — pass through to `peerStates.getStates({ groupingFn })`
3. **Auto-broadcast delegation** — SDK reads from HashContext, injects into presence state
4. **Example: multi-tab dedup** — host generates delegation with `@keyhive/keyhive` WASM, plugin groups by delegation
5. **Tests** — groupBy groups peers, dedup works, validation still rejects invalid state

## Key files

- `packages/sdk/src/react/useEphemeralState.ts` — main hook to modify
- `packages/types/src/hashroute.ts` — HashContext type (delegation field already exists)
- `packages/sdk/src/hashStore.ts` — reads hash context
- `research/PLUGIN-SCENARIOS.md` — gap #9 is relevant

## Open questions for next session

1. What should extensible PresenceState look like? Generic `useEphemeralState<MyState>(...)` or open schema?
2. Should delegation be auto-broadcast by the SDK or explicit by the plugin?
3. How heavy is @keyhive/keyhive WASM (8MB) — acceptable for the example? Or generate test fixtures offline?

## First task: KeyHive WASM proof-of-concept

Install `@keyhive/keyhive` (npm `0.0.0-alpha.54i`) and write a small Node script to verify we can:

1. Generate an Ed25519 keypair (`Signer.generate()`)
2. Sign a delegation payload (`signer.trySign(payload)`)
3. Export to bytes (`signed.toBytes()`) → base64url encode
4. Decode: base64url → bytes → `Signed.fromBytes()`
5. Verify the signature (`signed.verify()`)

If all 5 work, we have real test fixtures for the SDK. If not, we know exactly what's broken.

This unblocks everything else — extensible presence, groupBy, the example.

## How to resume

1. `cd /var/home/neftaly/dev/probability-plugin-sdk`
2. `git pull` (if switching machines)
3. `pnpm install && pnpm build && pnpm test` — verify everything passes
4. Read this plan file — it has all the context
5. Start with the open questions above, then implement the TODO list in order

Recent commits on main:
- `9211eb6` — Rename identity to delegation, add @experimental tag
- `3d9693c` — Add npm metadata and clean script
