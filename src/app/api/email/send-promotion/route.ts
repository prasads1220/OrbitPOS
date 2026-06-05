import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

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
      .select('id, full_name, email')
      .eq('store_id', storeId);

    if (customersError || !customers) {
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }

    // 2. Filter customers with valid email
    const targetCustomers = customers.filter(c => c.email && c.email.includes('@'));
    
    if (targetCustomers.length === 0) {
      return NextResponse.json({ error: 'No customers with valid email addresses found.' }, { status: 400 });
    }

    // 3. Configure Nodemailer transporter
    // For production, you should set these in your .env file. 
    // Example: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_USER=your_email@gmail.com, SMTP_PASS=app_password
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '', // Your email address
        pass: process.env.SMTP_PASS || '', // Your app password
      },
    });

    // Check if credentials are provided
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({ 
        error: 'SMTP credentials not configured. Please add SMTP_USER and SMTP_PASS to your environment variables.' 
      }, { status: 500 });
    }

    let successCount = 0;
    let failureCount = 0;

    // 4. Send email to each customer
    for (const customer of targetCustomers) {
      try {
        await transporter.sendMail({
          from: `"OrbitPOS Marketing" <${process.env.SMTP_USER}>`,
          to: customer.email!,
          subject: 'Special Offer from OrbitPOS',
          text: message,
          html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                   <h2>Special Offer for You, ${customer.full_name || 'Valued Customer'}!</h2>
                   <p style="white-space: pre-wrap;">${message}</p>
                 </div>`,
        });
        successCount++;
      } catch (emailErr: any) {
        failureCount++;
        console.error(`Error sending email to ${customer.email}:`, emailErr.message);
      }

      // Add a small delay to prevent rate limiting
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
