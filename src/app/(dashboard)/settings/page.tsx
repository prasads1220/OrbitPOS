'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Mail, 
  CreditCard,
  Loader2,
  Camera,
  Save,
  Key,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

import { useActiveStore } from '@/store/useActiveStore';

type SettingsTab = 'profile' | 'store';

export default function SettingsPage() {
  const { profile, fetchProfile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    hourly_rate: 0,
  });

  const [storeSettings, setStoreSettings] = useState({
    auto_print_receipt: true,
    loyalty_points_earn_ratio: 100,
    loyalty_points_redeem_ratio: 100,
    loyalty_points_redeem_discount_percent: 2,
  });

  const storeToUse = activeStoreId || profile?.store_id;

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        hourly_rate: profile.hourly_rate || 0,
      });

      if (profile.role === 'admin' && storeToUse) {
        fetchStoreData(storeToUse);
      }
    }
  }, [profile, activeStoreId, storeToUse]);

  const fetchStoreData = async (storeId: string) => {
    const { data, error } = await supabase
      .from('stores')
      .select('auto_print_receipt, loyalty_points_earn_ratio, loyalty_points_redeem_ratio, loyalty_points_redeem_discount_percent')
      .eq('id', storeId)
      .single();
    
    if (data) {
      setStoreSettings({
        auto_print_receipt: data.auto_print_receipt ?? true,
        loyalty_points_earn_ratio: data.loyalty_points_earn_ratio ?? 100,
        loyalty_points_redeem_ratio: data.loyalty_points_redeem_ratio ?? 100,
        loyalty_points_redeem_discount_percent: data.loyalty_points_redeem_discount_percent !== null ? parseFloat(data.loyalty_points_redeem_discount_percent) : 2,
      });
    } else if (error) {
      console.warn("Failed to fetch loyalty settings from DB, using defaults:", error.message);
      // Fallback: fetch only auto_print_receipt
      const { data: fallbackData } = await supabase
        .from('stores')
        .select('auto_print_receipt')
        .eq('id', storeId)
        .single();
      
      if (fallbackData) {
        setStoreSettings({
          auto_print_receipt: fallbackData.auto_print_receipt ?? true,
          loyalty_points_earn_ratio: 100,
          loyalty_points_redeem_ratio: 100,
          loyalty_points_redeem_discount_percent: 2,
        });
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          ...(profile.role === 'admin' && { hourly_rate: formData.hourly_rate }),
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      await fetchProfile(profile.id);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeToUse) return;

    setLoading(true);
    try {
      // First try to update all settings (auto_print_receipt + loyalty columns)
      const { error } = await supabase
        .from('stores')
        .update({
          auto_print_receipt: storeSettings.auto_print_receipt,
          loyalty_points_earn_ratio: parseInt(storeSettings.loyalty_points_earn_ratio.toString()) || 100,
          loyalty_points_redeem_ratio: parseInt(storeSettings.loyalty_points_redeem_ratio.toString()) || 100,
          loyalty_points_redeem_discount_percent: parseFloat(storeSettings.loyalty_points_redeem_discount_percent.toString()) || 2.00,
        })
        .eq('id', storeToUse);

      if (error) {
        console.warn("Saving custom loyalty settings directly to DB failed (possibly columns don't exist yet):", error.message);
        
        // Fallback: save only auto_print_receipt
        const { error: fallbackError } = await supabase
          .from('stores')
          .update({
            auto_print_receipt: storeSettings.auto_print_receipt,
          })
          .eq('id', storeToUse);

        if (fallbackError) throw fallbackError;
        
        toast.warning('Receipt settings saved. Loyalty settings require database migration to be saved to DB.');
      } else {
        toast.success('Store configuration and loyalty settings updated successfully');
      }
      
      // Update global state if needed
      await fetchProfile(profile.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update store settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">Settings</h1>
        <p className="text-[#86868b] font-medium mt-1">Manage your account and workspace preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-1">
          <SettingsNavItem 
            icon={User} 
            label="Profile" 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
          />
          {profile?.role === 'admin' && (
            <SettingsNavItem 
              icon={SettingsIcon} 
              label="Store Config" 
              active={activeTab === 'store'} 
              onClick={() => setActiveTab('store')} 
            />
          )}
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-8">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-10 border-b border-gray-50 bg-[#fbfbfd]">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-[2rem] bg-[#0071e3] text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-500/20">
                      {profile?.full_name?.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-black">{profile?.full_name}</h3>
                    <p className="text-[13px] text-gray-400 font-medium capitalize">{profile?.role} Account</p>
                  </div>
                </div>
              </div>

              <div className="p-10">
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</Label>
                      <Input 
                        id="full_name"
                        className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</Label>
                      <Input 
                        id="email"
                        disabled
                        className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl opacity-50 font-bold"
                        value={formData.email}
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-50 flex justify-end">
                    <Button 
                      type="submit"
                      disabled={loading}
                      className="bg-black text-white px-8 h-14 rounded-2xl font-bold shadow-xl shadow-black/10 hover:bg-gray-800 transition-all"
                    >
                      {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                      Save Profile
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'store' && profile?.role === 'admin' && (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-500">
              <div className="p-10 border-b border-gray-50 bg-[#fbfbfd]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#0071e3] rounded-xl flex items-center justify-center text-white">
                    <Printer className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-black">Store Configuration</h3>
                    <p className="text-[13px] text-gray-400 font-medium">Manage hardware and store-wide settings.</p>
                  </div>
                </div>
              </div>

              <div className="p-10 space-y-8">
                <form onSubmit={handleSavePayments} className="space-y-6">
                  <div className="space-y-6">


                    <div className="pt-6 border-t border-gray-50">
                      <Label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-4 block">POS Settings</Label>
                      <div className="flex items-center justify-between p-6 bg-[#f5f5f7] rounded-3xl group hover:bg-white hover:ring-2 hover:ring-[#0071e3]/10 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#0071e3] shadow-sm">
                            <Printer className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-black">Automatic Receipt Printing</p>
                            <p className="text-[12px] text-gray-400 font-medium">Print receipt immediately after payment</p>
                          </div>
                        </div>
                        <Checkbox 
                          checked={storeSettings.auto_print_receipt}
                          onCheckedChange={(checked) => setStoreSettings({...storeSettings, auto_print_receipt: !!checked})}
                          className="h-6 w-6 rounded-lg border-2"
                        />
                      </div>
                    </div>

                    {/* Loyalty Points Configuration Section */}
                    <div className="pt-8 border-t border-gray-50 space-y-6">
                      <div>
                        <Label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1 block">Loyalty & Rewards CRM Settings</Label>
                        <p className="text-[12px] text-gray-400 font-medium ml-1 mt-0.5">Customize earning rates and redemption discounts for all customers.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Earning Ratio */}
                        <div className="bg-[#f5f5f7] p-6 rounded-3xl space-y-3.5 border border-transparent hover:border-gray-200 hover:bg-white hover:ring-2 hover:ring-[#0071e3]/5 transition-all duration-300">
                          <Label htmlFor="loyalty_earn" className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Points Earning Ratio</Label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-black text-gray-400">₹</span>
                            <Input 
                              id="loyalty_earn"
                              type="number"
                              className="h-12 pl-8 bg-white border border-gray-100 rounded-xl focus:border-[#0071e3] transition-all font-bold text-[14px]"
                              value={storeSettings.loyalty_points_earn_ratio}
                              onChange={(e) => setStoreSettings({...storeSettings, loyalty_points_earn_ratio: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium block">Amount spent to earn 1 loyalty point (e.g. 100 spent = 1 pt).</span>
                        </div>

                        {/* Redeem Ratio */}
                        <div className="bg-[#f5f5f7] p-6 rounded-3xl space-y-3.5 border border-transparent hover:border-gray-200 hover:bg-white hover:ring-2 hover:ring-[#0071e3]/5 transition-all duration-300">
                          <Label htmlFor="loyalty_redeem" className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Redeem Points Threshold</Label>
                          <div className="relative">
                            <Input 
                              id="loyalty_redeem"
                              type="number"
                              className="h-12 bg-white border border-gray-100 rounded-xl focus:border-[#0071e3] transition-all font-bold text-[14px]"
                              value={storeSettings.loyalty_points_redeem_ratio}
                              onChange={(e) => setStoreSettings({...storeSettings, loyalty_points_redeem_ratio: parseInt(e.target.value) || 0})}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">pts</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium block">Minimum points balance required to trigger redemption at checkout.</span>
                        </div>

                        {/* Discount Percent */}
                        <div className="bg-[#f5f5f7] p-6 rounded-3xl space-y-3.5 border border-transparent hover:border-gray-200 hover:bg-white hover:ring-2 hover:ring-[#0071e3]/5 transition-all duration-300">
                          <Label htmlFor="loyalty_discount" className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Redemption Discount</Label>
                          <div className="relative">
                            <Input 
                              id="loyalty_discount"
                              type="number"
                              step="0.5"
                              className="h-12 bg-white border border-gray-100 rounded-xl focus:border-[#0071e3] transition-all font-bold text-[14px]"
                              value={storeSettings.loyalty_points_redeem_discount_percent}
                              onChange={(e) => setStoreSettings({...storeSettings, loyalty_points_redeem_discount_percent: parseFloat(e.target.value) || 0})}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-black text-gray-400">%</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium block">Cart total discount percentage applied upon redemption (e.g. 2%).</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-50 flex justify-end">
                    <Button 
                      type="submit"
                      disabled={loading}
                      className="bg-black text-white px-8 h-14 rounded-2xl font-bold shadow-xl shadow-black/10 hover:bg-gray-800 transition-all"
                    >
                      {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                      Save Store Settings
                    </Button>
                  </div>
                </form>

                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4">
                  <div className="p-2 bg-white rounded-lg h-fit shadow-sm">
                    <Bell className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="text-[13px] leading-relaxed text-amber-900">
                    <p className="font-bold mb-1">Testing Note:</p>
                    Use your <span className="font-bold underline">Test Mode Keys</span> first to verify the integration. Once you are ready for real payments, replace them with your <span className="font-bold underline">Live Mode Keys</span>.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsNavItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-bold transition-all ${active ? 'bg-white text-[#0071e3] shadow-sm border border-gray-100' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}
