'use client';
import { Canvas } from '@react-three/fiber';
import ParticleField from './ParticleField';
import SpaceObjects from './SpaceObjects';
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

export default function CanvasScene({ memories = [] }: { memories?: Memory[] }) {
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -10, pointerEvents: 'none' }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 60 }} dpr={[1, 1.5]} gl={{ powerPreference: "high-performance", antialias: false, alpha: true }}>
                <ParticleField />
                <SpaceObjects memories={memories} />
            </Canvas>
        </div>
    );
}
