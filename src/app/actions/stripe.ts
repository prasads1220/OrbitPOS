'use server';

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia' as any,
});

export async function createPaymentIntent(amount: number, storeName: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency: 'usd',
      metadata: { storeName },
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

export async function refundStripePayment(paymentIntentId: string, amount?: number) {
  try {
    console.log('Stripe SDK: Attempting refund for PI:', paymentIntentId);
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });
    console.log('Stripe SDK: Refund success:', refund.id);
    return { success: true, refundId: refund.id };
  } catch (error: any) {
    console.error('Stripe SDK Error during refund:', error.message, error.type);
    return { success: false, error: error.message };
  }
}
