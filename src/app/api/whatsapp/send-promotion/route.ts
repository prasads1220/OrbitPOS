import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWhatsAppClient } from '@/lib/whatsapp-client';

const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to add a delay between messages to avoid rate limits
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { storeId, message } = await req.json();
    if (!storeId || !message) {
      return NextResponse.json({ error: 'storeId and message are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch all customers for the store
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, full_name, phone')
      .eq('store_id', storeId);

    if (customersError || !customers) {
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }

    // 2. Filter customers with valid phone numbers
    const targetCustomers = customers.filter(c => c.phone && c.phone.trim().length >= 10);
    
    if (!global.whatsappClient || global.whatsappStatus !== 'AUTHENTICATED') {
      return NextResponse.json({ 
        error: 'WhatsApp client is not authenticated. Please scan the QR code first.' 
      }, { status: 400 });
    }

    const client = global.whatsappClient;

    let successCount = 0;
    let failureCount = 0;

    // 3. Send message to each customer
    for (const customer of targetCustomers) {
      let phone = customer.phone!.replace(/\D/g, '');
      if (phone.length === 10) {
        phone = `91${phone}`; // default to Indian country code
      }
      const recipientChatId = `${phone}@c.us`;

      try {
        await client.sendMessage(recipientChatId, message);
        successCount++;
      } catch (waErr: any) {
        failureCount++;
        console.error(`Error sending to ${phone}:`, waErr.message);
      }

      // Add a 500ms delay to prevent rate limiting / spam blocks
      await delay(500);
    }

    return NextResponse.json({ 
      success: true, 
      successCount, 
      failureCount,
      totalAttempted: targetCustomers.length 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
