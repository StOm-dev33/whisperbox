// ============================================================
//  WhisperBox — Read Receipt Component
//  Shows message read status with animated checkmarks
// ============================================================

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function ReadReceipt({ isRead, isDelivered }) {
  const checkVariants = {
    hidden: { opacity: 0, x: -4 },
    visible: { opacity: 1, x: 0 },
  };

  if (!isDelivered && !isRead) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-0.5"
    >
      {isRead ? (
        <>
          <motion.div variants={checkVariants} transition={{ delay: 0 }}>
            <Check size={11} style={{ color: 'var(--accent)' }} strokeWidth={3} />
          </motion.div>
          <motion.div variants={checkVariants} transition={{ delay: 0.05 }}>
            <Check size={11} style={{ color: 'var(--accent)' }} strokeWidth={3} />
          </motion.div>
        </>
      ) : (
        <motion.div variants={checkVariants}>
          <Check size={11} style={{ color: 'var(--text-muted)', opacity: 0.5 }} strokeWidth={3} />
        </motion.div>
      )}
    </motion.div>
  );
}
