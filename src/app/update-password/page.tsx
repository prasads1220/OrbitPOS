'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Verify there's an active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Session expired. Please request a new password reset link or log in.');
        router.push('/login');
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    
    // Update password AND clear the force_password_change flag if it exists
    const { error } = await supabase.auth.updateUser({
      password: password,
      data: { force_password_change: false }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully! Please log in.');
      await supabase.auth.signOut();
      router.push('/login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] p-4 font-sans selection:bg-[#0071e3] selection:text-white">
      <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
        
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
              <KeyRound className="h-7 w-7 text-[#0071e3]" />
            </div>
            <h1 className="text-[28px] font-black text-[#1d1d1f] tracking-tight mb-2">Set New Password</h1>
            <p className="text-[#86868b] text-[15px]">Please enter a strong new password for your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold text-[#86868b] uppercase tracking-wider ml-1">
                New Password
              </Label>
              <Input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-[#fbfbfd] border-[#d2d2d7] rounded-xl text-[15px] font-medium focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition-all"
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold text-[#86868b] uppercase tracking-wider ml-1">
                Confirm Password
              </Label>
              <Input 
                type="password" 
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 bg-[#fbfbfd] border-[#d2d2d7] rounded-xl text-[15px] font-medium focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition-all"
                required 
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 mt-2 rounded-xl bg-black text-white hover:bg-gray-800 font-bold text-[15px] transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
