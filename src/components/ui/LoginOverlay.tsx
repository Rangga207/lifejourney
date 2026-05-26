'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyLogin } from '@/app/actions';

interface LoginOverlayProps {
  onLoginSuccess: () => void;
}

// Ambient floating micro-particles for the login page background atmosphere
function AmbientParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 45 }).map((_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 1,
      delay: Math.random() * 10,
      duration: 7 + Math.random() * 9,
      color: ['#c084fc', '#818cf8', '#f472b6', '#60a5fa', '#ffffff', '#a78bfa'][i % 6],
      driftX: (Math.random() - 0.5) * 50,
      driftY: (Math.random() - 0.5) * 30,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}80`,
          }}
          animate={{
            y: [0, p.driftY, 0],
            x: [0, p.driftX, 0],
            opacity: [0, 0.7, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Particles rising from the bottom to fill the screen during transition
function ParticleRise() {
  const particles = useMemo(() => {
    return Array.from({ length: 130 }).map((_, i) => {
      const colors = ['#f5d0fe', '#c084fc', '#818cf8', '#60a5fa', '#38bdf8', '#f472b6', '#ffffff', '#a78bfa', '#e879f9'];
      const color = colors[i % colors.length];
      return {
        x: Math.random() * 100,          // % of viewport width
        size: Math.random() * 5 + 2,     // px
        duration: 1.4 + Math.random() * 1.8,
        delay: Math.random() * 1.8,
        drift: (Math.random() - 0.5) * 120,  // horizontal drift in px
        color,
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-[250] overflow-hidden">
      {/* Rising background aurora glow */}
      <motion.div
        initial={{ y: '105%', opacity: 0 }}
        animate={{ y: '-5%', opacity: [0, 0.5, 0.3, 0] }}
        transition={{ duration: 2.8, ease: [0.12, 1, 0.4, 1] }}
        className="absolute inset-x-0 h-full"
        style={{
          background: 'linear-gradient(to top, rgba(139,92,246,0.35) 0%, rgba(99,102,241,0.2) 30%, rgba(236,72,153,0.1) 60%, transparent 100%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Second wave glow */}
      <motion.div
        initial={{ y: '110%', opacity: 0 }}
        animate={{ y: '-15%', opacity: [0, 0.3, 0] }}
        transition={{ duration: 2.8, delay: 0.3, ease: [0.12, 1, 0.4, 1] }}
        className="absolute inset-x-0 h-full"
        style={{
          background: 'linear-gradient(to top, rgba(244,114,182,0.3) 0%, rgba(167,139,250,0.15) 40%, transparent 100%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Individual rising particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: 0,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}, 0 0 ${p.size * 6}px ${p.color}50`,
          }}
          initial={{ y: 0, x: 0, opacity: 0, scale: 0.3 }}
          animate={{
            y: [0, -(window?.innerHeight ?? 900) - 100],
            x: [0, p.drift],
            opacity: [0, 0.9, 0.9, 0],
            scale: [0.3, 1.1, 1, 0.6],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
            times: [0, 0.15, 0.75, 1],
          }}
        />
      ))}
    </div>
  );
}

