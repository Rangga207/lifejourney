'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Image as ImageIcon } from 'lucide-react';

interface AddMemoryModalProps {
    onAdd: (data: { title: string; content: string; imageUrl?: string; imageUrls?: string[]; hideFromGallery?: boolean }) => Promise<void> | void;
    isVisible?: boolean;
    onModalToggle?: (open: boolean) => void;
}

export default function AddMemoryModal({ onAdd, isVisible = true, onModalToggle }: AddMemoryModalProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        onModalToggle?.(open);
    }, [open, onModalToggle]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [hideFromGallery, setHideFromGallery] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const newImages: string[] = [];

        for (const file of files) {
            try {
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 800; // Decreased to save database size limits
                            let width = img.width;
                            let height = img.height;

                            if (width > MAX_WIDTH) {
                                height = Math.round((height * MAX_WIDTH) / width);
                                width = MAX_WIDTH;
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            
                            // Use better interpolation if supported (mostly for scaling down)
                            if (ctx) {
                                ctx.imageSmoothingEnabled = true;
                                ctx.imageSmoothingQuality = 'medium';
                                ctx.drawImage(img, 0, 0, width, height);
                            }

                            // Compressed to 0.8 to balance quality and size
                            resolve(canvas.toDataURL('image/jpeg', 0.8));
                        };
                        img.onerror = reject;
                        img.src = event.target?.result as string;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                newImages.push(dataUrl);
            } catch (err) {
                console.error("Failed to process image", err);
            }
        }
        setImages(prev => [...prev, ...newImages]);
        e.target.value = ''; // reset
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim() || isSubmitting) return;
        
        setIsSubmitting(true);
        try {
            await onAdd({ 
                title, 
                content, 
                imageUrl: images[0] || undefined, 
                imageUrls: images.length > 0 ? images : undefined,
                hideFromGallery 
            });
            setTitle('');
            setContent('');
            setImages([]);
            setHideFromGallery(false);
            setOpen(false);
        } catch (error) {
            alert('Failed to save memory to the database!');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* FAB Button */}
            <AnimatePresence>
                {isVisible && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setOpen(true)}
                        className="fixed z-50 w-14 h-14 rounded-full bg-white/10 border border-white/20 shadow-lg shadow-black/20 flex items-center justify-center text-white backdrop-blur-md touch-target"
                        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))', left: '1.5rem' }}
                        aria-label="Add Memory"
                    >
                        <Plus size={24} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Modal */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
                    >
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setOpen(false)}
                        />
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                            className="relative w-full sm:max-w-md sm:mx-4 glass-card sm:rounded-3xl rounded-t-[2rem] p-6 overflow-y-auto hide-scrollbar"
                            style={{
                                maxHeight: '92dvh',
                                paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
                            }}
                        >
                            {/* Drag handle pill for mobile */}
                            <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-serif text-lg font-semibold text-white">New Memory</h2>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="text-white/40 hover:text-white transition-colors touch-target flex items-center justify-center rounded-full"
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Image Upload & Preview */}
                                {images.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                        {images.map((img, idx) => (
                                            <div key={idx} className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-xl overflow-hidden mb-2 border border-white/10 group">
                                                <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(idx)}
                                                    className="absolute top-1.5 right-1.5 bg-black/50 text-white p-1 rounded-full hover:bg-red-500/80 backdrop-blur-md transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div>
                                    <input
                                        type="file"
                                        id="image-upload"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="image-upload"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2 cursor-pointer text-white/50 hover:bg-white/10 hover:text-white transition group focus-within:ring-1 focus-within:ring-white/40 focus-within:border-white/30"
                                        tabIndex={0}
                                    >
                                        <ImageIcon size={18} className="group-hover:scale-110 transition-transform" />
                                        <span className="text-sm font-medium">{images.length > 0 ? 'Add More Photos' : 'Add Photos'}</span>
                                    </label>
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="text-xs text-white/50 mb-1.5 block">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="A beautiful moment..."
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/30 transition"
                                    />
                                </div>

                                {/* Content */}
                                <div>
                                    <label className="text-xs text-white/50 mb-1.5 block">Memory</label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Write down what happened, how you felt..."
                                        required
                                        rows={5}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/30 transition resize-none"
                                    />
                                </div>

                                {images.length > 0 && (
                                    <label className="flex items-center gap-2 cursor-pointer mt-2 text-sm text-white/70 hover:text-white transition">
                                        <input 
                                            type="checkbox" 
                                            checked={hideFromGallery}
                                            onChange={(e) => setHideFromGallery(e.target.checked)}
                                            className="rounded border-white/20 bg-white/5 text-white/50 focus:ring-white/30"
                                        />
                                        Hide these photos from Gallery
                                    </label>
                                )}

                                <motion.button
                                    type="submit"
                                    disabled={isSubmitting}
                                    whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                                    whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                                    className={`w-full py-3 rounded-xl border font-medium text-sm transition-all font-sans ${
                                        isSubmitting 
                                            ? 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'
                                            : 'bg-white/10 border-white/20 text-white shadow-lg shadow-black/20 hover:bg-white/20'
                                    }`}
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Memory'}
                                </motion.button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
