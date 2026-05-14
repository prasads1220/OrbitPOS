'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  Clock, 
  Wallet,
  LogOut,
  ChevronRight,
  Store,
  ClipboardList,
  ShieldCheck,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'cashier', 'employee'] },
  { name: 'POS Checkout', href: '/pos', icon: ShoppingCart, roles: ['admin', 'cashier', 'employee'] },
  { name: 'Orders History', href: '/orders', icon: ClipboardList, roles: ['admin', 'cashier', 'employee'] },
  { name: 'Products', href: '/admin/products', icon: Package, roles: ['admin', 'cashier', 'employee'] },
  { name: 'Inventory', href: '/admin/inventory', icon: Package, roles: ['admin', 'cashier', 'employee'] },
  { name: 'Employees', href: '/admin/employees', icon: Users, roles: ['admin', 'cashier', 'employee'] },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3, roles: ['admin', 'cashier', 'employee'] },
  { name: 'Attendance', href: '/attendance', icon: Clock, roles: ['admin', 'cashier', 'employee'] },
  { name: 'Payroll', href: '/payroll', icon: Wallet, roles: ['admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'cashier', 'employee'] },
  { name: 'Infrastructure', href: '/super-admin', icon: ShieldCheck, roles: ['superadmin'] },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuthStore();

  const filteredItems = navItems.filter(item => 
    item.roles.includes(profile?.role || 'employee')
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 lg:hidden animate-in fade-in duration-300" 
          onClick={onClose}
        />
      )}

      <div className={cn(
        "flex flex-col w-[280px] bg-[#fbfbfd] border-r border-gray-100 h-full p-6 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) z-[60] shadow-[10px_0_40px_rgba(0,0,0,0.02)]",
        "fixed inset-y-0 left-0 lg:relative lg:translate-x-0 lg:shadow-none",
        isOpen ? "translate-x-0 scale-100 opacity-100" : "-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"
      )}>
        <div className="mb-10 px-2 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/10 shrink-0">
              <span className="text-white font-bold text-lg">
                {profile ? ((profile as any)?.stores?.name?.charAt(0) || 'O') : '...'}
              </span>
            </div>
            <span className="text-xl font-bold tracking-tight text-black font-heading truncate">
              {profile ? ((profile as any)?.stores?.name || 'OrbitPOS') : 'Loading...'}
            </span>
          </Link>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden rounded-xl h-10 w-10 text-gray-400 hover:text-black hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto min-h-0 pr-2 -mr-2 custom-scrollbar">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-3">Main Menu</p>
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center justify-between px-4 py-3 rounded-2xl text-[14px] font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-95",
                  isActive 
                    ? "bg-white text-[#0071e3] shadow-[0_10px_20px_rgba(0,0,0,0.04)] border border-gray-100 translate-x-1" 
                    : "text-[#86868b] hover:bg-white hover:text-black hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]"
                )}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose?.();
                }}
              >
                <div className="flex items-center">
                  <item.icon className={cn("mr-3 h-5 w-5 transition-all duration-300 group-hover:scale-110", isActive ? "text-[#0071e3] scale-110" : "text-gray-400 group-hover:text-black")} />
                  {item.name}
                </div>
                {isActive && (
                  <div className="flex items-center">
                    <ChevronRight className="h-4 w-4 text-[#0071e3] opacity-40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3] ml-1 shadow-[0_0_10px_rgba(0,113,227,0.4)]" />
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 pt-6 border-t border-gray-100 space-y-4 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-2xl border border-gray-50 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-black font-bold text-sm uppercase">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[13px] font-bold text-black truncate">{profile?.full_name || 'User'}</p>
              <p className="text-[11px] text-gray-400 font-medium capitalize">{profile?.role || 'Retail Staff'}</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 rounded-2xl h-11 px-4 font-semibold text-[14px]"
            onClick={() => signOut()}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </div>
    </>
  );
}
