'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Image as ImageIcon, LayoutGrid, X, Trash2, Upload, ChevronLeft, ChevronRight, ArrowUpDown, AlignLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import { MemoryCard } from '@/components/ui/MemoryCard';
import AddMemoryModal from '@/components/ui/AddMemoryModal';
import AudioPlayer from '@/components/ui/AudioPlayer';
import { getMemories, addMemory, removeMemory, updateMemory, type Memory } from '@/app/actions';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LoginOverlay } from '@/components/ui/LoginOverlay';

// Dynamically import the 3D Canvas to avoid SSR issues
const CanvasScene = dynamic(() => import('@/components/3d/CanvasScene'), {
  ssr: false,
});

export default function HomePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [titleVisible, setTitleVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'memories' | 'gallery'>('memories');
  const [fullGalleryImage, setFullGalleryImage] = useState<{ url: string, memoryId: string, imageIndex: number } | null>(null);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [notesView, setNotesView] = useState<'grid' | 'timeline'>('grid');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isScrolled, setIsScrolled] = useState(false);

  const filteredMemories = useMemo(() => {
    const filtered = memories.filter(m =>
      !m.isGalleryOnly &&
      (m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.date.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return sortOrder === 'oldest' ? [...filtered].reverse() : filtered;
  }, [memories, searchQuery, sortOrder]);

  const allImages = useMemo(() => {
    const sourceMemories = searchQuery
      ? memories.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.content.toLowerCase().includes(searchQuery.toLowerCase()))
      : memories;

    return sourceMemories.flatMap(m => {
      if (m.hideFromGallery) return [];

      if (m.imageUrls && m.imageUrls.length > 0) {
        return m.imageUrls.map((url, idx) => ({ url, memoryId: m.id, imageIndex: idx }));
      }
      if (m.imageUrl) {
        return [{ url: m.imageUrl, memoryId: m.id, imageIndex: 0 }];
      }
      return [];
    });
  }, [memories, searchQuery]);

  useEffect(() => {
    const auth = localStorage.getItem('memory_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    getMemories().then(data => setMemories(data));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const t = setTimeout(() => setTitleVisible(true), 300);
      const t2 = setTimeout(() => setInitialLoad(false), 3000);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    localStorage.setItem('memory_auth', 'true');
    setIsAuthenticated(true);
  };

  const handleAdd = async (memoryData: { title: string; content: string; imageUrl?: string; imageUrls?: string[]; isGalleryOnly?: boolean; hideFromGallery?: boolean }) => {
    const newMemory = await addMemory(memoryData);
    setMemories((prev) => [newMemory, ...prev]);
  };

  const handleDelete = async (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    await removeMemory(id);
  };

  const handleUpdate = async (id: string, data: Partial<Memory>) => {
    // First optimally update local state for immediate feedback
    const currentDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    setMemories((prev) => prev.map((m) => m.id === id ? { ...m, ...data, date: currentDate } : m));

    // Send update to server
    const updatedMemory = await updateMemory(id, data);
    if (updatedMemory) {
      // Ensure state exactly matches the server returned object
      setMemories((prev) => prev.map((m) => m.id === id ? updatedMemory : m));
    }
  };

  const handleDeleteGalleryImage = async (memoryId: string, imageIndex: number) => {
    const memory = memories.find(m => m.id === memoryId);
    if (!memory) return;

    if (memory.isGalleryOnly && (memory.imageUrls?.length === 1 || !memory.imageUrls)) {
      await handleDelete(memoryId);
    } else {
      const newImageUrls = memory.imageUrls ? [...memory.imageUrls] : (memory.imageUrl ? [memory.imageUrl] : []);
      newImageUrls.splice(imageIndex, 1);

      const updates: Partial<Memory> = {
        imageUrls: newImageUrls.length > 0 ? newImageUrls : undefined,
        imageUrl: newImageUrls.length > 0 ? newImageUrls[0] : undefined
      };
      await handleUpdate(memoryId, updates);
    }
    setFullGalleryImage(null);
  };

  const currentGalleryIndex = fullGalleryImage
    ? allImages.findIndex(img => img.url === fullGalleryImage.url && img.memoryId === fullGalleryImage.memoryId)
    : -1;

  const handleNextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentGalleryIndex !== -1 && currentGalleryIndex < allImages.length - 1) {
      setFullGalleryImage(allImages[currentGalleryIndex + 1]);
    }
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentGalleryIndex > 0) {
      setFullGalleryImage(allImages[currentGalleryIndex - 1]);
    }
  };

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setIsUploadingGallery(true);
    try {
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
              if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
              canvas.width = width; canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'medium'; ctx.drawImage(img, 0, 0, width, height); }
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
      };
      const newBase64Images: string[] = [];
      for (const file of files) {
        try {
          const dataUrl = await processImage(file);
          newBase64Images.push(dataUrl);
        } catch (e) {
          console.error("Failed to process gallery image", e);
        }
      }

      if (newBase64Images.length > 0) {
        await handleAdd({
          title: 'Gallery Upload',
          content: '',
          imageUrl: newBase64Images[0],
          imageUrls: newBase64Images,
          isGalleryOnly: true
        });
      }
    } finally {
      setIsUploadingGallery(false);
      event.target.value = '';
    }
  };

  return (
    <main className="relative min-h-[100dvh]">
      {/* 3D Background */}
      <ErrorBoundary>
        <CanvasScene memories={memories} />
      </ErrorBoundary>

      {/* Radial gradient vignette overlay */}
      <div
        className="fixed top-0 left-0 w-screen h-screen -z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {isAuthenticated === false && (
        <LoginOverlay onLoginSuccess={handleLoginSuccess} />
      )}

      {isAuthenticated === true && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex flex-col min-h-screen"
        >
          {/* Floating Apple-style Header */}
          <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <motion.div
              layout
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className={`pointer-events-auto flex items-center p-1 rounded-full border shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl saturate-150 transition-colors duration-500 max-w-[95vw] ${
                isScrolled
                  ? 'bg-black/60 border-white/10'
                  : 'bg-white/5 border-white/5'
              }`}
            >
              {/* Tabs switcher (Notes / Life Updates) */}
              <div className="relative flex bg-white/5 p-0.5 rounded-full border border-white/5">
                <button
                  onClick={() => setActiveTab('memories')}
                  className="relative flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 z-10 cursor-pointer"
                >
                  {activeTab === 'memories' && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute inset-0 bg-white/10 border border-white/5 rounded-full shadow-[0_2px_8px_rgba(255,255,255,0.05)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <LayoutGrid size={13} className="relative z-10 text-white" />
                  <span className="relative z-10 text-white">Notes</span>
                </button>
                <button
                  onClick={() => setActiveTab('gallery')}
                  className="relative flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 z-10 cursor-pointer"
                >
                  {activeTab === 'gallery' && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute inset-0 bg-white/10 border border-white/5 rounded-full shadow-[0_2px_8px_rgba(255,255,255,0.05)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <ImageIcon size={13} className="relative z-10 text-white" />
                  <span className="relative z-10 text-white">Updates</span>
                </button>
              </div>

              {/* Separator & Notes-only controls - only if activeTab is 'memories' */}
              <AnimatePresence initial={false}>
                {activeTab === 'memories' && (
                  <motion.div
                    key="notes-controls"
                    layout
                    initial={{ opacity: 0, width: 0, x: -15, marginLeft: 0 }}
                    animate={{ opacity: 1, width: 'auto', x: 0, marginLeft: 12 }}
                    exit={{ opacity: 0, width: 0, x: -15, marginLeft: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="flex items-center gap-2 sm:gap-2.5 overflow-hidden"
                  >
                    {/* Separator / Divider */}
                    <div className="w-px h-4 bg-white/15 self-center shrink-0" />

                    {/* View toggle: Grid / Timeline */}
                    <div className="relative flex bg-white/5 p-0.5 rounded-full border border-white/5 shrink-0">
                      <button
                        onClick={() => setNotesView('grid')}
                        title="Grid view"
                        className="relative p-1.5 rounded-full transition-colors duration-200 z-10 flex items-center justify-center cursor-pointer"
                      >
                        {notesView === 'grid' && (
                          <motion.div
                            layoutId="active-view"
                            className="absolute inset-0 bg-white/10 border border-white/5 rounded-full shadow-[0_2px_8px_rgba(255,255,255,0.05)]"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <LayoutGrid size={13} className="relative z-10 text-white" />
                      </button>
                      <button
                        onClick={() => setNotesView('timeline')}
                        title="Timeline view"
                        className="relative p-1.5 rounded-full transition-colors duration-200 z-10 flex items-center justify-center cursor-pointer"
                      >
                        {notesView === 'timeline' && (
                          <motion.div
                            layoutId="active-view"
                            className="absolute inset-0 bg-white/10 border border-white/5 rounded-full shadow-[0_2px_8px_rgba(255,255,255,0.05)]"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <AlignLeft size={13} className="relative z-10 text-white" />
                      </button>
                    </div>

                    {/* Sort toggle */}
                    <button
                      onClick={() => setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'))}
                      title={sortOrder === 'newest' ? 'Showing newest first' : 'Showing oldest first'}
                      className="relative flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-full text-xs font-medium text-white/60 hover:text-white transition-all duration-200 cursor-pointer active:scale-95 shrink-0"
                    >
                      <ArrowUpDown size={11} className="text-white/60" />
                      <span className="hidden sm:inline">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Header */}
          <header className="relative z-10 pt-[max(6.5rem,env(safe-area-inset-top)+3.5rem)] pb-8 text-center px-6 flex flex-col items-center">
            <AnimatePresence>
              {titleVisible && (
                <motion.div
                  initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center"
                >
                  {/* Cosmic Orbit Divider */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 0.8, scale: 1 }}
                    transition={{ delay: 0.2, duration: 1 }}
                    className="flex items-center gap-4 mb-6"
                  >
                    <div className="w-8 sm:w-12 h-px bg-gradient-to-r from-transparent to-white/40" />
                    <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.6em] text-white/80 font-light ml-[0.3em]">
                      Our Eternal Space
                    </span>
                    <div className="w-8 sm:w-12 h-px bg-gradient-to-l from-transparent to-white/40" />
                  </motion.div>

                  {/* Ethereal Glowing Title */}
                  <motion.h1
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="font-serif text-3xl sm:text-6xl font-extralight tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/30 text-glow leading-none select-none"
                  >
                    MEMORY OF US
                  </motion.h1>

                  {/* Starry Poetic Subtitle */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1.8 }}
                    className="text-white/40 text-[10px] sm:text-[12px] font-light tracking-[0.18em] max-w-xl mx-auto leading-relaxed uppercase mt-6 px-4"
                  >
                    A celestial sanctuary capturing our most precious moments, suspended like constellations in an infinite universe.
                  </motion.p>

                  {/* Constellation Statistics Counter */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1, duration: 1.2 }}
                    className="mt-8 flex items-center justify-center gap-6 sm:gap-8 text-[9px] sm:text-[10px] font-light tracking-[0.25em] text-white/25 uppercase"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/80 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
                      {memories.filter(m => !m.isGalleryOnly).length} Constellations
                    </span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400/80 animate-pulse shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
                      {allImages.length} Artifacts
                    </span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          {/* Search bar */}
          <section className="relative z-10 px-4 max-w-3xl mx-auto mb-10 w-full">
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-white/50 transition-colors duration-500">
                <Search size={14} strokeWidth={1.5} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search constellations & memories..."
                className="w-full bg-white/[0.015] border border-white/[0.06] hover:border-white/[0.1] focus:border-white/[0.18] rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:bg-white/[0.035] focus:shadow-[0_0_40px_rgba(255,255,255,0.01)] transition-all duration-500 font-light backdrop-blur-md"
              />
            </div>
          </section>

          {/* Main Content Area */}
          <section className="relative z-10 px-4 pb-safe max-w-4xl mx-auto" style={{ paddingBottom: 'max(8rem, calc(env(safe-area-inset-bottom) + 7rem))' }}>
            <AnimatePresence mode="wait">
              {activeTab === 'memories' ? (
                <motion.div
                  key={`memories-${notesView}-${sortOrder}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {filteredMemories.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-col items-center justify-center py-24 gap-4 text-center"
                    >
                      <p className="text-white/40 text-sm max-w-[220px]">
                        {searchQuery ? "No memories match your search." : "No memories yet. Tap the + button to add your first one."}
                      </p>
                    </motion.div>
                  ) : notesView === 'grid' ? (
                    /* ── GRID VIEW ── */
                    <div className="columns-1 sm:columns-2 md:columns-3 gap-6 pt-4">
                      {filteredMemories.map((memory, i) => (
                        <MemoryCard
                          key={memory.id}
                          memory={memory}
                          index={i}
                          onDelete={handleDelete}
                          onUpdate={handleUpdate}
                          isInitialLoad={initialLoad}
                        />
                      ))}
                    </div>
                  ) : (
                    /* ── TIMELINE VIEW ── */
                    <div className="relative pt-4">
                      {/* Vertical spine line */}
                      <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />

                      {filteredMemories.map((memory, i) => {
                        const isLeft = i % 2 === 0;
                        return (
                          <motion.div
                            key={memory.id}
                            initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(i * 0.07, 0.5), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className={`relative flex items-start mb-8 sm:mb-10 ${
                              isLeft
                                ? 'flex-row pl-10 sm:pl-0 sm:pr-[calc(50%+1.5rem)]'
                                : 'flex-row pl-10 sm:pl-[calc(50%+1.5rem)] sm:pr-0'
                            }`}
                          >
                            {/* Timeline dot */}
                            <div className={`absolute top-5 flex items-center justify-center ${
                              isLeft
                                ? 'left-[9px] sm:left-1/2 sm:-translate-x-1/2'
                                : 'left-[9px] sm:left-1/2 sm:-translate-x-1/2'
                            }`}>
                              <div className="w-3 h-3 rounded-full bg-white/20 border-2 border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                            </div>

                            {/* Card */}
                            <div className="w-full">
                              <MemoryCard
                                memory={memory}
                                index={i}
                                onDelete={handleDelete}
                                onUpdate={handleUpdate}
                                isInitialLoad={false}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="gallery-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between items-end mb-4 px-1">
                    <p className="text-white/40 text-sm">{allImages.length} photos</p>
                    <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${isUploadingGallery
                        ? 'bg-white/5 text-white/30 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/20 text-white shadow-lg'
                      }`}>
                      <Upload size={14} />
                      {isUploadingGallery ? 'Uploading...' : 'Upload Photos'}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={isUploadingGallery}
                        onChange={handleGalleryUpload}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {allImages.length === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
                        <p className="text-white/40 text-sm">No images found.</p>
                      </div>
                    ) : (
                      allImages.map((imgData, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: Math.min(i * 0.05, 0.5) }}
                          className="aspect-square rounded-xl overflow-hidden border border-white/10 group cursor-pointer relative"
                          onClick={() => setFullGalleryImage(imgData)}
                        >
                          <img src={imgData.url} alt="Gallery" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this photo?')) {
                                handleDeleteGalleryImage(imgData.memoryId, imgData.imageIndex);
                              }
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white/70 hover:text-red-400 hover:bg-black/80 rounded-full backdrop-blur-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10"
                            aria-label="Delete from gallery"
                          >
                            <Trash2 size={14} />
                          </button>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Add Memory FAB */}
          <AddMemoryModal onAdd={handleAdd} />

          {/* Music Player */}
          <AudioPlayer />

          {/* Full Size Gallery Image Modal */}
          <AnimatePresence>
            {fullGalleryImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-lg"
                onClick={() => setFullGalleryImage(null)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setFullGalleryImage(null); }}
                  className="absolute top-4 right-4 z-20 text-white/60 hover:text-white transition-colors bg-black/30 p-2 rounded-full backdrop-blur-md touch-target flex items-center justify-center"
                  aria-label="Close full size"
                >
                  <X size={20} />
                </button>

                {currentGalleryIndex > 0 && (
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-4 z-20 text-white/50 hover:text-white transition-colors bg-black/20 hover:bg-black/40 p-3 rounded-full backdrop-blur-md hidden sm:flex items-center justify-center"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}

                {currentGalleryIndex < allImages.length - 1 && (
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 z-20 text-white/50 hover:text-white transition-colors bg-black/20 hover:bg-black/40 p-3 rounded-full backdrop-blur-md hidden sm:flex items-center justify-center"
                  >
                    <ChevronRight size={24} />
                  </button>
                )}

                <motion.div
                  key={fullGalleryImage.url} // Forces re-animation when image changes
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="relative w-full h-full p-4 sm:p-8 flex flex-col items-center justify-center touch-none"
                  onClick={(e) => e.stopPropagation()}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = Math.abs(offset.x) * velocity.x;
                    if (swipe < -1000) {
                      handleNextImage();
                    } else if (swipe > 1000) {
                      handlePrevImage();
                    }
                  }}
                >
                  <img
                    src={fullGalleryImage.url}
                    alt="Gallery Full Size"
                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing mb-6 pointer-events-none"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this photo?')) {
                        handleDeleteGalleryImage(fullGalleryImage.memoryId, fullGalleryImage.imageIndex);
                      }
                    }}
                    className="bg-red-500/20 hover:bg-red-500/40 text-red-100 border border-red-500/30 backdrop-blur-md px-6 py-2.5 rounded-full transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Trash2 size={16} />
                    <span className="text-sm font-medium">Delete Photo</span>
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </main>
  );
}
