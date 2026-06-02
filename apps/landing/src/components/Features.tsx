'use client';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const features = [
  {
    icon: '📸',
    title: 'Check-in visual',
    description: 'Registre cada xícara com foto, nota de 0 a 5 (meia estrela), método de preparo e descrição sensorial em até 500 caracteres.',
    color: 'from-amber-500/20 to-orange-500/10',
    darkColor: 'dark:from-amber-500/10 dark:to-orange-500/5',
  },
  {
    icon: '🤝',
    title: 'Feed social',
    description: 'Veja em tempo real o que seus amigos estão bebendo. Feed paginado por cursor, infinito e sempre fresco.',
    color: 'from-caramel/20 to-espresso/10',
    darkColor: 'dark:from-caramel/10 dark:to-espresso/5',
  },
  {
    icon: '🏆',
    title: 'Badges & Gamificação',
    description: '10 conquistas desbloqueáveis — da Primeira Xícara ao Viajante de Xícara (cafés de 5 países). A Badge Engine avalia em tempo real.',
    color: 'from-gold/20 to-amber-400/10',
    darkColor: 'dark:from-gold/10 dark:to-amber-400/5',
  },
  {
    icon: '📚',
    title: 'Catálogo colaborativo',
    description: 'Milhares de cafés, torrefações e produtores. Qualquer usuário pode sugerir edições — revisadas por admins antes de publicar.',
    color: 'from-green-600/15 to-emerald-500/10',
    darkColor: 'dark:from-green-600/8 dark:to-emerald-500/5',
  },
  {
    icon: '🌍',
    title: 'Origens e produtores',
    description: 'Navegue por fazendas, variedades e processos. Conecte cada xícara à sua origem — altitude, país, produtor.',
    color: 'from-sky-500/15 to-blue-500/10',
    darkColor: 'dark:from-sky-500/8 dark:to-blue-500/5',
  },
  {
    icon: '🌙',
    title: 'Dark mode nativo',
    description: 'Design System completo com paleta espresso-crema em light e dark. Segue o tema do sistema automaticamente.',
    color: 'from-slate-500/15 to-gray-500/10',
    darkColor: 'dark:from-dark-var/60 dark:to-dark-bg/40',
  },
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: (index % 3) * 0.1, ease: [0.22,1,0.36,1] }}
      className={`relative p-6 rounded-3xl bg-gradient-to-br ${feature.color} ${feature.darkColor} border border-black/5 dark:border-white/5 hover:shadow-warm-md dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-1`}
    >
      <div className="text-3xl mb-4">{feature.icon}</div>
      <h3 className="font-display text-xl font-bold text-espresso dark:text-dark-text mb-2">
        {feature.title}
      </h3>
      <p className="text-sm text-caramel dark:text-dark-sub leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-gold dark:text-gold-dark uppercase tracking-widest mb-3">
            Funcionalidades
          </p>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-espresso dark:text-dark-text mb-4">
            Tudo que um amante de café precisa
          </h2>
          <p className="text-lg text-caramel dark:text-dark-sub max-w-xl mx-auto">
            Do check-in à comunidade — uma experiência completa ao redor do café especial.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => <FeatureCard key={i} feature={f} index={i} />)}
        </div>
      </div>
    </section>
  );
}
