'use client';
import { DefaultSearchDialog } from 'fumadocs-ui/components/dialog/search';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{
        SearchDialog: DefaultSearchDialog,
      }}
    >
      {children}
    </RootProvider>
  );
}
