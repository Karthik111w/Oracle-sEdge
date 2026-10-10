import { Component, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// A field of bars that rises left-to-right like a long-term growth chart,
// with slow waves rolling through it. Rendered behind the home hero.
const COLS = 41; // odd, so a bar (not a gap) sits on the camera's centre line
const ROWS = 14;
const GAP = 0.42;
const COUNT = COLS * ROWS;

const PALETTES = {
  dark: { low: '#0e5f73', high: '#e8c97a', fog: '#0a0f1e', accent: '#22d3ee', metalness: 0.45 },
  light: { low: '#bfdbfe', high: '#fbbf24', fog: '#f4f7fb', accent: '#38bdf8', metalness: 0.05 },
};

function Bars({ palette, animate }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const low = useMemo(() => new THREE.Color(palette.low), [palette.low]);
  const high = useMemo(() => new THREE.Color(palette.high), [palette.high]);
  const tmp = useMemo(() => new THREE.Color(), []);
  const seeds = useMemo(() => Array.from({ length: COUNT }, () => Math.random() * Math.PI * 2), []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = animate ? state.clock.elapsedTime : 1.5;
    let i = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const trend = (c / COLS) * 1.25;
        const wave =
          Math.sin(c * 0.32 + t * 0.7) * 0.22 +
          Math.sin(r * 0.55 + c * 0.12 - t * 0.5) * 0.18 +
          Math.sin(seeds[i] + t * 1.1) * 0.06;
        const h = Math.max(0.04, 0.2 + trend + wave);
        dummy.position.set((c - (COLS - 1) / 2) * GAP, h / 2, (r - (ROWS - 1) / 2) * GAP);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, tmp.copy(low).lerp(high, Math.min(1, h / 1.7)));
        i++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <boxGeometry args={[0.3, 1, 0.3]} />
      <meshStandardMaterial roughness={0.4} metalness={palette.metalness} />
    </instancedMesh>
  );
}

// Eases the camera toward the pointer for a subtle parallax.
function Rig({ pointer, animate }) {
  useFrame(({ camera }) => {
    const tx = animate ? pointer.current.x * 1.4 : 0;
    const ty = 3.4 + (animate ? pointer.current.y * 0.5 : 0);
    camera.position.x += (tx - camera.position.x) * 0.04;
    camera.position.y += (ty - camera.position.y) * 0.04;
    camera.lookAt(0, 0.4, 0);
  });
  return null;
}

class WebGLBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function HeroScene({ theme = 'dark', animate = true }) {
  const palette = PALETTES[theme] || PALETTES.dark;
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!animate) return;
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [animate]);

  return (
    <WebGLBoundary>
      <Canvas
        className="hero-scene-canvas"
        dpr={[1, 1.75]}
        frameloop={animate ? 'always' : 'demand'}
        camera={{ position: [0, 3.4, 7.5], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <fog attach="fog" args={[palette.fog, 6.5, 13]} />
        <ambientLight intensity={theme === 'light' ? 1.1 : 0.45} />
        <directionalLight position={[4, 8, 6]} intensity={theme === 'light' ? 1.4 : 1.6} />
        <pointLight position={[-6, 3, 2]} intensity={theme === 'light' ? 6 : 18} color={palette.accent} />
        <Bars palette={palette} animate={animate} />
        <Rig pointer={pointer} animate={animate} />
      </Canvas>
    </WebGLBoundary>
  );
}
