export async function GET() {
  // Podstawowa weryfikacja zdrowia aplikacji
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'hps-crm',
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}