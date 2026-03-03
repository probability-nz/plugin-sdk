import { DocProvider, RepoProvider } from '@probability-nz/plugin-sdk';

export function App() {
  return (
    <RepoProvider>
      <DocProvider>
        <p>tools</p>
      </DocProvider>
    </RepoProvider>
  );
}
