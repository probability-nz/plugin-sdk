import { type ReactNode, useContext, useEffect, useRef } from 'react';
import { Repo, RepoContext, WebSocketClientAdapter } from '@automerge/react';

export interface RepoProviderProps {
  sync?: string[];
  children: ReactNode;
}

export function RepoProvider({ sync = [], children }: RepoProviderProps) {
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
    if (!repo) {
      return;
    }

    const desired = new Set(dedupe(sync));
    const { current } = adaptersRef;

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
    const repo = repoRef.current;
    const adapters = adaptersRef.current;
    return () => {
      repo?.shutdown();
      repoRef.current = null;
      adapters.clear();
    };
  }, []);

  return (
    <RepoContext.Provider value={repoRef.current}>
      {children}
    </RepoContext.Provider>
  );
}

function dedupe(urls: string[]): string[] {
  return [...new Set(urls)];
}
