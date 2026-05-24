'use client';

import { useState, useEffect } from 'react';
import { 
  Store, 
  Plus, 
  Users, 
  ShieldCheck, 
  Building2,
  UserPlus,
  RefreshCw,
  Search,
  Trash2,
  LogOut,
  User,
  Ban,
  CheckCircle2,
  Pencil,
  ShieldAlert,
  Loader2
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
import { 
  createStore, 
  createStoreAdmin, 
  getAllStores, 
  deleteStore, 
  updateStore, 
  toggleStoreSuspension,
  createCompany,
  getCompanies,
  deleteCompany,
  createSuperAdmin,
  getPlatformStats
} from '@/app/actions/super-admin';
import { format } from 'date-fns';

import { LoginForm } from '@/components/auth/login-form';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { Suspense } from 'react';

function SuperAdminContent() {
  const { profile, loading: authLoading } = useAuthStore();
  const searchParams = useSearchParams();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [forceShow, setForceShow] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  
  // Filter state
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all');

  // Form states
  const [storeName, setStoreName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [adminData, setAdminData] = useState({
    email: '',
    full_name: '',
    password: ''
  });
  const [superAdminData, setSuperAdminData] = useState({
    email: '',
    full_name: '',
    password: ''
  });

  const [stats, setStats] = useState({
    totalStores: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    if (searchParams.get('master') === 'true') {
      setForceShow(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    if (profile?.role === 'super_admin' || forceShow) {
      fetchCompanies();
      fetchStores();
    }
  }, [profile, forceShow]);

  useEffect(() => {
    if (profile?.role === 'super_admin' || forceShow) {
      fetchPlatformStats(selectedCompanyFilter);
    }
  }, [profile, forceShow, selectedCompanyFilter]);

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
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-br from-[#0071e3]/40 to-[#00c6ff]/20 rounded-full blur-[120px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-gradient-to-tr from-[#8a2be2]/30 to-[#4a00e0]/20 rounded-full blur-[120px] mix-blend-screen animate-[pulse_12s_ease-in-out_infinite_1s]" />
          <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] bg-gradient-to-bl from-[#ff007f]/20 to-[#7f00ff]/20 rounded-full blur-[120px] mix-blend-screen animate-[pulse_14s_ease-in-out_infinite_2s]" />
        </div>

        <div className="relative z-10 w-full max-w-[460px] mx-auto p-6 animate-in slide-in-from-bottom-10 fade-in duration-1000">
          <div className="relative rounded-[2.5rem] bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(0,113,227,0.15)] overflow-hidden">
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

  const fetchPlatformStats = async (companyId: string = 'all') => {
    try {
      const res = await getPlatformStats(companyId);
      if (res.success && res.stats) {
        setStats(res.stats);
      }
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

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await getCompanies();
      if (res.success) {
        setCompanies(res.companies || []);
        if (res.companies && res.companies.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(res.companies[0].id);
        }
      }
    } catch (err) {
      console.error('Company fetch failed:', err);
    }
    setLoading(false);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) return;

    setLoading(true);
    const res = await createCompany(companyName);
    if (res.success) {
      toast.success('Company created successfully');
      setCompanyName('');
      setIsCompanyModalOpen(false);
      fetchCompanies();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !selectedCompanyId) {
      toast.error('Store name and company are required');
      return;
    }

    setLoading(true);
    const res = await createStore(storeName, selectedCompanyId);
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

  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdminData.email || !superAdminData.full_name) return;

    setLoading(true);
    const res = await createSuperAdmin(superAdminData);

    if (res.success) {
      toast.success('Super Admin account created successfully');
      setSuperAdminData({ email: '', full_name: '', password: '' });
      setIsSuperAdminModalOpen(false);
      fetchPlatformStats();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleDeleteStore = async (storeId: string, storeName: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete ">₹{storeName}"? This will wipe all products, orders, and logins for this company.`)) return;

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

  const handleToggleSuspension = async (store: any) => {
    setLoading(true);
    const res = await toggleStoreSuspension(store.id, !store.is_suspended);
    if (res.success) {
      toast.success(store.is_suspended ? 'Store resumed' : 'Store suspended');
      fetchStores();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore || !storeName) return;

    setLoading(true);
    const res = await updateStore(selectedStore.id, storeName);
    if (res.success) {
      toast.success('Store updated successfully');
      setIsEditModalOpen(false);
      fetchStores();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const filteredStores = stores.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesCompany = selectedCompanyFilter === 'all' || s.company_id === selectedCompanyFilter;
    return matchesSearch && matchesCompany;
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // Re-calculate stats based on filter
  const displayStoresCount = selectedCompanyFilter === 'all' ? stats.totalStores : filteredStores.length;
  // Note: Users count filter could be added similarly if we wanted per-company user counts

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-12 animate-in fade-in duration-1000">
      {/* Glossy Header Banner */}
      <div className="relative h-64 md:h-72 w-full overflow-hidden mb-8">
        <Image 
          src="/super-admin-banner.png" 
          alt="OrbitPOS Infrastructure Banner" 
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-[#f5f5f7]" />
        
        <div className="absolute bottom-0 w-full p-8 md:p-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-4 text-left">
              <div className="w-16 h-16 bg-black/5 backdrop-blur-xl border border-black/10 rounded-2xl flex items-center justify-center shadow-lg">
                <ShieldCheck className="text-black h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-black tracking-tight drop-shadow-sm">Super Admin Portal</h1>
                <p className="text-gray-600 font-medium mt-1 text-lg">Manage OrbitPOS architecture securely.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/super-admin/profile">
                <Button variant="outline" className="h-12 px-6 rounded-xl bg-white/50 backdrop-blur-md border-gray-200 text-black hover:bg-white/80 font-bold transition-all shadow-sm">
                  <User className="mr-2 h-4 w-4" />
                  Admin Profile
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="h-12 px-6 rounded-xl text-gray-600 hover:text-black hover:bg-white/50 backdrop-blur-md border border-transparent hover:border-gray-200 font-bold transition-all shadow-sm"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 md:px-12 space-y-8">
        
        {/* Top Actions & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/70 backdrop-blur-xl border border-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex-1 max-w-md">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Filter by Company</Label>
            <select
              className="w-full h-12 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#0071e3]/20 font-bold px-4 shadow-sm text-gray-800 transition-all hover:border-[#0071e3]/30 cursor-pointer"
              value={selectedCompanyFilter}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
            >
              <option value="all">🌐 All Companies</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>🏢 {c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <Dialog open={isCompanyModalOpen} onOpenChange={setIsCompanyModalOpen}>
              <DialogTrigger 
                render={
                  <Button variant="outline" className="h-12 px-5 rounded-xl border-indigo-100/50 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-600 font-bold shadow-sm transition-all">
                    <Building2 className="mr-2 h-4 w-4" />
                    New Company
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[440px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                <div className="p-10 bg-[#fbfbfd] border-b border-gray-50">
                  <DialogHeader>
                    <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                      <Building2 className="text-white h-6 w-6" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-black">New Company</DialogTitle>
                  </DialogHeader>
                </div>
                <form onSubmit={handleCreateCompany} className="p-10 space-y-6 bg-white">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Company Name</Label>
                    <Input 
                      placeholder="e.g. Acme Corp" 
                      className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/10 font-bold"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-14 bg-indigo-500 hover:bg-indigo-600 rounded-2xl text-white font-bold shadow-xl shadow-indigo-500/20">
                    {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : 'Create Company'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
              <DialogTrigger 
                render={
                  <Button className="h-12 px-5 rounded-xl bg-gradient-to-b from-[#0071e3] to-[#005bb5] hover:from-[#0077ed] hover:to-[#0062c3] text-white font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 border border-blue-400/20">
                    <Plus className="mr-2 h-4 w-4" />
                    Register New Store
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[440px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                <div className="p-10 bg-[#fbfbfd] border-b border-gray-50">
                  <DialogHeader>
                    <div className="w-12 h-12 bg-gradient-to-b from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                      <Store className="text-white h-6 w-6" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-black">New Store</DialogTitle>
                  </DialogHeader>
                </div>
                <form onSubmit={handleCreateStore} className="p-10 space-y-6 bg-white">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Company</Label>
                    <select
                      className="w-full h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold px-4"
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      required
                    >
                      <option value="">Select a Company...</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
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

            <Dialog open={isSuperAdminModalOpen} onOpenChange={setIsSuperAdminModalOpen}>
              <DialogTrigger 
                render={
                  <Button variant="outline" className="h-12 px-5 rounded-xl border-amber-100/50 bg-amber-50/50 hover:bg-amber-50 text-amber-600 font-bold shadow-sm transition-all">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    New Super Admin
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[440px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                <div className="p-10 bg-[#fbfbfd] border-b border-gray-50">
                  <DialogHeader>
                    <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                      <ShieldCheck className="text-white h-6 w-6" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-black">New Super Admin</DialogTitle>
                    <p className="text-[13px] text-gray-400 font-medium mt-1 uppercase tracking-widest">Global Access</p>
                  </DialogHeader>
                </div>
                <form onSubmit={handleCreateSuperAdmin} className="p-10 space-y-6 bg-white">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</Label>
                      <Input 
                        placeholder="e.g. Jane Doe" 
                        className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/10 font-bold"
                        value={superAdminData.full_name}
                        onChange={e => setSuperAdminData({...superAdminData, full_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</Label>
                      <Input 
                        type="email"
                        placeholder="admin@orbitpos.com" 
                        className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/10 font-bold"
                        value={superAdminData.email}
                        onChange={e => setSuperAdminData({...superAdminData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password (Optional)</Label>
                      <Input 
                        type="password"
                        placeholder="Leave blank for default" 
                        className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/10 font-bold"
                        value={superAdminData.password}
                        onChange={e => setSuperAdminData({...superAdminData, password: e.target.value})}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold shadow-xl shadow-amber-500/20">
                    {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : 'Provision Super Admin'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Platform Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 p-8 text-[#0071e3] opacity-5 transition-transform group-hover:scale-110 group-hover:opacity-10">
              <Building2 className="h-24 w-24" />
            </div>
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Stores</p>
            <h3 className="text-5xl font-black text-black tracking-tight">{displayStoresCount}</h3>
            <p className="text-[13px] text-[#0071e3] font-bold mt-3 bg-blue-50 inline-block px-3 py-1 rounded-lg">Active Businesses</p>
          </div>

          <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 p-8 text-indigo-500 opacity-5 transition-transform group-hover:scale-110 group-hover:opacity-10">
              <Users className="h-24 w-24" />
            </div>
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Users</p>
            <h3 className="text-5xl font-black text-black tracking-tight">{stats.totalUsers}</h3>
            <p className="text-[13px] text-indigo-600 font-bold mt-3 bg-indigo-50 inline-block px-3 py-1 rounded-lg">Platform Wide</p>
          </div>
        </div>

        {/* Search & Stores Table */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="p-6 border-b border-gray-100/50 bg-white/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-black flex items-center gap-2">
              <Store className="h-5 w-5 text-[#0071e3]" />
              Store Infrastructure
            </h3>
            <div className="relative group w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
              <Input 
                placeholder="Search stores..." 
                className="pl-10 h-11 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#0071e3]/20 font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-50/50 bg-white/20">
                  <TableHead className="font-bold text-black pl-8 h-16">Store Name</TableHead>
                  <TableHead className="font-bold text-black h-16">Company</TableHead>
                  <TableHead className="font-bold text-black h-16">Store ID</TableHead>
                  <TableHead className="font-bold text-black h-16">Created</TableHead>
                  <TableHead className="font-bold text-black text-right pr-8 h-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && stores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-gray-400">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0071e3]/50" />
                      <p className="font-bold text-lg">Syncing Infrastructure...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredStores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20">
                      <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-200" />
                      <p className="text-gray-400 font-bold text-lg">No stores found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStores.map((store) => (
                    <TableRow key={store.id} className="border-b border-gray-50/50 hover:bg-white/60 group transition-colors">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center text-[#0071e3] font-black text-xs uppercase shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] group-hover:bg-white group-hover:shadow-sm transition-all border border-gray-100">
                            {store.name.substring(0, 2)}
                          </div>
                          <span className="font-bold text-gray-800 text-[15px]">{store.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px] font-bold text-indigo-700 bg-indigo-50/80 px-3 py-1.5 rounded-lg border border-indigo-100/50 inline-block shadow-sm">
                          {store.company_name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="text-[12px] bg-gray-50 px-2 py-1 rounded-md text-gray-500 font-medium border border-gray-100">
                          {store.id.substring(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell className="text-gray-500 font-medium text-[13px]">
                        {format(new Date(store.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-2">
                          {!store.admin ? (
                            <Button 
                              variant="ghost" 
                              className="text-[#0071e3] font-bold text-[13px] hover:bg-blue-50 rounded-xl px-4"
                              onClick={() => {
                                setSelectedStore(store);
                                setIsAdminModalOpen(true);
                              }}
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Add Admin
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                className="text-gray-600 font-bold text-[13px] hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 rounded-xl px-4 transition-all"
                                onClick={() => {
                                  setSelectedStore(store);
                                  setStoreName(store.name);
                                  setIsEditModalOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4 text-gray-400" />
                                Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                className={cn(
                                  "font-bold text-[13px] rounded-xl px-4 transition-all",
                                  store.is_suspended 
                                    ? "text-emerald-600 hover:bg-emerald-50 hover:shadow-sm hover:border-emerald-100 border border-transparent" 
                                    : "text-amber-600 hover:bg-amber-50 hover:shadow-sm hover:border-amber-100 border border-transparent"
                                )}
                                onClick={() => handleToggleSuspension(store)}
                              >
                                {store.is_suspended ? (
                                  <><CheckCircle2 className="mr-2 h-4 w-4" /> Resume</>
                                ) : (
                                  <><Ban className="mr-2 h-4 w-4" /> Suspend</>
                                )}
                              </Button>
                            </div>
                          )}
                          <Button 
                            variant="ghost" 
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl h-10 w-10 p-0 transition-colors"
                            onClick={() => handleDeleteStore(store.id, store.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
        
        {/* Edit Store Dialog */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[440px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
            <div className="p-10 bg-[#fbfbfd] border-b border-gray-50">
              <DialogHeader>
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4">
                  <Building2 className="text-white h-6 w-6" />
                </div>
                <DialogTitle className="text-2xl font-black text-black">Edit Store</DialogTitle>
              </DialogHeader>
            </div>
            <form onSubmit={handleUpdateStore} className="p-10 space-y-6 bg-white">
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
                {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : 'Update Store'}
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
