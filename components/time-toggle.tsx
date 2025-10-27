
'use client';

import { useTimeOfDay } from './time-context';

export function TimeToggle() {
  const { timeOfDay, setTimeOfDay } = useTimeOfDay();

  return (
    <div className="time-toggle-container">
      <button
        onClick={() => setTimeOfDay('day')}
        className={`time-btn ${timeOfDay === 'day' ? 'active' : ''}`}
        title="Day time"
        aria-label="Switch to day time"
      >
        ☀️
      </button>
      <button
        onClick={() => setTimeOfDay('evening')}
        className={`time-btn ${timeOfDay === 'evening' ? 'active' : ''}`}
        title="Evening time"
        aria-label="Switch to evening time"
      >
        🌅
      </button>
      <button
        onClick={() => setTimeOfDay('night')}
        className={`time-btn ${timeOfDay === 'night' ? 'active' : ''}`}
        title="Night time"
        aria-label="Switch to night time"
      >
        🌙
      </button>
    </div>
  );
}
