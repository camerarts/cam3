
import { Category, Photo } from '../types';

const API_ROOT = '/api';

export const client = {
  // 获取照片列表
  async getPhotos(page = 1, pageSize = 100, category?: Category): Promise<Photo[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    });
    if (category && category !== Category.ALL) {
      params.append('category', category);
    }

    try {
      const res = await fetch(`${API_ROOT}/photos?${params}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          console.warn('API Endpoint not found (404). Returning empty list.');
          return [];
        }
        const errorText = await res.text().catch(() => 'Unknown Error');
        throw new Error(`Failed to fetch photos: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      return data.items || [];
    } catch (error) {
      console.error("API Error:", error);
      // In case of network error or 404, return empty array to keep app usable
      return [];
    }
  },

  // 上传照片
  async uploadPhoto(dataUrl: string, metadata: Photo, token: string): Promise<Photo> {
    // Convert Base64 to Blob for FormData
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const file = new File([u8arr], 'image.jpg', { type: mime });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('meta', JSON.stringify(metadata));

    const res = await fetch(`${API_ROOT}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) {
      const err = await res.text().catch(() => 'Unknown Error');
      throw new Error(`Upload failed: ${res.status} ${err}`);
    }

    const result = await res.json();
    return { ...metadata, url: result.url, id: result.id };
  },

  // 删除照片
  async deletePhoto(id: string, token: string): Promise<void> {
    const res = await fetch(`${API_ROOT}/photos/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const err = await res.text().catch(() => 'Unknown Error');
      throw new Error(`Delete failed: ${res.status} ${err}`);
    }
  }
};
