import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';

const TONE_COLOR = { pos: '#34d399', neg: '#f87171', mid: '#e3b25a' };

function Gauge({ score, tone, color: explicit }) {
  const group = useRef();
  const arc = useRef();
  const drawn = useRef(0);
  const built = useRef(0);
  const color = explicit || TONE_COLOR[tone] || TONE_COLOR.mid;
  const target = THREE.MathUtils.clamp((score || 0) / 100, 0, 1);

  useFrame((state, dt) => {
    // Sweep the arc up to the score, then idle with a slow wobble that follows the pointer.
    drawn.current = THREE.MathUtils.damp(drawn.current, target, 2.2, dt);
    // Rebuild the arc only while it is still visibly sweeping.
    if (Math.abs(drawn.current - built.current) > 0.004) {
      built.current = drawn.current;
      arc.current.geometry.dispose();
      arc.current.geometry = new THREE.TorusGeometry(1, 0.085, 20, 96, Math.max(0.001, drawn.current * Math.PI * 2));
    }
    const t = state.clock.elapsedTime;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, state.pointer.x * 0.5 + Math.sin(t * 0.5) * 0.12, 4, dt);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -state.pointer.y * 0.4 + 0.25, 4, dt);
  });

  return (
    <group ref={group}>
      <mesh>
        <torusGeometry args={[1, 0.03, 12, 96]} />
        <meshStandardMaterial color="#8892a6" metalness={0.9} roughness={0.35} transparent opacity={0.35} />
      </mesh>
      {/* Start at 12 o'clock and run clockwise. */}
      <mesh ref={arc} rotation={[0, Math.PI, Math.PI / 2]}>
        <torusGeometry args={[1, 0.085, 20, 96, 0.001]} />
        <meshStandardMaterial color={color} metalness={1} roughness={0.2} emissive={color} emissiveIntensity={0.55} />
      </mesh>
      <mesh scale={[1, 1, 0.16]}>
        <sphereGeometry args={[0.8, 48, 24]} />
        <meshPhysicalMaterial transmission={1} thickness={0.8} ior={1.5} roughness={0.05} clearcoat={1} iridescence={0.8} iridescenceIOR={1.3} />
      </mesh>
    </group>
  );
}

// A small 3D gauge: a glass lens ringed by an arc that sweeps to the score.
// Decorative: the number itself is rendered as text by the caller.
// `color` (any CSS colour) overrides the tone colour, e.g. the verdict ring colour.
export default function ScoreOrb({ score, tone = 'mid', color }) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 3.6], fov: 36 }} gl={{ antialias: true, alpha: true }} aria-hidden="true">
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 5]} intensity={1.8} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 3, 2]} scale={[8, 2, 1]} rotation-x={Math.PI / 2} />
          <Lightformer form="rect" intensity={2} color="#ffd98f" position={[-4, 0, 2]} scale={[2, 6, 1]} rotation-y={Math.PI / 2} />
          <Lightformer form="rect" intensity={1.2} color="#9fb8ff" position={[4, 0, 1]} scale={[2, 6, 1]} rotation-y={-Math.PI / 2} />
        </Environment>
        <Gauge score={score} tone={tone} color={color} />
      </Suspense>
    </Canvas>
  );
}
