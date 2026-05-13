'use client';

import { Bell, Search, Settings, HelpCircle, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { profile } = useAuthStore();

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden rounded-xl h-10 w-10 text-gray-500 hover:text-black hover:bg-gray-100"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
            <Input 
              placeholder="Search products, orders, or customers..." 
              className="pl-11 h-11 bg-white border-gray-100 rounded-2xl focus:ring-2 focus:ring-gray-100 font-medium text-[14px]"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-gray-500 hover:text-black rounded-xl hover:bg-gray-100 h-10 w-10">
          <HelpCircle className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-500 hover:text-black rounded-xl hover:bg-gray-100 h-10 w-10 relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </Button>
        <div className="h-8 w-px bg-gray-100 mx-2" />
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-bold text-black leading-none mb-1">{profile?.full_name?.split(' ')[0] || 'User'}</p>
            <p className="text-[11px] font-medium text-gray-400 capitalize">{profile ? ((profile as any)?.stores?.name || profile?.role) : 'Checking Store...'}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden cursor-pointer relative">
             <div className="w-full h-full bg-gray-50 absolute" />
             <span className="text-black font-bold text-sm relative">{profile?.full_name?.charAt(0)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
