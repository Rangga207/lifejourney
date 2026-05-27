'use client';
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ──────────────────────────────────────────────────────────────
   GLSL Vertex Shader
   Simple pass-through; just sends UV to fragment stage.
────────────────────────────────────────────────────────────── */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* ──────────────────────────────────────────────────────────────
   GLSL Fragment Shader
   Generates volumetric nebula clouds via multi-octave FBM noise.
   Produces organic, drifting gas cloud shapes with rich colour.
────────────────────────────────────────────────────────────── */
const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3  uColor1;
  uniform vec3  uColor2;
  uniform vec3  uColor3;
  uniform float uOpacity;
  uniform float uScale;
  uniform float uPulse;
  uniform int   uOctaves;   // 3 = desktop quality, 2 = mobile quality

  varying vec2 vUv;

  /* ── Deterministic hash ─────────────────────────────────── */
  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 74.27);
    return fract(p.x * p.y);
  }

  /* ── Bilinear smooth noise ──────────────────────────────── */
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    /* Quintic smoothstep for softer interpolation */
    f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(
      mix(hash(i),             hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  /* ── 3-octave Fractal Brownian Motion (adaptive octaves) ───── */
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2  shift = vec2(100.0);
    /* Rotation matrix to reduce axis-aligned artefacts */
    mat2  rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 3; i++) {
      if (i >= uOctaves) break;   // mobile: skip 3rd octave (i==2)
      v += a * noise(p);
      p = rot * p * 2.1 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    /* Map UV to centred [-1, 1] space, apply per-cloud scale */
    vec2 uv = (vUv * 2.0 - 1.0) * uScale;

    /* Single-level high-performance domain warp for organic fluid shapes */
    float t = uTime * 0.018;
    vec2 q = vec2(
      fbm(uv + t),
      fbm(uv + vec2(5.2, 1.3) + t * 0.3)
    );
    float f = fbm(uv + 3.0 * q);

    /* Three-way colour blend based on noise density */
    float t1 = clamp(pow(f, 2.0) * 4.0, 0.0, 1.0);
    float t2 = clamp(f * 1.8,           0.0, 1.0);
    vec3 col = mix(uColor1, uColor2, t1);
    col       = mix(col,    uColor3, t2);

    /* Radial vignette — hard fade at disc boundary */
    float dist  = length(vUv * 2.0 - 1.0);
    float radial = smoothstep(1.05, 0.15, dist);

    /* Final alpha: noise density × radial × global opacity × glow pulse */
    float alpha = f * f * radial * uOpacity * (0.72 + uPulse * 0.28);
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

/* ──────────────────────────────────────────────────────────────
   NebulaLayer — a single animated cloud plane
────────────────────────────────────────────────────────────── */
interface NebulaLayerProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: number;
  color1: string;
  color2: string;
  color3: string;
  opacity: number;
  scale: number;
  speed?: number; // time multiplier offset
  octaves?: number; // FBM octaves: 3 = desktop, 2 = mobile
}

function NebulaLayer({
  position,
  rotation = [0, 0, 0],
  size,
  color1,
  color2,
  color3,
  opacity,
  scale,
  speed = 1.0,
  octaves = 3,
}: NebulaLayerProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  // Keep refs in sync with the latest prop values on every render.
  // This avoids stale-closure issues in useFrame without causing re-mounts.
  const c1Ref = useRef(color1);
  const c2Ref = useRef(color2);
  const c3Ref = useRef(color3);
  const opacityRef = useRef(opacity);
  c1Ref.current = color1;
  c2Ref.current = color2;
  c3Ref.current = color3;
  opacityRef.current = opacity;

  const uniforms = useMemo(
    () => ({
      uTime:    { value: 0 },
      uColor1:  { value: new THREE.Color(color1) },
      uColor2:  { value: new THREE.Color(color2) },
      uColor3:  { value: new THREE.Color(color3) },
      uOpacity: { value: opacity },
      uScale:   { value: scale },
      uPulse:   { value: 0.5 },
      uOctaves: { value: octaves },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Update ALL dynamic uniforms inside useFrame so they are applied every GPU tick.
  // Updating uniforms via useEffect inside the R3F Canvas can miss frames because
  // React's effect scheduling and the WebGL render loop are not synchronised.
  useFrame(({ clock }) => {
    if (matRef.current) {
      const t = clock.getElapsedTime() * speed;
      matRef.current.uniforms.uTime.value = t;
      matRef.current.uniforms.uColor1.value.set(c1Ref.current);
      matRef.current.uniforms.uColor2.value.set(c2Ref.current);
      matRef.current.uniforms.uColor3.value.set(c3Ref.current);
      matRef.current.uniforms.uOpacity.value = opacityRef.current;
      // Organic glow pulse — three overlapping sine waves create a non-repeating breathing rhythm
      const rawPulse =
        Math.sin(t * 0.40) * 0.40 +          // slow breath ~0.4 Hz
        Math.sin(t * 1.10 + 1.20) * 0.25 +  // mid beat ~1.1 Hz
        Math.sin(t * 0.15 + 2.70) * 0.15;   // very slow swell ~0.15 Hz
      matRef.current.uniforms.uPulse.value = 0.5 + rawPulse * 0.5;
    }
  });


  return (
    <mesh position={position} rotation={rotation as any}>
      <planeGeometry args={[size, size, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ──────────────────────────────────────────────────────────────
   NebulaCloud — exports a scene of multiple overlapping layers
   covering the entire background with rich cosmic atmosphere.
────────────────────────────────────────────────────────────── */
interface NebulaCloudProps {
  timeTheme?: 'dawn' | 'sunset' | 'midnight';
  isMobile?: boolean;
}

export default function NebulaCloud({ timeTheme = 'midnight', isMobile = false }: NebulaCloudProps) {
  // On mobile: 2 FBM octaves (vs 3) cuts shader cost ~33% — imperceptible at 1× DPR
  const octaves = isMobile ? 2 : 3;
  // Define theme-based dynamic colors
  const themeColors = useMemo(() => {
    switch (timeTheme) {
      case 'dawn':
        return {
          l1: { c1: '#13113c', c2: '#581c87', c3: '#c084fc' }, // Indigo deep to light violet
          l2: { c1: '#1a0b2e', c2: '#a16207', c3: '#f59e0b' }, // Sunset warm gold
          l3: { c1: '#022c22', c2: '#0d9488', c3: '#2dd4bf' }, // Deep teal sunrise transition
        };
      case 'sunset':
        return {
          l1: { c1: '#1e052d', c2: '#701a75', c3: '#d946ef' }, // Purple-fuchsia
          l2: { c1: '#1a051d', c2: '#9d174d', c3: '#f43f5e' }, // Rich pink-rose
          l3: { c1: '#2e0854', c2: '#be185d', c3: '#fda4af' }, // Soft warm glow
        };
      case 'midnight':
      default:
        return {
          l1: { c1: '#0d0221', c2: '#6b21a8', c3: '#a855f7' }, // Deep cosmic violet
          l2: { c1: '#1a0a1a', c2: '#9d174d', c3: '#f59e0b' }, // Dark base / rose-gold glow
          l3: { c1: '#042f2e', c2: '#0e7490', c3: '#22d3ee' }, // Cool indigo-teal drift
        };
    }
  }, [timeTheme]);

  return (
    <group>
      {/* ── Layer 1: Deep mass (largest, deepest back) */}
      <NebulaLayer
        position={[0, 2, -55]}
        size={135}
        color1={themeColors.l1.c1}
        color2={themeColors.l1.c2}
        color3={themeColors.l1.c3}
        opacity={0.5}
        scale={1.1}
        speed={0.5}
        octaves={octaves}
      />

      {/* ── Layer 2: Warm bloom — upper right warm glow */}
      <NebulaLayer
        position={[15, 5, -48]}
        rotation={[0, 0, 0.4]}
        size={90}
        color1={themeColors.l2.c1}
        color2={themeColors.l2.c2}
        color3={themeColors.l2.c3}
        opacity={0.4}
        scale={1.3}
        speed={0.6}
        octaves={octaves}
      />

      {/* ── Layer 3: Cool drift — lower left cool drift */}
      <NebulaLayer
        position={[-15, -6, -44]}
        rotation={[0, 0, -0.3]}
        size={85}
        color1={themeColors.l3.c1}
        color2={themeColors.l3.c2}
        color3={themeColors.l3.c3}
        opacity={0.3}
        scale={1.2}
        speed={0.8}
        octaves={octaves}
      />
    </group>
  );
}
