import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Finleo Game',
  description: 'A simple financial literacy game experience.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
