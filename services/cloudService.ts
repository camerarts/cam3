
// ==========================================
// 配置区域 / Configuration
// ==========================================
// 1. Cloudflare Worker 地址 (已填入您提供的地址)
export const CLOUD_API_URL: string = "https://luminaphotos.10125800.xyz"; 

// 2. 密钥 (需与 Worker 代码一致)
export const CLOUD_API_KEY = "lumina_upload_key_123"; 
// ==========================================

export const isCloudConfigured = () => !!CLOUD_API_URL && CLOUD_API_URL.length > 0;

// Helper to ensure URL doesn't end with slash
const getApiUrl = () => CLOUD_API_URL.replace(/\/$/, "");

/**
 * Check if the admin password has already been set in the cloud
 * (Deprecated for hardcoded login, kept for compatibility)
 */
export const checkAuthSetup = async (): Promise<boolean> => {
  return true; 
};

/**
 * Set the admin password in the cloud
 * (Deprecated for hardcoded login)
 */
export const setupPassword = async (password: string): Promise<boolean> => {
  return true;
};

/**
 * Verify login password against the cloud
 * (Deprecated for hardcoded login)
 */
export const verifyPassword = async (password: string): Promise<boolean> => {
  return true;
};

/**
 * Upload image to R2 via Worker
 */
export const uploadImageToCloud = async (base64Data: string): Promise<string> => {
  if (!isCloudConfigured()) return base64Data;

  // Helper: Base64 to Blob
  const base64ToBlob = (base64: string): Blob => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const blob = base64ToBlob(base64Data);
  
  const response = await fetch(getApiUrl(), {
    method: 'PUT',
    headers: {
      'X-Secret-Key': CLOUD_API_KEY,
      'Content-Type': blob.type
    },
    body: blob
  });

  if (!response.ok) {
     const errorText = await response.text().catch(() => response.statusText);
     throw new Error(`Upload failed: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  return data.url;
};