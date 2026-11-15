import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Folio — A little clarity for your money',
  description:
    'Your personal financial workspace. Understand your spending, make a plan, and move toward what matters.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
