import { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/helpers.js';

// Reveal — IntersectionObserver scroll-reveal wrapper.
// Usage: <Reveal delay={80}>…</Reveal>  (delay in ms, for stagger)
export default function Reveal({ children, delay = 0, className, as: Tag = 'div' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ '--reveal-delay': `${delay}ms` }}
      className={cn('reveal', visible && 'is-visible', className)}
    >
      {children}
    </Tag>
  );
}
