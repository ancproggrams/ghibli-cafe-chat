
'use client';

import { useEffect, useRef, useState } from 'react';

interface WaveformVisualizerProps {
  micActive: boolean;
}

export function WaveformVisualizer({ micActive }: WaveformVisualizerProps) {
  const barsRef = useRef<HTMLDivElement[]>([]);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (micActive) {
      startVisualization();
    } else {
      stopVisualization();
    }

    return () => {
      stopVisualization();
    };
  }, [micActive]);

  const startVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const data = new Uint8Array(analyser.frequencyBinCount);
      const barsCount = barsRef.current.length;

      const render = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteTimeDomainData(data);
        
        // Compute amplitude
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128; // normalize to -1..1
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length); // 0..~1

        // Smooth and scatter across bars
        for (let i = 0; i < barsCount; i++) {
          const bar = barsRef.current[i];
          if (bar) {
            const jitter = Math.random() * 0.2;
            const level = Math.max(0.2, Math.min(1, rms * 3 + jitter));
            bar.style.transform = `scaleY(${level.toFixed(2)})`;
          }
        }
        
        animationRef.current = requestAnimationFrame(render);
      };
      
      render();
    } catch (err) {
      console.error('Microphone access error:', err);
    }
  };

  const stopVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    
    // Reset bars to default state
    barsRef.current.forEach(bar => {
      if (bar) {
        bar.style.transform = 'scaleY(0.4)';
      }
    });
  };

  return (
    <div className="wave-container" title="Mic level" aria-label="Microphone input level">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="bar"
          ref={(el) => {
            if (el) barsRef.current[index] = el;
          }}
        />
      ))}
    </div>
  );
}
