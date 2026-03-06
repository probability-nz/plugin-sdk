import { StrictMode, Suspense, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { useHashStore, toColor, type SDKError } from '@probability-nz/plugin-sdk';
import { RepoProvider, useSuspenseDoc } from '@probability-nz/plugin-sdk/react';
import { z } from 'zod';

// --- Presence schema ---

const CursorSchema = z.object({
  x: z.number(),
  y: z.number(),
  color: z.string(),
});

type Cursor = z.infer<typeof CursorSchema>;

// --- Error boundary ---

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: SDKError | Error | null }
> {
  state: { error: SDKError | Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const err = this.state.error;
      return (
        <div style={{ padding: 24, color: '#e55' }}>
          <h2>Error</h2>
          <pre>{'code' in err ? (err as SDKError).code : err.name}: {err.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Loading fallback ---

function LoadingFallback() {
  return <p>Connecting...</p>;
}

// --- Plugin ---

function Plugin({ doc: docUrl }: { doc: string }) {
  const { doc, changeDoc, presence, setPresence, peers } = useSuspenseDoc<
    { count?: number },
    Cursor
  >(docUrl, CursorSchema);

  return (
    <div style={{ padding: 24, fontFamily: 'monospace' }}>
      <h2>Debug Plugin</h2>

      <section>
        <h3>Document</h3>
        <pre>{JSON.stringify(doc, null, 2)}</pre>
        <button onClick={() => changeDoc((d) => { d.count = (d.count ?? 0) + 1; })}>
          Increment count
        </button>
      </section>

      <section>
        <h3>Presence</h3>
        <p>Local: {JSON.stringify(presence)}</p>
        <button
          onClick={() =>
            setPresence({
              x: Math.round(Math.random() * 100),
              y: Math.round(Math.random() * 100),
              color: toColor(String(Date.now())),
            })
          }
        >
          Set random cursor
        </button>
      </section>

      <section>
        <h3>Peers ({Object.keys(peers).length})</h3>
        <ul>
          {Object.entries(peers).map(([id, peer]) => (
            <li key={id} style={{ color: peer.state?.color ?? '#888' }}>
              {id}: {JSON.stringify(peer.state)} (active {new Date(peer.lastActiveAt).toLocaleTimeString()})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// --- App ---

function App() {
  const hash = useHashStore();
  const context = hash.context;

  if (!context?.doc || !context?.sync?.length) {
    return (
      <div style={{ padding: 24, color: '#e55' }}>
        <h2>Error</h2>
        <pre>No context found in URL hash. Expected format:{'\n'}{`#${JSON.stringify({ context: { doc: 'automerge:...', sync: ['wss://...'] } })}`}</pre>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <RepoProvider sync={context.sync}>
        <Suspense fallback={<LoadingFallback />}>
          <Plugin doc={context.doc} />
        </Suspense>
      </RepoProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
