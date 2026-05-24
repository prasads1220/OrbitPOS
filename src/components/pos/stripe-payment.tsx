'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, CreditCard, Smartphone } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm({ amount, onReady, onCancel }: { amount: number, onReady: (id: string, last4?: string, brand?: string) => void, onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Stripe payment started...');
    if (!stripe || !elements) {
      console.error('Stripe.js has not yet loaded.');
      return;
    }

    setLoading(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/pos',
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Stripe confirmation error:', error);
        toast.error(error.message);
        setLoading(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Stripe payment succeeded!', paymentIntent.id);
        
        // Pass minimal details, CheckoutDialog will fetch the rest server-side
        const last4 = (paymentIntent as any).payment_method_details?.card?.last4 || '';
        const brand = (paymentIntent as any).payment_method_details?.card?.brand || '';

        toast.success('Payment successful!');
        onReady(paymentIntent.id, last4, brand);
      } else {
        console.log('Stripe payment status:', paymentIntent?.status);
        setLoading(false);
      }
    } catch (err) {
      console.error('Unexpected error during Stripe payment:', err);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-blue-500" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Tap</span>
          </div>
          <div className="w-8 h-[1px] bg-gray-100" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-indigo-500" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Insert</span>
          </div>
          <div className="w-8 h-[1px] bg-gray-100" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Swipe</span>
          </div>
        </div>

        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <div className="flex gap-3">
        <Button 
          type="button" 
          variant="ghost" 
          className="flex-1 rounded-2xl h-14 font-bold text-gray-400"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={loading || !stripe} 
          className="flex-[2] h-14 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20"
        >
          {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : `Pay ₹${amount.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
}

export default function StripePayment({ publishableKey, clientSecret, amount, onSuccess, onCancel }: { publishableKey: string, clientSecret: string, amount: number, onSuccess: (id: string, last4?: string, brand?: string) => void, onCancel: () => void }) {
  const stripePromise = loadStripe(publishableKey);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm amount={amount} onReady={onSuccess} onCancel={onCancel} />
      </Elements>
    </div>
  );
}
