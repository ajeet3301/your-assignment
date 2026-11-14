import type { Metadata } from 'next';
import { Inter, Lora, Caveat } from 'next/font/google';
import { GOOGLE_FONTS_URL } from '@/lib/engine/fonts';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const lora = Lora({
  variable: '--font-serif',
  subsets: ['latin'],
});

const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'YourAssignment — Realistic Handwriting Generator & AI Assignment Solver',
  description:
    'Turn typed assignments into ultra-realistic handwritten A4 notebook pages. Deterministic rule-based handwriting engine with pen physics and paper styles.',
  keywords: [
    'handwriting generator',
    'assignment solver',
    'handwritten notes',
    'A4 pdf export',
    'realistic handwriting',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} ${caveat.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      </head>
      <body className="min-h-full flex flex-col bg-[#FBF7EE] text-[#14213D] selection:bg-[#FFE066] selection:text-[#14213D]">
        {children}
      </body>
    </html>
  );
}
