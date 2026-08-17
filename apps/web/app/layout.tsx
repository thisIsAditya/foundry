import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AppTrpcProvider } from '../lib/trpc/provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Foundry',
  description: 'Founder journey workspace',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppTrpcProvider>{children}</AppTrpcProvider>
      </body>
    </html>
  );
}
