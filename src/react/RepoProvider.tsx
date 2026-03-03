import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { Repo } from '@automerge/automerge-repo';
import { WebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket';
import { SDKError } from '../errors';

const RepoContext = createContext<Repo | null>(null);

export const useRepo = (): Repo => {
  const repo = useContext(RepoContext);
  if (!repo) {
    throw new Error('useRepo must be used within a <RepoProvider>');
  }
  return repo;
};

export interface RepoProviderProps {
  sync: string[];
  children: ReactNode;
}

export function RepoProvider({ sync, children }: RepoProviderProps) {
  if (sync.length === 0) {
    throw new SDKError('MISSING_SYNC', 'RepoProvider requires at least one sync URL');
  }

  // Warn on nesting (always call hook to satisfy rules of hooks)
  const parent = useContext(RepoContext);
  if (parent) {
    console.warn('Nested <RepoProvider> detected. This creates a separate Repo instance.');
  }

  const repoRef = useRef<Repo | null>(null);
  const adaptersRef = useRef<Map<string, WebSocketClientAdapter>>(new Map());

  // Create repo on first render
  if (!repoRef.current) {
    const adapters = dedupe(sync).map((url) => {
      const adapter = new WebSocketClientAdapter(url);
      adaptersRef.current.set(url, adapter);
      return adapter;
    });
    repoRef.current = new Repo({ network: adapters, isEphemeral: true });
  }

  // Handle sync prop changes
  useEffect(() => {
    const repo = repoRef.current;
    if (!repo) return;

    const desired = new Set(dedupe(sync));
    const current = adaptersRef.current;

    // Add new adapters first (prevents sync gap)
    for (const url of desired) {
      if (!current.has(url)) {
        const adapter = new WebSocketClientAdapter(url);
        current.set(url, adapter);
        repo.networkSubsystem.addNetworkAdapter(adapter);
      }
    }

    // Then remove old
    for (const [url, adapter] of current) {
      if (!desired.has(url)) {
        adapter.disconnect();
        current.delete(url);
      }
    }
  }, [sync]);

  // Shutdown on unmount
  useEffect(() => {
    return () => {
      repoRef.current?.shutdown();
      repoRef.current = null;
      adaptersRef.current.clear();
    };
  }, []);

  return (
    <RepoContext value={repoRef.current}>
      {children}
    </RepoContext>
  );
}

function dedupe(urls: string[]): string[] {
  return [...new Set(urls)];
}
