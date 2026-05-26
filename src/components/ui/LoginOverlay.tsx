'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyLogin } from '@/app/actions';
import { Lock } from 'lucide-react';

interface LoginOverlayProps {
  onLoginSuccess: () => void;
}

export function LoginOverlay({ onLoginSuccess }: LoginOverlayProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showBlackout, setShowBlackout] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmitPin = async (enteredPin: string) => {
    if (enteredPin.length < 6 || isLoading) return;
    setIsLoading(true);
    const isValid = await verifyLogin(enteredPin);
    setIsLoading(false);

    if (isValid) {
      setError(false);
      setIsSuccess(true);

      // Show "Hiii Boociiilll" for exactly 2.5 seconds as requested, then fade to full black
      setTimeout(() => {
        setShowBlackout(true);
        // Take 1.0s to fade completely to black, then trigger reveal in page.tsx
        setTimeout(() => {
          onLoginSuccess();
        }, 1000);
      }, 2500);
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-hidden bg-[#040407]">
      {/* Subtle static background starlight texture */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '56px 56px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.015)_0%,transparent_65%)] pointer-events-none" />

      {/* Main card container */}
      <div className="relative w-full max-w-sm z-10">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="login-form"
              initial={{ opacity: 0, y: 35, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(15px)' }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-2xl p-8 sm:p-10 bg-[#09090d]/85 border border-white/[0.06] backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]"
            >
              {/* Top elegant ambient accent line */}
              <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }}
              />

              {/* Header: lock icon + Title */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.6, ease: 'easeOut' }}
                  className="flex justify-center mb-5"
                >
                  <div className="w-12 h-12 rounded-full border border-white/[0.08] bg-white/[0.01] flex items-center justify-center text-white/50 shadow-inner">
                    <Lock size={16} strokeWidth={1.5} />
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="font-serif text-3xl font-light tracking-wide text-white/90 mb-2.5"
                >
                  Memory of Us
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="text-[9px] tracking-[0.4em] uppercase font-light text-white/30"
                >
                  Enter secret code
                </motion.p>
              </div>

              {/* Pin Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (pin.length === 6) handleSubmitPin(pin);
                }}
                className="space-y-6"
              >
                <div className="relative flex justify-center gap-2.5 sm:gap-3 py-1">
                  {/* Hidden real input field */}
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

                  {/* Display visual boxes */}
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const char = pin[idx];
                    const isFocused = pin.length === idx;
                    const isFilled = !!char;
                    return (
                      <motion.div
                        key={idx}
                        animate={
                          error
                            ? { x: [-6, 6, -4, 4, -2, 2, 0] }
                            : isFocused
                              ? { scale: 1.05 }
                              : { scale: 1 }
                        }
                        transition={error ? { duration: 0.4 } : { duration: 0.15 }}
                        className="relative w-10 h-12 sm:w-11 sm:h-14 rounded-lg flex items-center justify-center overflow-hidden"
                        style={{
                          background: isFocused
                            ? 'rgba(255,255,255,0.03)'
                            : 'rgba(255,255,255,0.01)',
                          border: isFocused
                            ? '1px solid rgba(255,255,255,0.35)'
                            : isFilled
                              ? '1px solid rgba(255,255,255,0.14)'
                              : '1px solid rgba(255,255,255,0.05)',
                          boxShadow: isFocused
                            ? '0 0 10px rgba(255,255,255,0.04)'
                            : 'none',
                          transition: 'background 0.2s, border 0.2s',
                        }}
                      >
                        {isFilled ? (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                            className="w-1.5 h-1.5 rounded-full bg-white/90"
                          />
                        ) : (
                          isFocused && !isLoading && (
                            <motion.div
                              animate={{ opacity: [1, 0, 1] }}
                              transition={{ repeat: Infinity, duration: 0.85 }}
                              className="w-px h-4 bg-white/50"
                            />
                          )
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Minimalist Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading || pin.length < 6}
                  whileHover={!isLoading && pin.length >= 6 ? { scale: 1.015 } : {}}
                  whileTap={!isLoading && pin.length >= 6 ? { scale: 0.985 } : {}}
                  className="relative w-full py-3.5 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300 font-sans tracking-[0.2em] text-[10px] uppercase font-semibold"
                  style={{
                    background: error
                      ? 'rgba(239,68,68,0.08)'
                      : pin.length >= 6
                        ? '#ffffff'
                        : 'rgba(255,255,255,0.02)',
                    color: pin.length >= 6 && !error ? '#000000' : 'rgba(255,255,255,0.2)',
                    border: error
                      ? '1px solid rgba(239,68,68,0.25)'
                      : pin.length >= 6
                        ? '1px solid #ffffff'
                        : '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {error ? (
                    <span className="text-red-400 font-medium">Access Denied</span>
                  ) : isLoading ? (
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ border: '1.5px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.8)' }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                      />
                      <span className="text-white/40 font-medium">Verifying</span>
                    </div>
                  ) : (
                    <span>Unlock Memory</span>
                  )}
                </motion.button>
              </form>
            </motion.div>
          ) : (
            /* Sophisticated, quiet Welcome Message (NO EMOTE, NO colorful gradients) */
            <motion.div
              key="success-message"
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(15px)' }}
              animate={
                showBlackout
                  ? { opacity: 0, scale: 1.15, filter: 'blur(8px)', y: -15 }
                  : { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }
              }
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center h-48"
            >
              <h2
                className="font-serif text-3xl sm:text-4xl font-extralight tracking-[0.25em] text-center text-white/90"
              >
                Hiii Boociiilll
              </h2>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cinematic Full Black Transition Cover */}
      <AnimatePresence>
        {showBlackout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.0, ease: 'easeInOut' }}
            className="absolute inset-0 bg-black z-[300] pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
