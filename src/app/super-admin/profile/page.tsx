'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { PublicHeader } from '@/components/layout/public-header';
import { Button } from '@/components/ui/button';
import { ShieldCheck, User, Mail, Calendar, LogOut, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

export default function SuperAdminProfile() {
  const { profile } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] font-sans">
      <div className="max-w-4xl mx-auto pt-20 px-8 pb-32">
        <Link href="/super-admin">
          <Button variant="ghost" className="mb-10 text-gray-400 hover:text-black font-bold transition-all">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Master Control
          </Button>
        </Link>

        <div className="bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
          <div className="h-48 bg-gradient-to-tr from-gray-900 to-black relative">
            <div className="absolute -bottom-16 left-12 w-32 h-32 rounded-[2.5rem] bg-white p-2 shadow-xl">
              <div className="w-full h-full rounded-[2rem] bg-gray-100 flex items-center justify-center">
                <ShieldCheck className="h-16 w-16 text-black" />
              </div>
            </div>
          </div>

          <div className="pt-24 px-12 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <h1 className="text-4xl font-black text-black tracking-tight">{profile?.full_name}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <span className="px-4 py-1 bg-black text-white rounded-full text-[11px] font-bold uppercase tracking-widest">
                    Infrastructure Super Admin
                  </span>
                  <span className="text-gray-400 font-medium text-sm flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Member since {profile?.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : 'N/A'}
                  </span>
                </div>
              </div>

              <Button 
                variant="destructive" 
                onClick={handleLogout}
                className="h-14 px-8 rounded-2xl font-bold shadow-lg shadow-red-500/10"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Sign Out Everywhere
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
              <div className="p-8 rounded-3xl bg-[#f5f5f7] border border-gray-100 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Full Name</p>
                    <p className="font-bold text-black">{profile?.full_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Email Address</p>
                    <p className="font-bold text-black">{profile?.email}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-gray-200" />
                </div>
                <div>
                  <h3 className="font-bold text-black">Security Clearance</h3>
                  <p className="text-sm text-gray-400 font-medium mt-1">Your account has full administrative access to the OrbitPOS platform core.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
