import { getStore } from '@netlify/blobs';

const KEY = 'macrotrama-data';

export default async (req) => {
  const store = getStore('macrotrama');

  if (req.method === 'GET') {
    const data = await store.get(KEY, { type: 'json' });
    return new Response(JSON.stringify({ data: data || null }), {
      headers: { 'content-type': 'application/json' }
    });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    await store.setJSON(KEY, body.data);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' }
    });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config = { path: '/api/data' };
