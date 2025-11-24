
import React, { useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Photo, Theme } from '../types';
import { MapPin } from 'lucide-react';

interface MapViewProps {
  photos: Photo[];
  theme: Theme;
  onPhotoClick: (photo: Photo) => void;
  onMapLoadStatus?: (isLoading: boolean) => void;
}

interface LocationGroup {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  photos: Photo[];
}

export const MapView: React.FC<MapViewProps> = ({ photos, theme, onPhotoClick, onMapLoadStatus }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const isDark = theme === 'dark';

  // 1. Group photos by location proximity (approx 20km radius)
  const locationGroups = useMemo(() => {
    const groups: LocationGroup[] = [];
    const THRESHOLD = 0.2; // roughly 20km degrees diff

    photos.forEach(photo => {
      if (!photo.exif.latitude || !photo.exif.longitude) return;

      // Find existing group nearby
      const existingGroup = groups.find(g => 
        Math.abs(g.latitude - photo.exif.latitude!) < THRESHOLD && 
        Math.abs(g.longitude - photo.exif.longitude!) < THRESHOLD
      );

      if (existingGroup) {
        existingGroup.photos.push(photo);
      } else {
        const locName = photo.exif.location.split(',')[0].trim() || '未知地点';
        groups.push({
          id: `loc-${groups.length}`,
          name: locName,
          latitude: photo.exif.latitude!,
          longitude: photo.exif.longitude!,
          photos: [photo]
        });
      }
    });

    return groups;
  }, [photos]);

  // 2. Initialize and Update Map
  useEffect(() => {
    if (!mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Init Map Instance if needed
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [25, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
        worldCopyJump: true // Enable markers to track across world copies
      });
    }

    const map = mapInstance.current;

    // CRITICAL FIX: Force map to recalculate size after a short delay to prevent partial rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Update Tile Layer based on theme
    const layerStyle = theme === 'dark' ? 'dark_all' : 'light_all';
    map.eachLayer((layer: any) => {
      if (layer.options && layer.options.subdomains) { 
        map.removeLayer(layer);
      }
    });
    
    const tileLayer = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${layerStyle}/{z}/{x}/{y}{r}.png`, {
      maxZoom: 20,
      subdomains: 'abcd',
    });

    // Add loading listeners
    tileLayer.on('loading', () => {
       onMapLoadStatus?.(true);
    });
    tileLayer.on('load', () => {
       onMapLoadStatus?.(false);
    });

    tileLayer.addTo(map);

    // 3. Render Markers with Popups
    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    locationGroups.forEach(group => {
      // Create copies for continuous world wrapping (Center, East Copy, West Copy)
      // This ensures markers appear on all "copies" of the world map when dragging endlessly
      const positions = [
          [group.latitude, group.longitude],
          [group.latitude, group.longitude + 360],
          [group.latitude, group.longitude - 360]
      ];

      positions.forEach(pos => {
        // Create a clean circle marker with REDUCED RADIUS (3)
        const marker = L.circleMarker(pos, {
          radius: 3, // Reduced from 6 to 3
          fillColor: theme === 'dark' ? '#fff' : '#000',
          color: 'transparent',
          weight: 0,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(map);

        // Create Popup Content using React Portal Logic
        const popupDiv = document.createElement('div');
        const root = createRoot(popupDiv);
        
        root.render(
          <div className={`w-64 rounded-xl shadow-xl overflow-hidden backdrop-blur-md border animate-fade-in
             ${theme === 'dark' ? 'bg-black/80 border-white/10 text-white' : 'bg-white/90 border-black/5 text-black'}
          `}>
            <div className={`p-3 border-b flex justify-between items-center ${theme === 'dark' ? 'border-white/10' : 'border-black/5'}`}>
               <div>
                  <h3 className="font-serif font-medium text-sm leading-tight">{group.name}</h3>
                  <div className="flex items-center gap-1 opacity-50 text-[10px] uppercase tracking-wider mt-0.5">
                    <MapPin size={8} />
                    <span>{group.photos.length} 张照片</span>
                  </div>
               </div>
            </div>
            <div className="p-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
               {group.photos.map(photo => (
                 <div 
                   key={photo.id}
                   onClick={(e) => {
                     e.stopPropagation(); // prevent map click
                     onPhotoClick(photo);
                   }}
                   className="aspect-square rounded-md overflow-hidden cursor-pointer relative group/item"
                 >
                   <img 
                     src={photo.url} 
                     alt={photo.title} 
                     className="w-full h-full object-cover transition-transform duration-300 group-hover/item:scale-110"
                   />
                   <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/20 transition-colors" />
                 </div>
               ))}
            </div>
          </div>
        );

        marker.bindPopup(popupDiv, {
          className: 'custom-popup',
          minWidth: 256,
          maxWidth: 256,
          closeButton: false,
          offset: [0, -4]
        });

        // Marker interactions - Hover radius reduced to 5
        marker.on('mouseover', function (this: any) {
          this.setStyle({ fillOpacity: 1, radius: 5 }); // Reduced from 9 to 5
          this.openPopup();
        });

        markersRef.current.push(marker);
      });
    });

  }, [theme, locationGroups, onPhotoClick, onMapLoadStatus]); 

  // Cleanup
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full animate-fade-in relative z-0 group">
       <div ref={mapRef} className="w-full h-full overflow-hidden outline-none focus:outline-none" style={{ background: theme === 'dark' ? '#111' : '#f5f5f5' }} />
       
       <div className={`absolute bottom-4 right-4 text-xs ${theme === 'dark' ? 'text-white/30' : 'text-black/30'} pointer-events-none z-[400]`}>
          点击或悬停黑点查看详情
       </div>
    </div>
  );
};