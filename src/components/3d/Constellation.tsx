'use client';
import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Memory } from '@/app/actions';

interface ConstellationProps {
    memories: Memory[];
    activeMemoryId: string | null;
    onSelectMemory: (id: string | null) => void;
    isSearchZoom?: boolean;
}

function MemoryStar({
    memory,
    position,
    isHovered,
    isActive,
    onClick,
    onHover,
    onBlur,
}: {
    memory: Memory;
    position: THREE.Vector3;
    isHovered: boolean;
    isActive: boolean;
    onClick: () => void;
    onHover: () => void;
    onBlur: () => void;
}) {
    const glowRef = useRef<THREE.Mesh>(null);
    const starRef = useRef<THREE.Mesh>(null);
    const orbitRefs = useRef<THREE.Group>(null);

    // Orbiting stardust configuration
    const orbitCount = 6;
    const orbitSpeed = useMemo(() => Array.from({ length: orbitCount }, () => Math.random() * 2.0 + 1.2), []);
    const orbitRadius = useMemo(() => Array.from({ length: orbitCount }, () => Math.random() * 0.16 + 0.14), []);
    const orbitPhase = useMemo(() => Array.from({ length: orbitCount }, () => Math.random() * Math.PI * 2), []);

    // Blending colors: neutral sky-blue/white (matching ParticleField space dust) and custom vibrant colors
    const vibrantColor = useMemo(() => new THREE.Color(memory.color || '#c084fc'), [memory.color]);
    const neutralColor = useMemo(() => new THREE.Color('#bae6fd'), []);

    // Interpolation references for blending/transitions
    const targetScale = (isHovered || isActive) ? 1.0 : 0.45;
    const targetEmissive = (isHovered || isActive) ? 2.0 : 0.25;
    const targetGlowOpacity = (isHovered || isActive) ? 0.22 : 0.0;
    const targetOrbitOpacity = (isHovered || isActive) ? 0.65 : 0.0;

    const currentScale = useRef(0.45);
    const currentEmissive = useRef(0.25);
    const currentGlowOpacity = useRef(0.0);
    const currentOrbitOpacity = useRef(0.0);

    useFrame((state, delta) => {
        const time = state.clock.getElapsedTime();
        
        // Dynamic smooth transitions
        const clampedDelta = Math.min(delta, 0.03);
        const t = 1.0 - Math.exp(-6.5 * clampedDelta);
        currentScale.current += (targetScale - currentScale.current) * t;
        currentEmissive.current += (targetEmissive - currentEmissive.current) * t;
        currentGlowOpacity.current += (targetGlowOpacity - currentGlowOpacity.current) * t;
        currentOrbitOpacity.current += (targetOrbitOpacity - currentOrbitOpacity.current) * t;

        // Normalized color interpolation factor (0 = small neutral, 1 = large vibrant)
        const colorT = Math.max(0, Math.min(1, (currentScale.current - 0.45) / (1.0 - 0.45)));

        if (starRef.current) {
            starRef.current.scale.setScalar(currentScale.current);
            starRef.current.rotation.y = time * 0.4;
            starRef.current.rotation.x = time * 0.15;
            
            const starMat = starRef.current.material as THREE.MeshStandardMaterial;
            if (starMat) {
                starMat.emissiveIntensity = currentEmissive.current;
                // Transition color dynamically
                starMat.color.copy(neutralColor).lerp(vibrantColor, colorT);
                starMat.emissive.copy(neutralColor).lerp(vibrantColor, colorT);
            }

            const floatOffset = Math.sin(time + memory.title.charCodeAt(0)) * 0.02;
            starRef.current.position.y = floatOffset;
        }

        if (glowRef.current) {
            const pulse = Math.sin(time * 2.5 + memory.title.charCodeAt(0)) * 0.2;
            glowRef.current.scale.setScalar(currentScale.current * (1.8 + pulse));
            const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
            if (glowMat) {
                glowMat.opacity = currentGlowOpacity.current;
                glowMat.color.copy(neutralColor).lerp(vibrantColor, colorT);
            }
        }

        if (orbitRefs.current) {
            const children = orbitRefs.current.children;
            for (let i = 0; i < children.length; i++) {
                const child = children[i] as THREE.Mesh;
                if (child) {
                    const speed = orbitSpeed[i];
                    // Orbit rings contract/expand based on selection scale
                    const rad = orbitRadius[i] * currentScale.current * 1.5;
                    const phase = orbitPhase[i];
                    const angle = time * speed + phase;
                    child.position.set(
                        Math.cos(angle) * rad,
                        Math.sin(angle) * rad * 0.4,
                        Math.sin(angle) * rad * 0.8
                    );
                    
                    const childMat = child.material as THREE.MeshBasicMaterial;
                    if (childMat) {
                        childMat.opacity = currentOrbitOpacity.current * (0.3 + Math.sin(time * 4 + i) * 0.2);
                        childMat.color.copy(neutralColor).lerp(vibrantColor, colorT);
                    }
                }
            }
        }
    });

    const starColor = memory.color || '#c084fc'; // Default to Dusk Violet accent

    return (
        <group position={position}>
            {/* Glowing atmosphere */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[0.26, 16, 16]} />
                <meshBasicMaterial
                    color={starColor}
                    transparent
                    opacity={0.0}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Glowing crystal core */}
            <mesh
                ref={starRef}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    onHover();
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    onBlur();
                }}
            >
                <octahedronGeometry args={[0.08, 1]} /> {/* Soft geodesic sphere-like crystal */}
                <meshStandardMaterial
                    color={starColor}
                    emissive={starColor}
                    emissiveIntensity={0.25}
                    roughness={0.0}
                    metalness={0.9}
                />
            </mesh>

            {/* Orbiting Stardust Cluster (blends star with the space dust environment) */}
            <group ref={orbitRefs}>
                {Array.from({ length: orbitCount }).map((_, idx) => (
                    <mesh key={idx}>
                        <sphereGeometry args={[0.013, 8, 8]} />
                        <meshBasicMaterial
                            color={starColor}
                            transparent
                            opacity={0.0}
                            blending={THREE.AdditiveBlending}
                            depthWrite={false}
                        />
                    </mesh>
                ))}
            </group>

            {/* Immersive Tooltip overlay */}
            {isHovered && (
                <Html distanceFactor={8} pointerEvents="none" zIndexRange={[100, 200]}>
                    <div className="bg-black/75 border border-white/10 px-3 py-1.5 rounded-xl text-white text-[11px] whitespace-nowrap shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-center gap-2 transform -translate-x-1/2 -translate-y-[150%] select-none transition-all duration-300">
                        <span className="font-serif font-medium tracking-wide truncate max-w-[120px]">{memory.title}</span>
                        <span className="text-white/40 text-[9px] font-mono shrink-0">{memory.date}</span>
                    </div>
                </Html>
            )}
        </group>
    );
}

