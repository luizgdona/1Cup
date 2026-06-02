'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-paper/90 dark:bg-dark-surf/90 backdrop-blur-md shadow-warm-sm border-b border-black/5 dark:border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="font-display text-xl font-bold text-espresso dark:text-dark-text">
          ☕ 1Cup
        </a>

        <div className="flex items-center gap-6">
          <a href="#features"   className="hidden sm:block text-sm font-medium text-caramel dark:text-dark-sub hover:text-espresso dark:hover:text-dark-text transition-colors">Funcionalidades</a>
          <a href="#como-funciona" className="hidden sm:block text-sm font-medium text-caramel dark:text-dark-sub hover:text-espresso dark:hover:text-dark-text transition-colors">Como funciona</a>
          <a href="#waitlist"   className="hidden sm:block text-sm font-medium text-caramel dark:text-dark-sub hover:text-espresso dark:hover:text-dark-text transition-colors">Lista de espera</a>

          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-espresso/8 dark:bg-dark-var hover:bg-espresso/15 dark:hover:bg-dark-var/80 transition-colors"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
