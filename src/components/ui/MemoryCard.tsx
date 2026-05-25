'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Calendar, Maximize2, ImagePlus } from 'lucide-react';
import { type Memory } from '@/app/actions';

export const CARD_COLORS = [
    // Dusk Violet (soft violet-purple dusk glow)
    { 
        bg: 'from-violet-950/20 to-purple-950/10 hover:from-violet-950/25 hover:to-purple-950/15', 
        border: 'border-violet-500/15 hover:border-violet-400/35', 
        accent: '#c084fc', 
        accentRgb: '192, 132, 252',
        textAccent: 'text-violet-300'
    },
    // Sunset Amber (warm orange-rose twilight glow)
    { 
        bg: 'from-amber-950/15 to-rose-950/10 hover:from-amber-950/20 hover:to-rose-950/12', 
        border: 'border-amber-500/15 hover:border-amber-400/35', 
        accent: '#fbbf24', 
        accentRgb: '251, 191, 36',
        textAccent: 'text-amber-200'
    },
    // Starry Indigo (dreamy deep blue-indigo space glow)
    { 
        bg: 'from-indigo-950/20 to-blue-950/10 hover:from-indigo-950/25 hover:to-blue-950/15', 
        border: 'border-indigo-500/15 hover:border-indigo-400/35', 
        accent: '#818cf8', 
        accentRgb: '129, 140, 248',
        textAccent: 'text-indigo-300'
    },
];

// Extremely fast offscreen canvas dominant color extractor
function getDominantColor(imgUrl: string): Promise<string> {
    return new Promise((resolve) => {
        if (!imgUrl) return resolve('');
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = 1;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, 1, 1);
                    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                    resolve(`${r}, ${g}, ${b}`);
                } else {
                    resolve('');
                }
            } catch (e) {
                resolve('');
            }
        };
        img.onerror = () => {
            resolve('');
        };
        img.src = imgUrl;
    });
}

interface MemoryCardProps {
    memory: Memory;
    index: number;
    onDelete: (id: string) => void;
    onUpdate?: (id: string, data: Partial<Memory>) => void;
    isInitialLoad?: boolean;
    onFocusChange?: (focused: boolean) => void;
    onModalToggle?: (open: boolean) => void;
}

