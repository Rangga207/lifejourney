'use client';
import { useRef, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sphere, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { Memory } from '@/app/actions';

function OrbitingMercury() {
    const planetRef = useRef<THREE.Mesh>(null);
    const texture = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg');
    const { viewport } = useThree();

    // Check if device is in portrait/mobile view based on viewport aspect ratio
    const isMobile = viewport.width < viewport.height;

    // Adjust planet scale and position for mobile vs desktop
    const radius = isMobile ? 12 : 15;
    const posX = isMobile ? 6 : 16;
    const posY = isMobile ? -8 : -12;

    useFrame((_, delta) => {
        if (planetRef.current) {
            // Planet rotates on its own axis slowly, rendering the craters crossing the light
            planetRef.current.rotation.y += delta * 0.015;
            planetRef.current.rotation.z += delta * 0.002;

            // Simulating satellite orbit drift (gentle float)
            planetRef.current.position.y = posY + Math.sin(Date.now() * 0.0003) * 0.002;
        }
    });

    return (
        <group>
            {/* The massive planet close-up.
                Placed at bottom-right, creating a gorgeous massive crescent flyby look */}
            <Sphere ref={planetRef} args={[radius, 64, 64]} position={[posX, posY, -30]}>
                <meshStandardMaterial
                    map={texture}
                    bumpMap={texture}
                    bumpScale={0.03} // Drastically reduced: Stops 1K texture from looking jagged, faking 4K smoothness
                    roughness={0.65}
                    metalness={0.4} // Higher metalness for beautiful majestic specular glares
                    color="#ffffff"
                    onBeforeCompile={(shader) => {
                        shader.fragmentShader = shader.fragmentShader.replace(
                            `#include <map_fragment>`,
                            `
                            #ifdef USE_MAP
                                vec4 sampledColor = texture2D( map, vMapUv );
                                float v = sampledColor.r;
                                
                                // Smoothstep for ultra-HD fluid blending without sharp pixel edge transitions
                                float t1 = smoothstep(0.0, 0.4, v);
                                float t2 = smoothstep(0.35, 0.75, v);
                                float t3 = smoothstep(0.65, 1.0, v);
                                
                                // Premium Cinematic Palette
                                vec3 c_low = vec3(0.02, 0.04, 0.3);   // Intense Deep Space Blue
                                vec3 c_mid = vec3(0.12, 0.35, 0.95);  // Electric Royal Blue
                                vec3 c_high = vec3(0.8, 0.5, 0.15);   // Rich Copper
                                vec3 c_peak = vec3(1.0, 0.95, 0.6);   // Blinding Radiance Yellow
                                
                                vec3 finalColor = mix(c_low, c_mid, t1);
                                finalColor = mix(finalColor, c_high, t2);
                                finalColor = mix(finalColor, c_peak, t3);
                                
                                // Micro-contrast enhancer to simulate ultra-high resolution
                                finalColor += (v - 0.5) * 0.15;
                                
                                vec4 sampledDiffuseColor = vec4(finalColor, 1.0);
                                diffuseColor *= sampledDiffuseColor;
                            #endif
                            `
                        );
                    }}
                />
            </Sphere>

            {/* Cinematic Multilayered Atmospheric Glow to hide hard polygon edges */}
            <Sphere args={[radius + 0.2, 64, 64]} position={[posX, posY, -30]}>
                <meshBasicMaterial
                    color="#60a5fa"
                    transparent
                    opacity={0.05}
                    blending={THREE.AdditiveBlending}
                    side={THREE.BackSide}
                    depthWrite={false}
                />
            </Sphere>
            <Sphere args={[radius + 0.6, 32, 32]} position={[posX, posY, -30]}>
                <meshBasicMaterial
                    color="#1e3a8a"
                    transparent
                    opacity={0.03}
                    blending={THREE.AdditiveBlending}
                    side={THREE.BackSide}
                    depthWrite={false}
                />
            </Sphere>
        </group>
    );
}

export default function SpaceObjects({ memories = [] }: { memories?: Memory[] }) {
    const { viewport } = useThree();
    const shootingStarRef = useRef<THREE.Group>(null);
    const starMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const cometState = useRef({ life: 0, active: false });
    const isMobile = viewport.width < viewport.height;

    // Shooting star animation
    useFrame((state, delta) => {
        if (shootingStarRef.current && starMatRef.current) {
            const star = shootingStarRef.current;

            if (cometState.current.active) {
                // Glide gracefully across the screen
                const velocity = new THREE.Vector3(40, -18, 20);
                star.position.addScaledVector(velocity, delta);
                star.lookAt(star.position.clone().add(velocity));

                // Advance lifetime smoothly. At 0.4x it lasts precisely 2.5 seconds.
                cometState.current.life += delta * 0.4;

                // Smooth Fade-In and Fade-Out (Perfect Bell Curve / Sine Wave)
                // Opacity peaks softly at the middle of its lifetime. No more harsh popping!
                const smoothOpacity = Math.sin(cometState.current.life * Math.PI);
                starMatRef.current.opacity = smoothOpacity * 0.9;

                // Deactivate gracefully at the end of its life cycle
                if (cometState.current.life >= 1.0) {
                    cometState.current.active = false;
                    starMatRef.current.opacity = 0;
                }
            } else {
                // Very high chance to spawn again quickly
                if (Math.random() > 0.97) {
                    cometState.current.active = true;
                    cometState.current.life = 0;
                    star.position.set(-25 - Math.random() * 5, 12 + Math.random() * 8, -10 - Math.random() * 5);
                }
            }
        }
    });

    return (
        <group>
            {/* Cinematic Crescent Lighting System */}
            <ambientLight intensity={0.03} />

            {/* Dramatic sunlight blasting from the distant sun */}
            <directionalLight position={[-35, 25, -15]} intensity={3.5} color="#ffffff" />

            {/* Extremely faint blue starlight fill from the back */}
            <directionalLight position={[20, -10, -20]} intensity={0.15} color="#0284c7" />

            {/* Deep Space Nebula Glow (Subtle cosmic dust) */}
            <Sphere args={[50, 32, 32]} position={[0, 0, -45]}>
                <meshBasicMaterial
                    color="#4c1d95" // Deep cosmic purple
                    transparent
                    opacity={0.08}
                    blending={THREE.AdditiveBlending}
                    side={THREE.BackSide}
                    depthWrite={false}
                />
            </Sphere>

            <Suspense fallback={null}>
                <OrbitingMercury />
            </Suspense>

            {/* Shooting Star Group */}
            <group ref={shootingStarRef} position={[-40, 20, -20]}>
                {/* Using a highly stretched single sphere creates a beautiful seamless comet teardrop shape, 
                    replacing the chunky flat-bottomed cylinder! */}
                <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 12, 1]}>
                    <sphereGeometry args={[0.05, 16, 16]} />
                    <meshBasicMaterial ref={starMatRef} color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
                </mesh>
            </group>
        </group>
    );
}
