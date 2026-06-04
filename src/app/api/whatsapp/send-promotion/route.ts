import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function POST(req: NextRequest) {
  try {
    const { message, storeId, audience } = await req.json();
    if (!message || !storeId) {
      return NextResponse.json({ error: 'Message and storeId are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch target customers
    let query = supabase.from('customers').select('*').eq('store_id', storeId).not('phone', 'is', null).not('phone', 'eq', '');
    
    if (audience === 'loyalty') {
      query = query.gt('loyalty_points', 0);
    }

    const { data: customers, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({ message: 'No customers found with phone numbers for this audience.', count: 0 });
    }

    const openWaUrl = process.env.WHATSAPP_API_URL || 'http://localhost:8080';
    let sentCount = 0;
    let failedCount = 0;

    // To avoid Vercel edge/serverless function timeouts (usually 10s or 60s),
    // ideally this should be sent to a queue (like Inngest, Upstash, AWS SQS) 
    // or processed via a long-running background worker.
    // For MVP, we will try to process up to 50 synchronously to avoid immediate timeouts.
    const maxProcess = Math.min(customers.length, 50);

    for (let i = 0; i < maxProcess; i++) {
      const customer = customers[i];
      let phone = customer.phone.replace(/\D/g, '');
      if (phone.length === 10) {
        phone = `91${phone}`; // default to Indian country code
      }
      
      const recipientChatId = `${phone}@c.us`;

      // Personalize message
      let personalizedMessage = message.replace(/{name}/g, customer.full_name || 'Valued Customer');
      personalizedMessage = personalizedMessage.replace(/{points}/g, customer.loyalty_points || '0');

      try {
        const response = await fetch(`${openWaUrl}/sendText`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WHATSAPP_SESSION_KEY || ''}`,
          },
          body: JSON.stringify({
            to: recipientChatId,
            content: personalizedMessage,
            chatId: recipientChatId,
            body: personalizedMessage,
          }),
        });

        if (response.ok) {
          sentCount++;
          await supabase.from('whatsapp_logs').insert({
            phone_number: customer.phone,
            status: 'sent',
            // optional: you could add campaign_id or message_type here if schema allows
          });
        } else {
          failedCount++;
          console.error(`OpenWA failed for ${customer.phone}`);
        }
      } catch (waErr: any) {
        failedCount++;
        console.error(`Fetch failed for ${customer.phone}`, waErr.message);
      }

      // Throttle to prevent spam flags and overwhelming the Docker API (e.g., 2 seconds)
      if (i < maxProcess - 1) {
        await delay(2000);
      }
    }

    return NextResponse.json({ 
      success: true, 
      sentCount, 
      failedCount, 
      totalProcessed: maxProcess,
      totalAudience: customers.length
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
