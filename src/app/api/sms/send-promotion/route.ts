import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    
    if (targetCustomers.length === 0) {
      return NextResponse.json({ error: 'No customers with valid phone numbers found.' }, { status: 400 });
    }

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      return NextResponse.json({ 
        error: 'Twilio SMS credentials not configured in environment variables (.env).' 
      }, { status: 500 });
    }

    let successCount = 0;
    let failureCount = 0;

    // 3. Send SMS to each customer
    for (const customer of targetCustomers) {
      let phone = customer.phone!.replace(/\D/g, '');
      if (phone.length === 10) {
        phone = `+91${phone}`; // default to Indian country code in E.164 format for Twilio
      } else if (!phone.startsWith('+')) {
        phone = `+${phone}`;
      }

      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        
        const formData = new URLSearchParams();
        formData.append('To', phone);
        formData.append('From', twilioFromNumber);
        formData.append('Body', message);

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
          },
          body: formData.toString()
        });

        if (response.ok) {
          successCount++;
        } else {
          const errorData = await response.text();
          failureCount++;
          console.error(`Failed to send SMS to ${phone}. Response: ${errorData}`);
        }
      } catch (smsErr: any) {
        failureCount++;
        console.error(`Error sending SMS to ${phone}:`, smsErr.message);
      }

      // Add a small delay to prevent rate limiting
      await delay(200);
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
