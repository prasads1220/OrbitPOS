'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] p-4 font-sans selection:bg-[#0071e3] selection:text-white">
      <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
        
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative w-14 h-14 bg-gradient-to-tr from-gray-900 to-black rounded-2xl flex items-center justify-center shadow-xl border border-white/20">
            <span className="text-white font-bold text-3xl tracking-tighter drop-shadow-md">O</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
          {submitted ? (
            <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight mb-2">Check your email</h1>
                <p className="text-[#86868b] text-[15px] leading-relaxed">
                  We've sent a password reset link to <span className="font-bold text-black">{email}</span>.
                </p>
              </div>
              <Link href="/login" className="block w-full">
                <Button className="w-full h-12 rounded-xl bg-black text-white hover:bg-gray-800 font-bold text-[15px] transition-all shadow-md">
                  Return to Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-[28px] font-black text-[#1d1d1f] tracking-tight mb-2">Reset Password</h1>
                <p className="text-[#86868b] text-[15px]">Enter your email to receive a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[13px] font-bold text-[#86868b] uppercase tracking-wider ml-1">
                    Email Address
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-[#fbfbfd] border-[#d2d2d7] rounded-xl text-[15px] font-medium text-[#1d1d1f] placeholder:text-gray-400 focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition-all"
                    required 
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ED] font-bold text-[15px] transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Sending link...' : 'Send Reset Link'}
                </Button>
              </form>

              <div className="mt-8 text-center">
                <Link href="/login" className="inline-flex items-center text-[14px] text-[#0071e3] hover:underline font-medium transition-colors">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
