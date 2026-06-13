'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Music } from 'lucide-react';

export default function AudioPlayer({ visible = true }: { visible?: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Initial load animation trigger
    useEffect(() => {
        const timer = setTimeout(() => setIsReady(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    // Autoplay fallback and interaction listeners
    useEffect(() => {
        let interacted = false;

        const attemptPlay = async () => {
            const audio = audioRef.current;
            if (audio && audio.paused && !interacted) {
                try {
                    await audio.play();
                    setIsPlaying(true);
                    interacted = true;
                    cleanupListeners();
                } catch (e) {
                    // Autoplay blocked by browser
                }
            }
        };

        attemptPlay();

        const handleInteraction = () => {
            if (!interacted) attemptPlay();
        };

        const events = ['pointerdown', 'click', 'touchstart', 'keydown'];
        const cleanupListeners = () => {
            events.forEach(e => window.removeEventListener(e, handleInteraction));
        };

        events.forEach(e => window.addEventListener(e, handleInteraction, { once: true }));

        return () => {
            cleanupListeners();
        };
    }, []);

    // Playback state manager
    useEffect(() => {
        const audio = audioRef.current;
        if (isPlaying) {
            audio?.play().catch(() => { });
        } else {
            audio?.pause();
        }
    }, [isPlaying]);

    const togglePlay = useCallback(() => {
        setIsPlaying(p => !p);
    }, []);

    return (
        <>
            <audio ref={audioRef} src="/audio/loveephipnay.mp3" loop preload="metadata" />

            <AnimatePresence>
                {isReady && visible && (
                    <div
                        className="fixed z-50 flex flex-col items-end gap-3"
                        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))', right: '1.5rem' }}
                    >
                        {/* Audio Controller Button */}
                        <motion.div
                            layout
                            className="flex items-center gap-3 rounded-full p-1 bg-black/60 border border-white/10 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] select-none transition-all duration-300 hover:border-white/20"
                        >
                            {/* Main Player Toggle */}
                            <button
                                onClick={togglePlay}
                                className="flex items-center gap-2.5 rounded-full pl-3.5 pr-4 py-2 bg-white/5 hover:bg-white/10 text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group cursor-pointer"
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
                                    className="text-white/70 group-hover:text-white"
                                >
                                    <Music size={13} strokeWidth={1.5} />
                                </motion.div>

                                <span className="text-[11px] tracking-wide text-white/80 font-sans font-light max-w-[80px] truncate hidden sm:block">
                                    Journey Theme
                                </span>

                                <div className="text-white/70 group-hover:text-white ml-0.5">
                                    {isPlaying ? <Pause size={12} strokeWidth={1.5} /> : <Play size={12} strokeWidth={1.5} />}
                                </div>

                                {/* Animated music spectrum bars */}
                                {isPlaying && (
                                    <div className="flex items-end gap-0.5 h-2.5">
                                        {[0, 1, 2].map((i) => (
                                            <motion.div
                                                key={i}
                                                className="w-0.5 bg-white/75 rounded-full"
                                                animate={{ height: ['30%', '100%', '30%'] }}
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
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
