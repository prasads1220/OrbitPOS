import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { amount, currency = 'INR', receipt, storeId } = await req.json();
    
    let keyId = process.env.RAZORPAY_KEY_ID;
    let keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (storeId) {
      const supabase = getSupabaseAdmin();
      const { data: storeData } = await supabase
        .from('stores')
        .select('razorpay_key_id, razorpay_key_secret')
        .eq('id', storeId)
        .single();
      
      if (storeData?.razorpay_key_id && storeData?.razorpay_key_secret) {
        keyId = storeData.razorpay_key_id;
        keySecret = storeData.razorpay_key_secret;
      }
    }
    
    if (!keyId || !keySecret) {
      return NextResponse.json({ 
        error: `Razorpay API keys not configured. (keyId: ${keyId ? 'present' : 'missing'}, keySecret: ${keySecret ? 'present' : 'missing'}). If you recently edited your .env.local file, please restart your dev server (npm run dev).`
      }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt,
    });
    return NextResponse.json({ orderId: order.id, amount: order.amount, keyId });
  } catch (err: any) {
    console.error("Razorpay order creation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
