import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { register } from '../api/auth';
import { setupKeysForRegister } from '../crypto/keyManager';
import { useAuthStore } from '../store/authStore';

function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

// ─── NEW SLIDE 1: Hex Cipher Rain ─────────────────────────────────────────────
// Falling columns of hex characters that encrypt into a lock icon
function SlideOne() {
  const hexChars = ['A','F','3','7','E','2','9','C','0','B','D','5','8','1','6','4'];
  const cols = [60, 105, 150, 195, 240, 285, 330];
  return (
    <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
      {/* Background subtle grid */}
      <defs>
        <linearGradient id="fadeBottom1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="40%" stopColor="rgba(220,38,38,0)" />
          <stop offset="100%" stopColor="rgba(15,5,5,0.7)" />
        </linearGradient>
      </defs>

      {/* Hex columns */}
      {cols.map((cx, ci) => (
        <g key={ci}>
          {[0,1,2,3,4,5].map((row) => {
            const char = hexChars[(ci * 3 + row * 2) % hexChars.length];
            const baseY = row * 44 + 20;
            const delay = ci * 0.18 + row * 0.12;
            const isHighlight = (ci + row) % 5 === 0;
            return (
              <motion.text
                key={row}
                x={cx} y={baseY}
                textAnchor="middle"
                fontSize="13"
                fontFamily="monospace"
                fontWeight={isHighlight ? '700' : '400'}
                fill={isHighlight ? 'rgba(220,38,38,0.95)' : 'rgba(220,38,38,0.25)'}
                initial={{ opacity: 0, y: baseY - 20 }}
                animate={{
                  opacity: [0, isHighlight ? 1 : 0.4, isHighlight ? 0.6 : 0.15, isHighlight ? 1 : 0.4],
                  y: [baseY - 10, baseY, baseY],
                }}
                transition={{ duration: 3 + ci * 0.4, delay, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
              >
                {char}
              </motion.text>
            );
          })}
        </g>
      ))}

      {/* Fade overlay at bottom */}
      <rect x="40" y="180" width="320" height="100" fill="url(#fadeBottom1)" />

      {/* Central glowing padlock */}
      <motion.g
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.6, ease: [0.16,1,0.3,1] }}
        style={{ transformOrigin: '200px 240px' }}
      >
        {/* Glow rings */}
        <motion.circle cx="200" cy="245" r="52"
          fill="none" stroke="rgba(220,38,38,0.12)" strokeWidth="20"
          animate={{ r: [50, 58, 50], opacity: [0.5, 0.15, 0.5] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.circle cx="200" cy="245" r="40"
          fill="none" stroke="rgba(220,38,38,0.2)" strokeWidth="8"
          animate={{ r: [38, 44, 38] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
        />
        {/* Lock body */}
        <rect x="173" y="230" width="54" height="42" rx="8"
          fill="rgba(15,5,5,0.85)" stroke="rgba(220,38,38,0.9)" strokeWidth="2"
        />
        {/* Lock shackle */}
        <motion.path
          d="M186 230 C186 213 214 213 214 230"
          stroke="rgba(220,38,38,0.9)" strokeWidth="2.5" fill="none" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay: 1.1, ease: 'easeOut' }}
        />
        {/* Keyhole */}
        <circle cx="200" cy="247" r="6" fill="rgba(220,38,38,0.8)" />
        <rect x="197" y="247" width="6" height="10" rx="2" fill="rgba(220,38,38,0.8)" />
      </motion.g>

      {/* Scanning line */}
      <motion.line
        x1="40" y1="180" x2="360" y2="180"
        stroke="rgba(220,38,38,0.5)" strokeWidth="1.5"
        strokeDasharray="6 4"
        animate={{ y1: [160, 290, 160], y2: [160, 290, 160], opacity: [0, 0.7, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

// ─── NEW SLIDE 2: Dual-Key Handshake ─────────────────────────────────────────
// Two geometric "keys" travel across the screen and interlock
function SlideTwo() {
  return (
    <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
      <defs>
        <linearGradient id="keyGrad1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(220,38,38,0.9)" />
          <stop offset="100%" stopColor="rgba(180,20,20,0.6)" />
        </linearGradient>
        <linearGradient id="keyGrad2" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
        </linearGradient>
      </defs>

      {/* Dotted center line */}
      <motion.line x1="200" y1="60" x2="200" y2="270"
        stroke="rgba(220,38,38,0.2)" strokeWidth="1" strokeDasharray="5 5"
        animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 3, repeat: Infinity }}
      />

      {/* Left key (public) - slides in from left */}
      <motion.g
        initial={{ x: -120 }} animate={{ x: 0 }}
        transition={{ duration: 1.1, delay: 0.3, ease: [0.16,1,0.3,1] }}
      >
        {/* Key ring */}
        <circle cx="105" cy="160" r="28" fill="none" stroke="url(#keyGrad1)" strokeWidth="2.5" />
        <circle cx="105" cy="160" r="16" fill="rgba(220,38,38,0.15)" stroke="rgba(220,38,38,0.6)" strokeWidth="1.5" />
        <circle cx="105" cy="160" r="6" fill="rgba(220,38,38,0.8)" />
        {/* Key shaft */}
        <rect x="133" y="155" width="58" height="10" rx="5" fill="url(#keyGrad1)" />
        {/* Key teeth */}
        <rect x="148" y="165" width="8" height="12" rx="3" fill="rgba(220,38,38,0.8)" />
        <rect x="163" y="165" width="6" height="9" rx="2.5" fill="rgba(220,38,38,0.7)" />
        <rect x="175" y="165" width="10" height="15" rx="3" fill="rgba(220,38,38,0.8)" />
        {/* Label */}
        <motion.text x="105" y="208" textAnchor="middle" fontSize="10" fill="rgba(220,38,38,0.7)"
          fontFamily="monospace" fontWeight="600"
          animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity }}>
          PUBLIC KEY
        </motion.text>
      </motion.g>

      {/* Right key (private) - slides in from right */}
      <motion.g
        initial={{ x: 120 }} animate={{ x: 0 }}
        transition={{ duration: 1.1, delay: 0.3, ease: [0.16,1,0.3,1] }}
      >
        {/* Key ring */}
        <circle cx="295" cy="160" r="28" fill="none" stroke="url(#keyGrad2)" strokeWidth="2.5" />
        <circle cx="295" cy="160" r="16" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        <circle cx="295" cy="160" r="6" fill="rgba(255,255,255,0.5)" />
        {/* Key shaft (pointing left) */}
        <rect x="209" y="155" width="58" height="10" rx="5" fill="url(#keyGrad2)" />
        {/* Key teeth (pointing up) */}
        <rect x="243" y="143" width="8" height="12" rx="3" fill="rgba(255,255,255,0.4)" />
        <rect x="226" y="143" width="6" height="9" rx="2.5" fill="rgba(255,255,255,0.3)" />
        <rect x="212" y="140" width="10" height="15" rx="3" fill="rgba(255,255,255,0.35)" />
        {/* Label */}
        <motion.text x="295" y="208" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.5)"
          fontFamily="monospace" fontWeight="600"
          animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}>
          PRIVATE KEY
        </motion.text>
      </motion.g>

      {/* Sparks at meeting point */}
      {[0,1,2,3,4,5].map(i => {
        const angle = (i / 6) * Math.PI * 2;
        const r = 18;
        return (
          <motion.circle key={i}
            cx={200 + Math.cos(angle) * r}
            cy={160 + Math.sin(angle) * r * 0.5}
            r="3"
            fill={i % 2 === 0 ? 'rgba(220,38,38,0.9)' : 'rgba(255,255,255,0.6)'}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, delay: 1.3 + i * 0.1, repeat: Infinity, repeatDelay: 2.5 }}
          />
        );
      })}

      {/* Encrypted badge */}
      <motion.g
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.6 }}
      >
        <rect x="138" y="240" width="124" height="28" rx="14"
          fill="rgba(220,38,38,0.1)" stroke="rgba(220,38,38,0.4)" strokeWidth="1"
        />
        <text x="200" y="258" textAnchor="middle" fontSize="11" fill="rgba(220,38,38,0.85)"
          fontFamily="monospace" fontWeight="700">
          ✓ ENCRYPTED
        </text>
      </motion.g>
    </svg>
  );
}

