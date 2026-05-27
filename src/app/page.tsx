'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Image as ImageIcon, LayoutGrid, X, Trash2, Upload, ChevronLeft, ChevronRight, ArrowUpDown, AlignLeft, Sun, Moon, Sunset } from 'lucide-react';
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
  const [isSpaceBlurred, setIsSpaceBlurred] = useState(false);
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
  const [cameraFocusId, setCameraFocusId] = useState<string | null>(null);
  const [timeTheme, setTimeTheme] = useState<'dawn' | 'sunset' | 'midnight'>('midnight');
  const [isMobile, setIsMobile] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isNavbarHovered, setIsNavbarHovered] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    }
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 15) {
      setTimeTheme('dawn');
    } else if (hour >= 15 && hour < 19) {
      setTimeTheme('sunset');
    } else {
      setTimeTheme('midnight');
    }
  }, []);

  const cycleTimeTheme = useCallback(() => {
    setTimeTheme((prev) => {
      if (prev === 'dawn') return 'sunset';
      if (prev === 'sunset') return 'midnight';
      return 'dawn';
    });
  }, []);

  const [activeModals, setActiveModals] = useState<Record<string, boolean>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showBlackCurtain, setShowBlackCurtain] = useState(false);

  const handleModalToggle = useCallback((id: string, isOpen: boolean) => {
    setActiveModals((prev) => {
      if (prev[id] === isOpen) return prev;
      return { ...prev, [id]: isOpen };
    });
    if (isOpen) {
      setActiveMemoryId(id);
    } else {
      setActiveMemoryId((prev) => (prev === id ? null : prev));
    }
  }, []);

  const isAnyCardModalOpen = useMemo(() => {
    return Object.values(activeModals).some(Boolean);
  }, [activeModals]);

  const isHideHeader = isAnyCardModalOpen || !!fullGalleryImage || isAddModalOpen;
  const isCollapsed = isScrolled && !isNavbarHovered && !isSearchActive;

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
      setIsNavbarHovered(false);
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

  // Unified camera focus controller: strictly reactive, no race conditions, perfectly synchronizes search and modal state
  useEffect(() => {
    if (activeMemoryId) {
      // 1. If a note modal is open, camera MUST stay focused on this open note's star (close zoom)
      setCameraFocusId(activeMemoryId);
    } else if (searchQuery.trim() !== '') {
      // 2. If no modal is open but user is searching, focus on the matching keyword star (aerial zoom)
      const matched = memories.find(m =>
        !m.isGalleryOnly &&
        (m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.content.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setCameraFocusId(matched ? matched.id : null);
    } else {
      // 3. Otherwise, return to overview float
      setCameraFocusId(null);
    }
  }, [searchQuery, memories, activeMemoryId]);

  const handleLoginSuccess = () => {
    localStorage.setItem('memory_auth', 'true');
    setIsAuthenticated(true);
    // Show black curtain that slowly fades out to reveal the website
    setShowBlackCurtain(true);
    setTimeout(() => setShowBlackCurtain(false), 80);
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
    const currentDate = new Date().toLocaleDateString('en-US', {
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
      {/* Dynamic Background Gradients Cross-fade */}
      <div className="fixed inset-0 -z-20 pointer-events-none">
        {/* Dawn Layer */}
        <div
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{
            background: 'linear-gradient(to bottom right, #090921, #23123a)',
            opacity: timeTheme === 'dawn' ? 1 : 0,
          }}
        />
        {/* Sunset Layer */}
        <div
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{
            background: 'linear-gradient(to bottom right, #11031c, #300a25)',
            opacity: timeTheme === 'sunset' ? 1 : 0,
          }}
        />
        {/* Midnight Layer */}
        <div
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{
            background: 'linear-gradient(to bottom right, #030712, #0b1329)',
            opacity: timeTheme === 'midnight' ? 1 : 0,
          }}
        />
      </div>

      {/* 3D Background with Zorin-esque spatial blur (DoF) and subtle scale interpolation */}
      <div
        className="canvas-wrapper fixed top-0 left-0 w-screen h-screen -z-10 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          filter: isSpaceBlurred && !isMobile ? 'blur(6px) saturate(85%)' : 'blur(0px) saturate(100%)',
          transform: isSpaceBlurred ? 'scale(1.025)' : 'scale(1)',
        }}
      >
        <ErrorBoundary>
          <CanvasScene
            memories={filteredMemories}
            activeMemoryId={cameraFocusId}
            onSelectMemory={(id) => {
              // Clicking a star: move camera AND open the modal
              setCameraFocusId(id);
              setActiveMemoryId(id);
            }}
            timeTheme={timeTheme}
            isSearchZoom={searchQuery.trim() !== '' && cameraFocusId !== null && activeMemoryId !== cameraFocusId}
          />
        </ErrorBoundary>
      </div>

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

      {/* Black reveal curtain — fades out after login to smoothly reveal the website */}
      <AnimatePresence>
        {showBlackCurtain && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[190] bg-black pointer-events-none"
          />
        )}
      </AnimatePresence>

      {isAuthenticated === true && (
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header */}
          <AnimatePresence>
            {!isHideHeader && (
              <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 pt-[max(3.5rem,env(safe-area-inset-top)+0.5rem)] pb-4 text-center px-6"
              >
                <AnimatePresence>
                  {titleVisible && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    >
                      <motion.div
                        className="flex flex-col items-center justify-center"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {/* Celestial Orbit Divider */}
                        <div className="flex items-center gap-4 mb-2 opacity-90">
                          <span
                            className="text-[10px] sm:text-[12px] uppercase tracking-[0.55em] text-white font-extralight ml-[0.25em]"
                            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                          >
                            Final Chapter
                          </span>
                        </div>

                        {/* Starry Text */}
                        <motion.p
                          className="flex items-center justify-center gap-3 text-white/40 text-[11px] sm:text-[13px] font-light tracking-[0.2em] uppercase w-full max-w-2xl mx-auto"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.8, duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                        >
                        </motion.p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.header>
            )}
          </AnimatePresence>

          {/* Floating Apple-style Header (Dynamic Island) */}
          <AnimatePresence>
            {!isHideHeader && (
              <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                className="sticky top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none mb-3"
              >
                <motion.div
                  layout
                  onMouseEnter={() => setIsNavbarHovered(true)}
                  onMouseLeave={() => setIsNavbarHovered(false)}
                  onClick={() => {
                    if (isCollapsed && !isNavbarHovered) {
                      setIsNavbarHovered(true);
                    }
                  }}
                  className={`pointer-events-auto flex items-center shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl saturate-150 border transition-all duration-300 max-w-[95vw] ${
                    isSearchActive
                      ? 'w-[90vw] max-w-[420px] h-[46px] justify-between bg-black/75 border-white/20 px-3 py-1 rounded-[22px]'
                      : isCollapsed
                      ? 'w-auto h-[40px] bg-black/85 border-white/20 px-2 py-0.5 rounded-full cursor-pointer'
                      : 'w-auto h-[46px] bg-black/60 border-white/10 p-1 rounded-full'
                  }`}
                  transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                >
                  <AnimatePresence mode="wait">
                    {!isSearchActive ? (
                      /* Standard mode (expanded / collapsed) */
                      <motion.div
                        key="nav-standard-flow"
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center"
                      >
                        {/* Tabs switcher (Notes / Life Updates) */}
                        <motion.div
                          layout
                          className="relative flex bg-white/5 p-0.5 rounded-full border border-white/5 shrink-0"
                        >
                          <motion.button
                            layout
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab('memories');
                            }}
                            className="relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 z-10 cursor-pointer"
                          >
                            {activeTab === 'memories' && (
                              <motion.div
                                layoutId="active-tab"
                                className="absolute inset-0 bg-white/10 border border-white/5 rounded-full shadow-[0_2px_8px_rgba(255,255,255,0.05)]"
                                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                              />
                            )}
                            <LayoutGrid size={13} className="relative z-10 text-white shrink-0" />
                            <AnimatePresence initial={false}>
                              {!isCollapsed && (
                                <motion.span
                                  initial={{ width: 0, opacity: 0 }}
                                  animate={{ width: 'auto', opacity: 1, marginLeft: 4 }}
                                  exit={{ width: 0, opacity: 0 }}
                                  transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                                  className="relative z-10 text-white overflow-hidden whitespace-nowrap hidden sm:inline-block"
                                >
                                  Notes
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </motion.button>

                          <motion.button
                            layout
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab('gallery');
                            }}
                            className="relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 z-10 cursor-pointer"
                          >
                            {activeTab === 'gallery' && (
                              <motion.div
                                layoutId="active-tab"
                                className="absolute inset-0 bg-white/10 border border-white/5 rounded-full shadow-[0_2px_8px_rgba(255,255,255,0.05)]"
                                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                              />
                            )}
                            <ImageIcon size={13} className="relative z-10 text-white shrink-0" />
                            <AnimatePresence initial={false}>
                              {!isCollapsed && (
                                <motion.span
                                  initial={{ width: 0, opacity: 0 }}
                                  animate={{ width: 'auto', opacity: 1, marginLeft: 4 }}
                                  exit={{ width: 0, opacity: 0 }}
                                  transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                                  className="relative z-10 text-white overflow-hidden whitespace-nowrap hidden sm:inline-block"
                                >
                                  Updates
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        </motion.div>

                        {/* Separator & Notes-only controls - only if activeTab is 'memories' AND not collapsed */}
                        <AnimatePresence initial={false}>
                          {activeTab === 'memories' && !isCollapsed && (
                            <motion.div
                              key="notes-controls"
                              layout
                              initial={{ opacity: 0, width: 0, x: -10, marginLeft: 0 }}
                              animate={{ opacity: 1, width: 'auto', x: 0, marginLeft: 8 }}
                              exit={{ opacity: 0, width: 0, x: -10, marginLeft: 0 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                              className="flex items-center gap-1.5 sm:gap-2 overflow-hidden shrink-0"
                            >
                              {/* Separator / Divider */}
                              <motion.div layout className="w-px h-4 bg-white/15 self-center shrink-0" />

                              {/* View toggle: Grid / Timeline */}
                              <motion.div layout className="relative flex bg-white/5 p-0.5 rounded-full border border-white/5 shrink-0">
                                <motion.button
                                  layout
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNotesView('grid');
                                  }}
                                  title="Grid view"
                                  className="relative p-1.5 rounded-full transition-colors duration-200 z-10 flex items-center justify-center cursor-pointer"
                                >
                                  {notesView === 'grid' && (
                                    <motion.div
                                      layoutId="active-view"
                                      className="absolute inset-0 bg-white/10 border border-white/5 rounded-full shadow-[0_2px_8px_rgba(255,255,255,0.05)]"
                                      transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                                    />
                                  )}
                                  <LayoutGrid size={13} className="relative z-10 text-white" />
                                </motion.button>
                                <motion.button
                                  layout
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNotesView('timeline');
                                  }}
                                  title="Timeline view"
                                  className="relative p-1.5 rounded-full transition-colors duration-200 z-10 flex items-center justify-center cursor-pointer"
                                >
                                  {notesView === 'timeline' && (
                                    <motion.div
                                      layoutId="active-view"
                                      className="absolute inset-0 bg-white/10 border border-white/5 rounded-full shadow-[0_2px_8px_rgba(255,255,255,0.05)]"
                                      transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                                    />
                                  )}
                                  <AlignLeft size={13} className="relative z-10 text-white" />
                                </motion.button>
                              </motion.div>

                              {/* Sort toggle */}
                              <motion.button
                                layout
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'));
                                }}
                                title={sortOrder === 'newest' ? 'Showing newest first' : 'Showing oldest first'}
                                className="relative flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-full text-xs font-medium text-white/60 hover:text-white transition-all duration-200 cursor-pointer active:scale-95 shrink-0"
                              >
                                <ArrowUpDown size={11} className="text-white/60" />
                                <span className="hidden sm:inline">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
                              </motion.button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Divider and Search Trigger Button */}
                        <motion.div layout className="w-px h-4 bg-white/15 mx-1.5 sm:mx-2 shrink-0" />
                        <motion.button
                          layout
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSearchActive(true);
                          }}
                          title="Cari memori..."
                          className="relative flex items-center justify-center p-2 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-full text-white/70 hover:text-white transition-all duration-200 cursor-pointer active:scale-95 shrink-0"
                        >
                          <Search size={12} />
                          {searchQuery && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                          )}
                        </motion.button>

                        {/* Divider and Theme Selector */}
                        <motion.div layout className="w-px h-4 bg-white/15 mx-1.5 sm:mx-2 shrink-0" />
                        <motion.button
                          layout
                          onClick={(e) => {
                            e.stopPropagation();
                            cycleTimeTheme();
                          }}
                          title="Change Sky Atmosphere"
                          className="relative flex items-center justify-center p-2 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-full text-white/70 hover:text-white transition-all duration-200 cursor-pointer active:scale-95 shrink-0 mr-1 ml-0.5"
                        >
                          {timeTheme === 'dawn' && <Sun size={12} className="text-amber-300 animate-pulse" />}
                          {timeTheme === 'sunset' && <Sunset size={12} className="text-rose-400" />}
                          {timeTheme === 'midnight' && <Moon size={12} className="text-indigo-200" />}
                        </motion.button>
                      </motion.div>
                    ) : (
                      /* Search state */
                      <motion.div
                        key="search-mode-content"
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-2 w-full animate-in fade-in-50 duration-200"
                      >
                        <Search size={13} className="text-white/40 shrink-0 ml-1" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Nyari apa cil?"
                          autoFocus
                          className="w-full bg-transparent border-none text-xs text-white placeholder-white/30 focus:outline-none font-light py-1"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="p-1 text-white/40 hover:text-white/80 transition-colors cursor-pointer shrink-0"
                          >
                            <X size={12} />
                          </button>
                        )}
                        <div className="w-px h-4 bg-white/15 shrink-0 mx-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSearchActive(false);
                            setSearchQuery('');
                          }}
                          className="text-[11px] font-medium text-white/50 hover:text-white transition-colors cursor-pointer shrink-0 mr-1"
                        >
                          Batal
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content Area */}
          <section className="relative z-10 px-4 pb-safe max-w-4xl mx-auto" style={{ paddingBottom: 'max(8rem, calc(env(safe-area-inset-bottom) + 7rem))' }}>
            <AnimatePresence mode="wait">
              {activeTab === 'memories' ? (
                <motion.div
                  key="memories-main-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {filteredMemories.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col items-center justify-center py-20 px-6 text-center relative overflow-hidden"
                    >
                      {/* Ethereal background aura glow */}
                      <div className="absolute w-48 h-48 rounded-full bg-violet-500/5 blur-[80px] pointer-events-none -z-10" />

                      {/* Interactive Constellation SVG */}
                      <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
                        <svg width="120" height="120" viewBox="0 0 120 120" className="text-white/15">
                          {/* Connection Lines */}
                          <motion.line
                            x1="20" y1="50" x2="50" y2="20"
                            stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, delay: 0.5 }}
                          />
                          <motion.line
                            x1="50" y1="20" x2="90" y2="40"
                            stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2.2, delay: 0.7 }}
                          />
                          <motion.line
                            x1="90" y1="40" x2="70" y2="85"
                            stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2.5, delay: 0.9 }}
                          />
                          <motion.line
                            x1="70" y1="85" x2="30" y2="90"
                            stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, delay: 1.1 }}
                          />
                          <motion.line
                            x1="30" y1="90" x2="20" y2="50"
                            stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2.3, delay: 1.3 }}
                          />

                          {/* Pulsing Constellation Stars */}
                          <motion.circle
                            cx="20" cy="50" r="3.5" fill="rgba(255,255,255,0.7)"
                            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                            transition={{ repeat: Infinity, duration: 3, delay: 0.2 }}
                          />
                          <motion.circle
                            cx="50" cy="20" r="4.5" fill="rgba(255,255,255,0.8)"
                            animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                            transition={{ repeat: Infinity, duration: 4.5, delay: 0.5 }}
                          />
                          <motion.circle
                            cx="90" cy="40" r="3" fill="rgba(255,255,255,0.6)"
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 3.5, delay: 0.8 }}
                          />
                          <motion.circle
                            cx="70" cy="85" r="4" fill="rgba(255,255,255,0.75)"
                            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                            transition={{ repeat: Infinity, duration: 4, delay: 1.1 }}
                          />
                          <motion.circle
                            cx="30" cy="90" r="3.5" fill="rgba(255,255,255,0.7)"
                            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                            transition={{ repeat: Infinity, duration: 3.8, delay: 1.4 }}
                          />
                        </svg>

                        {/* Floating Center Nebula Glow */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <motion.div
                            animate={{
                              scale: [0.9, 1.1, 0.9],
                              opacity: [0.2, 0.4, 0.2]
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 5,
                              ease: "easeInOut"
                            }}
                            className="w-16 h-16 rounded-full bg-indigo-500/20 blur-[15px]"
                          />
                        </div>
                      </div>

                      {/* Content copywriting */}
                      <h3 className="font-serif text-white/80 text-base font-medium mb-2 tracking-wide">
                        {searchQuery ? "No memories found" : "The memory sky is still empty"}
                      </h3>
                      <p className="text-white/40 text-xs max-w-[260px] leading-relaxed font-light font-sans">
                        {searchQuery
                          ? "Try searching with different keywords to find the moment you're looking for."
                          : "Every story we share is precious. Tap the + button on the bottom left to write your first memory."
                        }
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
                          onFocusChange={setIsSpaceBlurred}
                          onModalToggle={(isOpen) => handleModalToggle(memory.id, isOpen)}
                          isExpanded={activeMemoryId === memory.id}
                          onClose={() => handleModalToggle(memory.id, false)}
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
                            className={`relative flex items-start mb-8 sm:mb-10 group ${isLeft
                              ? 'flex-row pl-10 sm:pl-0 sm:pr-[calc(50%+1.5rem)]'
                              : 'flex-row pl-10 sm:pl-[calc(50%+1.5rem)] sm:pr-0'
                              }`}
                          >
                            {/* Timeline dot */}
                            <div className={`absolute top-5 flex items-center justify-center z-10 ${isLeft
                              ? 'left-[9px] sm:left-1/2 sm:-translate-x-1/2'
                              : 'left-[9px] sm:left-1/2 sm:-translate-x-1/2'
                              }`}>
                              <div className="w-3 h-3 rounded-full bg-white/20 border-2 border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.3)] group-hover:scale-125 group-hover:border-white/80 transition-all duration-500" />
                            </div>

                            {/* Horizontal constellation connector line */}
                            <div className={`absolute top-[26px] hidden sm:block h-px w-6 bg-gradient-to-r transition-all duration-700 pointer-events-none ${isLeft
                              ? 'right-0 from-white/25 to-transparent group-hover:from-white/60 group-hover:scale-x-125 origin-right'
                              : 'left-0 from-transparent to-white/25 group-hover:to-white/60 group-hover:scale-x-125 origin-left'
                              }`} />

                            {/* Card */}
                            <div className="w-full">
                              <MemoryCard
                                memory={memory}
                                index={i}
                                onDelete={handleDelete}
                                onUpdate={handleUpdate}
                                isInitialLoad={false}
                                onFocusChange={setIsSpaceBlurred}
                                onModalToggle={(isOpen) => handleModalToggle(memory.id, isOpen)}
                                isExpanded={activeMemoryId === memory.id}
                                onClose={() => handleModalToggle(memory.id, false)}
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
          <AddMemoryModal onAdd={handleAdd} isVisible={!isHideHeader} onModalToggle={setIsAddModalOpen} />

          {/* Music Player */}
          <AudioPlayer visible={!isHideHeader} />

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
                    className="absolute left-4 z-20 text-white/50 hover:text-white transition-colors bg-black/20 hover:bg-black/40 p-3 rounded-full backdrop-blur-md flex items-center justify-center"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}

                {currentGalleryIndex < allImages.length - 1 && (
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 z-20 text-white/50 hover:text-white transition-colors bg-black/20 hover:bg-black/40 p-3 rounded-full backdrop-blur-md flex items-center justify-center"
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
                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing mb-4 pointer-events-none"
                  />
                  {/* Swipe dots — visible on touch devices instead of arrows */}
                  {allImages.length > 1 && (
                    <div className="swipe-hint items-center justify-center gap-1.5 mb-4">
                      {allImages.map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-full transition-all duration-300 ${
                            i === currentGalleryIndex
                              ? 'w-4 h-1.5 bg-white/80'
                              : 'w-1.5 h-1.5 bg-white/30'
                          }`}
                        />
                      ))}
                    </div>
                  )}
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
        </div>
      )}
    </main>
  );
}
