
import { Env } from '../../types';

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const id = params.id as string;

  // 1. Verify Token
  const authHeader = request.headers.get('Authorization');
  const expectedToken = `Bearer ${env.ADMIN_TOKEN}`;

  if (!authHeader || authHeader !== expectedToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. Find the data key using the lookup index
    const lookupKey = `lookup:${id}`;
    const dataKey = await env.PHOTO_KV.get(lookupKey);
    
    if (!dataKey) {
      return new Response('Not Found', { status: 404 });
    }

    // 3. Get data to find object key (to delete from R2)
    const data: any = await env.PHOTO_KV.get(dataKey, 'json');
    
    if (data && data.object_key) {
       await env.PHOTO_BUCKET.delete(data.object_key);
    }

    // 4. Delete KV keys (Metadata and Lookup)
    await env.PHOTO_KV.delete(lookupKey);
    await env.PHOTO_KV.delete(dataKey);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
