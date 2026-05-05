// ============================================================
//  WhisperBox — Message Group Component
//  Groups consecutive messages from same sender with animations
// ============================================================

import { motion } from 'framer-motion';

export default function MessageGroup({ messages, isSentByMe, children }) {
  return (
    <motion.div
      className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'} mb-4 group`}
      layout
    >
      <div className={`max-w-[65%] flex flex-col ${isSentByMe ? 'items-end' : 'items-start'} gap-0.5`}>
        {children}
      </div>
    </motion.div>
  );
}
