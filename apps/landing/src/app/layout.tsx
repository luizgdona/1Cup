import type { Metadata, Viewport } from 'next';
import { Source_Serif_4, Hanken_Grotesk } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';

// Self-hosted at build time by next/font — no external request to Google Fonts
// (better privacy + LCP). Exposes CSS variables used by Tailwind/globals.css.
const display = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const body = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://1cup.app';
const TITLE = '1Cup — Cada xícara conta uma história';
const DESCRIPTION =
  'Registre seus cafés especiais, avalie o sensorial, colecione badges e descubra o que seus amigos estão bebendo. O Untappd do café especial.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: '1Cup',
  keywords: ['café especial', 'specialty coffee', 'check-in', 'badges', 'torrefação', 'barista', '1Cup'],
  authors: [{ name: '1Cup' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: '1Cup',
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FDF8F5' },
    { media: '(prefers-color-scheme: dark)', color: '#141210' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          {/* Accessibility: keyboard users can jump straight to the content. */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-espresso focus:text-white"
          >
            Pular para o conteúdo
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
