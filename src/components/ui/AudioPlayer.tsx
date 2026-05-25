'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Music2 } from 'lucide-react';

export default function AudioPlayer({ visible = true }: { visible?: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsReady(true), 1500);

        const audio = audioRef.current;
        let interacted = false;

        const attemptPlay = async () => {
            if (audio && audio.paused && !interacted) {
                try {
                    await audio.play();
                    setIsPlaying(true);
                    interacted = true;
                    cleanupListeners();
                } catch (e) {
                    // Autoplay blocked by browser until user genuinely interacts
                }
            }
        };

        // Try to play immediately (sometimes allowed based on site engagement score)
        attemptPlay();

        // Autoplay Fallback: Play on any user interaction with the window
        const handleInteraction = () => {
            if (!interacted) attemptPlay();
        };

        const events = ['pointerdown', 'click', 'touchstart', 'keydown'];
        const cleanupListeners = () => {
            events.forEach(e => window.removeEventListener(e, handleInteraction));
        };

        events.forEach(e => window.addEventListener(e, handleInteraction, { once: true }));

        return () => {
            clearTimeout(timer);
            cleanupListeners();
        };
    }, []);

    const toggle = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(() => { });
        }
        setIsPlaying(p => !p);
    }, [isPlaying]);

    return (
        <>
            <audio
                ref={audioRef}
                src="/audio/loveephipnay.mp3"
                loop
                preload="metadata"
            />
            <AnimatePresence>
                {isReady && visible && (
                    <motion.div
                        key="audio-player"
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed z-50"
                        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))', right: '1.5rem' }}
                    >
                        <button
                            onClick={toggle}
                            className="glass flex items-center gap-3 rounded-full px-5 py-3 text-white hover:scale-105 active:scale-95 transition-transform duration-200 shadow-lg shadow-black/20 group"
                            aria-label={isPlaying ? 'Pause music' : 'Play music'}
                        >
                            {/* Spinning disc icon when playing */}
                            <motion.div
                                animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                                transition={
                                    isPlaying
                                        ? { repeat: Infinity, duration: 4, ease: 'linear' }
                                        : { duration: 0.3 }
                                }
                                className="text-slate-300"
                            >
                                <Music2 size={16} />
                            </motion.div>

                            <span className="text-xs text-white/70 font-medium max-w-[100px] truncate hidden sm:block">
                                Love Epiphany
                            </span>

                            <div className="text-slate-300">
                                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                            </div>

                            {/* Animated bars */}
                            {isPlaying && (
                                <div className="flex items-end gap-0.5 h-4">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            className="w-0.5 bg-slate-300 rounded-full"
                                            animate={{ height: ['40%', '100%', '40%'] }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 0.8,
                                                delay: i * 0.15,
                                                ease: 'easeInOut',
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
