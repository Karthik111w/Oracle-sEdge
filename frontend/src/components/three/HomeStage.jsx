import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import LensArray from './LensArray';
import { stage } from './stage';
import { useTheme } from '../../theme';

// Full-viewport WebGL layer fixed behind the home page. `active` stops the render loop once
// the page has scrolled past the sections that use it.
export default function HomeStage({ active = true }) {
  const { theme } = useTheme();
  const [compact, setCompact] = useState(() => window.innerWidth < 900);
  const [visible, setVisible] = useState(!document.hidden);

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 900);
    const onPointer = (e) => {
      stage.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      stage.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onVisibility = () => setVisible(!document.hidden);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div className={`stage${active ? '' : ' is-idle'}`} aria-hidden="true">
      <Canvas
        dpr={[1, compact ? 1.5 : 1.75]}
        camera={{ position: [0, 0, compact ? 8.6 : 7.4], fov: 34, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        frameloop={active && visible ? 'always' : 'never'}
      >
        <Suspense fallback={null}>
          <LensArray dark={theme === 'dark'} compact={compact} />
        </Suspense>
      </Canvas>
    </div>
  );
}
