import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { login } from '../api/auth';
import { restoreKeysFromLogin } from '../crypto/keyManager';
import { useAuthStore } from '../store/authStore';

// ─── Hook to detect window size ───────────────────────────────────────────────
function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const handleResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

// ─── SLIDE 1: Neural Mesh Topology ───────────────────────────────────────────
// Nodes connected by edges; data pulses travel toward a central locked node
function SlideOne() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const nodes = [
      { x: 200, y: 160, r: 11, main: true },
      { x: 80,  y: 70,  r: 5 },
      { x: 320, y: 75,  r: 5 },
      { x: 55,  y: 215, r: 5 },
      { x: 345, y: 220, r: 5 },
      { x: 135, y: 265, r: 5 },
      { x: 270, y: 270, r: 5 },
      { x: 120, y: 105, r: 4 },
      { x: 290, y: 120, r: 4 },
    ];

    const edges = [
      [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
      [1,7],[2,8],[7,3],[8,4],[5,3],[6,4],[1,2],
    ];

    const pulses = [];

    function spawnPulse() {
      const e = edges[Math.floor(Math.random() * edges.length)];
      const rev = Math.random() > 0.5;
      pulses.push({
        a: rev ? e[1] : e[0],
        b: rev ? e[0] : e[1],
        t: 0,
        speed: 0.007 + Math.random() * 0.01,
      });
    }

    for (let i = 0; i < 6; i++) setTimeout(spawnPulse, i * 280);

    let globalT = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      globalT += 0.02;

      // Edges
      edges.forEach(([ai, bi]) => {
        const a = nodes[ai], b = nodes[bi];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = 'rgba(220,38,38,0.14)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // Pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.speed;
        if (p.t >= 1) { pulses.splice(i, 1); spawnPulse(); continue; }
        const na = nodes[p.a], nb = nodes[p.b];
        const px = na.x + (nb.x - na.x) * p.t;
        const py = na.y + (nb.y - na.y) * p.t;

        const g = ctx.createRadialGradient(px, py, 0, px, py, 10);
        g.addColorStop(0, 'rgba(255,100,100,0.85)');
        g.addColorStop(1, 'rgba(220,38,38,0)');
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,160,160,0.95)';
        ctx.fill();
      }

      // Nodes
      nodes.forEach(n => {
        const pulse = n.main ? 0.5 + 0.5 * Math.sin(globalT * 2) : 0;

        if (n.main) {
          const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 28 + pulse * 10);
          rg.addColorStop(0, `rgba(220,38,38,${0.25 + pulse * 0.15})`);
          rg.addColorStop(1, 'rgba(220,38,38,0)');
          ctx.beginPath();
          ctx.arc(n.x, n.y, 28 + pulse * 10, 0, Math.PI * 2);
          ctx.fillStyle = rg;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + (n.main ? pulse * 2 : 0), 0, Math.PI * 2);
        ctx.fillStyle = n.main ? '#dc2626' : 'rgba(220,38,38,0.6)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = n.main ? 'rgba(255,200,200,0.9)' : 'rgba(255,150,150,0.4)';
        ctx.fill();
      });

      // Lock icon at center node
      const cx = nodes[0].x, cy = nodes[0].y;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - 7, cy - 2, 14, 11, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 5, Math.PI, 0);
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={320}
      style={{ width: '100%', maxWidth: '360px', display: 'block', margin: '0 auto' }}
    />
  );
}

