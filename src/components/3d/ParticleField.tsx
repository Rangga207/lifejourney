'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';



/* ─── Deterministic PRNG (mulberry32) ────────────────────── */
function mkRand(seed: number) {
    return () => {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function ForegroundDust({ count = 250, mouseRef }: { count?: number, mouseRef: React.MutableRefObject<{x: number, y: number}> }) {
    const dustRef = useRef<THREE.Points>(null);
    const { positions } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 40;     
            pos[i * 3 + 1] = (Math.random() - 0.5) * 20; 
            pos[i * 3 + 2] = 2 + (Math.random() * 8);    
        }
        return { positions: pos };
    }, [count]);

    useFrame((_, delta) => {
        if (dustRef.current) {
            // Interactive dust flowing with mouse movement
            dustRef.current.position.y += delta * 0.08 + (mouseRef.current.y * 0.005);
            dustRef.current.position.x += delta * 0.03 - (mouseRef.current.x * 0.005);
            if (dustRef.current.position.y > 10) dustRef.current.position.y = -10;
            if (dustRef.current.position.x > 20) dustRef.current.position.x = -20;
        }
    });

    return (
        <points ref={dustRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <pointsMaterial 
                size={0.06} 
                color="#bae6fd"
                transparent 
                opacity={0.4} 
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                onBeforeCompile={(shader) => {
                    shader.fragmentShader = shader.fragmentShader.replace(
                        `#include <premultiplied_alpha_fragment>`,
                        `
                        #include <premultiplied_alpha_fragment>
                        float dist = distance(gl_PointCoord, vec2(0.5));
                        if (dist > 0.5) discard;
                        gl_FragColor.a *= pow(1.0 - (dist * 2.0), 1.2);
                        `
                    );
                }}
            />
        </points>
    );
}


/* ─── Shooting Stars / Meteor Streaks ───────────────────────────────── */
const METEOR_TRAIL = 30; // trail particles per meteor

type MeteorState = {
    x: number; y: number; z: number;
    vx: number; vy: number;
    speed: number;
    trail: number;
    maxLife: number;
    alive: boolean;
    life: number;
    waitTime: number;
};

function newMeteorParams() {
    const side = Math.random() > 0.5 ? 1 : -1;
    const rawVx = -side * (0.45 + Math.random() * 0.40);
    const rawVy = -(0.55 + Math.random() * 0.45);
    const len = Math.sqrt(rawVx * rawVx + rawVy * rawVy);
    const speed = 9 + Math.random() * 11;
    const trail = 1.5 + Math.random() * 2.5;
    return {
        x: side * (11 + Math.random() * 9),
        y: 3 + Math.random() * 9,
        z: -6 - Math.random() * 22,
        vx: rawVx / len,
        vy: rawVy / len,
        speed,
        trail,
        maxLife: (trail + 22) / speed,
    };
}

