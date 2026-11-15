import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { ringColor, stage } from './stage';

const LENS_COUNT = 6;
const SPACING = 2.4;
const GOLD = '#e3b25a';

const damp = THREE.MathUtils.damp;

// One optical element: a brass rim, an engraved inner ring and a glass body.
function Lens({ index, dark }) {
  const group = useRef();
  const glass = useRef();
  const rim = useRef();
  const inner = useRef();
  const target = useMemo(() => new THREE.Color(GOLD), []);

  useFrame((state, dt) => {
    const active = stage.lens === index;
    const t = state.clock.elapsedTime;
    group.current.rotation.z += dt * (0.05 + index * 0.012) * (index % 2 ? -1 : 1);
    // The lens in focus swells slightly and its rim brightens.
    const scale = active ? 1.08 : 1;
    group.current.scale.setScalar(damp(group.current.scale.x, scale, 4, dt));
    rim.current.emissiveIntensity = damp(rim.current.emissiveIntensity, active ? 1.6 : 0.3, 4, dt);
    // Each ring takes the colour of this lens's verdict on the stock.
    target.set(ringColor(stage.verdicts[index]));
    rim.current.color.lerp(target, 1 - Math.exp(-4 * dt));
    rim.current.emissive.copy(rim.current.color);
    inner.current.color.copy(rim.current.color);
    glass.current.iridescence = damp(glass.current.iridescence, active ? 1 : 0.35, 3, dt);
    // Looking straight down the axis stacks six panes; thin them so text over the scene stays readable.
    const onAxis = THREE.MathUtils.smoothstep(stage.journey, 0, 0.14);
    glass.current.opacity = damp(glass.current.opacity, (dark ? 0.14 : 0.3) * (1 - onAxis * 0.72), 4, dt);
    group.current.position.y = Math.sin(t * 0.6 + index) * 0.04;
  });

  return (
    <group position={[0, 0, -index * SPACING]}>
      <group ref={group} rotation={[0, 0, index * 0.5]}>
        <mesh>
          <torusGeometry args={[1.22, 0.038, 20, 128]} />
          <meshStandardMaterial ref={rim} color={GOLD} metalness={1} roughness={0.22} emissive={GOLD} emissiveIntensity={0.15} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.84, 0.006, 8, 96]} />
          <meshBasicMaterial ref={inner} color={GOLD} transparent opacity={0.55} />
        </mesh>
        {/* Index notches around the rim, one more per lens. */}
        {Array.from({ length: index + 1 }).map((_, i) => (
          <mesh key={i} position={[Math.cos((i / (index + 1)) * Math.PI * 2) * 1.02, Math.sin((i / (index + 1)) * Math.PI * 2) * 1.02, 0]}>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshBasicMaterial color={GOLD} />
          </mesh>
        ))}
        <mesh scale={[1, 1, 0.11]}>
          <sphereGeometry args={[1.19, 64, 32]} />
          <meshPhysicalMaterial
            ref={glass}
            color={dark ? '#dfe6ff' : '#fff4dc'}
            transparent
            opacity={dark ? 0.14 : 0.3}
            roughness={0.04}
            metalness={0.15}
            clearcoat={1}
            clearcoatRoughness={0.04}
            iridescence={0.35}
            iridescenceIOR={1.35}
            iridescenceThicknessRange={[120, 620]}
            envMapIntensity={1.6}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

// The thing being examined: a faceted core at the far end of the optical train.
function Core() {
  const mesh = useRef();
  const wire = useRef();
  const light = useRef();
  const target = useMemo(() => new THREE.Color(GOLD), []);
  useFrame((state, dt) => {
    // The core glows in the colour of the verdict from the lens in focus.
    target.set(ringColor(stage.verdicts[stage.lens]));
    const k = 1 - Math.exp(-3 * dt);
    mesh.current.material.color.lerp(target, k);
    mesh.current.material.emissive.copy(mesh.current.material.color);
    wire.current.material.color.copy(mesh.current.material.color);
    light.current.color.copy(mesh.current.material.color);
    mesh.current.rotation.x += dt * 0.25;
    mesh.current.rotation.y += dt * 0.35;
    wire.current.rotation.x -= dt * 0.12;
    wire.current.rotation.y -= dt * 0.18;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.4) * 0.03;
    mesh.current.scale.setScalar(pulse);
  });
  return (
    <group position={[0, 0, -LENS_COUNT * SPACING - 0.6]}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.18} flatShading emissive={GOLD} emissiveIntensity={0.35} />
      </mesh>
      <mesh ref={wire}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.22} />
      </mesh>
      <pointLight ref={light} color={GOLD} intensity={40} distance={14} decay={2} />
    </group>
  );
}

