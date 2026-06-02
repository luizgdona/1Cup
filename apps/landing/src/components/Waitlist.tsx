'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

type State = 'idle' | 'loading' | 'success' | 'error';

export function Waitlist() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setState('loading');
    try {
      const res = await fetch(`${API}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? 'Erro ao cadastrar.');
      }
      setState('success');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro inesperado. Tente novamente.');
      setState('error');
    }
  }

  return (
    <section id="waitlist" className="py-24 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}
        >
          <p className="text-sm font-semibold text-gold dark:text-gold-dark uppercase tracking-widest mb-3">
            Lista de espera
          </p>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-espresso dark:text-dark-text mb-4">
            Seja o primeiro a saber
          </h2>
          <p className="text-lg text-caramel dark:text-dark-sub mb-10">
            Cadastre-se para receber uma notificação assim que o 1Cup chegar ao Android e iOS.
          </p>

          {state === 'success' ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-8 rounded-3xl bg-espresso/5 dark:bg-dark-var border border-espresso/10 dark:border-dark-surf"
            >
              <div className="text-5xl mb-4">☕</div>
              <h3 className="font-display text-2xl font-bold text-espresso dark:text-dark-text mb-2">
                Você está na lista!
              </h3>
              <p className="text-caramel dark:text-dark-sub">
                Avisaremos em <strong>{email}</strong> quando lançarmos. Até lá, beba bons cafés.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="flex-1 px-5 py-3.5 rounded-2xl bg-espresso/5 dark:bg-dark-var border border-espresso/10 dark:border-dark-surf text-espresso dark:text-dark-text placeholder:text-espresso/30 dark:placeholder:text-dark-sub/40 focus:outline-none focus:ring-2 focus:ring-espresso/30 dark:focus:ring-dark-text/30 transition-all"
              />
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="flex-1 px-5 py-3.5 rounded-2xl bg-espresso/5 dark:bg-dark-var border border-espresso/10 dark:border-dark-surf text-espresso dark:text-dark-text placeholder:text-espresso/30 dark:placeholder:text-dark-sub/40 focus:outline-none focus:ring-2 focus:ring-espresso/30 dark:focus:ring-dark-text/30 transition-all"
              />
              <button
                type="submit"
                disabled={state === 'loading'}
                className="px-8 py-3.5 rounded-2xl bg-espresso dark:bg-dark-text text-white dark:text-espresso font-semibold whitespace-nowrap hover:bg-espresso/90 dark:hover:bg-dark-text/90 disabled:opacity-60 transition-all shadow-warm-md"
              >
                {state === 'loading' ? 'Cadastrando...' : 'Entrar na lista →'}
              </button>
            </form>
          )}

          {state === 'error' && (
            <p className="mt-3 text-sm text-red-500 dark:text-red-400">{errorMsg}</p>
          )}

          <p className="mt-4 text-xs text-espresso/30 dark:text-dark-sub/40">
            Sem spam. Apenas o aviso de lançamento.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
