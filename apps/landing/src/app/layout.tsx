import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import './globals.css';

export const metadata: Metadata = {
  title: '1Cup — Cada xícara conta uma história',
  description:
    'Registre seus cafés especiais, descubra novos e compartilhe com quem também vive pelo café.',
  openGraph: {
    title: '1Cup',
    description: 'Rede social gamificada de consumo de café especial',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
