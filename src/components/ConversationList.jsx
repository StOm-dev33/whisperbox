import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Lock, Loader2 } from 'lucide-react';
import { getConversations } from '../api/messages';
import { searchUsers } from '../api/users';
import { useAuthStore } from '../store/authStore';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationList({ selectedUserId, onSelectUser, onlineUsers, refreshTrigger }) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    loadConversations();
  }, [refreshTrigger]);

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsers(searchQuery.trim());
        setSearchResults(results || []);
      } catch {}
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleSelectConversation = (userId, displayName, username) => {
    onSelectUser({ id: userId, display_name: displayName, username });
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const isOnline = (userId) => onlineUsers?.has(userId);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="WhisperBox" width="32" height="32" />
            <h2 className="font-bold text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              WhisperBox
            </h2>
            <span style={{ fontSize: '12px', marginLeft: '8px', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-dim)', color: 'var(--accent)' }}>🔒 E2EE</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => setShowSearch(s => !s)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: showSearch ? 'var(--accent-dim)' : 'transparent', color: showSearch ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {showSearch ? <X size={16} /> : <Plus size={16} />}
          </motion.button>
        </div>

        {/* User info */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'var(--bg-card)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, var(--accent), #ec4899)', color: '#fff' }}>
            {user?.display_name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.display_name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>@{user?.username}</p>
          </div>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--green)' }} />
        </div>
      </div>

      {/* Search panel */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="p-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              {searching && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mt-2 space-y-1">
                  {searchResults.map(u => (
                    <motion.button
                      key={u.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleSelectConversation(u.id, u.display_name, u.username)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                      style={{ background: 'var(--bg-hover)' }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        {u.display_name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.display_name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>@{u.username}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {searchQuery && !searching && searchResults.length === 0 && (
                <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>No users found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No conversations yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Tap + to find someone</p>
          </div>
        ) : (
          conversations.map((conv, i) => (
            <motion.button
              key={conv.user_id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleSelectConversation(conv.user_id, conv.display_name, conv.username)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors relative rounded-lg"
              style={{
                background: selectedUserId === conv.user_id ? 'var(--bg-hover)' : 'transparent',
                borderLeft: selectedUserId === conv.user_id ? '3px solid var(--accent)' : '3px solid transparent',
                paddingLeft: selectedUserId === conv.user_id ? 'calc(0.75rem - 3px)' : '0.75rem',
              }}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
                  {conv.display_name[0].toUpperCase()}
                </div>
                {isOnline(conv.user_id) && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                    style={{ background: 'var(--green)', borderColor: 'var(--bg-secondary)' }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {conv.display_name}
                  </p>
                  <span className="text-xs flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                    {formatTime(conv.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Lock size={9} style={{ color: 'var(--accent)', opacity: 0.6 }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Encrypted</span>
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