function ShootingStars({ isMobile = false }: { isMobile?: boolean }) {
    const METEOR_COUNT = isMobile ? 3 : 6;
    const METEOR_TOTAL = METEOR_COUNT * METEOR_TRAIL;
    const pointsRef = useRef<THREE.Points>(null);
    const meteorsRef = useRef<MeteorState[]>([]);

    const positions = useMemo(() => new Float32Array(METEOR_TOTAL * 3), []);
    const colors    = useMemo(() => new Float32Array(METEOR_TOTAL * 3), []);

    // Lazy-init meteor pool once
    if (meteorsRef.current.length === 0) {
        meteorsRef.current = Array.from({ length: METEOR_COUNT }, (_, i): MeteorState => ({
            ...newMeteorParams(),
            alive: false,
            life: 0,
            waitTime: 1 + i * 1.8 + Math.random() * 2, // staggered initial delays
        }));
    }

    useFrame((_, delta) => {
        const ms = meteorsRef.current;

        ms.forEach((m, mi) => {
            const base = mi * METEOR_TRAIL;

            if (!m.alive) {
                m.waitTime -= delta;
                if (m.waitTime <= 0) {
                    Object.assign(m, newMeteorParams());
                    m.alive = true;
                    m.life = 0;
                }
                // keep trail invisible while waiting
                for (let ti = 0; ti < METEOR_TRAIL; ti++) {
                    const idx = (base + ti) * 3;
                    colors[idx] = colors[idx + 1] = colors[idx + 2] = 0;
                    positions[idx] = positions[idx + 1] = positions[idx + 2] = 0;
                }
                return;
            }

            m.life += delta;

            if (m.life >= m.maxLife || m.y < -14) {
                m.alive    = false;
                m.waitTime = 3 + Math.random() * 9;
                return;
            }

            // Move head forward
            m.x += m.vx * m.speed * delta;
            m.y += m.vy * m.speed * delta;

            // Fade envelope: quick fade-in, slow fade-out
            const fadeIn  = Math.min(m.life * 10, 1);
            const fadeOut = Math.min((m.maxLife - m.life) * 4, 1);
            const env     = fadeIn * fadeOut;

            // Write trail particles (ti=0 → tail, ti=TRAIL-1 → head)
            for (let ti = 0; ti < METEOR_TRAIL; ti++) {
                const frac   = ti / (METEOR_TRAIL - 1); // 0 = tail, 1 = head
                const offset = (1 - frac) * m.trail;

                const idx = (base + ti) * 3;
                positions[idx]     = m.x - m.vx * offset;
                positions[idx + 1] = m.y - m.vy * offset;
                positions[idx + 2] = m.z;

                // Brightness → quadratic from tail (black) to head (white)
                // Additive blending makes black = fully transparent automatically
                const brightness   = frac * frac * env;
                colors[idx]        = brightness;
                colors[idx + 1]    = brightness * 0.93; // slight warm tint
                colors[idx + 2]    = brightness * 0.88;
            }
        });

        if (pointsRef.current) {
            const geo = pointsRef.current.geometry;
            (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
            (geo.attributes.color    as THREE.BufferAttribute).needsUpdate = true;
        }
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={METEOR_TOTAL} args={[positions, 3]} />
                <bufferAttribute attach="attributes-color"    count={METEOR_TOTAL} args={[colors,    3]} />
            </bufferGeometry>
            <pointsMaterial
                size={0.09}
                vertexColors
                transparent
                opacity={1.0}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                sizeAttenuation
            />
        </points>
    );
}

export default function ParticleField({ count = 900, isMobile = false }: { count?: number; isMobile?: boolean }) {
    const pointsRef = useRef<THREE.Points>(null);
    const shaderRef = useRef<any>(null);
    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };
        // Touch parallax: lets mobile users get the same camera parallax
        // effect by dragging/scrolling their finger across the screen.
        const handleTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0];
            if (!touch) return;
            mouseRef.current.x = (touch.clientX / window.innerWidth) * 2 - 1;
            mouseRef.current.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    const { positions, colors } = useMemo(() => {
        // Use a deterministic seed so Math.random side effects don't mess up rendering in React Strict Mode
        const rand = mkRand(0x9e3779b9 ^ count);

        const posArray = new Float32Array(count * 3);
        const colArray = new Float32Array(count * 3);

        const tempColor = new THREE.Color();
        const radius = 6;

        for (let i = 0; i < count; i++) {
            // Random point in a sphere using deterministic PRNG
            const u = rand();
            const v = rand();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = Math.cbrt(rand()) * radius;

            posArray[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            posArray[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            posArray[i * 3 + 2] = r * Math.cos(phi);

            // White stars for space theme
            colArray[i * 3] = 1.0;
            colArray[i * 3 + 1] = 1.0;
            colArray[i * 3 + 2] = 1.0;
        }

        return { positions: posArray, colors: colArray };
    }, [count]);

    // Animate rotation slowly and add Parallax POV
    useFrame((state, delta) => {
        if (pointsRef.current) {
            // Constant majestic swirl of the galaxy
            pointsRef.current.rotation.y -= delta * 0.02;
            pointsRef.current.rotation.z -= delta * 0.005;
            pointsRef.current.rotation.x -= delta * 0.008;
        }

        // Mouse Parallax POV (Head tracking) - Increased for more interaction
        const targetX = mouseRef.current.x * 3.0;
        const targetY = mouseRef.current.y * 3.0;

        // Smoothly interpolate camera position (faster response)
        state.camera.position.x += (targetX - state.camera.position.x) * 0.04;
        state.camera.position.y += (targetY - state.camera.position.y) * 0.04;

        // Update Twinkle Time Uniform
        if (shaderRef.current) {
            shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        }

        // Keep camera at edge of the sphere (radius 5-6)
        state.camera.lookAt(0, 0, 0);
    });

    return (
        <>
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-color"
                    args={[colors, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.15}
                vertexColors={true}
                transparent={true}
                opacity={0.8}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                onBeforeCompile={(shader) => {
                    shader.uniforms.uTime = { value: 0 };
                    shaderRef.current = shader;
                    
                    // Inject Twinkle Logic
                    shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
                    shader.vertexShader = shader.vertexShader.replace(
                        `#include <color_vertex>`,
                        `
                        #include <color_vertex>
                        // Generate a unique random phase per star based on its position
                        float phase = sin(position.x * 20.0 + position.y * 30.0 + position.z * 10.0) * 100.0;
                        // Rhythmic twinkle pulsing
                        float twinkle = sin(uTime * 1.5 + phase) * 0.5 + 0.5; 
                        // Keep min brightness at 20%, peak at 100%
                        vColor.rgb *= (0.2 + twinkle * 0.8);
                        `
                    );

                    // Inject Soft Gaussian Bokeh Shape
                    shader.fragmentShader = shader.fragmentShader.replace(
                        `#include <premultiplied_alpha_fragment>`,
                        `
                        #include <premultiplied_alpha_fragment>
                        float dist = distance(gl_PointCoord, vec2(0.5));
                        if (dist > 0.5) discard;
                        
                        // Creates a sharp bright core with a soft radiating halo (Gaussian Falloff)
                        float alpha = pow(1.0 - (dist * 2.0), 1.5);
                        gl_FragColor.a *= alpha;
                        `
                    );
                }}
            />
        </points>
        {!isMobile && <ForegroundDust count={250} mouseRef={mouseRef} />}
        {!isMobile && <CosmicStardust />}
        <ShootingStars isMobile={isMobile} />
        </>
    );
}

function CosmicStardust({ count = 90 }) {
    const dustRef = useRef<THREE.Points>(null);
    
    const { positions, colors } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        
        // Dynamic colors: soft pinks, cyans, golden ambers, violets
        const palette = [
            new THREE.Color('#ec4899'),
            new THREE.Color('#06b6d4'),
            new THREE.Color('#f59e0b'),
            new THREE.Color('#8b5cf6')
        ];
        
        for (let i = 0; i < count; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = 4 + Math.random() * 12;
            
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
            
            const randomColor = palette[Math.floor(Math.random() * palette.length)];
            col[i * 3] = randomColor.r;
            col[i * 3 + 1] = randomColor.g;
            col[i * 3 + 2] = randomColor.b;
        }
        return { positions: pos, colors: col };
    }, [count]);

    useFrame((state, delta) => {
        if (dustRef.current) {
            dustRef.current.rotation.y += delta * 0.006;
            dustRef.current.rotation.x -= delta * 0.003;
            dustRef.current.rotation.z += delta * 0.002;
        }
    });

    return (
        <points ref={dustRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-color" args={[colors, 3]} />
            </bufferGeometry>
            <pointsMaterial 
                size={0.16} 
                vertexColors={true}
                transparent 
                opacity={0.35} 
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                onBeforeCompile={(shader) => {
                    shader.fragmentShader = shader.fragmentShader.replace(
                        `#include <premultiplied_alpha_fragment>`,
                        `
                        #include <premultiplied_alpha_fragment>
                        float dist = distance(gl_PointCoord, vec2(0.5));
                        if (dist > 0.5) discard;
                        float alpha = pow(1.0 - (dist * 2.0), 2.2);
                        gl_FragColor.a *= alpha;
                        `
                    );
                }}
            />
        </points>
    );
}
