'use client';
import { Canvas } from '@react-three/fiber';
import ParticleField from './ParticleField';
import SpaceObjects from './SpaceObjects';
import NebulaCloud from './NebulaCloud';
import Constellation from './Constellation';
import type { Memory } from '@/app/actions';

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
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -10 }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 60 }} dpr={[1, 1.5]} gl={{ powerPreference: "high-performance", antialias: false, alpha: true }}>
                {/* Nebula renders first — deepest background layer */}
                <NebulaCloud timeTheme={timeTheme} />
                <ParticleField />
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
