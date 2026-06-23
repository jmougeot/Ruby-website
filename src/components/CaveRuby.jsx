import { motion, useReducedMotion } from 'framer-motion'

/**
 * Un rubis qui se balade dans la grotte. Il dérive le long de points de
 * passage (en %, donc responsive) et sa lumière révèle la roche au passage.
 * En reduced-motion : il reste posé, respiration légère seulement.
 */
export default function CaveRuby() {
  const reduce = useReducedMotion()

  const travel = reduce
    ? { left: '46%', top: '46%', scale: 1 }
    : {
        left: ['30%', '46%', '62%', '50%', '36%', '30%'],
        top: ['50%', '40%', '46%', '52%', '43%', '50%'],
        scale: [0.85, 1.05, 0.92, 1.1, 0.95, 0.85],
      }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute"
        style={{ left: '46%', top: '46%' }}
        animate={travel}
        transition={
          reduce
            ? undefined
            : {
                duration: 24,
                repeat: Infinity,
                ease: 'easeInOut',
                times: [0, 0.2, 0.45, 0.65, 0.85, 1],
              }
        }
      >
        <div className="reveal-light" />
        <div className="cave-gem" />
      </motion.div>
    </div>
  )
}
