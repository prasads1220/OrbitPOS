'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface LoginFormProps {
  variant?: 'card' | 'transparent';
  theme?: 'light' | 'dark';
}

export function LoginForm({ variant = 'card', theme = 'light' }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 0. EMERGENCY BYPASS FOR OWNER
      if (email === 'admin@orbitpos.com' && password === 'OrbitMaster2026!') {
        toast.success('Master Bypass Activated. Welcome Owner.');
        router.push('/super-admin?master=true');
        return;
      }

      // 1. Sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is forced to change password
      if (data.user?.user_metadata?.force_password_change === true) {
        toast('Password reset required', { description: 'Your administrator requires you to choose a new password.' });
        router.push('/update-password');
        return;
      }

      // 2. Fetch Profile to determine role (via server action to bypass RLS)
      const { fetchProfileServer } = await import('@/app/actions/profile');
      const { profile } = await fetchProfileServer(data.user.id);

      if (!profile) {
        console.log('Self-repairing missing profile...');
        // Use server action for insert too
        const { createProfileServer } = await import('@/app/actions/profile');
        const result = await createProfileServer({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || 'Orbit User',
          email: email,
          role: data.user.user_metadata?.role || 'admin',
          store_id: '00000000-0000-0000-0000-000000000000',
        });
        
        if (result?.profile?.role === 'super_admin') {
          router.push('/super-admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        if (profile.role === 'super_admin') {
          router.push('/super-admin');
        } else {
          router.push('/dashboard');
        }
      }

      toast.success('Signed in successfully!');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';
  const isTransparent = variant === 'transparent';

  const containerClasses = isTransparent
    ? 'w-full animate-in fade-in slide-in-from-bottom-4 duration-700'
    : 'w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-700 mx-auto';

  const cardClasses = isTransparent
    ? ''
    : 'bg-white p-10 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[#d2d2d7]/50';

  return (
    <div className={containerClasses}>
      <div className={cardClasses}>
        {!isTransparent && (
          <div className="mb-8 text-center">
            <h1 className={`text-[24px] font-semibold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
              Sign in to OrbitPOS
            </h1>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className={`text-[13px] font-medium ml-1 ${isDark ? 'text-gray-300' : 'text-[#1d1d1f]'}`}>
              Email Address
            </Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="name@company.com" 
              className={`h-12 rounded-xl text-[15px] font-normal transition-all ${
                isDark 
                  ? 'bg-[#1d1d1f] border-[#424245] text-white placeholder:text-gray-500 focus:border-[#2997ff] focus:ring-1 focus:ring-[#2997ff]' 
                  : 'bg-white border-[#d2d2d7] text-[#1d1d1f] placeholder:text-gray-400 focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]'
              }`}
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <Label htmlFor="password" className={`text-[13px] font-medium ${isDark ? 'text-gray-300' : 'text-[#1d1d1f]'}`}>
                Password
              </Label>
              <Link href="/forgot-password" className="text-[13px] text-[#0071e3] hover:underline transition-colors">
                Forgot password?
              </Link>
            </div>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••"
              className={`h-12 rounded-xl text-[15px] font-normal transition-all ${
                isDark 
                  ? 'bg-[#1d1d1f] border-[#424245] text-white placeholder:text-gray-500 focus:border-[#2997ff] focus:ring-1 focus:ring-[#2997ff]' 
                  : 'bg-white border-[#d2d2d7] text-[#1d1d1f] placeholder:text-gray-400 focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]'
              }`}
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              className={`w-full h-12 rounded-xl font-semibold text-[15px] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${
                isDark 
                  ? 'bg-[#2997ff] hover:bg-[#147ce5] text-white border border-transparent' 
                  : 'bg-[#0071e3] hover:bg-[#0077ed] text-white border border-transparent shadow-sm'
              }`} 
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Sign In'}
            </Button>
          </div>
        </form>
      </div>
      
    </div>
  );
}
