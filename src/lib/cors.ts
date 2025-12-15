import { NextResponse } from 'next/server';

export default function cors(req: Request) {
  const headers = new Headers({
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  });

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers
    });
  }

  return null;
}