export function MemoryCard({ memory, index, onDelete, onUpdate, isInitialLoad = false, onFocusChange, onModalToggle }: MemoryCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [fullImage, setFullImage] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);
    const [extractedAccent, setExtractedAccent] = useState<string | null>(null);

    const colorIndex = index % CARD_COLORS.length;
    const colorSet = CARD_COLORS[colorIndex];
    
    const animDelay = isInitialLoad ? 0.8 + index * 0.15 : 0;
    
    const allImages = memory.imageUrls || (memory.imageUrl ? [memory.imageUrl] : []);
    const displayImage = allImages[0];

    useEffect(() => {
        onModalToggle?.(expanded || !!fullImage);
    }, [expanded, fullImage, onModalToggle]);

    useEffect(() => {
        if (displayImage) {
            getDominantColor(displayImage).then((color) => {
                if (color) {
                    setExtractedAccent(color);
                }
            });
        } else {
            setExtractedAccent(null);
        }
    }, [displayImage]);

    const accentRgb = extractedAccent || colorSet.accentRgb;

    return (
        <>
            <motion.div
                layoutId={`card-${memory.id}`}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, y: -10 }}
                transition={{ duration: 0.8, delay: animDelay, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ 
                    y: -6, 
                    scale: 1.02,
                    boxShadow: `0 24px 60px -8px rgba(${accentRgb}, 0.22), 0 8px 24px -6px rgba(0,0,0,0.6), inset 0 1px 1px 0 rgba(255,255,255,0.15)`
                }}
                onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMousePos({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                    });
                }}
                onMouseEnter={() => {
                    setIsHovered(true);
                    onFocusChange?.(true);
                }}
                onMouseLeave={() => {
                    setIsHovered(false);
                    onFocusChange?.(false);
                }}
                className={`break-inside-avoid mb-5 cursor-pointer relative rounded-2xl p-5 glass-card bg-gradient-to-br ${colorSet.bg} border ${colorSet.border} transition-all duration-500 group overflow-hidden`}
                style={{ 
                    boxShadow: `0 12px 40px -8px rgba(${accentRgb}, 0.08), 0 4px 12px -4px rgba(0,0,0,0.5), inset 0 1px 1px 0 rgba(255,255,255,0.08)`
                }}
                onClick={() => setExpanded(true)}
            >
                {/* Spotlight Cursor-tracking Glow Overlay */}
                {isHovered && (
                    <div
                        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                        style={{
                            background: `radial-gradient(150px circle at ${mousePos.x}px ${mousePos.y}px, rgba(${accentRgb}, 0.12), transparent 80%)`,
                        }}
                    />
                )}

                {displayImage && (
                    <div className="relative mb-4 overflow-hidden rounded-xl bg-white/5 border border-white/10 p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.4)] aspect-[4/3] group-hover:shadow-[0_12px_25px_rgba(0,0,0,0.5)] transition-all duration-500">
                        <div className="w-full h-full overflow-hidden rounded-lg relative">
                            <img 
                                src={displayImage} 
                                alt={memory.title} 
                                className="w-full h-full object-cover object-center group-hover:scale-105 group-hover:rotate-0.5 transition-transform duration-700 ease-out" 
                            />
                            {allImages.length > 1 && (
                                <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] text-white/90 font-mono tracking-wider">
                                    +{allImages.length - 1} PHOTOS
                                </div>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setFullImage(displayImage); }}
                                className="absolute bottom-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                aria-label="View full size"
                            >
                                <Maximize2 size={14} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex items-start justify-between gap-3 mb-2 relative z-10">
                    <h3 className="font-serif font-medium text-white text-lg leading-snug line-clamp-2 flex-1 group-hover:text-white/90 transition-colors">
                        {memory.title}
                    </h3>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this memory?')) {
                                onDelete(memory.id);
                            }
                        }}
                        className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all p-1.5 -mr-1.5 -mt-1.5 rounded-lg hover:bg-red-500/10 flex-shrink-0 touch-target flex items-center justify-center"
                        aria-label="Delete memory"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4 relative z-10 font-light">
                    {memory.content}
                </p>
                <div className="flex items-center gap-1 mt-3.5 text-white/30 relative z-10 font-light text-[10px]">
                    <Calendar size={10} />
                    <span>{memory.date}</span>
                </div>
            </motion.div>

            {/* Expanded Modal */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                        onClick={() => setExpanded(false)}
                    >
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                            className={`relative w-full max-w-md overflow-y-auto scroll-smooth hide-scrollbar rounded-3xl p-6 glass-card bg-gradient-to-br ${colorSet.bg} border ${colorSet.border}`}
                            style={{
                                boxShadow: `0 24px 64px -12px rgba(${colorSet.accentRgb}, 0.25), inset 0 1px 1px 0 rgba(255,255,255,0.05)`,
                                maxHeight: '90dvh',
                                paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setExpanded(false)}
                                className="absolute top-4 right-4 z-20 text-white/60 hover:text-white transition-colors bg-black/30 p-2 rounded-full backdrop-blur-md touch-target flex items-center justify-center"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>

                            {allImages.length > 0 && (
                                <div className="-mx-6 -mt-6 mb-5 relative overflow-hidden rounded-t-3xl border-b border-white/10 group">
                                    {allImages.length === 1 ? (
                                        <div className="h-64 sm:h-80 relative">
                                            <img src={allImages[0]} alt={memory.title} className="w-full h-full object-cover object-center" />
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setFullImage(allImages[0]); }}
                                                className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                                aria-label="View full size"
                                            >
                                                <Maximize2 size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                                            {allImages.map((img, idx) => (
                                                <div key={idx} className="w-full h-64 sm:h-80 flex-shrink-0 snap-center relative">
                                                    <img src={img} alt={`${memory.title} ${idx + 1}`} className="w-full h-full object-cover object-center" />
                                                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs text-white/90 font-medium">
                                                        {idx + 1} / {allImages.length}
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setFullImage(img); }}
                                                        className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                                        aria-label="View full size"
                                                    >
                                                        <Maximize2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <h2 
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                    const newTitle = e.currentTarget.innerText.trim();
                                    if (newTitle !== memory.title) onUpdate?.(memory.id, { title: newTitle });
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.currentTarget.blur();
                                    }
                                }}
                                className="font-serif text-xl font-semibold text-white mb-3 relative z-10 mt-1 outline-none hover:bg-white/5 focus:bg-white/10 transition-colors rounded px-2 -mx-2 cursor-text"
                            >
                                {memory.title}
                            </h2>
                            <p 
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                    const newContent = e.currentTarget.innerText.trim();
                                    if (newContent !== memory.content) onUpdate?.(memory.id, { content: newContent });
                                }}
                                className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap outline-none hover:bg-white/5 focus:bg-white/10 transition-colors rounded px-2 -mx-2 cursor-text"
                            >
                                {memory.content}
                            </p>
                            <div className="flex items-center gap-1.5 mt-5 pt-4 border-t border-white/10">
                                <Calendar size={12} className="text-white/40" />
                                <span className="text-white/40 text-xs">{memory.date}</span>
                                <div className="flex-1" />
                                <label className="cursor-pointer flex items-center gap-1.5 text-white/50 hover:text-white/90 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium">
                                    <ImagePlus size={12} />
                                    <span>Add Photo</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        multiple 
                                        className="hidden" 
                                        onChange={async (event) => {
                                            const files = Array.from(event.target.files || []);
                                            if (files.length === 0) return;

                                            const processImage = (file: File): Promise<string> => {
                                                return new Promise((resolve) => {
                                                    const reader = new FileReader();
                                                    reader.onload = (e) => {
                                                        const img = new Image();
                                                        img.onload = () => {
                                                            const canvas = document.createElement('canvas');
                                                            const MAX_WIDTH = 800;
                                                            let width = img.width;
                                                            let height = img.height;

                                                            if (width > MAX_WIDTH) {
                                                                height = Math.round((height * MAX_WIDTH) / width);
                                                                width = MAX_WIDTH;
                                                            }

                                                            canvas.width = width;
                                                            canvas.height = height;
                                                            const ctx = canvas.getContext('2d');
                                                            
                                                            if (ctx) {
                                                                ctx.imageSmoothingEnabled = true;
                                                                ctx.imageSmoothingQuality = 'medium';
                                                                ctx.drawImage(img, 0, 0, width, height);
                                                            }

                                                            resolve(canvas.toDataURL('image/jpeg', 0.8));
                                                        };
                                                        img.src = e.target?.result as string;
                                                    };
                                                    reader.readAsDataURL(file);
                                                });
                                            };

                                            const newBase64Images = await Promise.all(files.map(processImage));
                                            const updatedImageUrls = [...allImages, ...newBase64Images];
                                            
                                            onUpdate?.(memory.id, { 
                                                imageUrls: updatedImageUrls, 
                                                imageUrl: updatedImageUrls[0] 
                                            });
                                            
                                            // Reset input
                                            event.target.value = '';
                                        }} 
                                    />
                                </label>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Full Size Image Modal */}
            <AnimatePresence>
                {fullImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-lg"
                        onClick={(e) => { e.stopPropagation(); setFullImage(null); }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setFullImage(null); }}
                            className="absolute top-4 right-4 z-20 text-white/60 hover:text-white transition-colors bg-black/30 p-2 rounded-full backdrop-blur-md touch-target flex items-center justify-center"
                            aria-label="Close full size"
                        >
                            <X size={20} />
                        </button>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="relative w-full h-full p-4 sm:p-8 flex items-center justify-center"
                        >
                            <img 
                                src={fullImage} 
                                alt={memory.title} 
                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default" 
                                onClick={(e) => e.stopPropagation()}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
