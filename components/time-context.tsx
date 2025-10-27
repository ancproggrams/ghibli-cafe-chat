
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type TimeOfDay = 'day' | 'evening' | 'night';

interface TimeContextType {
  timeOfDay: TimeOfDay;
  setTimeOfDay: (time: TimeOfDay) => void;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export function TimeProvider({ children }: { children: ReactNode }) {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');

  // Auto-detect time on mount (optional)
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 17) {
      setTimeOfDay('day');
    } else if (hour >= 17 && hour < 20) {
      setTimeOfDay('evening');
    } else {
      setTimeOfDay('night');
    }
  }, []);

  // Apply CSS class to body for theme switching
  useEffect(() => {
    document.body.className = `time-${timeOfDay}`;
  }, [timeOfDay]);

  return (
    <TimeContext.Provider value={{ timeOfDay, setTimeOfDay }}>
      {children}
    </TimeContext.Provider>
  );
}

export function useTimeOfDay() {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useTimeOfDay must be used within TimeProvider');
  }
  return context;
}
