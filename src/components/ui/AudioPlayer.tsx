'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Music, SlidersHorizontal, Volume2, CloudRain, Flame, Wind, X } from 'lucide-react';

export default function AudioPlayer({ visible = true }: { visible?: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const rainRef = useRef<HTMLAudioElement>(null);
    const fireRef = useRef<HTMLAudioElement>(null);
    const windRef = useRef<HTMLAudioElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [showMixer, setShowMixer] = useState(false);

    // Mixer volumes (0.0 to 1.0)
    const [musicVolume, setMusicVolume] = useState(0.5);
    const [rainVolume, setRainVolume] = useState(0.0);
    const [fireVolume, setFireVolume] = useState(0.0);
    const [windVolume, setWindVolume] = useState(0.0);

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

        // Try playing immediately
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

    // Sync individual channel volumes
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = musicVolume;
    }, [musicVolume]);

    useEffect(() => {
        if (rainRef.current) rainRef.current.volume = rainVolume;
    }, [rainVolume]);

    useEffect(() => {
        if (fireRef.current) fireRef.current.volume = fireVolume;
    }, [fireVolume]);

    useEffect(() => {
        if (windRef.current) windRef.current.volume = windVolume;
    }, [windVolume]);

    // Playback state manager: plays/pauses all active audio tracks in sync
    useEffect(() => {
        const audio = audioRef.current;
        const rain = rainRef.current;
        const fire = fireRef.current;
        const wind = windRef.current;

        if (isPlaying) {
            audio?.play().catch(() => { });
            if (rainVolume > 0) rain?.play().catch(() => { });
            if (fireVolume > 0) fire?.play().catch(() => { });
            if (windVolume > 0) wind?.play().catch(() => { });
        } else {
            audio?.pause();
            rain?.pause();
            fire?.pause();
            wind?.pause();
        }
    }, [isPlaying, rainVolume, fireVolume, windVolume]);

    const togglePlay = useCallback(() => {
        setIsPlaying(p => !p);
    }, []);

    // Safely trigger channel audio play when volume increases
    const handleVolumeChange = (type: 'music' | 'rain' | 'fire' | 'wind', val: number) => {
        if (type === 'music') {
            setMusicVolume(val);
        } else if (type === 'rain') {
            setRainVolume(val);
            if (val > 0 && isPlaying && rainRef.current?.paused) {
                rainRef.current.play().catch(() => { });
            }
        } else if (type === 'fire') {
            setFireVolume(val);
            if (val > 0 && isPlaying && fireRef.current?.paused) {
                fireRef.current.play().catch(() => { });
            }
        } else if (type === 'wind') {
            setWindVolume(val);
            if (val > 0 && isPlaying && windRef.current?.paused) {
                windRef.current.play().catch(() => { });
            }
        }
    };

    return (
        <>
            {/* Audio sources */}
            <audio ref={audioRef} src="/audio/loveephipnay.mp3" loop preload="metadata" />
            <audio ref={rainRef} src="https://raw.githubusercontent.com/karthiknvd/noctune/master/sounds/rain.mp3" loop preload="metadata" />
            <audio ref={fireRef} src="https://raw.githubusercontent.com/karthiknvd/noctune/master/sounds/campfire.mp3" loop preload="metadata" />
            <audio ref={windRef} src="https://raw.githubusercontent.com/karthiknvd/noctune/master/sounds/wind.mp3" loop preload="metadata" />

            <AnimatePresence>
                {isReady && visible && (
                    <div
                        className="fixed z-50 flex flex-col items-end gap-3"
                        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))', right: '1.5rem' }}
                    >
                        {/* Slide-up Atmospheric Mixer Panel */}
                        <AnimatePresence>
                            {showMixer && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                                    className="bg-black/85 border border-white/10 p-4 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl w-64 flex flex-col gap-3.5 relative overflow-hidden"
                                >
                                    {/* Subtly blurred nebula glow background indicator inside mixer */}
                                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-violet-500/10 blur-[40px] pointer-events-none" />

                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-white text-xs font-serif font-medium tracking-wide">Mixer</span>
                                            <span className="text-white/40 text-[9px] font-sans font-light uppercase tracking-wider"></span>
                                        </div>
                                        <button
                                            onClick={() => setShowMixer(false)}
                                            className="text-white/40 hover:text-white transition-colors cursor-pointer"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>

                                    <div className="w-full h-px bg-white/10" />

                                    <div className="flex flex-col gap-3">
                                        {/* Slider 1: Main Music */}
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[10px] text-white/50">
                                                <div className="flex items-center gap-1.5">
                                                    <Volume2 size={11} className="text-violet-300" />
                                                    <span className="font-light">Love Epiphany</span>
                                                </div>
                                                <span className="font-mono text-[9px]">{Math.round(musicVolume * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={musicVolume}
                                                onChange={(e) => handleVolumeChange('music', parseFloat(e.target.value))}
                                                className="w-full accent-violet-400 h-1 bg-white/10 rounded-lg cursor-pointer"
                                            />
                                        </div>

                                        {/* Slider 2: Rain Sound */}
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[10px] text-white/50">
                                                <div className="flex items-center gap-1.5">
                                                    <CloudRain size={11} className="text-sky-300" />
                                                    <span className="font-light">Rainfall</span>
                                                </div>
                                                <span className="font-mono text-[9px]">{Math.round(rainVolume * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={rainVolume}
                                                onChange={(e) => handleVolumeChange('rain', parseFloat(e.target.value))}
                                                className="w-full accent-sky-400 h-1 bg-white/10 rounded-lg cursor-pointer"
                                            />
                                        </div>

                                        {/* Slider 3: Campfire Crackling */}
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[10px] text-white/50">
                                                <div className="flex items-center gap-1.5">
                                                    <Flame size={11} className="text-amber-400" />
                                                    <span className="font-light">Campfire</span>
                                                </div>
                                                <span className="font-mono text-[9px]">{Math.round(fireVolume * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={fireVolume}
                                                onChange={(e) => handleVolumeChange('fire', parseFloat(e.target.value))}
                                                className="w-full accent-amber-400 h-1 bg-white/10 rounded-lg cursor-pointer"
                                            />
                                        </div>

                                        {/* Slider 4: Wind Sound */}
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[10px] text-white/50">
                                                <div className="flex items-center gap-1.5">
                                                    <Wind size={11} className="text-slate-300" />
                                                    <span className="font-light">Night Wind</span>
                                                </div>
                                                <span className="font-mono text-[9px]">{Math.round(windVolume * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={windVolume}
                                                onChange={(e) => handleVolumeChange('wind', parseFloat(e.target.value))}
                                                className="w-full accent-slate-300 h-1 bg-white/10 rounded-lg cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Audio Controller Button */}
                        <motion.div
                            layout
                            className="flex items-center gap-1 rounded-full p-1 bg-black/60 border border-white/10 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] select-none transition-all duration-300 hover:border-white/20"
                        >
                            {/* Toggle mixer panel (Sliders Icon) */}
                            <button
                                onClick={() => setShowMixer(prev => !prev)}
                                title="Open Atmosphere Mixer"
                                className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${
                                    showMixer ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                                } active:scale-90`}
                            >
                                <SlidersHorizontal size={14} />
                            </button>

                            {/* Main Player Toggle */}
                            <button
                                onClick={togglePlay}
                                className="flex items-center gap-2.5 rounded-full pl-2.5 pr-3 py-1.5 bg-white/5 hover:bg-white/10 text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group cursor-pointer"
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
                                    Love Epiphany
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
