export function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-espresso/8 dark:border-dark-var">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-bold text-espresso dark:text-dark-text">☕ 1Cup</span>
          <span className="text-sm text-caramel/60 dark:text-dark-sub/60">© 2025</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/luizgdona/1Cup"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-caramel dark:text-dark-sub hover:text-espresso dark:hover:text-dark-text transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-caramel dark:text-dark-sub hover:text-espresso dark:hover:text-dark-text transition-colors"
          >
            Instagram
          </a>
          <a
            href="mailto:contato@1cup.app"
            className="text-sm text-caramel dark:text-dark-sub hover:text-espresso dark:hover:text-dark-text transition-colors"
          >
            Contato
          </a>
        </div>

        <p className="text-xs text-espresso/30 dark:text-dark-sub/40">
          Feito com ☕ para amantes de café especial
        </p>
      </div>
    </footer>
  );
}
