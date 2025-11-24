import React from 'react';
import { Layers, Aperture, Zap, Gauge, Star, MoreHorizontal } from 'lucide-react';
import { ExifData, Theme } from '../types';

interface PhotoDetailProps {
  exif: ExifData;
  rating?: number;
  className?: string;
  theme?: Theme;
  isAdmin?: boolean;
  onRate?: (rating: number) => void;
}

export const PhotoDetail: React.FC<PhotoDetailProps> = ({ 
  exif, 
  rating = 0, 
  className = '', 
  theme = 'dark',
  isAdmin = false,
  onRate
}) => {
  const isDark = theme === 'dark';
  
  // Colors tailored to match the solid grey background reference
  const labelColor = isDark ? 'text-white/40' : 'text-[#888888]';
  const valueColor = isDark ? 'text-white/90' : 'text-[#333333]';
  const iconColor = isDark ? 'text-white/70' : 'text-[#555555]';

  return (
    <div className={`w-full flex flex-wrap items-end justify-center gap-y-2 gap-x-4 md:gap-x-8 text-xs md:text-sm font-sans ${className}`}>
      
      {/* 1. Rating Column */}
      <div className="flex flex-col items-center gap-0.5 min-w-[50px]">
        <span className={`text-[10px] uppercase tracking-widest ${labelColor} scale-90 origin-bottom`}>评级</span>
        <div className={`flex items-center gap-0.5 ${isAdmin ? 'cursor-pointer' : ''}`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <div 
              key={star} 
              onClick={() => isAdmin && onRate && onRate(star)}
              className={`${isAdmin ? 'hover:scale-125 transition-transform duration-200' : ''}`}
            >
              <Star 
                size={10} 
                className={`${star <= rating ? (isDark ? 'text-white fill-white' : 'text-[#555555] fill-[#555555]') : (isDark ? 'text-white/10' : 'text-black/10')}`} 
              />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Parameters Column (Combined) */}
      <div className="flex flex-col items-center gap-0.5">
         <span className={`text-[10px] uppercase tracking-widest ${labelColor} scale-90 origin-bottom`}>参数</span>
         <div className={`flex items-center gap-2 md:gap-3 ${valueColor} font-medium`}>
            <div className="flex items-center gap-0.5" title="Focal Length">
                <Layers size={12} className={iconColor} strokeWidth={1.5} />
                <span>{exif.focalLength || '--'}</span>
            </div>
            <div className="flex items-center gap-0.5" title="Aperture">
                <Aperture size={12} className={iconColor} strokeWidth={1.5} />
                <span>{exif.aperture || '--'}</span>
            </div>
            <div className="flex items-center gap-0.5" title="Shutter Speed">
                <Zap size={12} className={iconColor} strokeWidth={1.5} />
                <span>{exif.shutterSpeed || '--'}</span>
            </div>
             <div className="flex items-center gap-0.5" title="ISO">
                <Gauge size={12} className={iconColor} strokeWidth={1.5} />
                <span>ISO {exif.iso || '--'}</span>
            </div>
         </div>
      </div>

      {/* 3. Location Column */}
      <div className="flex flex-col items-center gap-0.5">
         <span className={`text-[10px] uppercase tracking-widest ${labelColor} scale-90 origin-bottom`}>地点</span>
         <span className={`${valueColor} font-medium`}>{exif.location || 'Unknown'}</span>
      </div>

      {/* 4. Camera Column */}
      <div className="flex flex-col items-center gap-0.5">
        <span className={`text-[10px] uppercase tracking-widest ${labelColor} scale-90 origin-bottom`}>相机</span>
        <span className={`${valueColor} font-medium`}>{exif.camera || '--'}</span>
      </div>

       {/* 5. Lens Column */}
       <div className="flex flex-col items-center gap-0.5">
        <span className={`text-[10px] uppercase tracking-widest ${labelColor} scale-90 origin-bottom`}>镜头</span>
        <span className={`${valueColor} font-medium`}>{exif.lens || '--'}</span>
      </div>

      {/* Extra Menu Icon */}
      <div className="hidden md:flex items-center pb-0.5 opacity-50">
          <MoreHorizontal size={16} className={iconColor} />
      </div>

    </div>
  );
};