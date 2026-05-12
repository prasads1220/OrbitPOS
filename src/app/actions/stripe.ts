'use server';

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
};

async function getStripeClient(storeId: string) {
  const supabase = getSupabaseAdmin();
  const { data: store, error } = await supabase
    .from('stores')
    .select('stripe_secret_key')
    .eq('id', storeId)
    .single();

  if (error || !store?.stripe_secret_key) {
    // Fallback to global key for backward compatibility or demo purposes
    return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2026-04-22.dahlia' as any,
    });
  }

  return new Stripe(store.stripe_secret_key, {
    apiVersion: '2026-04-22.dahlia' as any,
  });
}

export async function createPaymentIntent(amount: number, storeId: string, storeName: string) {
  try {
    const stripe = await getStripeClient(storeId);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: { storeId, storeName },
      automatic_payment_methods: { enabled: true },
    });

    return { 
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id 
    };
  } catch (error: any) {
    console.error('Stripe error:', error);
    throw new Error(error.message);
  }
}

export async function refundStripePayment(storeId: string, paymentIntentId: string, amount?: number) {
  try {
    const stripe = await getStripeClient(storeId);
    console.log('Stripe SDK: Attempting refund for PI:', paymentIntentId, 'Store:', storeId);
    
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });
    
    return { success: true, refundId: refund.id };
  } catch (error: any) {
    console.error('Stripe SDK Error during refund:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getStorePublishableKey(storeId: string) {
  const supabase = getSupabaseAdmin();
  const { data: store } = await supabase
    .from('stores')
    .select('stripe_publishable_key')
    .eq('id', storeId)
    .single();

  return store?.stripe_publishable_key || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
}
