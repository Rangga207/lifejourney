'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Calendar, Maximize2, ImagePlus, Sparkles } from 'lucide-react';
import { type Memory } from '@/app/actions';

interface MemoryModal3DProps {
    memory: Memory;
    onClose: () => void;
    onDelete: (id: string) => void;
    onUpdate?: (id: string, data: Partial<Memory>) => void;
}

export function MemoryModal3D({ memory, onClose, onDelete, onUpdate }: MemoryModal3DProps) {
    const [fullImage, setFullImage] = useState<string | null>(null);
    const allImages = memory.imageUrls || (memory.imageUrl ? [memory.imageUrl] : []);

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    className="relative w-full max-w-lg overflow-y-auto scroll-smooth hide-scrollbar rounded-3xl p-6 border border-sky-500/30 bg-slate-950/80 shadow-[0_0_50px_rgba(56,189,248,0.25)]"
                    style={{
                        maxHeight: '85dvh',
                        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header Cosmic Sparkles */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
                    
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-20 text-white/60 hover:text-white transition-colors bg-black/40 p-2 rounded-full backdrop-blur-md touch-target flex items-center justify-center border border-white/10"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-2 mb-4 text-sky-400 text-xs tracking-widest uppercase font-mono">
                        <Sparkles size={14} className="animate-pulse" />
                        <span>Cosmic Memory Unveiled</span>
                    </div>

                    {allImages.length > 0 && (
                        <div className="-mx-6 -mt-6 mb-5 relative overflow-hidden rounded-t-3xl border-b border-sky-500/20 group">
                            {allImages.length === 1 ? (
                                <div className="h-64 sm:h-80 relative">
                                    <img src={allImages[0]} alt={memory.title} className="w-full h-full object-cover object-center" />
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setFullImage(allImages[0]); }}
                                        className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-all border border-white/10"
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
                                                className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-all border border-white/10"
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
                        className="font-serif text-2xl font-semibold text-white mb-3 outline-none hover:bg-white/5 focus:bg-white/10 transition-colors rounded px-2 -mx-2 cursor-text leading-snug"
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
                        className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap outline-none hover:bg-white/5 focus:bg-white/10 transition-colors rounded px-2 -mx-2 cursor-text"
                    >
                        {memory.content}
                    </p>

                    <div className="flex items-center gap-1.5 mt-6 pt-4 border-t border-sky-500/20">
                        <Calendar size={12} className="text-sky-400" />
                        <span className="text-slate-400 text-xs font-mono">{memory.date}</span>
                        <div className="flex-1" />
                        
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to delete this memory?')) {
                                    onDelete(memory.id);
                                    onClose();
                                }
                            }}
                            className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all text-xs font-medium flex items-center gap-1.5 border border-red-500/10"
                        >
                            <Trash2 size={14} />
                            <span>Delete</span>
                        </button>

                        <label className="cursor-pointer flex items-center gap-1.5 text-sky-400 hover:text-sky-300 transition-colors bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-full text-xs font-medium border border-sky-500/20">
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

            {/* Full Size Image Modal */}
            <AnimatePresence>
                {fullImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[130] flex items-center justify-center bg-black/95 backdrop-blur-lg"
                        onClick={() => setFullImage(null)}
                    >
                        <button
                            onClick={() => setFullImage(null)}
                            className="absolute top-4 right-4 z-20 text-white/60 hover:text-white transition-colors bg-black/40 p-2 rounded-full backdrop-blur-md flex items-center justify-center border border-white/10"
                            aria-label="Close full size"
                        >
                            <X size={20} />
                        </button>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full h-full p-4 sm:p-8 flex items-center justify-center"
                        >
                            <img 
                                src={fullImage} 
                                alt={memory.title} 
                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                                onClick={(e) => e.stopPropagation()}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
