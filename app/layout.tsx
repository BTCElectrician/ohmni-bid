import type { Metadata } from 'next';
import { IBM_Plex_Mono, Sora } from 'next/font/google';

import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap'
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Ohmni Bid',
  description: 'Agentic electrical estimating system'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${ibmPlexMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
