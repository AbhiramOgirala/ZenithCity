import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
}

const COLORS = [
  '#00F5FF', '#00FF88', '#FFD93D', '#FF2E97',
  '#B24BF3', '#FF6B35', '#ffffff',
];

interface Props {
  active: boolean;
  duration?: number;
  particleCount?: number;
}

/**
 * Confetti celebration component.
 * Renders burst particles from the center of the screen.
 */
export default function Celebration({ active, duration = 2500, particleCount = 40 }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 20,
      y: 50,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      velocityX: (Math.random() - 0.5) * 80,
      velocityY: -(Math.random() * 60 + 20),
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => setParticles([]), duration);
    return () => clearTimeout(timer);
  }, [active, duration, particleCount]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: 1,
              scale: 1,
              rotate: 0,
            }}
            animate={{
              left: `${p.x + p.velocityX}%`,
              top: `${p.y + p.velocityY + 120}%`,
              opacity: 0,
              scale: 0.3,
              rotate: p.rotation + 360,
            }}
            transition={{
              duration: duration / 1000,
              ease: 'easeOut',
            }}
            className="absolute"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              boxShadow: `0 0 ${p.size}px ${p.color}50`,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
