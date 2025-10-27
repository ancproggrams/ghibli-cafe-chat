
'use client';

import { WaveformVisualizer } from './waveform-visualizer';
import { TimeToggle } from './time-toggle';

interface TopNavigationProps {
  micActive: boolean;
  onToggleRobots: () => void;
}

export function TopNavigation({ micActive, onToggleRobots }: TopNavigationProps) {
  return (
    <div className="topnav elev-1" role="navigation" aria-label="Global">
      <span className="brand">
        <span className="spark" aria-hidden="true">☕</span> 
        Ghibli Café Chat
      </span>
      <TimeToggle />
      <span className="chip">Cozy Conversations • Warm Vibes</span>
      <WaveformVisualizer micActive={micActive} />
      <button 
        className="btn outline toggle-robots" 
        onClick={onToggleRobots}
        aria-expanded="false" 
        aria-controls="robotPanels"
      >
        Café Scenes
      </button>
    </div>
  );
}
