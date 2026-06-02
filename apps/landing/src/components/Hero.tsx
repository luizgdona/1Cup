'use client';
import { motion } from 'framer-motion';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
});

// Mockup simplificado do app (SVG inline)
function AppMockup() {
  return (
    <div className="relative w-[260px] mx-auto">
      {/* Phone frame */}
      <div className="rounded-[36px] bg-[#1A1A1A] p-[10px] shadow-2xl">
        <div className="rounded-[28px] bg-[#141210] overflow-hidden">
          {/* Status bar */}
          <div className="h-8 bg-[#1C1A18] flex items-center justify-between px-4">
            <span className="text-[10px] text-[#D2C4BC]">9:41</span>
            <div className="w-12 h-2 rounded-full bg-[#2E2A27]" />
            <span className="text-[10px] text-[#D2C4BC]">●●●</span>
          </div>
          {/* App bar */}
          <div className="h-10 bg-[#1C1A18] flex items-center px-3 border-b border-[#2E2A27]">
            <span className="text-sm font-bold text-[#DEC1AF]">☕ 1Cup</span>
          </div>
          {/* Check-in card */}
          <div className="p-3 space-y-2">
            {/* Card */}
            <div className="rounded-2xl bg-[#1C1A18] overflow-hidden">
              {/* Photo area */}
              <div className="h-24 bg-gradient-to-br from-[#6B3A0F] via-[#8B4F1A] to-[#5A2D08] flex items-end p-2">
                <div>
                  <p className="text-xs font-bold text-white">Fazenda Santa Inês</p>
                  <p className="text-[10px] text-amber-200">Bourbon Natural</p>
                </div>
              </div>
              <div className="p-2">
                <p className="text-[10px] text-[#F0BD8B] font-semibold">Mínimo Café</p>
                {/* Stars */}
                <div className="flex gap-0.5 my-1">
                  {[1,2,3,4].map(i => (
                    <span key={i} className="text-[#FFC000] text-xs">★</span>
                  ))}
                  <span className="text-[#FFC000] text-xs">½</span>
                </div>
                <p className="text-[9px] text-[#9B8B83] italic">"Frutado, ameixa e tâmara..."</p>
                <p className="text-[9px] text-[#9B8B83] mt-1">📍 Coffee Lab, SP · V60</p>
              </div>
            </div>
            {/* Segundo card menor */}
            <div className="rounded-2xl bg-[#1C1A18] p-2 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#3D2B1F] flex items-center justify-center text-xs text-[#DEC1AF] font-bold">A</div>
              <div>
                <p className="text-[10px] font-semibold text-[#DEC1AF]">Ana Paula</p>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-[#FFC000] text-[9px]">★</span>)}
                </div>
              </div>
            </div>
          </div>
          {/* Nav bar */}
          <div className="h-12 bg-[#1C1A18] border-t border-[#2E2A27] flex items-center justify-around px-2">
            {['🏠','🔍','👤'].map((icon, i) => (
              <span key={i} className={`text-base ${i===0?'opacity-100':'opacity-40'}`}>{icon}</span>
            ))}
          </div>
        </div>
      </div>
      {/* Decorative glow */}
      <div className="absolute -inset-8 bg-gold/10 rounded-full blur-3xl -z-10" />
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 pb-24 px-6 overflow-hidden">
      {/* Background grain */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />

      {/* Decorative circles */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gold/8 rounded-full blur-3xl dark:bg-gold/5" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-caramel/8 rounded-full blur-3xl dark:bg-caramel/5" />

      <div className="relative max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-espresso/8 dark:bg-dark-var text-espresso dark:text-dark-text text-sm font-medium mb-8">
            <span>☕</span>
            <span>Em breve nas stores</span>
          </motion.div>

          <motion.h1 {...fadeUp(0.1)} className="font-display text-5xl lg:text-6xl font-bold leading-[1.1] text-espresso dark:text-dark-text mb-6">
            Cada xícara{' '}
            <span className="text-gold-gradient">conta uma</span>{' '}
            história.
          </motion.h1>

          <motion.p {...fadeUp(0.2)} className="text-lg text-caramel dark:text-dark-sub leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
            Registre seus cafés especiais, avalie o sensorial, colecione badges e descubra o que seus amigos estão bebendo. O Untappd do café especial.
          </motion.p>

          <motion.div {...fadeUp(0.3)} className="flex flex-wrap gap-3 justify-center lg:justify-start">
            <a
              href="#waitlist"
              className="px-8 py-3.5 rounded-2xl bg-espresso dark:bg-dark-text text-white dark:text-espresso font-semibold text-base hover:bg-espresso/90 dark:hover:bg-dark-text/90 transition-all shadow-warm-md hover:shadow-warm-lg hover:-translate-y-0.5"
            >
              Entrar na lista de espera
            </a>
            <a
              href="#features"
              className="px-8 py-3.5 rounded-2xl border border-espresso/20 dark:border-dark-var text-espresso dark:text-dark-text font-medium text-base hover:bg-espresso/5 dark:hover:bg-dark-var transition-all"
            >
              Ver funcionalidades
            </a>
          </motion.div>

          <motion.div {...fadeUp(0.4)} className="mt-12 flex items-center gap-6 justify-center lg:justify-start">
            <div className="flex -space-x-2">
              {['L','A','M','G'].map((l, i) => (
                <div key={i} className="w-9 h-9 rounded-full bg-espresso/10 dark:bg-dark-var border-2 border-paper dark:border-dark-bg flex items-center justify-center text-xs font-bold text-espresso dark:text-dark-text">
                  {l}
                </div>
              ))}
            </div>
            <p className="text-sm text-caramel dark:text-dark-sub">
              <span className="font-bold text-espresso dark:text-dark-text">+240</span> amantes de café já na lista
            </p>
          </motion.div>
        </div>

        {/* App mockup */}
        <motion.div {...fadeUp(0.2)} className="flex justify-center lg:justify-end">
          <AppMockup />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-caramel/50 dark:text-dark-sub/50"
      >
        <span className="text-xs">Rolar</span>
        <motion.div animate={{ y: [0,6,0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-base">↓</motion.div>
      </motion.div>
    </section>
  );
}
