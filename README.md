# @probability-nz/plugin-sdk

[probability.nz](https://probability.nz) is a freeform platform for playing tabletop & board games online. Players can move pieces, draw cards, and roll dice with no rules enforced, like a physical table.

Plugins add automation on top. A plugin can read and modify the game, and can do anything a player could do. Each plugin connects to a shared [automerge](https://automerge.org/) document (JSON object) that syncs between players. This SDK lets you build them with React.

## Quick start

```sh
git clone https://github.com/probability-nz/plugin-sdk
cd plugin-sdk/examples/debug
pnpm install
pnpm dev
```

Edit [`src/main.tsx`](./examples/debug/src/main.tsx) to build your plugin.

## Usage

```tsx
import { Suspense } from 'react';
import { useProbDocument } from '@probability-nz/plugin-sdk/react';

function MyPlugin({ docUrl }: { docUrl: AutomergeUrl }) {
  const [doc, changeDoc] = useProbDocument<{ count?: number }>(docUrl, { suspense: true });

  return (
    <button onClick={() => changeDoc(d => { d.count = (d.count ?? 0) + 1 })}>
      Count: {doc.count ?? 0}
    </button>
  );
}

// Must be wrapped in <Suspense> (loading) and an error boundary (errors)
<Suspense fallback={<p>Connecting...</p>}>
  <MyPlugin docUrl={docUrl} />
</Suspense>
```

`useProbDocument` connects to a shared document and returns `[doc, changeDoc]`. Mutations are validated against the game state schema and sync to all players in real-time.

### Hooks

From the SDK:

- **`useProbDocument(id, { suspense: true })`** — returns `[doc, changeDoc]`. Validates writes against the game state schema. Requires suspense mode.
- **`useEphemeralState(docUrl)`** — typed presence API. Returns `{ state, setState, peers }`. Two channels: `cursor` (focus/attention) and `op` (uncommitted mutation preview).

From `@automerge/react` (peer dep):

- **`useRepo()`** — raw automerge `Repo` instance for multi-doc or doc creation.
- **`useDocHandle(id)`** — raw `DocHandle` for advanced operations.

### Wiring

Wrap your plugin in `RepoProvider` to connect to the sync server. In the browser, `useHashStore` reads connection config from the URL hash:

```tsx
import { useHashStore } from '@probability-nz/plugin-sdk';
import { RepoProvider } from '@probability-nz/plugin-sdk/react';

function App() {
  const { context } = useHashStore();
  return (
    <ErrorBoundary>
      <RepoProvider sync={context.sync}>
        <Suspense fallback={<p>Connecting...</p>}>
          <MyPlugin docUrl={context.doc} />
        </Suspense>
      </RepoProvider>
    </ErrorBoundary>
  );
}
```

Non-browser environments (Electron, React Ink, tests) skip the hash and pass config as props directly.

## How it works

When a player clicks Play on probability.nz, it opens your plugin and connects it to a shared document. See the [automerge docs](https://automerge.org/docs/) for document operations.

```mermaid
flowchart TD
    subgraph prob ["probability.nz"]
        A["Player clicks Play"]
        A -- "Opens plugin in new window" --> B["Plugin loaded"]
    end

    B --> C{"URL has<br/>doc + sync?"}
    C -- "No" --> Err

    C -- "Yes" --> D["Connecting..."]

    D -- "Connected" --> E["Loading document..."]
    D -- "Server unreachable" --> Err

    E -- "Not found or<br/>doc deleted" --> Err
    E -- "Loaded" --> Ready

    subgraph Ready ["Your plugin code runs here"]
        direction LR
        R1["Read and display<br/>game state"]
        R2["Players edit<br/>shared state"]
        R3["See each other's<br/>cursors and actions"]
        R1 --- R2 --- R3
    end

    Ready -- "Real-time sync" --> Peers["Other players<br/>see changes instantly"]
    Peers -- "Their changes" --> Ready

    subgraph Err ["Error boundary"]
        ErrMsg["Automerge errors caught<br/>by React error boundary"]
    end

    style prob fill:#f0f0ff,stroke:#99a
    style Ready fill:#e8f5e9,stroke:#4a7
    style Err fill:#fce4ec,stroke:#c55
    style Peers fill:#e3f2fd,stroke:#59d
```
