import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ALL_GOOGLE_FONTS_URL } from '@/lib/engine/fonts';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'YourAssignment — Realistic Handwriting Generator',
  description:
    'Turn typed assignments into realistic handwritten A4 notebook pages. 50+ free handwriting fonts, ruled notebook paper, pen physics, and print-ready 300 DPI PDF export. Free, unlimited, zero-config.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={ALL_GOOGLE_FONTS_URL} />
      </head>
      <body className="min-h-full flex flex-col bg-[#FBF7EE] text-[#14213D] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
