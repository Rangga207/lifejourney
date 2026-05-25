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
}

function MemoryStar({
    memory,
    position,
    isHovered,
    onClick,
    onHover,
    onBlur,
}: {
    memory: Memory;
    position: THREE.Vector3;
    isHovered: boolean;
    onClick: () => void;
    onHover: () => void;
    onBlur: () => void;
}) {
    const glowRef = useRef<THREE.Mesh>(null);
    const starRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        
        if (glowRef.current) {
            // Pulse scale and opacity dynamically
            const pulse = Math.sin(time * 2.5 + memory.title.charCodeAt(0)) * 0.2;
            glowRef.current.scale.setScalar(1.6 + pulse);
            const material = glowRef.current.material as THREE.MeshBasicMaterial;
            if (material) {
                material.opacity = 0.12 + pulse * 0.05;
            }
        }
        
        if (starRef.current) {
            starRef.current.rotation.y = time * 0.4;
            starRef.current.rotation.x = time * 0.15;
            
            // Faint floating motion
            const floatOffset = Math.sin(time + memory.title.charCodeAt(0)) * 0.02;
            starRef.current.position.y = floatOffset;
        }
    });

    const starColor = memory.color || '#c084fc'; // Default to Dusk Violet accent

    return (
        <group position={position}>
            {/* Glowing atmosphere */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[0.24, 16, 16]} />
                <meshBasicMaterial
                    color={starColor}
                    transparent
                    opacity={0.15}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Solid crystal core */}
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
                <octahedronGeometry args={[0.13, 0]} />
                <meshStandardMaterial
                    color={starColor}
                    emissive={starColor}
                    emissiveIntensity={1.2}
                    roughness={0.1}
                    metalness={0.9}
                />
            </mesh>

            {/* Immersive Tooltip overlay */}
            {isHovered && (
                <Html distanceFactor={8} pointerEvents="none" zIndexRange={[100, 200]}>
                    <div className="bg-black/75 border border-white/10 px-3 py-1.5 rounded-xl text-white text-[11px] whitespace-nowrap shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-center gap-2 transform -translate-x-1/2 -translate-y-[150%] select-none transition-all duration-300">
                        <span className="text-xs shrink-0">{memory.emoji || '💌'}</span>
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
}: {
    activeMemoryId: string | null;
    memories: Memory[];
    points: THREE.Vector3[];
}) {
    const { camera } = useThree();
    
    // Default home state camera positions
    const defaultPos = useMemo(() => new THREE.Vector3(0, 0, 5), []);
    const defaultLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);

    const targetPos = useRef(defaultPos.clone());
    const targetLookAt = useRef(defaultLookAt.clone());
    
    // Keep track of the current lookAt point to interpolate camera lookAt transitions smoothly
    const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

    useFrame((state) => {
        const activeIndex = memories.findIndex((m) => m.id === activeMemoryId);
        
        if (activeMemoryId && activeIndex !== -1 && points[activeIndex]) {
            const nodePos = points[activeIndex];
            // Position camera close in front of the selected star node
            targetPos.current.set(nodePos.x, nodePos.y, nodePos.z + 2.2);
            targetLookAt.current.copy(nodePos);
        } else {
            // Home floating camera parallax based on mouse
            const mouseX = state.pointer.x * 1.5;
            const mouseY = state.pointer.y * 1.0;
            targetPos.current.set(mouseX, mouseY, 5);
            targetLookAt.current.set(0, 0, 0);
        }

        // Interpolate camera position
        camera.position.lerp(targetPos.current, 0.05);

        // Interpolate lookAt point
        currentLookAt.current.lerp(targetLookAt.current, 0.05);
        camera.lookAt(currentLookAt.current);
    });

    return null;
}

export default function Constellation({
    memories = [],
    activeMemoryId,
    onSelectMemory,
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
                        onClick={() => onSelectMemory(memory.id)}
                        onHover={() => setHoveredId(memory.id)}
                        onBlur={() => setHoveredId(null)}
                    />
                );
            })}
        </group>
    );
}