export function LoginOverlay({ onLoginSuccess }: LoginOverlayProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmitPin = async (enteredPin: string) => {
    if (enteredPin.length < 6 || isLoading) return;
    setIsLoading(true);
    const isValid = await verifyLogin(enteredPin);
    setIsLoading(false);

    if (isValid) {
      setError(false);
      setIsSuccess(true);

      // Show "Hiii Boociiilll" for 1.5s, then trigger particle rise
      setTimeout(() => {
        setShowParticles(true);
        // Particles rise for 2.2s, then fade out the overlay
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(onLoginSuccess, 800);
        }, 2200);
      }, 1500);
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          key="login-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-hidden"
          style={{
            background: `
              radial-gradient(ellipse at 25% 15%, rgba(109,40,217,0.18) 0%, transparent 55%),
              radial-gradient(ellipse at 75% 85%, rgba(219,39,119,0.14) 0%, transparent 55%),
              radial-gradient(ellipse at 50% 50%, rgba(6,11,20,0.90) 0%, rgba(2,4,8,0.99) 100%)
            `,
          }}
        >
          {/* Ambient floating particles */}
          <AmbientParticles />

          {/* Background nebula orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.12, 0.22, 0.12], rotate: [0, 20, 0] }}
              transition={{ repeat: Infinity, duration: 13, ease: 'easeInOut' }}
              className="absolute -top-[25%] -left-[20%] w-[75vw] h-[75vw] rounded-full blur-[130px]"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, rgba(79,70,229,0.1) 60%, transparent 100%)' }}
            />
            <motion.div
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1], rotate: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 15, ease: 'easeInOut' }}
              className="absolute -bottom-[25%] -right-[20%] w-[75vw] h-[75vw] rounded-full blur-[130px]"
              style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.2) 0%, rgba(236,72,153,0.1) 60%, transparent 100%)' }}
            />
            <motion.div
              animate={{ opacity: [0.04, 0.1, 0.04], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] h-[55vw] rounded-full blur-[100px]"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)' }}
            />
          </div>

          {/* Subtle perspective grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.018]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
              backgroundSize: '64px 64px',
            }}
          />

          {/* Main card content */}
          <div className="relative w-full max-w-sm z-10">
            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, y: 50, filter: 'blur(15px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -20, scale: 0.93, filter: 'blur(20px)' }}
                  transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Outer card glow ring */}
                  <div className="absolute -inset-[1px] rounded-3xl opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, rgba(167,139,250,0.3) 0%, rgba(255,255,255,0.05) 40%, rgba(244,114,182,0.2) 100%)',
                    }}
                  />

                  <div
                    className="relative rounded-3xl p-8 sm:p-10"
                    style={{
                      background: 'rgba(10,10,20,0.6)',
                      backdropFilter: 'blur(24px)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      boxShadow: `
                        0 0 0 1px rgba(139,92,246,0.08),
                        0 4px 6px -1px rgba(0,0,0,0.5),
                        0 24px 80px -12px rgba(0,0,0,0.6),
                        inset 0 1px 0 rgba(255,255,255,0.07)
                      `,
                    }}
                  >
                    {/* Top shimmer line */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-px"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.6), transparent)' }}
                    />

                    {/* Icon + title */}
                    <div className="text-center mb-9 relative z-10">
                      <motion.div
                        initial={{ scale: 0, opacity: 0, rotate: -15 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 240, damping: 18 }}
                        className="flex justify-center mb-6"
                      >
                        <div className="relative">
                          <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                            className="absolute inset-0 rounded-2xl blur-xl"
                            style={{ background: 'rgba(244,114,182,0.4)', transform: 'scale(1.6)' }}
                          />
                          <div
                            className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                            }}
                          >
                            <span className="text-2xl select-none"></span>
                          </div>
                        </div>
                      </motion.div>

                      <motion.h1
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="font-serif text-3xl sm:text-4xl font-light mb-2.5 tracking-wide"
                        style={{
                          background: 'linear-gradient(160deg, rgba(255,255,255,0.95) 0%, rgba(200,180,255,0.7) 60%, rgba(255,255,255,0.5) 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        Memory of Us
                      </motion.h1>

                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55, duration: 0.8 }}
                        className="text-[9px] tracking-[0.45em] uppercase font-light"
                        style={{ color: 'rgba(255,255,255,0.22)' }}
                      >
                        Enter secret code
                      </motion.p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (pin.length === 6) handleSubmitPin(pin);
                      }}
                      className="space-y-5 relative z-10"
                    >
                      {/* PIN Input Row */}
                      <div className="relative flex justify-center gap-2.5 sm:gap-3 py-1">
                        {/* Hidden real input */}
                        <input
                          type="text"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          maxLength={6}
                          value={pin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setPin(val);
                            if (val.length === 6) handleSubmitPin(val);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                          autoFocus
                          disabled={isLoading || isSuccess}
                          aria-label="Enter 6-digit passcode"
                        />

                        {/* Visual PIN boxes */}
                        {Array.from({ length: 6 }).map((_, idx) => {
                          const char = pin[idx];
                          const isFocused = pin.length === idx;
                          const isFilled = !!char;
                          return (
                            <motion.div
                              key={idx}
                              animate={
                                error
                                  ? { x: [-7, 7, -5, 5, -3, 3, 0] }
                                  : isFocused
                                    ? { scale: 1.1 }
                                    : isFilled
                                      ? { scale: 1.03 }
                                      : { scale: 1 }
                              }
                              transition={error ? { duration: 0.45 } : { duration: 0.18 }}
                              className="relative w-10 h-12 sm:w-11 sm:h-14 rounded-xl flex items-center justify-center overflow-hidden"
                              style={{
                                background: isFocused
                                  ? 'rgba(139,92,246,0.1)'
                                  : isFilled
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(255,255,255,0.025)',
                                border: isFocused
                                  ? '1px solid rgba(167,139,250,0.5)'
                                  : isFilled
                                    ? '1px solid rgba(255,255,255,0.18)'
                                    : '1px solid rgba(255,255,255,0.06)',
                                boxShadow: isFocused
                                  ? '0 0 0 3px rgba(139,92,246,0.08), 0 0 20px rgba(139,92,246,0.12)'
                                  : 'none',
                                transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
                              }}
                            >
                              {/* Top accent line on focused box */}
                              {isFocused && (
                                <motion.div
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  className="absolute top-0 left-0 right-0 h-[1.5px] rounded-full"
                                  style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.8), transparent)' }}
                                />
                              )}

                              {isFilled ? (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{
                                    background: 'radial-gradient(circle, rgba(220,200,255,1) 0%, rgba(167,139,250,0.8) 100%)',
                                    boxShadow: '0 0 10px rgba(167,139,250,0.9), 0 0 20px rgba(167,139,250,0.4)',
                                  }}
                                />
                              ) : (
                                isFocused && !isLoading && (
                                  <motion.div
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ repeat: Infinity, duration: 0.85 }}
                                    className="w-px h-5 rounded-full"
                                    style={{ background: 'linear-gradient(to bottom, rgba(167,139,250,0.9), rgba(167,139,250,0.2))' }}
                                  />
                                )
                              )}
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Submit button */}
                      <motion.button
                        type="submit"
                        disabled={isLoading || pin.length < 6}
                        whileHover={!isLoading && pin.length >= 6 ? { scale: 1.02, y: -1 } : {}}
                        whileTap={!isLoading && pin.length >= 6 ? { scale: 0.97 } : {}}
                        className="relative w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 overflow-hidden transition-all duration-500"
                        style={{
                          background: error
                            ? 'rgba(239,68,68,0.07)'
                            : pin.length >= 6
                              ? 'linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(99,102,241,0.15) 50%, rgba(236,72,153,0.12) 100%)'
                              : 'rgba(255,255,255,0.025)',
                          border: error
                            ? '1px solid rgba(239,68,68,0.25)'
                            : pin.length >= 6
                              ? '1px solid rgba(167,139,250,0.28)'
                              : '1px solid rgba(255,255,255,0.05)',
                          boxShadow: pin.length >= 6 && !error
                            ? '0 0 28px rgba(124,58,237,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
                            : 'none',
                        }}
                      >
                        {/* Animated shimmer on ready state */}
                        {!error && !isLoading && pin.length >= 6 && (
                          <motion.div
                            className="absolute inset-0"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }}
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 0.5 }}
                          />
                        )}

                        {error ? (
                          <span className="tracking-[0.28em] uppercase text-[9px] text-red-400/80 font-light">
                            Access Denied
                          </span>
                        ) : isLoading ? (
                          <div className="flex items-center gap-2.5">
                            <motion.div
                              className="w-3.5 h-3.5 rounded-full"
                              style={{ border: '1.5px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(167,139,250,0.9)' }}
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                            />
                            <span className="tracking-[0.28em] uppercase text-[9px] text-white/40 font-light">
                              Verifying
                            </span>
                          </div>
                        ) : (
                          <span
                            className="tracking-[0.28em] uppercase text-[9px] font-light transition-colors duration-300"
                            style={{ color: pin.length >= 6 ? 'rgba(220,210,255,0.85)' : 'rgba(255,255,255,0.18)' }}
                          >
                            Unlock Memory
                          </span>
                        )}
                      </motion.button>
                    </form>

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          className="absolute bottom-3 left-0 right-0 text-center text-[9px] tracking-[0.22em] uppercase font-light"
                          style={{ color: 'rgba(248,113,113,0.55)' }}
                        >
                          Incorrect Passcode
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="success-message"
                  initial={{ opacity: 0, scale: 0.85, filter: 'blur(20px)' }}
                  animate={
                    showParticles
                      ? { opacity: 0, scale: 1.12, filter: 'blur(16px)' }
                      : { opacity: 1, scale: 1, filter: 'blur(0px)' }
                  }
                  transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center h-48 gap-4"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-4xl select-none"
                  >
                    💕
                  </motion.div>
                  <h2
                    className="font-serif text-4xl sm:text-5xl font-light tracking-widest text-center"
                    style={{
                      background: 'linear-gradient(135deg, #f5d0fe 0%, #c084fc 35%, #818cf8 65%, #e0d7ff 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Hiii Boociiilll
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Particle rise transition — replaces tornado */}
          <AnimatePresence>
            {showParticles && <ParticleRise />}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
