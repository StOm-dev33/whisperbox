import { motion } from 'framer-motion';
import { Lock, AlertTriangle, Download, FileText } from 'lucide-react';
import { useState } from 'react';
import ReadReceipt from './ReadReceipt';

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getFileIcon(mimeType) {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🔊';
  if (mimeType === 'application/pdf') return '📄';
  return '📎';
}

export default function MessageBubble({ message, isSentByMe, onDownloadFile, isSelected, onSelect }) {
  const { text, decryptionFailed, created_at, file, file_name, file_type, file_size, isRead, isDelivered } = message;
  const [previewError, setPreviewError] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const handleDownload = () => {
    if (onDownloadFile) {
      onDownloadFile(message);
    }
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: isSentByMe ? 20 : -20,
        y: 8,
      }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
      transition={{
        duration: 0.3,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'} mb-3 group`}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      {/* Selection checkbox */}
      {isSelected !== undefined && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isSelected ? 1 : 0.5, scale: 1 }}
          className="mr-2 mt-1 flex-shrink-0"
        >
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={(e) => onSelect?.(message.id, e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
            style={{
              accentColor: 'var(--accent)',
              borderColor: 'var(--border)',
            }}
          />
        </motion.div>
      )}

      <motion.div
        className={`max-w-[65%] ${isSentByMe ? 'items-end' : 'items-start'} flex flex-col`}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="px-8 py-6 rounded-2xl relative cursor-default transition-all overflow-hidden"
          style={{
            background: isSentByMe ? 'var(--msg-sent)' : 'var(--msg-recv)',
            border: isSentByMe
              ? '1px solid var(--msg-sent-border)'
              : '1px solid var(--border)',
            borderBottomRightRadius: isSentByMe ? '4px' : '16px',
            borderBottomLeftRadius: isSentByMe ? '16px' : '4px',
          }}
          whileHover={{
            boxShadow: isSentByMe
              ? '0 4px 16px rgba(139, 92, 246, 0.15)'
              : '0 4px 16px rgba(0, 0, 0, 0.1)',
          }}
        >
          {decryptionFailed ? (
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={13} style={{ color: 'var(--red)' }} />
              <span className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                [Unable to decrypt]
              </span>
            </div>
          ) : (
            <>
              {/* File attachment */}
              {file && (
                <div className="mb-2">
                  {!previewError && file_type?.startsWith('image/') ? (
                    <img
                      src={file}
                      alt={file_name}
                      className="max-w-xs max-h-64 rounded-lg"
                      onError={() => setPreviewError(true)}
                      style={{ background: 'rgba(0, 0, 0, 0.1)' }}
                    />
                  ) : !previewError && file_type?.startsWith('video/') ? (
                    <video
                      src={file}
                      controls
                      className="max-w-xs max-h-64 rounded-lg"
                      onError={() => setPreviewError(true)}
                      style={{ background: 'rgba(0, 0, 0, 0.1)' }}
                    />
                  ) : !previewError && file_type?.startsWith('audio/') ? (
                    <audio
                      src={file}
                      controls
                      className="w-full max-w-xs rounded-lg"
                      onError={() => setPreviewError(true)}
                      style={{ background: 'rgba(0, 0, 0, 0.1)' }}
                    />
                  ) : (
                    <div
                      className="flex items-center gap-2 p-2 rounded-lg max-w-xs"
                      style={{ background: 'rgba(0, 0, 0, 0.05)' }}
                    >
                      <span className="text-2xl">{getFileIcon(file_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-primary)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                        >
                          {file_name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatFileSize(file_size)}
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleDownload}
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'var(--accent-dim)',
                          color: 'var(--accent)',
                        }}
                        title="Download file"
                      >
                        <Download size={14} />
                      </motion.button>
                    </div>
                  )}
                </div>
              )}

              {/* Message text */}
              {/* Message text */}
{text && (
  <div className="w-full overflow-hidden">
    <p
      className="text-base leading-6 px-1 py-1"
      style={{
        color: 'var(--text-primary)',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'pre-wrap',
        maxWidth: '100%',
      }}
    >
      {text}
    </p>
  </div>
)}
                >
                  {text}
                </p>
              )}
            </>
          )}
        </motion.div>

        {/* Time + lock + receipt */}
        <div className={`flex items-center gap-2 mt-1.5 px-1 ${isSentByMe ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Timestamp - reveal on hover */}
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{
              opacity: showTimestamp ? 1 : 0.4,
              width: showTimestamp ? 'auto' : 0,
            }}
            transition={{ duration: 0.2 }}
            className="text-xs whitespace-nowrap overflow-hidden"
            style={{ color: 'var(--text-muted)' }}
          >
            {formatTime(created_at)}
          </motion.span>

          {/* Encryption badge */}
          <span className="lock-badge opacity-70 group-hover:opacity-100 transition-opacity">
            <Lock size={9} />
          </span>

          {/* Read receipt - only for sent messages */}
          {isSentByMe && (
            <ReadReceipt isRead={isRead} isDelivered={isDelivered} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