function CameraRig({
    activeMemoryId,
    memories,
    points,
    isSearchZoom,
}: {
    activeMemoryId: string | null;
    memories: Memory[];
    points: THREE.Vector3[];
    isSearchZoom?: boolean;
}) {
    const { camera } = useThree();
    
    // Default home state camera positions
    const defaultPos = useMemo(() => new THREE.Vector3(0, 0, 5), []);
    const defaultLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);

    const targetPos = useRef(defaultPos.clone());
    const targetLookAt = useRef(defaultLookAt.clone());
    
    // Keep track of the current lookAt point to interpolate camera lookAt transitions smoothly
    const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

    useFrame((state, delta) => {
        const activeIndex = memories.findIndex((m) => m.id === activeMemoryId);
        
        if (activeMemoryId && activeIndex !== -1 && points[activeIndex]) {
            const nodePos = points[activeIndex];
            if (isSearchZoom) {
                // Gentle distant overview zoom for search — stays further away, wider angle
                targetPos.current.set(nodePos.x * 0.5, nodePos.y * 0.5 + 0.5, nodePos.z + 4.5);
            } else {
                // Precise fly-to on star click — beautiful 3/4 perspective
                targetPos.current.set(nodePos.x + 0.6, nodePos.y + 0.4, nodePos.z + 1.8);
            }
            targetLookAt.current.copy(nodePos);
        } else {
            // Home floating camera parallax based on mouse
            const mouseX = state.pointer.x * 1.5;
            const mouseY = state.pointer.y * 1.0;
            targetPos.current.set(mouseX, mouseY, 5);
            targetLookAt.current.set(0, 0, 0);
        }

        // Framerate-independent exponential smoothing
        // Clamp delta to avoid large jumps on frame drops (e.g. during modal opening)
        const clampedDelta = Math.min(delta, 0.03);
        // Search zoom: dreamy glide (0.85), star click: smooth fly-in (2.2), idle zoom-out: smooth drift (1.8)
        const lerpSpeed = activeMemoryId
            ? (isSearchZoom ? 0.85 : 2.2)
            : 1.8;
        const t = 1.0 - Math.exp(-lerpSpeed * clampedDelta);
        
        camera.position.lerp(targetPos.current, t);
        currentLookAt.current.lerp(targetLookAt.current, t);
        camera.lookAt(currentLookAt.current);
    });

    return null;
}

