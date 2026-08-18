import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

import { AppTrpcProvider } from '../lib/trpc/provider';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display-loaded',
  display: 'swap',
});

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-loaded',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-loaded',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Foundry',
  description: 'Founder journey workspace',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <AppTrpcProvider>{children}</AppTrpcProvider>
      </body>
    </html>
  );
}