// ─── SLIDE 2: Signal Waveform Encoder ────────────────────────────────────────
// Clean sine waves enter, get shredded into cipher noise, re-emerge decoded
function SlideTwo() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    let t = 0;

    function drawWave(x0, x1, yBase, freq, amp, color, scramble, offset) {
      ctx.beginPath();
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const x = x0 + (x1 - x0) * (i / steps);
        const prog = i / steps;
        const y = scramble
          ? yBase + amp * Math.sin(prog * freq * Math.PI * 2 + t * 3 + offset)
            + amp * 0.55 * Math.sin(prog * freq * 5 * Math.PI + t * 7 + offset * 2)
          : yBase + amp * Math.sin(prog * freq * Math.PI * 2 + offset);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      t += 0.022;

      // Region backgrounds
      ctx.fillStyle = 'rgba(220,38,38,0.05)';
      ctx.fillRect(0, 0, 118, H);
      ctx.fillStyle = 'rgba(220,38,38,0.03)';
      ctx.fillRect(118, 0, 164, H);
      ctx.fillStyle = 'rgba(30,180,100,0.04)';
      ctx.fillRect(282, 0, 118, H);

      // Dividers
      ctx.strokeStyle = 'rgba(220,38,38,0.18)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(118, 10); ctx.lineTo(118, H - 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(282, 10); ctx.lineTo(282, H - 20); ctx.stroke();
      ctx.setLineDash([]);

      const waveColors = [
        'rgba(220,80,80,0.85)',
        'rgba(220,120,60,0.75)',
        'rgba(200,60,100,0.75)',
      ];
      const yBases = [70, 145, 220];

      // Plain waves (left)
      waveColors.forEach((c, i) =>
        drawWave(8, 112, yBases[i], 2.5, 20, c, false, i * 1.3));

      // Encrypted noise (center)
      waveColors.forEach((c, i) =>
        drawWave(124, 276, yBases[i], 5, 22, 'rgba(220,100,100,0.45)', true, i * 0.9));

      // Decoded (right)
      waveColors.forEach((c, i) =>
        drawWave(288, 392, yBases[i], 2.5, 20, c, false, i * 1.3));

      // Traveling lock along cipher region
      const lockX = 124 + ((t * 28) % 152);
      const lockY = 160;
      ctx.fillStyle = 'rgba(255,90,90,0.9)';
      ctx.beginPath();
      ctx.roundRect(lockX - 8, lockY - 6, 16, 13, 2.5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,90,90,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lockX, lockY - 6, 5.5, Math.PI, 0);
      ctx.stroke();

      // Labels
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(220,100,100,0.6)';
      ctx.fillText('PLAIN', 59, H - 8);
      ctx.fillStyle = 'rgba(220,80,80,0.5)';
      ctx.fillText('CIPHER', 200, H - 8);
      ctx.fillStyle = 'rgba(80,210,140,0.6)';
      ctx.fillText('DECRYPTED', 337, H - 8);

      rafRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={320}
      style={{ width: '100%', maxWidth: '360px', display: 'block', margin: '0 auto' }}
    />
  );
}

