// ============================================================
//  WhisperBox — Typing Indicator Component
//  Shows animated dots when recipient is typing
// ============================================================

import { motion } from 'framer-motion';

export default function TypingIndicator() {
  const dotVariants = {
    initial: { y: 0, opacity: 0.5 },
    animate: { y: -8, opacity: 1 },
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.15,
        repeatDelay: 0.3,
      },
    },
  };

  return (
    <div className="flex items-end gap-1.5 px-4 py-3 rounded-2xl"
      style={{
        background: 'var(--msg-recv)',
        border: '1px solid var(--border)',
        width: 'fit-content',
      }}
    >
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="flex gap-1.5"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            variants={dotVariants}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--text-muted)' }}
          />
        ))}
      </motion.div>
    </div>
  );
}
