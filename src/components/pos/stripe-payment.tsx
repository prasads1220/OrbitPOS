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
import { RefreshCw } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm({ amount, onReady, onCancel }: { amount: number, onReady: (id: string) => void, onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/pos',
      },
      redirect: 'if_required',
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      toast.success('Payment successful!');
      onReady(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
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
          {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : `Pay $${amount.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
}

export default function StripePayment({ clientSecret, amount, onSuccess, onCancel }: { clientSecret: string, amount: number, onSuccess: (id: string) => void, onCancel: () => void }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm amount={amount} onReady={onSuccess} onCancel={onCancel} />
      </Elements>
    </div>
  );
}
