import React, { useEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';

const topbarHeight = () => document.querySelector('.topnav')?.offsetHeight || parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 64;

// Sticky in-page navigation with scroll-spy. `sections` is [{ id, label }]; each id must
// match an element on the page. It sticks directly under the app navbar, whatever its height.
const SectionNav = ({ sections }) => {
  const [active, setActive] = useState(sections[0]?.id);
  const root = useRef(null);
  const lenis = useLenis();
  const ids = sections.map((s) => s.id).join('|');

  // Publish the navbar and this bar's heights so section anchors can clear both.
  useEffect(() => {
    const page = root.current?.closest('.an-page');
    if (!page) return undefined;
    const apply = () => {
      page.style.setProperty('--an-top', `${topbarHeight()}px`);
      page.style.setProperty('--an-nav-h', `${root.current?.offsetHeight || 0}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(root.current);
    const bar = document.querySelector('.topnav');
    if (bar) ro.observe(bar);
    window.addEventListener('resize', apply);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, []);

  // The active section is the last one whose top has passed the line under the sticky bars.
  useEffect(() => {
    const list = ids.split('|');
    const update = () => {
      const line = topbarHeight() + (root.current?.offsetHeight || 0) + 24;
      let current = list[0];
      for (const id of list) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) current = list[list.length - 1];
      setActive(current);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [ids]);

  // Keep the current pill visible when the bar scrolls sideways on a narrow screen.
  useEffect(() => {
    const el = root.current?.querySelector('[aria-current="true"]');
    const track = root.current?.querySelector('.an-nav-track');
    if (!el || !track || track.scrollWidth <= track.clientWidth) return;
    track.scrollTo({ left: el.offsetLeft - track.clientWidth / 2 + el.clientWidth / 2, behavior: 'auto' });
  }, [active]);

  const go = (event, id) => {
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    const offset = -(topbarHeight() + (root.current?.offsetHeight || 0) + 12);
    if (lenis) lenis.scrollTo(el, { offset });
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
    try {
      history.replaceState(history.state, '', `#${id}`);
    } catch {
      // The hash is a nicety; ignore if the history API refuses.
    }
  };

  return (
    <nav ref={root} className="an-nav" aria-label="Sections on this page">
      <div className="an-nav-track">
        {sections.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} className={`an-nav-link${active === s.id ? ' is-active' : ''}`} aria-current={active === s.id ? 'true' : undefined} onClick={(e) => go(e, s.id)}>
            <span className="mono an-nav-idx">{String(i + 1).padStart(2, '0')}</span> {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
};

export default SectionNav;
