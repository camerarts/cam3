
export enum Category {
  ALL = '全部',
  LANDSCAPE = '风光',
  PORTRAIT = '人像',
  STREET = '人文',
  MACRO = '微距',
  BW = '黑白',
  HORIZONTAL = '横屏',
  VERTICAL = '竖屏'
}

export type Theme = 'dark' | 'light';

export interface ExifData {
  camera: string;
  lens: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  location: string;
  date: string;
  focalLength?: string;
  latitude?: number;
  longitude?: number;
}

export interface Photo {
  id: string;
  url: string;
  title: string;
  category: Category;
  exif: ExifData;
  width?: number;
  height?: number;
  rating?: number; // 0-5
}

export interface User {
  isAuthenticated: boolean;
  username?: string;
}