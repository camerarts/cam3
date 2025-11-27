
import { Env } from '../../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  
  let page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '100');
  
  if (page < 1) page = 1;

  // KV List Strategy:
  // Keys are sorted by inverted timestamp (Newest first).
  
  try {
    if (!env.PHOTO_KV) {
      throw new Error('PHOTO_KV binding is missing in Cloudflare configuration');
    }

    const limit = page * pageSize;
    // Cap at 1000 (KV list limit)
    const safeLimit = Math.min(limit, 1000);
    
    const listResult = await env.PHOTO_KV.list({ 
      prefix: 'data:', 
      limit: safeLimit 
    });

    const totalKeys = listResult.keys;
    const startIndex = (page - 1) * pageSize;
    
    // If requesting a page beyond available items
    if (startIndex >= totalKeys.length) {
       return new Response(JSON.stringify({ items: [] }), { 
         headers: { 'Content-Type': 'application/json' } 
       });
    }

    const pageKeys = totalKeys.slice(startIndex, startIndex + pageSize);

    // Fetch full metadata in parallel with individual error handling
    const items = await Promise.all(pageKeys.map(async (key) => {
       try {
         return await env.PHOTO_KV.get(key.name, 'json');
       } catch (e) {
         console.error(`Failed to fetch key ${key.name}`, e);
         return null;
       }
    }));

    // Filter nulls and map to expected structure
    const validItems = items.filter(i => i !== null);
    
    const mappedItems = validItems.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.tags?.[0] || '全部',
      url: item.url,
      width: item.width,
      height: item.height,
      rating: item.rating,
      exif: item.exif // Stored as object in KV
    }));

    return new Response(JSON.stringify({ items: mappedItems }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