// A thin beam of light down the optical axis.
function Beam() {
  const length = LENS_COUNT * SPACING + 4;
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -length / 2 + 2]}>
      <cylinderGeometry args={[0.012, 0.012, length, 8, 1, true]} />
      <meshBasicMaterial color={GOLD} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function Dust({ dark, count = 900 }) {
  const points = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.6 + Math.random() * 7;
      const a = Math.random() * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = Math.sin(a) * r * 0.7;
      arr[i * 3 + 2] = 4 - Math.random() * (LENS_COUNT * SPACING + 12);
    }
    return arr;
  }, [count]);

  useFrame((_, dt) => {
    points.current.rotation.z += dt * 0.012;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.028}
        sizeAttenuation
        color={dark ? '#f3dba8' : '#7a5a1e'}
        transparent
        opacity={dark ? 0.7 : 0.55}
        depthWrite={false}
        blending={dark ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}

// The six-lens optical train. In the hero it sits to one side in three-quarter view; as the
// lens section scrolls, it swings onto the camera's axis and the camera travels down it.
export default function LensArray({ dark = true, compact = false }) {
  const rig = useRef();
  const { camera } = useThree();

  useFrame((_, dt) => {
    const j = stage.journey;
    // Ease the hand-off from "hero pose" to "on axis" over the first slice of the journey.
    const align = THREE.MathUtils.smoothstep(j, 0, 0.14);
    const heroX = compact ? 0.9 : 2.95;
    const heroY = compact ? -1.5 : 0.2;
    const heroRotY = compact ? 0.3 : 0.3;

    const targetX = THREE.MathUtils.lerp(heroX, 0, align);
    const targetY = THREE.MathUtils.lerp(heroY, 0, align) + stage.exit * 5;
    const targetRotY = THREE.MathUtils.lerp(heroRotY, 0, align) + stage.pointerX * 0.1 * (1 - align * 0.6);
    const targetRotX = THREE.MathUtils.lerp(-0.1, 0, align) + stage.pointerY * 0.07 * (1 - align * 0.6);

    rig.current.position.x = damp(rig.current.position.x, targetX, 3.2, dt);
    rig.current.position.y = damp(rig.current.position.y, targetY, 3.2, dt);
    rig.current.rotation.y = damp(rig.current.rotation.y, targetRotY, 3.2, dt);
    rig.current.rotation.x = damp(rig.current.rotation.x, targetRotX, 3.2, dt);

    // Travel: from in front of the first lens to just in front of the last one.
    const travel = THREE.MathUtils.clamp((j - 0.1) / 0.9, 0, 1) * (LENS_COUNT - 1) * SPACING;
    const targetZ = (compact ? 8.6 : 7.4) - travel - align * 3.6;
    camera.position.z = damp(camera.position.z, targetZ, 3.6, dt);
    camera.position.x = damp(camera.position.x, stage.pointerX * 0.25 * align, 3, dt);
    camera.position.y = damp(camera.position.y, stage.pointerY * -0.18 * align, 3, dt);
  });

  return (
    <>
      <ambientLight intensity={dark ? 0.35 : 0.9} />
      <directionalLight position={[4, 5, 6]} intensity={dark ? 1.6 : 2.2} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 2]} scale={[10, 2, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={2} color="#ffd98f" position={[-5, 0, 2]} scale={[2, 8, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.4} color="#9fb8ff" position={[5, -1, 1]} scale={[2, 8, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="ring" intensity={2.2} color="#ffe2a8" position={[0, 0, 6]} scale={3} />
      </Environment>
      <group ref={rig} scale={compact ? 0.78 : 1} position={[compact ? 0.9 : 2.95, compact ? -1.5 : 0.2, 0]} rotation={[-0.1, 0.3, 0]}>
        {Array.from({ length: LENS_COUNT }).map((_, i) => (
          <Lens key={i} index={i} dark={dark} />
        ))}
        <Beam />
        <Core />
      </group>
      <Dust dark={dark} count={compact ? 450 : 900} />
    </>
  );
}
