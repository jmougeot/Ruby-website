import { motion, useReducedMotion } from 'framer-motion'
import Header from './components/Header'
import Hero from './components/Hero'
import SectionPlaceholder from './components/SectionPlaceholder'
import Footer from './components/Footer'
import { sections } from './data/sections'

const ease = [0.22, 1, 0.36, 1]

export default function App() {
  const reduce = useReducedMotion()
  const reveal = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
  }

  return (
    <>
      <Header />
      <main>
        <Hero />

        {sections.map((s) => (
          <SectionPlaceholder key={s.id} {...s} />
        ))}

        {/* TODO (cf. structure.md) : sections Proof + How it works à construire */}

        {/* CTA final — on boucle sur la promesse du hero */}
        <section
          id="demo"
          className="relative overflow-hidden"
          style={{ background: '#f8f8f6' }}
        >
          <div className="thread-soft pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 opacity-50" />
          <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-40 text-center">
            <motion.h2
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-15%' }}
              className="mx-auto max-w-3xl text-balance text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-tight text-night"
            >
              Become an AI-augmented sales rep.
            </motion.h2>
            <motion.div
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="mt-10"
            >
              <a
                href="#"
                className="inline-block rounded-full bg-ruby px-8 py-4 text-[15px] font-medium text-white shadow-[0_0_40px_-6px_var(--ruby-glow)] transition-shadow hover:shadow-[0_0_52px_-4px_var(--ruby-glow)]"
              >
                Get Ruby
              </a>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
