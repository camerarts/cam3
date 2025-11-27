
import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Loader2, ChevronDown, Trash2, Star, Calendar as CalendarIcon, MapPin, CheckCircle, Cloud } from 'lucide-react';
import { Category, Photo, Theme } from '../types';
import { GlassCard } from './GlassCard';
import EXIF from 'exif-js';
import { client } from '../api/client';

// Hardcoded admin token for client operations
const ADMIN_TOKEN = "1211"; 

interface SmartInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  storageKey: string;
  placeholder?: string;
  theme: Theme;
  type?: string;
  readOnly?: boolean;
}

const SmartInput: React.FC<SmartInputProps> = ({ label, value, onChange, storageKey, placeholder, theme, type = 'text', readOnly = false }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (type !== 'text' || readOnly) return; 
    const saved = localStorage.getItem(`lumina_history_${storageKey}`);
    if (saved) {
      setHistory(JSON.parse(saved));
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [storageKey, type, readOnly]);

  const saveToHistory = () => {
    if (type !== 'text' || !value.trim() || readOnly) return;
    const newHistory = Array.from(new Set([value, ...history])).slice(10);
    setHistory(newHistory);
    localStorage.setItem(`lumina_history_${storageKey}`, JSON.stringify(newHistory));
  };

  const deleteFromHistory = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h !== item);
    setHistory(newHistory);
    localStorage.setItem(`lumina_history_${storageKey}`, JSON.stringify(newHistory));
  };

  const inputClass = isDark 
    ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-white/30 placeholder:text-white/20" 
    : "bg-black/5 border-black/10 text-black focus:bg-black/5 focus:border-black/30 placeholder:text-black/30";
  
  const labelClass = isDark ? "text-white/60" : "text-black/50";
  const dropdownClass = isDark ? "bg-[#1a1f35] border-white/10 text-white/80" : "bg-white border-black/10 text-black/80";
  const dropdownHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-black/5";

  return (
    <div className="relative" ref={wrapperRef}>
      <label className={`block text-xs uppercase tracking-wider mb-1 ${labelClass}`}>{label}</label>
      <div className="relative">
        <input 
          type={type}
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          onBlur={saveToHistory}
          onFocus={() => type === 'text' && !readOnly && setShowHistory(true)}
          readOnly={readOnly}
          className={`w-full border rounded p-2 text-xs focus:outline-none transition-colors ${inputClass} ${type === 'date' ? 'min-h-[34px]' : ''} ${readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
          placeholder={placeholder}
        />
        {type === 'text' && history.length > 0 && !readOnly && (
          <button 
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 hover:scale-110 ${isDark ? 'text-white/30 hover:text-white' : 'text-black/30 hover:text-black'}`}
          >
            <ChevronDown size={14} />
          </button>
        )}
      </div>

      {showHistory && history.length > 0 && !readOnly && (
        <div className={`absolute z-50 top-full left-0 right-0 mt-1 border rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto ${dropdownClass}`}>
          {history.map((item) => (
            <div 
              key={item} 
              className={`flex justify-between items-center px-3 py-2 cursor-pointer group ${dropdownHoverClass}`}
              onClick={() => { onChange(item); setShowHistory(false); }}
            >
              <span className="truncate flex-1">{item}</span>
              <button 
                onClick={(e) => deleteFromHistory(e, item)}
                className="opacity-50 hover:opacity-100 text-red-400 hover:text-red-500 p-1 transition-opacity"
                title="删除"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (photo: Photo) => void;
  theme: Theme;
  editingPhoto?: Photo | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload, theme, editingPhoto }) => {
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>(''); // For upload progress feedback
  
  // Image Data
  const [imageUrl, setImageUrl] = useState<string>(''); // This holds Base64 for preview
  const [imageDims, setImageDims] = useState<{width: number, height: number}>({ width: 0, height: 0 });
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>(Category.LANDSCAPE);
  const [rating, setRating] = useState(5);
  
  // EXIF Form State
  const [camera, setCamera] = useState('');
  const [lens, setLens] = useState('');
  const [aperture, setAperture] = useState('');
  const [shutter, setShutter] = useState('');
  const [iso, setIso] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [focalLength, setFocalLength] = useState('');
  
  // GPS State
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Map Picker State
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  const isDark = theme === 'dark';
  const textPrimary = isDark ? "text-white" : "text-black";
  const textSecondary = isDark ? "text-white/60" : "text-black/60";

  // Init
  useEffect(() => {
    if (isOpen && editingPhoto) {
      setImageUrl(editingPhoto.url);
      setTitle(editingPhoto.title);
      setCategory(editingPhoto.category);
      setRating(editingPhoto.rating || 0);
      setImageDims({ width: editingPhoto.width || 0, height: editingPhoto.height || 0 });
      
      setCamera(editingPhoto.exif.camera);
      setLens(editingPhoto.exif.lens);
      setAperture(editingPhoto.exif.aperture);
      setShutter(editingPhoto.exif.shutterSpeed);
      setIso(editingPhoto.exif.iso);
      setLocation(editingPhoto.exif.location);
      setDate(editingPhoto.exif.date);
      setFocalLength(editingPhoto.exif.focalLength || '');
      setLatitude(editingPhoto.exif.latitude ? String(editingPhoto.exif.latitude) : '');
      setLongitude(editingPhoto.exif.longitude ? String(editingPhoto.exif.longitude) : '');
    } else if (isOpen && !editingPhoto) {
      // Reset
      setImageUrl(''); setImageDims({width:0,height:0}); setTitle(''); setRating(5);
      setCamera(''); setLens(''); setAperture(''); setShutter(''); setIso(''); setLocation(''); setFocalLength(''); 
      setLatitude(''); setLongitude('');
      setUploadStatus('');
      
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [isOpen, editingPhoto]);

  // Map Initialization
  useEffect(() => {
    if (!isOpen) {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
      return;
    }
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    let center: [number, number] = [35.6895, 139.6917];
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (!isNaN(latNum) && !isNaN(lngNum)) center = [latNum, lngNum];

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { center: center, zoom: 2, zoomControl: false, attributionControl: false });
      const map = mapInstance.current;
      const layerStyle = theme === 'dark' ? 'dark_all' : 'light_all';
      L.tileLayer(`https://{s}.basemaps.cartocdn.com/${layerStyle}/{z}/{x}/{y}{r}.png`, { maxZoom: 20, subdomains: 'abcd' }).addTo(map);
      
      const dotIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${theme === 'dark' ? '#ffffff' : '#000000'}; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.5);"></div>`,
        iconSize: [12, 12], iconAnchor: [6, 6]
      });
      const marker = L.marker(center, { icon: dotIcon, draggable: true }).addTo(map);
      marker.on('dragend', function(event: any) {
        const pos = event.target.getLatLng();
        setLatitude(pos.lat.toFixed(6)); setLongitude(pos.lng.toFixed(6));
      });
      map.on('click', function(e: any) {
        marker.setLatLng(e.latlng);
        setLatitude(e.latlng.lat.toFixed(6)); setLongitude(e.latlng.lng.toFixed(6));
      });
    }
  }, [isOpen, theme, latitude, longitude]);

  // Helper: Compress Image
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const maxSizeInBytes = 2 * 1024 * 1024; // 2MB
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = objectUrl;
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        const MAX_DIMENSION = 2560;
        let needsResize = false;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          needsResize = true;
          const ratio = width / height;
          if (width > height) { width = MAX_DIMENSION; height = width / ratio; } 
          else { height = MAX_DIMENSION; width = height * ratio; }
        }
        if (file.size <= maxSizeInBytes && !needsResize) {
           const reader = new FileReader();
           reader.onload = (e) => resolve(e.target?.result as string);
           reader.onerror = reject;
           reader.readAsDataURL(file);
           return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        const maxStringLength = maxSizeInBytes * 1.37;
        while (dataUrl.length > maxStringLength && quality > 0.3) {
           quality -= 0.1;
           dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = (e) => { URL.revokeObjectURL(objectUrl); reject(e); }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      setUploadStatus('处理图片中...');
      
      // EXIF Logic
      try {
        await new Promise<void>((resolve) => {
            EXIF.getData(file as any, function(this: any) {
                if (!this || !this.exifdata) { resolve(); return; }
                const getTag = (tag: string) => EXIF.getTag(this, tag);
                const make = getTag('Make');
                const model = getTag('Model');
                if (model) {
                    const cleanMake = make ? make.replace(/\0/g, '').trim() : '';
                    const cleanModel = model.replace(/\0/g, '').trim();
                    setCamera(cleanModel.startsWith(cleanMake) ? cleanModel : `${cleanMake} ${cleanModel}`.trim());
                }
                const isoVal = getTag('ISOSpeedRatings'); if (isoVal) setIso(String(isoVal));
                const fNumber = getTag('FNumber'); if (fNumber) setAperture(`f/${Number(fNumber).toFixed(1)}`.replace('.0', ''));
                const exposure = getTag('ExposureTime'); if (exposure) setShutter(typeof exposure === 'number' ? (exposure < 1 ? `1/${Math.round(1/exposure)}s` : `${exposure}s`) : `${exposure.numerator}/${exposure.denominator}s`);
                const focal = getTag('FocalLength'); if (focal) setFocalLength(`${Math.round(typeof focal === 'number' ? focal : focal.numerator / focal.denominator)}mm`);
                const dateTag = getTag('DateTimeOriginal'); if (dateTag) setDate(dateTag.split(' ')[0].replace(/:/g, '-'));
                
                const lat = getTag("GPSLatitude"); const latRef = getTag("GPSLatitudeRef");
                const lon = getTag("GPSLongitude"); const lonRef = getTag("GPSLongitudeRef");
                if (lat && lon && latRef && lonRef) {
                   const safeLat = [Number(lat[0]), Number(lat[1]), Number(lat[2])];
                   const safeLon = [Number(lon[0]), Number(lon[1]), Number(lon[2])];
                   let ddLat = safeLat[0] + safeLat[1]/60 + safeLat[2]/3600; if(latRef === "S") ddLat *= -1;
                   let ddLon = safeLon[0] + safeLon[1]/60 + safeLon[2]/3600; if(lonRef === "W") ddLon *= -1;
                   if (!isNaN(ddLat) && !isNaN(ddLon)) { setLatitude(String(ddLat)); setLongitude(String(ddLon)); }
                }
                resolve();
            });
        });
      } catch (err) { console.error("EXIF failed", err); }

      try {
         const compressedBase64 = await compressImage(file);
         const img = new Image();
         img.onload = () => {
             setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
             setImageUrl(compressedBase64); // Show preview
             setLoading(false);
             setUploadStatus('');
         };
         img.src = compressedBase64;
      } catch (err) {
         setLoading(false);
         alert("图片处理失败");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;

    setLoading(true);
    setUploadStatus('正在上传...');

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const hasGPS = !isNaN(latNum) && !isNaN(lngNum);

    const photoData: Photo = {
      id: editingPhoto ? editingPhoto.id : '', // ID is generated by backend for new photos
      url: '', // Set by backend
      title: title || '未命名作品',
      category: category,
      width: imageDims.width,
      height: imageDims.height,
      rating: rating,
      exif: { 
        camera, lens, aperture, shutterSpeed: shutter, iso, location, date, focalLength,
        latitude: hasGPS ? latNum : undefined, 
        longitude: hasGPS ? lngNum : undefined 
      }
    };

    try {
      // Use new client API
      const result = await client.uploadPhoto(imageUrl, photoData, ADMIN_TOKEN);
      
      setUploadStatus('上传成功');
      onUpload(result); // Pass back the real photo object from server
      onClose();
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("上传失败: " + err.message);
      setUploadStatus('失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in ${isDark ? 'bg-black/80 backdrop-blur-sm' : 'bg-white/60 backdrop-blur-md'}`}>
      <GlassCard className="w-full max-w-2xl h-[85vh] flex flex-col" hoverEffect={false} theme={theme}>
        <div className="flex-shrink-0 p-6 pb-2 flex justify-between items-center border-b border-transparent">
            <h2 className={`text-2xl font-serif ${textPrimary}`}>{editingPhoto ? '编辑作品信息' : '上传作品'}</h2>
            <button onClick={onClose} className={`${textSecondary} hover:${textPrimary} transition-colors`}>
              <X size={24} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className={`w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group transition-colors flex-shrink-0
               ${isDark ? 'border-white/20 bg-white/5 hover:border-white/40' : 'border-black/20 bg-black/5 hover:border-black/40'}
            `}>
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <div className={`flex flex-col items-center ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                  {loading ? <Loader2 className="animate-spin mb-2" /> : <Upload size={40} className="mb-2" />}
                  <span className="text-sm">点击选择或拖拽图片</span>
                </div>
              )}
              {uploadStatus && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-md flex items-center gap-1">
                      {uploadStatus.includes('成功') ? <Cloud size={10} className="text-green-400"/> : <Loader2 size={10} className="animate-spin"/>}
                      {uploadStatus}
                  </div>
              )}
              {!editingPhoto && (
                 <input type="file" accept="image/jpeg,image/tiff,image/png" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs uppercase tracking-wider mb-1 ${textSecondary}`}>作品标题</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={`w-full border rounded-lg p-2 focus:outline-none transition-colors ${isDark ? 'bg-white/10 border-white/10 text-white focus:border-white/40' : 'bg-black/5 border-black/10 text-black focus:border-black/40'}`} />
              </div>
              <div>
                <label className={`block text-xs uppercase tracking-wider mb-1 ${textSecondary}`}>作品分类</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={`w-full border rounded-lg p-2 focus:outline-none ${isDark ? 'bg-white/10 border-white/10 text-white [&>option]:text-black' : 'bg-black/5 border-black/10 text-black'}`}>
                  {Object.values(Category).filter(c => c !== Category.ALL && c !== Category.HORIZONTAL && c !== Category.VERTICAL).map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
            </div>

            <div>
               <label className={`block text-xs uppercase tracking-wider mb-1 ${textSecondary}`}>评级</label>
               <div className="flex gap-2">
                 {[1,2,3,4,5].map(s => (
                   <button type="button" key={s} onClick={() => setRating(s)} className="focus:outline-none hover:scale-110 transition-transform">
                     <Star size={20} className={s <= rating ? (isDark ? 'text-white fill-white' : 'text-black fill-black') : (isDark ? 'text-white/20' : 'text-black/20')} />
                   </button>
                 ))}
               </div>
            </div>

            <div className={`border-t pt-4 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <div className="flex justify-between items-end mb-3">
                 <h3 className={`text-sm font-medium ${isDark ? 'text-white/80' : 'text-black/80'}`}>EXIF 参数信息</h3>
                 <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-black/40'}`}>支持自动提取或手动修改</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <SmartInput label="相机型号" value={camera} onChange={setCamera} storageKey="camera" theme={theme} />
                 <SmartInput label="镜头" value={lens} onChange={setLens} storageKey="lens" theme={theme} />
                 <SmartInput label="焦段" value={focalLength} onChange={setFocalLength} storageKey="focal" theme={theme} />
                 <SmartInput label="光圈" value={aperture} onChange={setAperture} storageKey="aperture" theme={theme} />
                 <SmartInput label="快门" value={shutter} onChange={setShutter} storageKey="shutter" theme={theme} />
                 <SmartInput label="ISO" value={iso} onChange={setIso} storageKey="iso" theme={theme} />
                 <div className="col-span-2">
                    <SmartInput label="地点" value={location} onChange={setLocation} storageKey="location" theme={theme} />
                 </div>
              </div>

              <div className={`mt-4 p-3 rounded-lg border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                 <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-xs opacity-60">
                        <MapPin size={12} />
                        <span>地理坐标 (拖动黑点修改位置)</span>
                    </div>
                    {(latitude && longitude) && <div className="flex items-center gap-1 text-xs text-green-500"><CheckCircle size={12} /><span>坐标已锁定</span></div>}
                 </div>
                 <div className="grid grid-cols-2 gap-4 mb-2">
                    <SmartInput label="纬度" value={latitude} onChange={setLatitude} storageKey="gps_lat" placeholder="0.00" theme={theme} />
                    <SmartInput label="经度" value={longitude} onChange={setLongitude} storageKey="gps_lng" placeholder="0.00" theme={theme} />
                 </div>
                 <div ref={mapRef} className="w-full h-48 rounded-md overflow-hidden bg-gray-100 relative z-0" />
              </div>

              <div className="mt-4">
                 <SmartInput label="拍摄日期" value={date} onChange={setDate} storageKey="date" theme={theme} type="date" />
              </div>
            </div>

            <button type="submit" disabled={!imageUrl || loading} className={`w-full font-semibold py-3 rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 shadow-lg mb-4 ${isDark ? 'bg-white text-black shadow-white/10' : 'bg-black text-white shadow-black/10'}`}>
              {loading ? (uploadStatus ? uploadStatus : '处理中...') : (editingPhoto ? '保存修改' : '发布到作品集')}
            </button>
          </form>
        </div>
      </GlassCard>
    </div>
  );
};
