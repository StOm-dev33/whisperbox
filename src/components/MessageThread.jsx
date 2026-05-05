import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lock, ShieldCheck, ChevronDown, Loader2, ArrowLeft, Paperclip, FileUp, Trash2 } from 'lucide-react';
import { getMessages, sendMessageRest, deleteMessage } from '../api/messages';
import { deleteFile } from '../api/files';
import { isReplayAttack } from '../crypto/encrypt';
import { useAuthStore } from '../store/authStore';
import { useFileTransfer } from '../hooks/useFileTransfer';
import { groupMessages } from '../utils/messageGrouping';
import MessageBubble from './MessageBubble';
import MessageGroup from './MessageGroup';
import TypingIndicator from './TypingIndicator';
import UploadProgress from './UploadProgress';

export default function MessageThread({ recipient, sendMessageWS, isWSConnected, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recipientPublicKey, setRecipientPublicKey] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState(new Map());
  const [selectedMessages, setSelectedMessages] = useState(new Set());

  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const oldestTimestampRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { getPrivateKey, getPublicKey, user } = useAuthStore();
  const { uploadFileEncrypted } = useFileTransfer();

  // ── Decrypt a raw message ────────────────────────────────

  const decryptOne = useCallback(async (msg) => {
    const isSentByMe = msg.from_user_id === user.id;
    const result = await decryptMessage(msg.payload, getPrivateKey(), isSentByMe);
    return {
      ...msg,
      text: result.success ? result.text : null,
      decryptionFailed: !result.success,
    };
  }, [user.id, getPrivateKey]);

  // ── Load message history ─────────────────────────────────

  const loadMessages = useCallback(async (before = null) => {
    try {
      const raw = await getMessages(recipient.id, { limit: 50, before });
      if (raw.length < 50) setHasMore(false);
      else setHasMore(true);

      if (raw.length > 0) {
        oldestTimestampRef.current = raw[raw.length - 1].created_at;
      }

      // Decrypt all (newest first from API → reverse for display)
      const decrypted = await Promise.all(raw.map(decryptOne));
      decrypted.reverse(); // oldest first for display

      if (before) {
        setMessages(prev => [...decrypted, ...prev]);
      } else {
        setMessages(decrypted);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
      }
    } catch (err) {
      console.error('Load messages error:', err);
    }
  }, [recipient.id, decryptOne]);

  // ── Initial load + recipient key ─────────────────────────

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setHasMore(false);
    oldestTimestampRef.current = null;

    Promise.all([
      loadMessages(),
      getUserPublicKey(recipient.id).then(k => setRecipientPublicKey(k)),
    ]).finally(() => setLoading(false));
  }, [recipient.id]);

  // ── Incoming WebSocket messages ──────────────────────────

  const handleIncomingMessage = useCallback(async (wsMsg) => {
    if (wsMsg.from_user_id !== recipient.id && wsMsg.to_user_id !== recipient.id) return;
    if (isReplayAttack(wsMsg.id)) return;

    const decrypted = await decryptOne(wsMsg);
    setMessages(prev => {
      if (prev.find(m => m.id === decrypted.id)) return prev;
      return [...prev, decrypted];
    });
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [recipient.id, decryptOne]);

  // Expose handler to parent via prop
  useEffect(() => {
    if (window.__wbHandlers) window.__wbHandlers[recipient.id] = handleIncomingMessage;
    return () => { if (window.__wbHandlers) delete window.__wbHandlers[recipient.id]; };
  }, [recipient.id, handleIncomingMessage]);

  // ── Send message ─────────────────────────────────────────

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !recipientPublicKey) return;

    setInput('');
    setSending(true);

    try {
      const myPublicKey = getPublicKey();
      const payload = await encryptMessage(text, recipientPublicKey, myPublicKey);

      // Optimistic UI
      const optimistic = {
        id: `opt_${Date.now()}`,
        from_user_id: user.id,
        to_user_id: recipient.id,
        payload,
        text,
        decryptionFailed: false,
        created_at: new Date().toISOString(),
        optimistic: true,
      };
      setMessages(prev => [...prev, optimistic]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);

      // Send via WS or REST fallback
      const sent = sendMessageWS(recipient.id, payload);
      if (!sent) {
        await sendMessageRest(recipient.id, payload);
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Handle file upload ───────────────────────────────────

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !recipientPublicKey) return;

    const transferId = `upload_${Date.now()}`;

    // Add to upload tracking
    setUploadedFiles(prev => new Map(prev).set(transferId, {
      transferId,
      fileName: file.name,
      progress: 0,
      status: 'encrypting',
    }));

    setUploading(true);

    try {
      const result = await uploadFileEncrypted(
        file,
        recipientPublicKey,
        recipient.id,
        (progress) => {
          setUploadedFiles(prev => {
            const next = new Map(prev);
            const item = next.get(transferId);
            if (item) {
              next.set(transferId, {
                ...item,
                progress,
                status: progress < 100 ? 'uploading' : 'uploading',
              });
            }
            return next;
          });
        }
      );

      if (result.success) {
        // Mark as completed
        setUploadedFiles(prev => {
          const next = new Map(prev);
          const item = next.get(transferId);
          if (item) {
            next.set(transferId, { ...item, progress: 100, status: 'completed' });
          }
          return next;
        });

        // Send file reference message
        const fileMsg = {
          text: input.trim() || `📎 ${file.name}`,
          file_id: result.fileId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        };

        // Encrypt and send
        const myPublicKey = getPublicKey();
        const payload = await encryptMessage(
          JSON.stringify(fileMsg),
          recipientPublicKey,
          myPublicKey
        );

        const optimistic = {
          id: `opt_${Date.now()}`,
          from_user_id: user.id,
          to_user_id: recipient.id,
          payload,
          text: fileMsg.text,
          file: URL.createObjectURL(file),
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          decryptionFailed: false,
          created_at: new Date().toISOString(),
          optimistic: true,
        };

        setMessages(prev => [...prev, optimistic]);
        setInput('');
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);

        const sent = sendMessageWS(recipient.id, payload);
        if (!sent) {
          await sendMessageRest(recipient.id, payload);
        }

        // Remove after 2 seconds
        setTimeout(() => {
          setUploadedFiles(prev => {
            const next = new Map(prev);
            next.delete(transferId);
            return next;
          });
        }, 2000);
      } else {
        // Mark as error
        setUploadedFiles(prev => {
          const next = new Map(prev);
          const item = next.get(transferId);
          if (item) {
            next.set(transferId, { ...item, status: 'error' });
          }
          return next;
        });
      }
    } catch (err) {
      console.error('File upload error:', err);
      setUploadedFiles(prev => {
        const next = new Map(prev);
        const item = next.get(transferId);
        if (item) {
          next.set(transferId, { ...item, status: 'error' });
        }
        return next;
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFilePickerClick = () => {
    fileInputRef.current?.click();
  };

  // ── Handle file download ─────────────────────────────────

  const handleDownloadFile = async (message) => {
    if (!message.file_id || !recipientPublicKey) {
      console.error('Missing file_id or recipient key');
      return;
    }

    try {
      // For now, just log - full implementation requires backend file download
      console.log('Download file:', message.file_id);
      // TODO: Implement file download with decryption
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  // ── Handle message selection ────────────────────────────

  const handleSelectMessage = (messageId, isSelected) => {
    setSelectedMessages(prev => {
      const next = new Set(prev);
      if (isSelected) {
        next.add(messageId);
      } else {
        next.delete(messageId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedMessages.size === messages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(messages.map(m => m.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMessages.size === 0) return;

    const confirmed = window.confirm(`Delete ${selectedMessages.size} message${selectedMessages.size !== 1 ? 's' : ''}?`);
    if (!confirmed) return;

    try {
      const deletePromises = Array.from(selectedMessages).map(async (messageId) => {
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        // Delete associated file if exists
        if (message.file_id) {
          try {
            await deleteFile(message.file_id);
          } catch (fileErr) {
            console.error('Failed to delete file:', fileErr);
            // Continue with message deletion even if file deletion fails
          }
        }

        // Delete the message
        await deleteMessage(messageId);
      });

      await Promise.all(deletePromises);

      // Remove from local state
      setMessages(prev => prev.filter(m => !selectedMessages.has(m.id)));
      setSelectedMessages(new Set());
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete some messages. Please try again.');
    }
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !oldestTimestampRef.current) return;
    setLoadingMore(true);
    await loadMessages(oldestTimestampRef.current);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Decrypting messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 flex-shrink-0"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>

        {/* Mobile back button */}
        <button onClick={onBack} className="md:hidden mr-1" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={20} />
        </button>

        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
          {recipient.display_name[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{recipient.display_name}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{recipient.username}</p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: 'var(--green-dim)', border: '1px solid rgba(0,229,160,0.2)' }}>
          <ShieldCheck size={12} style={{ color: 'var(--green)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--green)' }}>E2EE</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-6"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center mb-4">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              {loadingMore ? <Loader2 size={12} className="animate-spin" /> : null}
              {loadingMore ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full gap-3 py-16"
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,212,255,0.2)' }}>
              <Lock size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No messages yet</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Messages are end-to-end encrypted</p>
          </motion.div>
        ) : (
          <>
            {/* Selection toolbar */}
            {selectedMessages.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-4 p-3 rounded-lg"
                style={{
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent)',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedMessages.size === messages.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded cursor-pointer"
                  style={{ accentColor: 'var(--accent)' }}
                  title="Select all"
                />
                <span className="text-xs font-medium flex-1" style={{ color: 'var(--accent)' }}>
                  {selectedMessages.size} message{selectedMessages.size !== 1 ? 's' : ''} selected
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                  style={{
                    background: 'var(--red)',
                    color: '#fff',
                  }}
                  onMouseEnter={e => e.target.style.opacity = '0.8'}
                  onMouseLeave={e => e.target.style.opacity = '1'}
                >
                  <Trash2 size={12} /> Delete
                </motion.button>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {groupMessages(messages).map((group) => (
                <MessageGroup
                  key={`group-${group.messages[0].id}`}
                  messages={group.messages}
                  isSentByMe={group.messages[0].from_user_id === user.id}
                >
                  {group.messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isSentByMe={msg.from_user_id === user.id}
                      onDownloadFile={handleDownloadFile}
                      isSelected={selectedMessages.has(msg.id)}
                      onSelect={handleSelectMessage}
                    />
                  ))}
                </MessageGroup>
              ))}

              {/* Typing indicator */}
              {isRecipientTyping && (
                <div key="typing" className="flex items-start mb-3">
                  <TypingIndicator />
                </div>
              )}

              {/* Upload progress indicators */}
              {uploadedFiles.size > 0 && (
                <div key="uploads">
                  {Array.from(uploadedFiles.values()).map((file) => (
                    <UploadProgress
                      key={file.transferId}
                      fileName={file.fileName}
                      progress={file.progress}
                      status={file.status}
                      onCancel={() => {
                        setUploadedFiles(prev => {
                          const next = new Map(prev);
                          next.delete(file.transferId);
                          return next;
                        });
                      }}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute right-6 bottom-20 w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <ChevronDown size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-4 md:px-6 py-4 flex-shrink-0 flex items-end gap-3"
        style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,*/*"
        />

        {/* File picker button */}
        <motion.button
          onClick={handleFilePickerClick}
          disabled={uploading || !recipientPublicKey}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            opacity: (!recipientPublicKey || uploading) ? 0.4 : 1,
          }}
          title="Attach file"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Paperclip size={16} />
          )}
        </motion.button>

        <motion.div
          className="flex-1 relative"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <motion.textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message (end-to-end encrypted)"
            rows={1}
            className="w-full px-4 py-3 rounded-2xl text-sm resize-none transition-all"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              maxHeight: '120px',
              lineHeight: '1.5',
            }}
            whileFocus={{
              boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.2)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <motion.div
            className="absolute right-3 bottom-3"
            animate={{
              opacity: input.length > 0 ? 0.3 : 0.5,
            }}
          >
            <Lock size={12}
              style={{ color: 'var(--text-muted)' }} />
          </motion.div>
        </motion.div>

        <motion.button
          onClick={handleSend}
          disabled={sending || !input.trim() || !recipientPublicKey || uploading}
          whileHover={!sending && input.trim() && recipientPublicKey && !uploading ? { scale: 1.08 } : {}}
          whileTap={!sending && input.trim() && recipientPublicKey && !uploading ? { scale: 0.92 } : {}}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity shadow-md hover:shadow-lg"
          style={{
            background: 'linear-gradient(135deg, var(--accent), #ec4899)',
            opacity: (!input.trim() || !recipientPublicKey || sending || uploading) ? 0.4 : 1,
          }}
          title={!input.trim() ? 'Type a message' : 'Send message (Enter)'}
        >
          <motion.div
            animate={{ rotate: sending ? 360 : 0 }}
            transition={{ duration: sending ? 1 : 0.3, repeat: sending ? Infinity : 0 }}
          >
            {sending
              ? <Loader2 size={16} style={{ color: '#fff' }} />
              : <Send size={16} style={{ color: '#fff' }} />
            }
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
}
