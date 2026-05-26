import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, storeId } = await req.json();
    
    let keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (storeId) {
      const supabase = getSupabaseAdmin();
      const { data: storeData } = await supabase
        .from('stores')
        .select('razorpay_key_secret')
        .eq('id', storeId)
        .single();
      
      if (storeData?.razorpay_key_secret) {
        keySecret = storeData.razorpay_key_secret;
      }
    }

    if (!keySecret) {
      return NextResponse.json({ 
        error: `Razorpay secret key not configured. If you recently edited your .env.local file, please restart your dev server (npm run dev).`
      }, { status: 500 });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');
    const isAuthentic = expectedSignature === razorpay_signature;
    return NextResponse.json({ verified: isAuthentic, paymentId: razorpay_payment_id });
  } catch (err: any) {
    console.error("Razorpay verification error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
