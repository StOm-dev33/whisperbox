// ============================================================
//  WhisperBox — Upload Progress Component
//  Animated progress bar for file uploads
// ============================================================

import { motion } from 'framer-motion';
import { FileUp, X } from 'lucide-react';

export default function UploadProgress({ fileName, progress, status, onCancel }) {
  const isCompleted = status === 'completed';
  const isError = status === 'error';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mb-3 px-4 py-3 rounded-2xl"
      style={{
        background: isError
          ? 'rgba(239, 68, 68, 0.1)'
          : isCompleted
            ? 'rgba(34, 197, 94, 0.1)'
            : 'var(--msg-recv)',
        border: isError
          ? '1px solid rgba(239, 68, 68, 0.3)'
          : isCompleted
            ? '1px solid rgba(34, 197, 94, 0.3)'
            : '1px solid var(--border)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <FileUp
            size={16}
            style={{
              color: isError ? 'var(--red)' : isCompleted ? 'var(--green)' : 'var(--accent)',
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {fileName}
          </p>

          {!isError && !isCompleted && (
            <div className="mt-1.5">
              <div className="relative h-1.5 bg-black/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, var(--accent), #ec4899)',
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {Math.round(progress)}% • {status}
              </p>
            </div>
          )}

          {isCompleted && (
            <p className="text-xs mt-1" style={{ color: 'var(--green)' }}>
              ✓ Upload complete
            </p>
          )}

          {isError && (
            <p className="text-xs mt-1" style={{ color: 'var(--red)' }}>
              Upload failed
            </p>
          )}
        </div>

        {!isCompleted && !isError && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onCancel}
            className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
            style={{
              background: 'rgba(0, 0, 0, 0.05)',
              color: 'var(--text-muted)',
            }}
            title="Cancel upload"
          >
            <X size={14} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
