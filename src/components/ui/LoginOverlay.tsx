'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { verifyLogin } from '@/app/actions';

interface LoginOverlayProps {
  onLoginSuccess: () => void;
}

export function LoginOverlay({ onLoginSuccess }: LoginOverlayProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
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
      
      // Delay transition for gorgeous welcome message
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(onLoginSuccess, 1500); 
      }, 3500);
    } else {
      setError(true);
      setPin(''); // Reset PIN on error
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
          exit={{ opacity: 0, filter: 'blur(20px)', scale: 1.05 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_center,rgba(6,11,20,0.85)_0%,rgba(2,4,8,0.98)_100%)] backdrop-blur-xl overflow-hidden"
        >
          {/* Ethereal background nebula glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.15, 0.28, 0.15],
              }}
              transition={{
                repeat: Infinity,
                duration: 10,
                ease: 'easeInOut',
              }}
              className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-500/10 blur-[120px]"
            />
            <motion.div
              animate={{
                scale: [1.15, 1, 1.15],
                opacity: [0.15, 0.28, 0.15],
              }}
              transition={{
                repeat: Infinity,
                duration: 12,
                ease: 'easeInOut',
              }}
              className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-rose-500/10 blur-[120px]"
            />
          </div>

          <div className="relative w-full max-w-sm">
            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.9, filter: 'blur(15px)' }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="relative bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 sm:p-10 shadow-[0_0_80px_rgba(255,255,255,0.03)]"
                >
                  <div className="text-center mb-8 relative z-10">
                    <h1 className="font-serif text-3xl font-light text-white/90 mb-3 tracking-wider">
                      Memory of Us
                    </h1>
                    <p className="text-white/30 text-[9px] tracking-[0.3em] uppercase font-light">
                      Unlock with 6-Digit PIN
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (pin.length === 6) handleSubmitPin(pin);
                    }}
                    className="space-y-6 relative z-10"
                  >
                    <div className="relative flex justify-center gap-2.5 sm:gap-3 py-2">
                      {/* Hidden text field that covers the entire PIN row */}
                      <input
                        type="text"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setPin(val);
                          if (val.length === 6) {
                            handleSubmitPin(val);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        autoFocus
                        disabled={isLoading || isSuccess}
                        aria-label="Enter 6-digit passcode"
                      />

                      {/* Display grid of 6 tactile secure boxes */}
                      {Array.from({ length: 6 }).map((_, idx) => {
                        const char = pin[idx];
                        const isFocused = pin.length === idx;
                        return (
                          <motion.div
                            key={idx}
                            animate={
                              error
                                ? { x: [-6, 6, -6, 6, 0] }
                                : isFocused
                                ? { scale: 1.05, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.03)' }
                                : { scale: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.01)' }
                            }
                            transition={error ? { duration: 0.4 } : { duration: 0.2 }}
                            className={`w-11 h-12 sm:w-12 sm:h-14 rounded-2xl border flex items-center justify-center text-lg font-light text-white relative transition-all duration-300 ${
                              isFocused ? 'shadow-[0_0_20px_rgba(255,255,255,0.05)]' : ''
                            }`}
                          >
                            {char ? (
                              <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                              />
                            ) : (
                              isFocused && !isLoading && (
                                <motion.div
                                  animate={{ opacity: [1, 0, 1] }}
                                  transition={{ repeat: Infinity, duration: 1 }}
                                  className="w-0.5 h-5 bg-white/40"
                                />
                              )
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isLoading || pin.length < 6}
                      whileHover={isLoading || pin.length < 6 ? {} : { scale: 1.02 }}
                      whileTap={isLoading || pin.length < 6 ? {} : { scale: 0.98 }}
                      className={`w-full py-4 rounded-2xl font-light text-white flex items-center justify-center gap-2 transition-all duration-500 relative overflow-hidden group ${
                        error
                          ? 'bg-red-500/10 text-red-300 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                          : isLoading
                          ? 'bg-white/10 border border-white/[0.1] shadow-[0_0_20px_rgba(255,255,255,0.05)] cursor-not-allowed opacity-70'
                          : pin.length < 6
                          ? 'bg-white/[0.01] border border-white/[0.03] text-white/20 cursor-not-allowed shadow-none'
                          : 'bg-white/5 hover:bg-white/10 border border-white/[0.08] shadow-[0_0_20px_rgba(255,255,255,0.02)]'
                      }`}
                    >
                      {!error && !isLoading && pin.length === 6 && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent -translate-x-[100%] group-hover:animate-[shimmer_2s_infinite]" />
                      )}
                      {error ? (
                        <span className="tracking-[0.2em] uppercase text-[10px]">Access Denied</span>
                      ) : isLoading ? (
                        <span className="tracking-[0.25em] uppercase text-[10px] animate-pulse">Verifying...</span>
                      ) : (
                        <>
                          <span className="tracking-[0.25em] uppercase text-[10px]">Verify PIN</span>
                          <ChevronRight size={14} strokeWidth={1.5} className="opacity-40 group-hover:translate-x-1 group-hover:opacity-80 transition-all duration-500" />
                        </>
                      )}
                    </motion.button>
                  </form>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0, x: [-5, 5, -5, 5, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="absolute bottom-3 left-0 right-0 text-center text-red-400/60 text-[9px] font-light tracking-[0.2em] uppercase"
                      >
                        Incorrect Passcode
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="success-message"
                  initial={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
                  transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center justify-center h-48"
                >
                  <h2 className="font-serif text-4xl sm:text-5xl font-light text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 tracking-widest text-center">
                    Welcome Back ♡
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
