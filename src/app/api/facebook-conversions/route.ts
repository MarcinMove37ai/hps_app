// src/app/api/facebook-conversions/route.ts
import { NextResponse } from 'next/server';

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const PIXEL_ID = process.env.FACEBOOK_PIXEL_ID || '964071138476681';

interface ConversionEvent {
  event_name: string;
  event_time: number;
  user_data: {
    client_ip_address?: string;
    client_user_agent?: string;
    em?: string; // hashed email
    ph?: string; // hashed phone
    external_id?: string;
    fbp?: string; // Facebook Browser Pixel
    fbc?: string; // Facebook Click ID
  };
  custom_data?: Record<string, any>;
  event_source_url?: string;
  action_source: 'website' | 'email' | 'app' | 'phone_call' | 'chat' | 'other';
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Pobierz niezbędne dane z żądania
    const {
      event_name,
      user_data,
      custom_data,
      event_source_url
    } = data;

    // Utwórz obiekt zdarzenia
    const event: ConversionEvent = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      user_data,
      custom_data,
      event_source_url,
      action_source: 'website'
    };

    // Wywołaj API Facebooka
    const response = await sendToFacebookAPI([event]);

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Facebook Conversions API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send event to Facebook' },
      { status: 500 }
    );
  }
}

async function sendToFacebookAPI(events: ConversionEvent[]) {
  if (!FB_ACCESS_TOKEN || !PIXEL_ID) {
    throw new Error('Missing Facebook credentials');
  }

  const url = `https://graph.facebook.com/v18.0/${PIXEL_ID}/events`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: events,
      access_token: FB_ACCESS_TOKEN,
      test_event_code: process.env.FB_TEST_EVENT_CODE, // Opcjonalnie podczas testowania
    }),
  });

  return response.json();
}