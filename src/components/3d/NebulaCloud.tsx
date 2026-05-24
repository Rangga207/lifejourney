'use client';
import { useRef, useMemo } from 'react';
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

  /* ── 6-octave Fractal Brownian Motion ───────────────────── */
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2  shift = vec2(100.0);
    /* Rotation matrix to reduce axis-aligned artefacts */
    mat2  rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p = rot * p * 2.1 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    /* Map UV to centred [-1, 1] space, apply per-cloud scale */
    vec2 uv = (vUv * 2.0 - 1.0) * uScale;

    /* Two-level domain warp for organic, turbulent shapes */
    float t = uTime * 0.018;
    vec2 q = vec2(
      fbm(uv + vec2(0.0, 0.0) + t),
      fbm(uv + vec2(5.2, 1.3))
    );
    vec2 r = vec2(
      fbm(uv + 4.0 * q + vec2(1.7, 9.2) + t * 0.5),
      fbm(uv + 4.0 * q + vec2(8.3, 2.8))
    );

    float f = fbm(uv + 5.0 * r);

    /* Three-way colour blend based on noise density */
    float t1 = clamp(pow(f, 2.0) * 4.0, 0.0, 1.0);
    float t2 = clamp(f * 1.8,           0.0, 1.0);
    vec3 col = mix(uColor1, uColor2, t1);
    col       = mix(col,    uColor3, t2);

    /* Radial vignette — hard fade at disc boundary */
    float dist  = length(vUv * 2.0 - 1.0);
    float radial = smoothstep(1.05, 0.15, dist);

    /* Final alpha: noise density × radial × global opacity */
    float alpha = f * f * radial * uOpacity;
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
}: NebulaLayerProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime:    { value: 0 },
      uColor1:  { value: new THREE.Color(color1) },
      uColor2:  { value: new THREE.Color(color2) },
      uColor3:  { value: new THREE.Color(color3) },
      uOpacity: { value: opacity },
      uScale:   { value: scale },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime() * speed;
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
export default function NebulaCloud() {
  return (
    <group>
      {/* ── Layer 1: Deep violet-purple mass (largest, furthest back) */}
      <NebulaLayer
        position={[0, 2, -55]}
        size={120}
        color1="#0d0221"   // void black-purple
        color2="#6b21a8"   // deep violet
        color3="#a855f7"   // bright purple
        opacity={0.55}
        scale={1.2}
        speed={0.7}
      />

      {/* ── Layer 2: Magenta/rose cloud — upper right bloom */}
      <NebulaLayer
        position={[18, 6, -48]}
        rotation={[0, 0, 0.4]}
        size={80}
        color1="#1a0a1a"   // dark base
        color2="#9d174d"   // deep rose
        color3="#ec4899"   // vivid pink
        opacity={0.45}
        scale={1.4}
        speed={0.9}
      />

      {/* ── Layer 3: Teal/cyan cloud — lower left cool drift */}
      <NebulaLayer
        position={[-20, -8, -45]}
        rotation={[0, 0, -0.3]}
        size={75}
        color1="#042f2e"   // dark teal base
        color2="#0e7490"   // ocean blue
        color3="#22d3ee"   // bright cyan
        opacity={0.35}
        scale={1.3}
        speed={1.1}
      />

      {/* ── Layer 4: Indigo-blue mid layer — centre depth fill */}
      <NebulaLayer
        position={[-5, -3, -42]}
        rotation={[0.1, 0, 0.2]}
        size={90}
        color1="#1e1b4b"   // deep indigo
        color2="#3730a3"   // blue-indigo
        color3="#818cf8"   // periwinkle
        opacity={0.3}
        scale={1.0}
        speed={0.6}
      />

      {/* ── Layer 5: Warm amber/gold accent — subtle warmth */}
      <NebulaLayer
        position={[10, 10, -50]}
        rotation={[0, 0, 0.8]}
        size={65}
        color1="#1a0a00"   // dark ember
        color2="#92400e"   // deep amber
        color3="#f59e0b"   // golden
        opacity={0.18}
        scale={1.5}
        speed={0.5}
      />

      {/* ── Layer 6: Thin rose-violet wisp — near-field sparkle */}
      <NebulaLayer
        position={[-12, 5, -35]}
        rotation={[0, 0, -0.6]}
        size={55}
        color1="#0f0520"   // near void
        color2="#7e22ce"   // royal purple
        color3="#f0abfc"   // soft lilac
        opacity={0.22}
        scale={1.8}
        speed={1.3}
      />
    </group>
  );
}
