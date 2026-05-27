'use client';
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import ParticleField from './ParticleField';
import SpaceObjects from './SpaceObjects';
import NebulaCloud from './NebulaCloud';
import Constellation from './Constellation';
import type { Memory } from '@/app/actions';

/* ── Detect mobile/low-end device once at module level ─────────────────
   We use navigator.userAgent (not viewport) so the Canvas itself can
   choose the right DPR before the first render, avoiding a resolution
   bump mid-scene that causes a full WebGL context rebuild on mobile.
─────────────────────────────────────────────────────────────────────── */
function getIsMobile() {
    if (typeof navigator === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// Mencegah console.error / warning bawaan dari Three.js versi terbaru yang belum sinkron dengan R3F
if (typeof console !== 'undefined') {
    const originalError = console.error;
    console.error = (...args: any[]) => {
        if (typeof args[0] === 'string') {
            if (args[0].includes('THREE.Clock')) return;
            if (args[0].includes('WebGL context')) return;
        }
        originalError(...args);
    };
}

interface CanvasSceneProps {
    memories?: Memory[];
    activeMemoryId?: string | null;
    onSelectMemory?: (id: string | null) => void;
    timeTheme?: 'dawn' | 'sunset' | 'midnight';
    isSearchZoom?: boolean;
}

export default function CanvasScene({ 
    memories = [], 
    activeMemoryId = null, 
    onSelectMemory = () => {},
    timeTheme = 'midnight',
    isSearchZoom = false,
}: CanvasSceneProps) {
    const isMobile = useMemo(() => getIsMobile(), []);

    // Adaptive quality: mobile devices use 1× DPR to save ~55% GPU fill-rate.
    // Desktop keeps [1, 1.5] for crisp retina rendering.
    const dpr = isMobile ? [1, 1] as [number, number] : [1, 1.5] as [number, number];

    // Adaptive particle count: keeps the visual feel, reduces draw cost.
    const particleCount = isMobile ? 420 : 900;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -10 }}>
            <Canvas
                camera={{ position: [0, 0, 5], fov: 60 }}
                dpr={dpr}
                gl={{ powerPreference: 'high-performance', antialias: false, alpha: true }}
            >
                {/* Nebula renders first — deepest background layer */}
                <NebulaCloud timeTheme={timeTheme} isMobile={isMobile} />
                <ParticleField count={particleCount} isMobile={isMobile} />
                <SpaceObjects memories={memories} timeTheme={timeTheme} />
                <Constellation 
                    memories={memories} 
                    activeMemoryId={activeMemoryId} 
                    onSelectMemory={onSelectMemory}
                    isSearchZoom={isSearchZoom}
                />
            </Canvas>
        </div>
    );
}
