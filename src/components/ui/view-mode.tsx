'use client';
import { ReactNode } from 'react';
import { useAtom } from 'jotai';
import { Provider as JotaiProvider } from 'jotai';
import { viewModeAtom } from '../../lib/state'; // adjust path if needed

export function useViewMode() {
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  return {
    viewMode,
    setViewMode,
  };
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  return <JotaiProvider>{children}</JotaiProvider>;
}
