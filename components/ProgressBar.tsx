import React, { useEffect, useState } from 'react';
import { Theme } from '../types';

interface ProgressBarProps {
  isLoading: boolean;
  theme: Theme;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ isLoading, theme }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setVisible(true);
      setProgress(10); // Start
      // Simulate slow progress up to 90%
      interval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + Math.random() * 10 : prev));
      }, 500);
    } else {
      // Complete
      setProgress(100);
      clearInterval(interval);
      // Hide after animation finishes
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  if (!visible) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent pointer-events-none">
      <div 
        className={`h-full transition-all duration-500 ease-liquid shadow-[0_0_10px_rgba(0,0,0,0.5)]
          ${isDark ? 'bg-white shadow-white/50' : 'bg-black shadow-black/50'}
        `}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};