export default function Constellation({
    memories = [],
    activeMemoryId,
    onSelectMemory,
    isSearchZoom,
}: ConstellationProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Keep active documents pointer styles
    useEffect(() => {
        if (hoveredId) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'default';
        }
        return () => {
            document.body.style.cursor = 'default';
        };
    }, [hoveredId]);

    // Filter out gallery-only memories to only plot genuine diary notes
    const activeMemories = useMemo(() => {
        return memories.filter(m => !m.isGalleryOnly);
    }, [memories]);

    // Sort chronologically (oldest first to build the timeline path)
    const chronologicalMemories = useMemo(() => {
        return [...activeMemories].reverse();
    }, [activeMemories]);

    // Position algorithm: spiral galaxy trajectory stretching inwards in Z axis
    const points = useMemo(() => {
        return chronologicalMemories.map((_, i) => {
            const theta = i * 1.35; // Twist angle of the galaxy arms
            const radius = 2.0 + i * 0.9; // Radius expansion
            
            const x = Math.cos(theta) * radius;
            const y = Math.sin(theta) * radius * 0.75; // Slightly flattened orbit for 3D depth
            const z = -2.5 - i * 2.5; // Stretch backwards into outer space depth
            
            return new THREE.Vector3(x, y, z);
        });
    }, [chronologicalMemories]);

    // Render connection line points (converting THREE.Vector3[] to [number, number, number][])
    const linePoints = useMemo(() => {
        return points.map((p) => [p.x, p.y, p.z] as [number, number, number]);
    }, [points]);

    return (
        <group>
            {/* Rig to interpolate smooth camera movement */}
            <CameraRig
                activeMemoryId={activeMemoryId}
                memories={chronologicalMemories}
                points={points}
                isSearchZoom={isSearchZoom}
            />

            {/* Constellation Connection lines */}
            {linePoints.length > 1 && (
                <Line
                    points={linePoints}
                    color="#ffffff"
                    lineWidth={1.0}
                    transparent
                    opacity={0.16}
                    blending={THREE.AdditiveBlending}
                />
            )}

            {/* Memory Star Nodes */}
            {chronologicalMemories.map((memory, i) => {
                const pos = points[i];
                if (!pos) return null;
                return (
                    <MemoryStar
                        key={memory.id}
                        memory={memory}
                        position={pos}
                        isHovered={hoveredId === memory.id}
                        isActive={activeMemoryId === memory.id}
                        onClick={() => onSelectMemory(memory.id)}
                        onHover={() => setHoveredId(memory.id)}
                        onBlur={() => setHoveredId(null)}
                    />
                );
            })}
        </group>
    );
}
