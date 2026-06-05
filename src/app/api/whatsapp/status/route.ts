import { NextResponse } from 'next/server';
import { getWhatsAppClient } from '@/lib/whatsapp-client';

export async function GET() {
  try {
    // Attempt to initialize if it hasn't been initialized yet
    if (!global.whatsappClient) {
      getWhatsAppClient();
    }

    return NextResponse.json({
      status: global.whatsappStatus || 'DISCONNECTED',
      qrCode: global.whatsappQrCodeBase64 || null
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
