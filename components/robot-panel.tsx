
'use client';

import Image from 'next/image';
import { useTimeOfDay } from './time-context';

interface RobotPanelProps {
  side: 'left' | 'right';
  label: string;
}

export function RobotPanel({ side, label }: RobotPanelProps) {
  const { timeOfDay } = useTimeOfDay();

  // Determine which image to use based on side and time of day (with people)
  const getImageSrc = () => {
    const baseImage = side === 'left' ? 'ghibli_cafe_corner_person' : 'ghibli_cafe_seating_person';
    const timeSuffix = timeOfDay === 'day' ? '' : `_${timeOfDay}`;
    return `/${baseImage}${timeSuffix}.jpg`;
  };

  return (
    <aside 
      className={`robot-panel ${side === 'right' ? 'right' : ''}`} 
      aria-label={`${side} cafe scene`}
    >
      <div className="cafe-scene">
        <div className="relative w-full h-full">
          <Image
            src={getImageSrc()}
            alt={`Ghibli-style cafe ${side === 'left' ? 'corner' : 'seating area'} during ${timeOfDay}`}
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>
        <div className="cafe-overlay"></div>
        <div className="cafe-label">
          <span>{label}</span>
          <span className="cafe-dot" title="Cozy"></span>
        </div>
      </div>
    </aside>
  );
}
