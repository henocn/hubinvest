import { useEffect, useRef, useState } from 'react';

// Fait apparaître un bloc en douceur (montée et fondu) quand il entre à l'écran, une seule fois.
// Sans IntersectionObserver ou si l'appareil demande moins d'animations, le bloc est visible tout de suite.
export default function Reveal({ as: Tag = 'div', className = '', children, ...props }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => typeof window === 'undefined'
    || !('IntersectionObserver' in window)
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (visible || !ref.current) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  return <Tag ref={ref} className={`reveal${visible ? ' is-visible' : ''} ${className}`.trim()} {...props}>{children}</Tag>;
}
