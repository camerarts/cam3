
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Menu, Plus, LogOut, Filter, Settings, Moon, Sun, Trash2, Pencil, Check, SlidersHorizontal, Globe } from 'lucide-react';
import { GlassCard } from './components/GlassCard';
import { PhotoModal } from './components/PhotoModal';
import { UploadModal } from './components/UploadModal';
import { LoginModal } from './components/LoginModal';
import { MapView } from './components/MapView';
import { ProgressBar } from './components/ProgressBar';
import { Category, Photo, Theme } from './types';
import { client } from './api/client';

// Hardcoded Admin Token for client-side consistency (matches backend env var)
const ADMIN_TOKEN = "1211";

// Helper: Calculate distance between two coordinates in km (Haversine formula)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

const PAGE_SIZE = 9;

// New Tabs Definition
const FEED_TABS = ['精选', '最新', '随览', '附近', '远方'];

const App: React.FC = () => {
  // Initialize photos as empty array, will fetch from API
  const [photos, setPhotos] = useState<Photo[]>([]);
  
  // Loading States
  const [globalLoading, setGlobalLoading] = useState(false);
  
  // Data fetching
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setGlobalLoading(true);
        const data = await client.getPhotos(1, 100); // Fetch initial batch
        setPhotos(data);
      } catch (error) {
        console.error("Failed to fetch photos:", error);
      } finally {
        setGlobalLoading(false);
      }
    };
    fetchPhotos();
  }, []);

  const [activeCategory, setActiveCategory] = useState<Category>(Category.ALL);
  const [activeTab, setActiveTab] = useState<string>('最新');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const [isAdmin, setIsAdmin] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  
  // Admin Modes - Unified Manage Mode
  const [isManageMode, setIsManageMode] = useState(false);
  const [photoToEdit, setPhotoToEdit] = useState<Photo | null>(null);

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Sorting & Location States
  const [shuffleTrigger, setShuffleTrigger] = useState(0); // Trigger to force re-shuffle
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const isDark = theme === 'dark';

  // Background Component based on Theme
  const Background = () => (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none -z-10 transition-colors duration-1000 ease-liquid ${isDark ? 'bg-[#050505]' : 'bg-[#f8f8f8]'}`}>
      {isDark ? (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-indigo-950/20 rounded-full blur-[120px] animate-blob mix-blend-screen" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] bg-purple-950/10 rounded-full blur-[120px] animate-blob animation-delay-4000 mix-blend-screen" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150"></div>
        </>
      ) : (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-gray-200/40 rounded-full blur-[100px] animate-blob" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] bg-slate-200/30 rounded-full blur-[100px] animate-blob animation-delay-2000" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] brightness-100 contrast-100"></div>
        </>
      )}
    </div>
  );

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20); // Sensitive scroll trigger
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle Tab Click - Special logic for Random and Location
  const handleTabClick = (tab: string) => {
    // Reset view mode to grid when clicking other tabs, unless user toggles map explicitly
    if (viewMode === 'map') setViewMode('grid');

    // Trigger loading effect
    setGlobalLoading(true);
    setTimeout(() => setGlobalLoading(false), 800);

    if (tab === '随览') {
      // Always trigger re-shuffle even if already active
      setShuffleTrigger(prev => prev + 1);
    }
    
    // Only fetch location if clicking Nearby/Faraway and we don't have it yet
    if ((tab === '附近' || tab === '远方') && !userLocation) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            // Location fetched successfully
          },
          (error) => {
            let msg = "无法获取您的地理位置。";
            if (error.code === error.PERMISSION_DENIED) msg = "您拒绝了位置权限，无法按距离排序。";
            else if (error.code === error.POSITION_UNAVAILABLE) msg = "位置信息不可用。";
            else if (error.code === error.TIMEOUT) msg = "获取位置超时。";
            
            console.warn("Geolocation error:", error.message);
            alert(msg);
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
      } else {
        alert("您的浏览器不支持地理位置功能。");
      }
    }
    
    // Set active tab immediately
    setActiveTab(tab);
  };

  // Filter & Sort Logic
  const filteredPhotos = useMemo(() => {
    let result = photos.filter(p => {
      if (activeCategory === Category.ALL) return true;
      if (activeCategory === Category.HORIZONTAL) return (p.width || 0) >= (p.height || 0);
      if (activeCategory === Category.VERTICAL) return (p.height || 0) > (p.width || 0);
      return p.category === activeCategory;
    });

    switch (activeTab) {
      case '精选':
        // Filter for 4 or 5 stars, then sort by rating desc
        result = result.filter(p => (p.rating || 0) >= 4);
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
        
      case '最新':
        // API default sort is CreatedAt DESC, so no action needed for 'Latest'
        break;
        
      case '随览':
        // Random shuffle - depends on shuffleTrigger to re-run on every click
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const trigger = shuffleTrigger; // Dependency
        result = [...result].sort(() => Math.random() - 0.5);
        break;
        
      case '附近':
      case '远方':
        if (userLocation) {
          result = result.sort((a, b) => {
            const distA = (a.exif.latitude && a.exif.longitude) 
              ? getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, a.exif.latitude, a.exif.longitude)
              : 99999; // Put photos without location at the end
            const distB = (b.exif.latitude && b.exif.longitude) 
              ? getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, b.exif.latitude, b.exif.longitude)
              : 99999;
            
            return activeTab === '附近' ? distA - distB : distB - distA;
          });
        }
        break;
        
      default:
        break;
    }

    return result;
  }, [photos, activeCategory, activeTab, shuffleTrigger, userLocation]);

  // Progressive Loading Logic
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    window.scrollTo(0,0);
  }, [activeCategory, activeTab, shuffleTrigger, viewMode]); // Reset when reshuffled or view changed

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredPhotos.length));
    }, 3000);
    return () => clearTimeout(timer);
  }, [activeCategory, activeTab, shuffleTrigger, filteredPhotos.length]);

  useEffect(() => {
    if (viewMode === 'map') return; // Don't scroll load in map view
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredPhotos.length));
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [filteredPhotos.length, visibleCount, viewMode]); 

  const visiblePhotos = filteredPhotos.slice(0, visibleCount);

  const handleUpdatePhoto = (newPhoto: Photo) => {
    // For upload, we prepend the new photo to the list locally for immediate feedback
    // The actual persistence is done in UploadModal calling client.uploadPhoto
    setPhotos(prev => [newPhoto, ...prev]);
    
    // Reset filters to show new photo
    setActiveCategory(Category.ALL);
    setActiveTab('最新');
    setViewMode('grid');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePhoto = async (e: React.MouseEvent, photoId: string) => {
    // Critical: Stop propagation instantly
    e.stopPropagation();
    e.preventDefault();

    // Use setTimeout to ensure the UI has registered the click event 
    setTimeout(async () => {
      const isConfirmed = window.confirm('确定要永久删除这张照片吗？');
      if (isConfirmed) {
        try {
          setGlobalLoading(true);
          await client.deletePhoto(photoId, ADMIN_TOKEN);
          setPhotos(prev => prev.filter(p => p.id !== photoId));
          if (selectedPhoto?.id === photoId) {
            setSelectedPhoto(null);
          }
        } catch (err) {
          alert("删除失败，请检查网络连接");
          console.error(err);
        } finally {
          setGlobalLoading(false);
        }
      }
    }, 10);
  };

  const handlePhotoClick = (photo: Photo) => {
    // If management mode is active, prevent opening the modal
    if (isManageMode) return;
    
    setSelectedPhoto(photo);
  };

  const handleNextPhoto = () => {
    if (!selectedPhoto) return;
    setSlideDirection('right');
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex < filteredPhotos.length - 1) {
      setSelectedPhoto(filteredPhotos[currentIndex + 1]);
    }
  };

  const handlePrevPhoto = () => {
    if (!selectedPhoto) return;
    setSlideDirection('left');
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex > 0) {
      setSelectedPhoto(filteredPhotos[currentIndex - 1]);
    }
  };

  const currentIndex = selectedPhoto ? filteredPhotos.findIndex(p => p.id === selectedPhoto.id) : -1;
  const hasNext = currentIndex < filteredPhotos.length - 1;
  const hasPrev = currentIndex > 0;

  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-white/60" : "text-black/60";
  
  return (
    <div className={`min-h-screen font-sans selection:bg-gray-500/30 ${textPrimary}`}>
      <Background />
      <ProgressBar isLoading={globalLoading} theme={theme} />

      {/* Hero Section - Redesigned for Minimalist Premium Look */}
      {viewMode !== 'map' && (
        <header className="pt-12 pb-8 px-6 max-w-7xl mx-auto text-center">
          <div className="animate-fade-in flex flex-col items-center">
            {/* Extremely spaced, thin serif font for luxury feel */}
            <h1 className="text-5xl md:text-8xl font-serif font-thin tracking-[0.2em] leading-tight mb-2 uppercase mix-blend-overlay opacity-90">
              Lumina
            </h1>
            <div className={`w-24 h-px mb-6 ${isDark ? 'bg-white/20' : 'bg-black/20'}`}></div>
            <p className={`text-[10px] md:text-xs tracking-[0.4em] uppercase font-sans mb-0 ${textSecondary}`}>
              Light & Shadow Collection
            </p>
          </div>
        </header>
      )}

      {/* Unified Sticky Utility Bar - Liquid Glass Style */}
      <div className={`sticky top-0 z-40 transition-all duration-500 ease-liquid
        ${isDark ? 'bg-black/40' : 'bg-white/60'}
        backdrop-blur-2xl border-b 
        ${scrolled ? (isDark ? 'border-white/5 shadow-2xl shadow-black/10' : 'border-white/20 shadow-xl shadow-black/5') : 'border-transparent'}
      `}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left: Text Tabs with Liquid Hover */}
          <div className="flex gap-6 overflow-x-auto no-scrollbar items-center">
             {FEED_TABS.map(tab => (
               <button
                 key={tab}
                 onClick={() => handleTabClick(tab)}
                 className={`text-sm md:text-base font-serif transition-all duration-500 ease-liquid whitespace-nowrap relative py-2 px-1 hover:scale-110 active:scale-95
                    ${activeTab === tab 
                      ? (isDark ? 'text-white font-semibold' : 'text-black font-semibold')
                      : (isDark ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black')
                    }
                 `}
               >
                 {tab}
                 {activeTab === tab && (
                   <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`} />
                 )}
               </button>
             ))}
             
             {/* Map Toggle (Globe Icon) with Liquid Hover */}
             <button
               onClick={() => setViewMode(v => v === 'grid' ? 'map' : 'grid')}
               className={`p-2 rounded-full transition-all duration-500 ease-liquid flex items-center justify-center hover:scale-110 active:scale-95
                 ${viewMode === 'map' 
                   ? (isDark ? 'text-white bg-white/10' : 'text-black bg-black/5') 
                   : (isDark ? 'text-white/30 hover:text-white' : 'text-black/30 hover:text-black')
                 }
               `}
               title={viewMode === 'map' ? "切换回网格" : "世界地图模式"}
             >
               <Globe size={18} strokeWidth={1.5} />
             </button>
          </div>

          {/* Right: Filters, Theme, Admin (Compact & Liquid) */}
          <div className="flex items-center justify-between md:justify-end gap-3 overflow-x-auto no-scrollbar">
            
            {/* Categories - Compact Pills */}
            <div className="flex items-center gap-2">
              {Object.values(Category).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`
                    px-3 py-1.5 rounded-full text-[10px] md:text-xs tracking-wider font-medium whitespace-nowrap transition-all duration-500 ease-liquid hover:scale-105 active:scale-95
                    ${activeCategory === cat 
                      ? (isDark ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-black text-white shadow-[0_5px_15px_rgba(0,0,0,0.2)]') 
                      : (isDark ? 'text-white/50 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10' : 'text-black/50 hover:bg-black/5 hover:text-black border border-transparent hover:border-black/5')
                    }
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className={`w-px h-6 mx-1 flex-shrink-0 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

            {/* Theme Toggle */}
            <button 
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-500 ease-liquid hover:scale-110 active:scale-90 flex-shrink-0
                ${isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}
              `}
            >
              {isDark ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
            </button>

            {/* Admin / Login */}
            {isAdmin ? (
               <div className="flex items-center gap-2 flex-shrink-0">
                 {/* Toggle Management Mode */}
                 <button
                   onClick={() => {
                     // Disable map view if entering manage mode to avoid conflicts
                     if (!isManageMode && viewMode === 'map') setViewMode('grid');
                     setIsManageMode(!isManageMode);
                   }}
                   className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-500 ease-liquid hover:scale-110 active:scale-90 ${isManageMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : (isDark ? 'text-white/60 hover:bg-white/10' : 'text-black/60 hover:bg-black/5')}`}
                   title="管理模式 (编辑/删除)"
                 >
                   <Pencil size={16} strokeWidth={1.5} />
                 </button>
                 
                 {/* Upload */}
                 <button 
                  onClick={() => { setPhotoToEdit(null); setIsUploadOpen(true); }}
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-500 ease-liquid hover:scale-110 active:scale-90 ${isDark ? 'text-white/60 hover:bg-white/10' : 'text-black/60 hover:bg-black/5'}`}
                  title="上传图片"
                >
                  <Plus size={18} strokeWidth={1.5} />
                </button>

                {/* Logout */}
                <button
                   onClick={() => {
                     setIsAdmin(false);
                     setIsManageMode(false);
                   }}
                   className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-500 ease-liquid hover:scale-110 active:scale-90 ${isDark ? 'text-white/60 hover:bg-white/10' : 'text-black/60 hover:bg-black/5'}`}
                   title="退出登录"
                 >
                   <LogOut size={16} strokeWidth={1.5} />
                 </button>
               </div>
            ) : (
              <button 
                onClick={() => setIsLoginOpen(true)} 
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-500 ease-liquid hover:scale-110 active:scale-90 flex-shrink-0
                  ${isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}
                `}
              >
                <Settings size={16} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`
        ${viewMode === 'map' 
          ? "w-full h-[calc(100vh-65px)] relative" // Full screen map mode
          : "px-2 md:px-6 py-8 max-w-7xl mx-auto min-h-[60vh]" // Normal grid mode
        }
      `}>
        
        {viewMode === 'map' ? (
           // MAP VIEW
           <div className="w-full h-full">
             <MapView 
               photos={filteredPhotos} 
               theme={theme} 
               onPhotoClick={handlePhotoClick} 
               onMapLoadStatus={(isLoading) => setGlobalLoading(isLoading)}
             />
           </div>
        ) : (
          // GRID VIEW
          <>
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {visiblePhotos.map((photo) => (
                <div 
                  key={photo.id} 
                  className={`break-inside-avoid animate-fade-in relative group-container mb-4 z-0 hover:z-10 transition-all duration-500 ease-liquid`}
                >
                  <GlassCard 
                    theme={theme}
                    flat={true}
                    square={true}
                    hoverEffect={!isManageMode} // Disable hover effect in manage mode to stabilize buttons
                    className={`group h-full relative ${isManageMode ? 'cursor-default' : 'cursor-zoom-in'}`} 
                    onClick={() => handlePhotoClick(photo)}
                  >
                    <div className="relative overflow-hidden">
                      <img 
                        src={photo.url} 
                        alt={photo.title} 
                        className={`w-full h-auto object-cover transform transition-transform duration-700 ease-liquid ${isManageMode ? '' : 'group-hover:scale-105'}`}
                        loading="lazy"
                      />
                      
                      {/* Minimal Overlay - Info on Hover (Only if not in manage mode) */}
                      {!isManageMode && (
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4`}>
                          <p className="text-white font-serif text-lg font-medium translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-liquid">{photo.title}</p>
                          <p className="text-white/70 text-xs uppercase tracking-wider translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-liquid delay-75">{photo.category}</p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                  
                  {/* Manage Mode Interaction Overlay */}
                  {isManageMode && (
                    <div className="absolute inset-0 z-[50] bg-black/20 backdrop-blur-[2px] border-2 border-dashed border-white/30 flex items-start justify-between p-2 pointer-events-auto transition-all duration-300 animate-fade-in">
                      {/* Top Left: Edit */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPhotoToEdit(photo);
                          setIsUploadOpen(true);
                        }}
                        className="bg-blue-500/90 text-white p-2.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform duration-300 cursor-pointer backdrop-blur-sm"
                        title="编辑"
                      >
                        <Pencil size={14} />
                      </button>

                      {/* Top Right: Delete */}
                      <button
                        type="button"
                        onClick={(e) => handleDeletePhoto(e, photo.id)}
                        className="bg-red-500/90 text-white p-2.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform duration-300 cursor-pointer backdrop-blur-sm"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Scroll Sentinel */}
            <div ref={loadMoreRef} className="h-20 w-full flex items-center justify-center pointer-events-none opacity-0">
              Loading...
            </div>

            {filteredPhotos.length === 0 && (
              <div className={`text-center py-20 ${textSecondary}`}>
                <p>暂无图片，请登录上传。</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer - Hidden in Map View */}
      {viewMode !== 'map' && (
        <footer className={`border-t py-12 text-center text-[10px] uppercase tracking-[0.2em] font-light ${isDark ? 'border-white/5 text-white/20' : 'border-black/5 text-black/20'}`}>
          <p>© {new Date().getFullYear()} LUMINA. All Rights Reserved.</p>
        </footer>
      )}

      {/* Full Screen Photo Modal */}
      <PhotoModal 
        photo={selectedPhoto} 
        onClose={() => setSelectedPhoto(null)} 
        onNext={handleNextPhoto} 
        onPrev={handlePrevPhoto} 
        hasNext={hasNext} 
        hasPrev={hasPrev} 
        theme={theme} 
        slideDirection={slideDirection}
        isAdmin={isAdmin}
        onUpdatePhoto={handleUpdatePhoto}
      />

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => { setIsUploadOpen(false); setPhotoToEdit(null); }} 
        onUpload={handleUpdatePhoto} 
        theme={theme}
        editingPhoto={photoToEdit}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={() => setIsAdmin(true)}
        theme={theme}
      />
    </div>
  );
};

export default App;
