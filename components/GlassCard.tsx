import React from 'react';
import { Theme } from '../types';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: () => void;
  theme?: Theme;
  square?: boolean;
  flat?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  hoverEffect = true, 
  onClick,
  theme = 'dark',
  square = false,
  flat = false
}) => {
  const isDark = theme === 'dark';

  // Shadow definitions
  // Flat Mode: We want strong, clean shadows since there's no border to define edges
  // Glass Mode: We use softer shadows mixed with borders
  const shadowStyle = isDark
    ? (flat ? 'shadow-[0_20px_40px_rgba(0,0,0,0.6)]' : 'shadow-2xl shadow-black/50')
    : (flat ? 'shadow-[0_20px_40px_rgba(0,0,0,0.2)]' : 'shadow-[0_30px_60px_rgba(0,0,0,0.15)]');

  // Base style refinement
  const baseStyles = isDark 
    ? `${flat ? 'bg-transparent border-transparent' : 'bg-white/5 border-white/10'} ${shadowStyle}` 
    : `${flat ? 'bg-transparent border-transparent' : 'bg-white/80 border-white/40'} ${shadowStyle}`;

  // Hover styles (Liquid/Inertia Effect)
  const hoverStyles = hoverEffect 
    ? (isDark 
        ? "hover:scale-[1.02] hover:shadow-white/5" 
        : "hover:scale-[1.02] hover:shadow-[0_30px_60px_rgba(0,0,0,0.25)]")
    : "";

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        backdrop-blur-2xl border
        transition-all duration-500 ease-liquid
        ${square ? 'rounded-none' : 'rounded-3xl'}
        ${baseStyles}
        ${hoverStyles}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Glossy sheen overlay - subtly shifts on hover for "wet" look */}
      {!flat && (
        <div className={`
          absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-700
          bg-gradient-to-tr
          ${isDark ? 'from-white/5 via-transparent to-transparent' : 'from-white/40 via-transparent to-transparent'}
          ${hoverEffect ? 'group-hover:opacity-100' : ''}
        `} />
      )}
      
      {children}
    </div>
  );
};