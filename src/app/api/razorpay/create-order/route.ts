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
      const { data: storeData, error: dbError } = await supabase
        .from('stores')
        .select('razorpay_key_id, razorpay_key_secret')
        .eq('id', storeId)
        .single();
      
      if (dbError) {
        console.error("create-order: Database query error:", dbError);
        return NextResponse.json({ 
          error: `Database key lookup failed: ${dbError.message} (Code: ${dbError.code || 'N/A'}. Hint: Verify if the stores table columns have been successfully altered in your Supabase SQL editor).`
        }, { status: 500 });
      } else {
        console.log("create-order: Loaded store keys from database:", {
          storeId,
          razorpay_key_id: storeData?.razorpay_key_id ? 'present' : 'missing',
          razorpay_key_secret: storeData?.razorpay_key_secret ? 'present' : 'missing'
        });
      }
      
      if (storeData?.razorpay_key_id && storeData?.razorpay_key_secret) {
        keyId = storeData.razorpay_key_id;
        keySecret = storeData.razorpay_key_secret;
      }
    }
    
    if (!keyId || !keySecret) {
      return NextResponse.json({ 
        error: `Razorpay API keys not configured. Please log in as an Admin, navigate to Settings > Store Config, scroll down to the 'Razorpay Merchant Gateway' card, enter your Key ID and Secret, and click 'Save Store Settings'.`
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
