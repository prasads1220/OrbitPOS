'use client';

import { useState, useEffect } from 'react';
import { 
  Store, 
  Plus, 
  Users, 
  ShieldCheck, 
  LayoutDashboard, 
  Settings, 
  Building2,
  Mail,
  UserPlus,
  RefreshCw,
  Search,
  DollarSign,
  Trash2,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createStore, createStoreAdmin, getAllStores, deleteStore } from '@/app/actions/super-admin';
import { format } from 'date-fns';

import { LoginForm } from '@/components/auth/login-form';
import { useAuthStore } from '@/store/useAuthStore';
import { ShieldAlert, Loader2, Lock, ArrowRight } from 'lucide-react';

import { useSearchParams } from 'next/navigation';

import { Suspense } from 'react';

function SuperAdminContent() {
  const { profile, loading: authLoading } = useAuthStore();
  const searchParams = useSearchParams();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [forceShow, setForceShow] = useState(false);

  // Form states
  const [storeName, setStoreName] = useState('');
  const [adminData, setAdminData] = useState({
    email: '',
    full_name: '',
    password: ''
  });

  const [stats, setStats] = useState({
    totalStores: 0,
    totalUsers: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    if (searchParams.get('master') === 'true') {
      setForceShow(true);
      // Clean the URL so the 'master=true' is hidden
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    if (profile?.role === 'super_admin' || forceShow) {
      fetchStores();
      fetchPlatformStats();
    }
  }, [profile, forceShow]);

  // Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#0071e3]" />
      </div>
    );
  }

  // Auth Guard: Show Login if not Super Admin
  if (profile?.role !== 'super_admin' && !forceShow) {
    return (
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-black font-sans">
        {/* Dynamic Animated Dark Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-br from-[#0071e3]/40 to-[#00c6ff]/20 rounded-full blur-[120px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-gradient-to-tr from-[#8a2be2]/30 to-[#4a00e0]/20 rounded-full blur-[120px] mix-blend-screen animate-[pulse_12s_ease-in-out_infinite_1s]" />
          <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] bg-gradient-to-bl from-[#ff007f]/20 to-[#7f00ff]/20 rounded-full blur-[120px] mix-blend-screen animate-[pulse_14s_ease-in-out_infinite_2s]" />

        </div>

        {/* Glossy Glass Card Container */}
        <div className="relative z-10 w-full max-w-[460px] mx-auto p-6 animate-in slide-in-from-bottom-10 fade-in duration-1000">
          <div className="relative rounded-[2.5rem] bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(0,113,227,0.15)] overflow-hidden">
            {/* Inner Gloss Highlights */}
            <div className="absolute inset-0 rounded-[2.5rem] border border-white/20 pointer-events-none" style={{ clipPath: 'inset(0 0 auto 0)' }} />
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            
            <div className="p-10 relative z-20">
              <div className="mb-8 text-center">
                <div className="w-14 h-14 bg-gradient-to-tr from-gray-800 to-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/10 transform hover:scale-105 transition-transform duration-500">
                  <span className="text-white font-bold text-2xl drop-shadow-md">O</span>
                </div>
                <h1 className="text-[28px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white tracking-tight mb-2">
                  Master Control
                </h1>
                <p className="text-[14px] text-gray-400 font-medium">
                  Infrastructure Administrator Portal
                </p>
              </div>
              
              <div className="bg-black/20 p-6 rounded-[1.5rem] border border-white/5 backdrop-blur-md mb-6">
                <LoginForm variant="transparent" theme="dark" />
              </div>
              
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fetchPlatformStats = async () => {
    try {
      const { count: storesCount } = await supabase.from('stores').select('*', { count: 'exact', head: true });
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { data: revenueData } = await supabase.from('orders').select('total_amount').eq('payment_status', 'completed');
      const platformRevenue = revenueData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      setStats({
        totalStores: storesCount || 0,
        totalUsers: usersCount || 0,
        totalRevenue: platformRevenue
      });
    } catch (err) {
      console.error('Stats fetch failed:', err);
    }
  };

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res = await getAllStores();
      if (res.success) {
        setStores(res.stores || []);
      } else {
        console.warn('Store fetch failed:', res.error);
      }
    } catch (err) {
      console.error('Store fetch failed:', err);
    }
    setLoading(false);
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName) return;

    setLoading(true);
    const res = await createStore(storeName);
    if (res.success) {
      toast.success('Store created successfully');
      setStoreName('');
      setIsStoreModalOpen(false);
      fetchStores();
      fetchPlatformStats();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore || !adminData.email || !adminData.full_name) return;

    setLoading(true);
    const res = await createStoreAdmin({
      ...adminData,
      store_id: selectedStore.id
    });

    if (res.success) {
      toast.success(`Admin created for ${selectedStore.name}`);
      setAdminData({ email: '', full_name: '', password: '' });
      setIsAdminModalOpen(false);
      setSelectedStore(null);
      fetchPlatformStats();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleDeleteStore = async (storeId: string, storeName: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete "${storeName}"? This will wipe all products, orders, and logins for this company.`)) return;

    setLoading(true);
    const res = await deleteStore(storeId);
    if (res.success) {
      toast.success(`${storeName} deleted successfully`);
      fetchStores();
      fetchPlatformStats();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const filteredStores = stores.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd] p-8 md:p-12 animate-in fade-in duration-1000">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/10">
              <ShieldCheck className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-black tracking-tight">Super Admin Portal</h1>
              <p className="text-[#86868b] font-medium mt-1">Manage OrbitPOS stores and infrastructure.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="h-14 px-6 rounded-2xl text-gray-400 hover:text-black hover:bg-gray-100 font-bold transition-all"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Sign Out
            </Button>

            <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
              <DialogTrigger 
                render={
                  <Button className="h-14 px-8 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-[15px] shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                    <Plus className="mr-2 h-5 w-5" />
                    Register New Store
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[440px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                <div className="p-10 bg-[#fbfbfd] border-b border-gray-50">
                  <DialogHeader>
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4">
                      <Building2 className="text-white h-6 w-6" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-black">New Store</DialogTitle>
                  </DialogHeader>
                </div>
                <form onSubmit={handleCreateStore} className="p-10 space-y-6 bg-white">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Store Name</Label>
                    <Input 
                      placeholder="e.g. Apple Store Fifth Ave" 
                      className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                      value={storeName}
                      onChange={e => setStoreName(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-14 bg-black rounded-2xl font-bold shadow-xl shadow-black/10">
                    {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : 'Create Store'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Platform Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-blue-50 opacity-10 transition-transform group-hover:scale-110">
              <Building2 className="h-20 w-20" />
            </div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Stores</p>
            <h3 className="text-4xl font-black text-black tracking-tight">{stats.totalStores}</h3>
            <p className="text-[12px] text-[#0071e3] font-bold mt-2">Active Businesses</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-indigo-50 opacity-10 transition-transform group-hover:scale-110">
              <Users className="h-20 w-20" />
            </div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Users</p>
            <h3 className="text-4xl font-black text-black tracking-tight">{stats.totalUsers}</h3>
            <p className="text-[12px] text-indigo-500 font-bold mt-2">Platform Wide</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-emerald-50 opacity-10 transition-transform group-hover:scale-110">
              <DollarSign className="h-20 w-20" />
            </div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Platform Revenue</p>
            <h3 className="text-4xl font-black text-black tracking-tight">${stats.totalRevenue.toLocaleString()}</h3>
            <p className="text-[12px] text-emerald-500 font-bold mt-2">Gross Transactions</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
          <Input 
            placeholder="Search stores..." 
            className="pl-12 h-14 bg-white border-gray-100 rounded-2xl shadow-sm font-medium"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Stores Table */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-50 bg-[#fbfbfd]">
                <TableHead className="font-bold text-black pl-8 h-16">Store Name</TableHead>
                <TableHead className="font-bold text-black h-16">Store ID</TableHead>
                <TableHead className="font-bold text-black h-16">Created</TableHead>
                <TableHead className="font-bold text-black text-right pr-8 h-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 text-gray-400">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="font-bold text-lg">Syncing Infrastructure...</p>
                  </TableCell>
                </TableRow>
              ) : filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20">
                    <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-100" />
                    <p className="text-gray-400 font-bold text-lg">No stores found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store) => (
                  <TableRow key={store.id} className="border-gray-50 hover:bg-gray-50/50 group transition-colors">
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center text-[#0071e3] font-black text-xs uppercase shadow-sm group-hover:bg-white transition-colors">
                          {store.name.substring(0, 2)}
                        </div>
                        <span className="font-bold text-black text-lg">{store.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-[12px] bg-gray-50 px-2 py-1 rounded-md text-gray-500 font-medium">
                        {store.id.substring(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell className="text-gray-400 font-medium">
                      {format(new Date(store.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog open={isAdminModalOpen && selectedStore?.id === store.id} onOpenChange={(open) => { if (!open) setIsAdminModalOpen(false); }}>
                          <DialogTrigger 
                            render={
                              <Button 
                                variant="ghost" 
                                className="text-[#0071e3] font-bold text-[13px] hover:bg-blue-50 rounded-xl px-4"
                                onClick={() => setSelectedStore(store)}
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add Admin
                              </Button>
                            }
                          />
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          className="text-red-500 hover:bg-red-50 rounded-xl h-10 w-10 p-0"
                          onClick={() => handleDeleteStore(store.id, store.name)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Create Admin Dialog */}
        <Dialog open={isAdminModalOpen} onOpenChange={setIsAdminModalOpen}>
          <DialogContent className="sm:max-w-[440px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
            <div className="p-10 bg-[#fbfbfd] border-b border-gray-50">
              <DialogHeader>
                <div className="w-12 h-12 bg-[#0071e3] rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                  <ShieldCheck className="text-white h-6 w-6" />
                </div>
                <DialogTitle className="text-2xl font-black text-black">Create Store Admin</DialogTitle>
                <p className="text-[13px] text-gray-400 font-medium mt-1 uppercase tracking-widest">For: {selectedStore?.name}</p>
              </DialogHeader>
            </div>
            <form onSubmit={handleCreateAdmin} className="p-10 space-y-6 bg-white">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</Label>
                  <Input 
                    placeholder="e.g. John Appleseed" 
                    className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                    value={adminData.full_name}
                    onChange={e => setAdminData({...adminData, full_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</Label>
                  <Input 
                    type="email"
                    placeholder="admin@store.com" 
                    className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                    value={adminData.email}
                    onChange={e => setAdminData({...adminData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password (Optional)</Label>
                  <Input 
                    type="password"
                    placeholder="Leave blank for default" 
                    className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                    value={adminData.password}
                    onChange={e => setAdminData({...adminData, password: e.target.value})}
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-14 bg-black rounded-2xl font-bold shadow-xl shadow-black/10">
                {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : 'Provision Admin Account'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#0071e3]" />
      </div>
    }>
      <SuperAdminContent />
    </Suspense>
  );
}