// ─── NEW SLIDE 3: Morphing Vault ──────────────────────────────────────────────
// An octagonal vault that morphs and emits particle data streams
function SlideThree() {
  const particles = [
    { startX: 100, startY: 140, cx: 185, cy: 160, delay: 0 },
    { startX: 80,  startY: 180, cx: 185, cy: 175, delay: 0.3 },
    { startX: 320, startY: 130, cx: 215, cy: 160, delay: 0.6 },
    { startX: 330, startY: 190, cx: 215, cy: 175, delay: 0.9 },
    { startX: 200, startY: 60,  cx: 200, cy: 125, delay: 0.2 },
    { startX: 200, startY: 280, cx: 200, cy: 230, delay: 0.5 },
  ];

  // Octagon points for the vault
  const oct = (cx, cy, r) => {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI / 4) - Math.PI / 8;
      pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
    }
    return pts.join(' ');
  };

  return (
    <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
      {/* Outer pulse rings */}
      {[70, 90, 110].map((r, i) => (
        <motion.polygon key={i}
          points={oct(200, 165, r)}
          fill="none"
          stroke="rgba(220,38,38,0.15)"
          strokeWidth="1"
          animate={{ opacity: [0.1, 0.5, 0.1], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 3 + i * 0.7, repeat: Infinity, delay: i * 0.4 }}
          style={{ transformOrigin: '200px 165px' }}
        />
      ))}

      {/* Rotating outer ring of ticks */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '200px 165px' }}
      >
        {[...Array(24)].map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r1 = 95, r2 = i % 6 === 0 ? 108 : 102;
          return (
            <line key={i}
              x1={200 + r1 * Math.cos(a)} y1={165 + r1 * Math.sin(a)}
              x2={200 + r2 * Math.cos(a)} y2={165 + r2 * Math.sin(a)}
              stroke={i % 6 === 0 ? 'rgba(220,38,38,0.7)' : 'rgba(220,38,38,0.2)'}
              strokeWidth={i % 6 === 0 ? 2 : 1}
            />
          );
        })}
      </motion.g>

      {/* Main vault body */}
      <motion.polygon
        points={oct(200, 165, 68)}
        fill="rgba(15,5,5,0.85)"
        stroke="rgba(220,38,38,0.8)"
        strokeWidth="2.5"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.16,1,0.3,1] }}
        style={{ transformOrigin: '200px 165px' }}
      />

      {/* Inner vault detail */}
      <motion.polygon
        points={oct(200, 165, 52)}
        fill="none" stroke="rgba(220,38,38,0.3)" strokeWidth="1"
        animate={{ rotate: [-10, 10, -10] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '200px 165px' }}
      />

      {/* Vault center — key symbol */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <circle cx="200" cy="158" r="14" fill="none" stroke="rgba(220,38,38,0.8)" strokeWidth="2" />
        <circle cx="200" cy="158" r="5" fill="rgba(220,38,38,0.6)" />
        <rect x="197" y="158" width="6" height="16" rx="2" fill="rgba(220,38,38,0.8)" />
        <rect x="199" y="168" width="7" height="4" rx="1.5" fill="rgba(220,38,38,0.6)" />
        <rect x="199" y="174" width="5" height="4" rx="1.5" fill="rgba(220,38,38,0.5)" />
      </motion.g>

      {/* Particle streams flowing INTO vault */}
      {particles.map((p, i) => (
        <motion.circle key={i}
          cx={p.startX} cy={p.startY} r="3.5"
          fill={i % 2 === 0 ? 'rgba(220,38,38,0.8)' : 'rgba(255,255,255,0.5)'}
          animate={{
            cx: [p.startX, p.cx],
            cy: [p.startY, p.cy],
            opacity: [0, 1, 0.8, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{ duration: 1.6, delay: p.delay, repeat: Infinity, repeatDelay: 1.2, ease: 'easeIn' }}
        />
      ))}

      {/* Vault "locked" status bar */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
        <rect x="148" y="254" width="104" height="22" rx="11"
          fill="rgba(220,38,38,0.1)" stroke="rgba(220,38,38,0.35)" strokeWidth="1"
        />
        <motion.rect x="152" y="258" width="0" height="14" rx="6"
          fill="rgba(220,38,38,0.7)"
          animate={{ width: [0, 96, 96] }}
          transition={{ duration: 1.2, delay: 1.6, ease: 'easeOut' }}
        />
        <text x="200" y="268" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.8)"
          fontFamily="monospace" fontWeight="700">
          SECURED
        </text>
      </motion.g>
    </svg>
  );
}

const slides = [
  {
    illustration: <SlideOne />,
    title: 'Private by Design',
    subtitle: 'Every message encrypted before it leaves your device',
  },
  {
    illustration: <SlideTwo />,
    title: 'Only You Can Read It',
    subtitle: 'End-to-end encryption means zero server access to your chats',
  },
  {
    illustration: <SlideThree />,
    title: 'Your Keys, Your Control',
    subtitle: 'Private keys never leave your device — ever',
  },
];

// ─── Main Register Component ──────────────────────────────────────────────────

export default function Register({ onSwitchToLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slide, setSlide] = useState(0);
  const setSession = useAuthStore(s => s.setSession);
  const intervalRef = useRef(null);
  const windowSize = useWindowSize();
  const isMobile = windowSize.width < 768;

  useEffect(() => {
    intervalRef.current = setInterval(() => setSlide(s => (s + 1) % slides.length), 4000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username.trim() || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const keySetup = await setupKeysForRegister(form.password);
      const data = await register({
        username: form.username.trim(),
        password: form.password,
        wrapped_private_key: keySetup.wrapped_private_key,
        pbkdf2_salt: keySetup.pbkdf2_salt,
        public_key: keySetup.public_key,
      });
      const { user } = data;
      setSession(user, keySetup.privateKey, keySetup.publicKey);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#ffffff',
    padding: '14px 16px',
    width: '100%',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    backdropFilter: 'blur(8px)',
  };

  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(135deg, #3f0b0b 0%, #5b1111 50%, #2f0808 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
    }}>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)',
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: '960px',
          height: '100vh',
          maxHeight: '100vh',
          display: 'flex',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {/* ── LEFT PANEL ── */}
        {!isMobile && (
          <div style={{
            flex: '0 0 48%',
            background: 'linear-gradient(160deg, #721818 0%, #5b1111 40%, #3a0b0b 100%)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'linear-gradient(rgba(220,38,38,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.07) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}
            >
              <span style={{ color: '#ffffff', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>
                WhisperBox
              </span>
            </motion.div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
              <AnimatePresence mode="wait">
                <motion.div key={slide}
                  initial={{ opacity: 0, scale: 0.94, y: 18 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.02, y: -14 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  style={{ width: '100%' }}
                >
                  {slides[slide].illustration}
                  <motion.div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <h2 style={{
                      color: '#ffffff', fontFamily: "'Syne', sans-serif",
                      fontWeight: 700, fontSize: '22px', margin: '0 0 8px',
                    }}>
                      {slides[slide].title}
                    </h2>
                    <p style={{ color: 'rgba(255,228,228,0.9)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                      {slides[slide].subtitle}
                    </p>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
              {slides.map((_, i) => (
                <motion.button key={i}
                  onClick={() => { setSlide(i); clearInterval(intervalRef.current); intervalRef.current = setInterval(() => setSlide(s => (s + 1) % slides.length), 4000); }}
                  animate={{ width: i === slide ? '24px' : '8px', background: i === slide ? '#dc2626' : 'rgba(255,255,255,0.25)' }}
                  transition={{ duration: 0.3 }}
                  style={{ height: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer', padding: 0 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── RIGHT PANEL ── */}
        <div style={{
          flex: 1,
          background: 'rgba(70,16,16,0.92)',
          backdropFilter: 'blur(20px)',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflowY: 'auto',
          maxHeight: '100vh',
        }}>
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: '300px', height: '300px',
            background: 'radial-gradient(circle, rgba(220,38,38,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div className="flex md:hidden items-center gap-2 mb-8">
            <span style={{ color: '#fff', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px' }}>WhisperBox</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.5, ease: 'easeOut' }}
            style={{ position: 'relative', zIndex: 1, maxWidth: '380px', width: '100%', margin: '0 auto' }}
          >
            <h2 style={{
              color: '#ffffff', fontFamily: "'Syne', sans-serif",
              fontWeight: 700, fontSize: '28px', margin: '0 0 6px', letterSpacing: '-0.5px',
            }}>
              Create account
            </h2>
            <p style={{ color: 'rgba(255,210,210,0.85)', fontSize: '14px', margin: '0 0 32px' }}>
              Already have an account?{' '}
              <button onClick={onSwitchToLogin} style={{
                color: '#3b82f6', background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 600, fontSize: '14px', padding: 0,
                fontFamily: 'inherit',
              }}>
                Sign in
              </button>
            </p>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: '20px' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '10px', padding: '12px 16px', color: '#ef4444',
                    fontSize: '13px', borderLeft: '3px solid #ef4444',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{ marginBottom: '16px' }}
              >
                <label style={{ color: 'rgba(255,210,210,0.85)', fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                  Username
                </label>
                <input
                  type="text" value={form.username} placeholder="alice_92"
                  autoComplete="username" disabled={loading}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => { e.target.style.border = '1px solid rgba(220,38,38,0.8)'; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.15)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
                  onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                style={{ marginBottom: '28px' }}
              >
                <label style={{ color: 'rgba(255,210,210,0.85)', fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'} value={form.password}
                    placeholder="••••••••" autoComplete="new-password" disabled={loading}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ ...inputStyle, paddingRight: '48px' }}
                    onFocus={e => { e.target.style.border = '1px solid rgba(220,38,38,0.8)'; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.15)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
                    onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'rgba(255,210,210,0.65)',
                    cursor: 'pointer', padding: 0, display: 'flex',
                  }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>

              <motion.button
                type="submit" disabled={loading}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: loading ? 1 : 1.02, boxShadow: loading ? 'none' : '0 8px 24px rgba(220,38,38,0.4)' }}
                whileTap={{ scale: loading ? 1 : 0.97 }}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: loading ? 'rgba(220,38,38,0.5)' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: '#ffffff', fontWeight: 600, fontSize: '15px',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontFamily: 'inherit', transition: 'background 0.2s',
                  boxShadow: '0 4px 16px rgba(220,38,38,0.25)',
                }}
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating account...</>
                ) : 'Sign up'}
              </motion.button>
            </form>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', marginTop: '28px', paddingTop: '24px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '20px', padding: '6px 14px',
              }}>
                <ShieldCheck size={13} style={{ color: '#ffffff' }} />
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: 500 }}>
                  End-to-end encrypted
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
