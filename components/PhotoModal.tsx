import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Photo, Theme } from '../types';
import { PhotoDetail } from './PhotoDetail';

interface PhotoModalProps {
  photo: Photo | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  theme: Theme;
  slideDirection: 'left' | 'right';
  isAdmin?: boolean;
  onUpdatePhoto?: (photo: Photo) => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({ 
  photo, 
  onClose, 
  onNext, 
  onPrev, 
  hasNext, 
  hasPrev, 
  theme,
  slideDirection,
  isAdmin,
  onUpdatePhoto
}) => {
  const isDark = theme === 'dark';
  
  // State to manage transitions
  const [activePhoto, setActivePhoto] = useState<Photo | null>(photo);
  const [exitingPhoto, setExitingPhoto] = useState<Photo | null>(null);
  const [animDirection, setAnimDirection] = useState<'left' | 'right'>(slideDirection);
  const [isFirstOpen, setIsFirstOpen] = useState(true);

  // Sync prop changes to state for animations
  useEffect(() => {
    if (photo && activePhoto && photo.id !== activePhoto.id) {
      setExitingPhoto(activePhoto);
      setActivePhoto(photo);
      setAnimDirection(slideDirection);
      setIsFirstOpen(false); // Navigation occurred, so disable fade-in fallback
    } else if (photo && !activePhoto) {
      // First open
      setActivePhoto(photo);
      setExitingPhoto(null);
      setIsFirstOpen(true);
    } else if (photo && activePhoto && photo.id === activePhoto.id && photo !== activePhoto) {
      // Deep update (e.g. rating change) without transition
      setActivePhoto(photo);
    }
  }, [photo, slideDirection, activePhoto]);

  // Handle Close - Reset states
  useEffect(() => {
    if (!photo) {
      setActivePhoto(null);
      setExitingPhoto(null);
      setIsFirstOpen(true);
    }
  }, [photo]);

  // Lock body scroll
  useEffect(() => {
    if (photo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!photo) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [photo, onClose, onNext, onPrev]);

  if (!photo || !activePhoto) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center animate-fade-in overflow-hidden"
    >
      {/* 1. Solid Background (Grey for Light, Dark for Dark) matching reference */}
      <div className={`absolute inset-0 z-0 transition-colors duration-500
        ${isDark ? 'bg-[#1a1a1a]' : 'bg-[#E5E5E5]'}
      `} />

      {/* Background click to close */}
      <div className="absolute inset-0 z-10" onClick={onClose} />

      {/* Top Right Controls */}
      <div className="absolute top-6 right-6 z-[120] flex items-center gap-2">
        <button 
          className={`p-3 rounded-full transition-all hover:scale-110
            ${isDark 
              ? 'text-white/50 hover:text-white' 
              : 'text-black/40 hover:text-black'
            }
          `}
        >
          <MoreHorizontal size={24} />
        </button>
        <button 
          onClick={onClose}
          className={`p-3 rounded-full transition-all hover:rotate-90
            ${isDark 
              ? 'text-white/50 hover:text-white' 
              : 'text-black/40 hover:text-black'
            }
          `}
        >
          <X size={28} strokeWidth={1.5} />
        </button>
      </div>

      {/* Navigation Arrows - Fixed Position */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
          className={`absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-[120] p-4 rounded-full transition-all group hover:scale-110
            ${isDark 
              ? 'text-white/50 hover:text-white' 
              : 'text-black/50 hover:text-black'
            }
          `}
        >
          <ChevronLeft size={40} strokeWidth={1.5} />
        </button>
      )}

      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          className={`absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-[120] p-4 rounded-full transition-all group hover:scale-110
             ${isDark 
              ? 'text-white/50 hover:text-white' 
              : 'text-black/50 hover:text-black'
            }
          `}
        >
          <ChevronRight size={40} strokeWidth={1.5} />
        </button>
      )}

      {/* Main Content Area */}
      <div className="relative z-[110] w-full h-full flex flex-col pointer-events-none">
        
        {/* Image Display Area (Relative for absolute images) */}
        <div className="flex-1 w-full relative overflow-hidden perspective-[2000px]">
          
          {/* Exiting Photo (Old) */}
          {exitingPhoto && (
            <div 
              key={`exit-${exitingPhoto.id}`}
              className={`absolute inset-0 flex items-center justify-center p-0 md:p-2 will-change-transform
                ${animDirection === 'right' ? 'animate-slide-out-left' : 'animate-slide-out-right'}
              `}
              style={{ zIndex: 1 }}
              onAnimationEnd={() => setExitingPhoto(null)}
            >
              <img 
                src={exitingPhoto.url} 
                alt={exitingPhoto.title} 
                className="max-w-full max-h-full object-contain shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] backface-hidden"
                draggable={false}
                style={{ 
                  transform: 'translate3d(0,0,0)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden' 
                }}
              />
            </div>
          )}

          {/* Active Photo (New) */}
          <div 
            key={`active-${activePhoto.id}`}
            className={`absolute inset-0 flex items-center justify-center p-0 md:p-2 will-change-transform
              ${exitingPhoto // Only animate if there is an exiting photo (navigation)
                  ? (animDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left')
                  : (isFirstOpen ? 'animate-fade-in' : '') // FIX: Only fade in on first open, otherwise stay static to prevent flicker
              }
            `}
            style={{ zIndex: 2 }}
          >
             <img 
              src={activePhoto.url} 
              alt={activePhoto.title} 
              className="max-w-full max-h-full object-contain pointer-events-auto shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] select-none hover:scale-[1.01] transition-transform duration-500 ease-out backface-hidden"
              draggable={false}
              loading="eager"
              style={{ 
                transform: 'translate3d(0,0,0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden' 
              }}
            />
          </div>
        </div>
        
        {/* Bottom Detail Strip - Transparent & Floating */}
        <div className="w-full pointer-events-auto pb-8 pt-4">
          <div className="max-w-7xl mx-auto px-6">
             <PhotoDetail 
               exif={activePhoto.exif} 
               rating={activePhoto.rating} 
               theme={theme} 
               isAdmin={isAdmin}
               onRate={(newRating) => onUpdatePhoto?.({ ...activePhoto, rating: newRating })}
             />
          </div>
        </div>
      </div>
    </div>
  );
};