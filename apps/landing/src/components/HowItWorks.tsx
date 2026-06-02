'use client';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const steps = [
  {
    number: '01',
    icon: '🔍',
    title: 'Encontre o café',
    description: 'Pesquise no catálogo colaborativo ou cadastre um café novo em segundos. Torrefação, variedade, processo — tudo registrado.',
  },
  {
    number: '02',
    icon: '☕',
    title: 'Faça o check-in',
    description: 'Avalie de 0 a 5 estrelas (com meia estrela), descreva o sensorial, escolha o método de preparo e adicione até 3 fotos.',
  },
  {
    number: '03',
    icon: '👥',
    title: 'Compartilhe com amigos',
    description: 'Seu check-in aparece no feed dos seus amigos. Descubra o que eles estão bebendo e receba badges por suas conquistas.',
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="como-funciona" className="py-24 px-6 bg-espresso/[0.03] dark:bg-dark-var/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-gold dark:text-gold-dark uppercase tracking-widest mb-3">
            Como funciona
          </p>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-espresso dark:text-dark-text mb-4">
            Simples como preparar um V60
          </h2>
          <p className="text-lg text-caramel dark:text-dark-sub">
            Três passos para começar sua jornada de xícaras.
          </p>
        </div>

        <div ref={ref} className="relative grid lg:grid-cols-3 gap-8">
          {/* Linha conectora (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-espresso/20 dark:via-dark-var to-transparent" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.22,1,0.36,1] }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Número + ícone */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-paper dark:bg-dark-surf border-2 border-espresso/10 dark:border-dark-var flex items-center justify-center text-3xl shadow-warm-md">
                  {step.icon}
                </div>
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-espresso dark:bg-dark-text text-paper dark:text-espresso text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-espresso dark:text-dark-text mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-caramel dark:text-dark-sub leading-relaxed max-w-xs">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
