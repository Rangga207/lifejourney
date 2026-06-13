'use client';
import { useRef, Suspense, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sphere, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { Memory } from '@/app/actions';

function OrbitingMercury({ timeTheme = 'midnight', isMobile: isMobileProp }: { timeTheme?: 'dawn' | 'sunset' | 'midnight', isMobile?: boolean }) {
    const planetRef = useRef<THREE.Mesh>(null);
    const shaderRef = useRef<any>(null);
    const texture = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg');
    const { viewport } = useThree();

    // Check if device is in portrait/mobile view based on viewport aspect ratio or prop
    const isMobile = isMobileProp ?? (viewport.width < viewport.height);

    // Adjust planet scale and position for mobile vs desktop
    const radius = isMobile ? 12 : 15;
    const posX = isMobile ? 6 : 16;
    const posY = isMobile ? -8 : -12;

    const planetColors = useMemo(() => {
        switch (timeTheme) {
            case 'dawn':
                return {
                    low: '#0f051c',   // Deep sunset purple
                    mid: '#581c87',   // Purple
                    high: '#d97706',  // Warm amber
                    peak: '#fef08a',  // Sunlight yellow
                    glow1: '#fef08a',
                    glow2: '#6b21a8'
                };
            case 'sunset':
                return {
                    low: '#17011a',   // Deep burgundy
                    mid: '#9d174d',   // Deep pink
                    high: '#f43f5e',  // Bright rose
                    peak: '#ffe4e6',  // Warm mist rose
                    glow1: '#fb7185',
                    glow2: '#831843'
                };
            case 'midnight':
            default:
                return {
                    low: '#020430',
                    mid: '#1e3a8a',
                    high: '#0284c7',
                    peak: '#38bdf8',
                    glow1: '#60a5fa',
                    glow2: '#1e3a8a'
                };
        }
    }, [timeTheme]);

    // Keep dynamic uniforms in sync when palette changes
    useEffect(() => {
        if (shaderRef.current) {
            shaderRef.current.uniforms.uLowColor.value.set(planetColors.low);
            shaderRef.current.uniforms.uMidColor.value.set(planetColors.mid);
            shaderRef.current.uniforms.uHighColor.value.set(planetColors.high);
            shaderRef.current.uniforms.uPeakColor.value.set(planetColors.peak);
        }
    }, [planetColors]);

    useFrame((state, delta) => {
        if (planetRef.current) {
            // Planet rotates on its own axis slowly, rendering the craters crossing the light
            planetRef.current.rotation.y += delta * 0.015;
            planetRef.current.rotation.z += delta * 0.002;

            // Simulating satellite orbit drift (gentle float) using high performance clock
            planetRef.current.position.y = posY + Math.sin(state.clock.getElapsedTime() * 0.3) * 0.002;
        }
    });

    return (
        <group>
            {/* The massive planet close-up.
                Placed at bottom-right, creating a gorgeous massive crescent flyby look */}
            <Sphere ref={planetRef} args={[radius, isMobile ? 32 : 64, isMobile ? 32 : 64]} position={[posX, posY, -30]}>
                <meshStandardMaterial
                    map={texture}
                    bumpMap={texture}
                    bumpScale={0.03} // Drastically reduced: Stops 1K texture from looking jagged, faking 4K smoothness
                    roughness={0.65}
                    metalness={0.4} // Higher metalness for beautiful majestic specular glares
                    color="#ffffff"
                    onBeforeCompile={(shader) => {
                        shader.uniforms.uLowColor = { value: new THREE.Color(planetColors.low) };
                        shader.uniforms.uMidColor = { value: new THREE.Color(planetColors.mid) };
                        shader.uniforms.uHighColor = { value: new THREE.Color(planetColors.high) };
                        shader.uniforms.uPeakColor = { value: new THREE.Color(planetColors.peak) };
                        
                        shaderRef.current = shader;
                        
                        shader.fragmentShader = `
                            uniform vec3 uLowColor;
                            uniform vec3 uMidColor;
                            uniform vec3 uHighColor;
                            uniform vec3 uPeakColor;
                        \n` + shader.fragmentShader;

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
                                
                                vec3 finalColor = mix(uLowColor, uMidColor, t1);
                                finalColor = mix(finalColor, uHighColor, t2);
                                finalColor = mix(finalColor, uPeakColor, t3);
                                
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
            <Sphere args={[radius + 0.2, isMobile ? 16 : 32, isMobile ? 16 : 32]} position={[posX, posY, -30]}>
                <meshBasicMaterial
                    color={planetColors.glow1}
                    transparent
                    opacity={0.05}
                    blending={THREE.AdditiveBlending}
                    side={THREE.BackSide}
                    depthWrite={false}
                />
            </Sphere>
            <Sphere args={[radius + 0.6, isMobile ? 8 : 16, isMobile ? 8 : 16]} position={[posX, posY, -30]}>
                <meshBasicMaterial
                    color={planetColors.glow2}
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

export default function SpaceObjects({ 
    memories = [], 
    timeTheme = 'midnight',
    isMobile = false
}: { 
    memories?: Memory[]; 
    timeTheme?: 'dawn' | 'sunset' | 'midnight'; 
    isMobile?: boolean;
}) {
    const { viewport } = useThree();
    const shootingStarRef = useRef<THREE.Group>(null);
    const starMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const cometState = useRef({ life: 0, active: false });

    // Resolve theme-based lighting settings
    const lighting = useMemo(() => {
        switch (timeTheme) {
            case 'dawn':
                return {
                    ambColor: '#fef08a',
                    ambIntensity: 0.05,
                    dir1Color: '#fef08a',
                    dir1Intensity: 2.8,
                    dir2Color: '#a5f3fc',
                    dir2Intensity: 0.2,
                    sphereColor: '#b45309',
                    sphereOpacity: 0.05
                };
            case 'sunset':
                return {
                    ambColor: '#f472b6',
                    ambIntensity: 0.05,
                    dir1Color: '#f97316',
                    dir1Intensity: 3.0,
                    dir2Color: '#a78bfa',
                    dir2Intensity: 0.22,
                    sphereColor: '#701a75',
                    sphereOpacity: 0.06
                };
            case 'midnight':
            default:
                return {
                    ambColor: '#ffffff',
                    ambIntensity: 0.03,
                    dir1Color: '#ffffff',
                    dir1Intensity: 3.5,
                    dir2Color: '#0284c7',
                    dir2Intensity: 0.15,
                    sphereColor: '#4c1d95',
                    sphereOpacity: 0.08
                };
        }
    }, [timeTheme]);

    // Shooting star animation
    useFrame((state, delta) => {
        if (isMobile) return;
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
            <ambientLight intensity={lighting.ambIntensity} color={lighting.ambColor} />

            {/* Dramatic sunlight blasting from the distant sun */}
            <directionalLight position={[-35, 25, -15]} intensity={lighting.dir1Intensity} color={lighting.dir1Color} />

            {/* Extremely faint blue starlight fill from the back */}
            <directionalLight position={[20, -10, -20]} intensity={lighting.dir2Intensity} color={lighting.dir2Color} />

            {/* Deep Space Nebula Glow (Subtle cosmic dust) */}
            <Sphere args={[50, isMobile ? 8 : 32, isMobile ? 8 : 32]} position={[0, 0, -45]}>
                <meshBasicMaterial
                    color={lighting.sphereColor}
                    transparent
                    opacity={lighting.sphereOpacity}
                    blending={THREE.AdditiveBlending}
                    side={THREE.BackSide}
                    depthWrite={false}
                />
            </Sphere>

            <Suspense fallback={null}>
                <OrbitingMercury timeTheme={timeTheme} isMobile={isMobile} />
            </Suspense>

            {/* Shooting Star Group */}
            {!isMobile && (
                <group ref={shootingStarRef} position={[-40, 20, -20]}>
                    {/* Using a highly stretched single sphere creates a beautiful seamless comet teardrop shape, 
                        replacing the chunky flat-bottomed cylinder! */}
                    <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 12, 1]}>
                        <sphereGeometry args={[0.05, 16, 16]} />
                        <meshBasicMaterial ref={starMatRef} color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
                    </mesh>
                </group>
            )}
        </group>
    );
}