// ─── SLIDE 3: Constellation Lock ─────────────────────────────────────────────
// 8 nodes scatter and fly back into an octagon, connecting edges, forming a lock
function SlideThree() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const CX = W / 2, CY = H / 2 - 8;
    const R = 88;
    const N = 8;

    const targets = Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
    });

    const rng = (seed) => {
      let s = seed;
      return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
    };
    const rand = rng(42);

    const starts = targets.map(() => {
      const angle = rand() * Math.PI * 2;
      const dist = 130 + rand() * 60;
      return { x: CX + Math.cos(angle) * dist, y: CY + Math.sin(angle) * dist };
    });

    let elapsed = 0;
    const CYCLE = 260;

    function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

    // Static stars
    const stars = Array.from({ length: 45 }, (_, i) => ({
      x: (i * 79 + 23) % W,
      y: (i * 43 + 67) % H,
      r: 0.6 + (i % 3) * 0.4,
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);
      elapsed = (elapsed + 1) % CYCLE;
      const cycleT = elapsed / CYCLE;

      let assembleT, lockT;
      if (cycleT < 0.42) {
        assembleT = easeInOut(cycleT / 0.42);
        lockT = 0;
      } else if (cycleT < 0.72) {
        assembleT = 1;
        lockT = (cycleT - 0.42) / 0.3;
      } else {
        assembleT = easeInOut(1 - (cycleT - 0.72) / 0.28);
        lockT = 0;
      }

      const positions = targets.map((tgt, i) => ({
        x: starts[i].x + (tgt.x - starts[i].x) * assembleT,
        y: starts[i].y + (tgt.y - starts[i].y) * assembleT,
      }));

      // Stars
      stars.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(220,38,38,0.15)';
        ctx.fill();
      });

      // Cross edges
      for (let i = 0; i < N; i++) {
        const a = positions[i], c = positions[(i + 3) % N];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.strokeStyle = `rgba(220,38,38,${assembleT * 0.18})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Outer ring edges
      for (let i = 0; i < N; i++) {
        const a = positions[i], b = positions[(i + 1) % N];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(220,38,38,${assembleT * 0.55})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }

      // Nodes
      positions.forEach((p, i) => {
        const gR = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
        gR.addColorStop(0, `rgba(220,38,38,${0.3 * assembleT})`);
        gR.addColorStop(1, 'rgba(220,38,38,0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = gR;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,${70 + i * 12},${38 + i * 8},${0.5 + assembleT * 0.5})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,180,180,0.9)';
        ctx.fill();
      });

      // Center glow
      if (assembleT > 0) {
        const cg = ctx.createRadialGradient(CX, CY, 0, CX, CY, 40 * assembleT);
        cg.addColorStop(0, `rgba(220,38,38,${0.2 * assembleT})`);
        cg.addColorStop(1, 'rgba(220,38,38,0)');
        ctx.beginPath();
        ctx.arc(CX, CY, 40 * assembleT, 0, Math.PI * 2);
        ctx.fillStyle = cg;
        ctx.fill();
      }

      // Lock (appears when assembled)
      if (assembleT > 0.5) {
        const a2 = Math.min(1, (assembleT - 0.5) * 2);
        const lW = 26 * a2, lH = 22 * a2;
        ctx.strokeStyle = `rgba(255,255,255,${a2 * 0.9})`;
        ctx.lineWidth = 2 * a2;
        ctx.beginPath();
        ctx.roundRect(CX - lW / 2, CY - lH / 2 + 4, lW, lH, 4 * a2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(CX, CY - lH / 2 + 4, lW * 0.38, Math.PI, 0);
        ctx.stroke();

        // Keyhole
        ctx.fillStyle = `rgba(255,255,255,${a2 * 0.7})`;
        ctx.beginPath();
        ctx.arc(CX, CY + 2, 3 * a2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillRect(CX - 1.5 * a2, CY + 2, 3 * a2, 6 * a2);
        ctx.fill();
      }

      // Lock pulse ring
      if (lockT > 0) {
        const pulseR = 22 + lockT * 50;
        ctx.beginPath();
        ctx.arc(CX, CY, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(220,38,38,${(1 - lockT) * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={320}
      style={{ width: '100%', maxWidth: '360px', display: 'block', margin: '0 auto' }}
    />
  );
}

// ─── Slides config ────────────────────────────────────────────────────────────
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

// ─── Main Login Component ─────────────────────────────────────────────────────
export default function Login({ onSwitchToRegister }) {
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
    intervalRef.current = setInterval(
      () => setSlide(s => (s + 1) % slides.length),
      4000
    );
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.username.trim() || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const data = await login(form.username.trim(), form.password);
      const { user } = data;
      const { privateKey, publicKey } = await restoreKeysFromLogin(
        form.password,
        user.wrapped_private_key,
        user.pbkdf2_salt,
        user.public_key
      );
      setSession(user, privateKey, publicKey);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
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

  const jumpToSlide = i => {
    setSlide(i);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(
      () => setSlide(s => (s + 1) % slides.length),
      4000
    );
  };

  return (
    <div
      style={{
        height: '100vh',
        background: 'linear-gradient(135deg, #3f0b0b 0%, #5b1111 50%, #2f0808 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: "'DM Sans', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Ambient blobs */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Card */}
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
          boxShadow:
            '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {/* ── LEFT PANEL ── */}
        {!isMobile && (
          <div
            style={{
              flex: '0 0 48%',
              background:
                'linear-gradient(160deg, #721818 0%, #5b1111 40%, #3a0b0b 100%)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Grid pattern */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'linear-gradient(rgba(220,38,38,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.07) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <span
                style={{
                  color: '#ffffff',
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: '18px',
                  letterSpacing: '-0.3px',
                }}
              >
                WhisperBox
              </span>
            </motion.div>

            {/* Carousel */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide}
                  initial={{ opacity: 0, scale: 0.94, y: 18 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.02, y: -14 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  style={{ width: '100%' }}
                >
                  {slides[slide].illustration}
                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <h2
                      style={{
                        color: '#ffffff',
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: '22px',
                        margin: '0 0 8px',
                      }}
                    >
                      {slides[slide].title}
                    </h2>
                    <p
                      style={{
                        color: 'rgba(255,228,228,0.9)',
                        fontSize: '14px',
                        margin: 0,
                        lineHeight: 1.6,
                      }}
                    >
                      {slides[slide].subtitle}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dots */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {slides.map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => jumpToSlide(i)}
                  animate={{
                    width: i === slide ? '24px' : '8px',
                    background:
                      i === slide ? '#dc2626' : 'rgba(255,255,255,0.25)',
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    height: '8px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── RIGHT PANEL ── */}
        <div
          style={{
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
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '300px',
              height: '300px',
              background:
                'radial-gradient(circle, rgba(220,38,38,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 mb-8">
            <span
              style={{
                color: '#fff',
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: '18px',
              }}
            >
              WhisperBox
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.5, ease: 'easeOut' }}
            style={{
              position: 'relative',
              zIndex: 1,
              maxWidth: '380px',
              width: '100%',
              margin: '0 auto',
            }}
          >
            <h2
              style={{
                color: '#ffffff',
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: '28px',
                margin: '0 0 6px',
                letterSpacing: '-0.5px',
              }}
            >
              Welcome back
            </h2>
            <p
              style={{
                color: 'rgba(255,210,210,0.85)',
                fontSize: '14px',
                margin: '0 0 32px',
              }}
            >
              Don't have an account?{' '}
              <button
                onClick={onSwitchToRegister}
                style={{
                  color: '#3b82f6',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                Sign up
              </button>
            </p>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: '20px' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: '#ef4444',
                    fontSize: '13px',
                    borderLeft: '3px solid #ef4444',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
              {/* Username */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{ marginBottom: '16px' }}
              >
                <label
                  style={{
                    color: 'rgba(255,210,210,0.85)',
                    fontSize: '13px',
                    fontWeight: 500,
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  placeholder="alice_92"
                  autoComplete="username"
                  disabled={loading}
                  onChange={e =>
                    setForm(f => ({ ...f, username: e.target.value }))
                  }
                  style={inputStyle}
                  onFocus={e => {
                    e.target.style.border = '1px solid rgba(220,38,38,0.8)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.15)';
                    e.target.style.background = 'rgba(255,255,255,0.07)';
                  }}
                  onBlur={e => {
                    e.target.style.border = '1px solid rgba(255,255,255,0.1)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = 'rgba(255,255,255,0.05)';
                  }}
                />
              </motion.div>

              {/* Password */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                style={{ marginBottom: '28px' }}
              >
                <label
                  style={{
                    color: 'rgba(255,210,210,0.85)',
                    fontSize: '13px',
                    fontWeight: 500,
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                    onChange={e =>
                      setForm(f => ({ ...f, password: e.target.value }))
                    }
                    style={{ ...inputStyle, paddingRight: '48px' }}
                    onFocus={e => {
                      e.target.style.border =
                        '1px solid rgba(220,38,38,0.8)';
                      e.target.style.boxShadow =
                        '0 0 0 3px rgba(220,38,38,0.15)';
                      e.target.style.background = 'rgba(255,255,255,0.07)';
                    }}
                    onBlur={e => {
                      e.target.style.border =
                        '1px solid rgba(255,255,255,0.1)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.background = 'rgba(255,255,255,0.05)';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,210,210,0.65)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{
                  scale: loading ? 1 : 1.02,
                  boxShadow: loading
                    ? 'none'
                    : '0 8px 24px rgba(220,38,38,0.4)',
                }}
                whileTap={{ scale: loading ? 1 : 0.97 }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: loading
                    ? 'rgba(220,38,38,0.5)'
                    : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '15px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: 'inherit',
                  transition: 'background 0.2s',
                  boxShadow: '0 4px 16px rgba(220,38,38,0.25)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Restoring
                    session...
                  </>
                ) : (
                  'Sign in'
                )}
              </motion.button>
            </form>

            {/* E2EE badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '28px',
                paddingTop: '24px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                }}
              >
                <ShieldCheck size={13} style={{ color: '#ffffff' }} />
                <span
                  style={{
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
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
