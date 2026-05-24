'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useActiveStore } from '@/store/useActiveStore';
import { 
  TrendingUp, 
  Users, 
  Package, 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownRight,
  CalendarDays,
  ShoppingBag,
  RefreshCw,
  Download,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { 
  format, 
  startOfDay, 
  endOfDay,
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear 
} from 'date-fns';

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todaySales: 0,
    totalLoss: 0,
    totalProfiles: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [vendorData, setVendorData] = useState<any[]>([]);

  useEffect(() => {
    const storeToUse = activeStoreId || profile?.store_id;
    if (storeToUse) {
      fetchDashboardData(selectedDate, timeRange, storeToUse);
    }
  }, [selectedDate, timeRange, profile, activeStoreId]);

  const fetchDashboardData = async (dateStr: string, range: string, storeId: string) => {
    if (!storeId) return;
    setLoading(true);
    try {
      const targetDate = new Date(dateStr + 'T00:00:00');
      let startDate: string;
      let endDate: string;

      if (range === 'daily') {
        startDate = startOfDay(targetDate).toISOString();
        endDate = endOfDay(targetDate).toISOString();
      } else if (range === 'weekly') {
        startDate = startOfWeek(targetDate).toISOString();
        endDate = endOfWeek(targetDate).toISOString();
      } else if (range === 'monthly') {
        startDate = startOfMonth(targetDate).toISOString();
        endDate = endOfMonth(targetDate).toISOString();
      } else {
        startDate = startOfYear(targetDate).toISOString();
        endDate = endOfYear(targetDate).toISOString();
      }

      // 1. Stats based on range - FILTERED BY SELECTED STORE ID
      const { data: rangeData } = await supabase
        .from('orders')
        .select('total_amount, refunded_amount')
        .eq('store_id', storeId)
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .neq('payment_status', 'voided');

      const totalRevenue = rangeData?.reduce((sum, o) => sum + (o.total_amount || 0) - (o.refunded_amount || 0), 0) || 0;
      const totalLoss = rangeData?.reduce((sum, o) => sum + (o.refunded_amount || 0), 0) || 0;
      const orderCount = rangeData?.length || 0;

      // 2. All time staff count - FILTERED BY SELECTED STORE ID
      const { count: totalProfiles } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId);

      setStats({
        totalRevenue,
        todaySales: orderCount,
        totalLoss,
        totalProfiles: totalProfiles || 0,
      });

      // 3. Dynamic Chart Data - FILTERED BY SELECTED STORE ID
      const chartPoints = [];
      if (range === 'daily' || range === 'weekly') {
        // Show last 7 days
        for (let i = 6; i >= 0; i--) {
          const day = subDays(targetDate, i);
          const dStart = startOfDay(day).toISOString();
          const dEnd = endOfDay(day).toISOString();

          const { data: dOrders } = await supabase
            .from('orders')
            .select('total_amount, refunded_amount')
            .eq('store_id', storeId)
            .gte('created_at', dStart)
            .lt('created_at', dEnd)
            .neq('payment_status', 'voided');

          const dRev = dOrders?.reduce((sum, o) => sum + (o.total_amount || 0) - (o.refunded_amount || 0), 0) || 0;
          chartPoints.push({
            name: format(day, 'EEE'),
            revenue: parseFloat(dRev.toFixed(2)),
          });
        }
      } else if (range === 'monthly') {
        // Show 4 weeks of the month
        for (let i = 0; i < 4; i++) {
          const wStart = subDays(endOfMonth(targetDate), (3 - i) * 7 + 6);
          const wEnd = subDays(endOfMonth(targetDate), (3 - i) * 7);
          
          const { data: wOrders } = await supabase
            .from('orders')
            .select('total_amount, refunded_amount')
            .eq('store_id', storeId)
            .gte('created_at', startOfDay(wStart).toISOString())
            .lt('created_at', endOfDay(wEnd).toISOString())
            .neq('payment_status', 'voided');

          const wRev = wOrders?.reduce((sum, o) => sum + (o.total_amount || 0) - (o.refunded_amount || 0), 0) || 0;
          chartPoints.push({
            name: `Week ${i + 1}`,
            revenue: parseFloat(wRev.toFixed(2)),
          });
        }
      } else {
        // Yearly: Show 12 months
        for (let i = 0; i < 12; i++) {
          const mDate = new Date(targetDate.getFullYear(), i, 1);
          const mStart = startOfMonth(mDate).toISOString();
          const mEnd = endOfMonth(mDate).toISOString();

          const { data: mOrders } = await supabase
            .from('orders')
            .select('total_amount, refunded_amount')
            .eq('store_id', storeId)
            .gte('created_at', mStart)
            .lt('created_at', mEnd)
            .neq('payment_status', 'voided');

          const mRev = mOrders?.reduce((sum, o) => sum + (o.total_amount || 0) - (o.refunded_amount || 0), 0) || 0;
          chartPoints.push({
            name: format(mDate, 'MMM'),
            revenue: parseFloat(mRev.toFixed(2)),
          });
        }
      }
      setChartData(chartPoints);

      // 4. Recent orders - FILTERED BY SELECTED STORE ID
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, refunded_amount, payment_method, payment_status, created_at')
        .eq('store_id', storeId)
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentOrders(orders || []);

      // 5. Vendor & Product Performance Data - Grouped by both Vendor & Item Name!
      const { data: vItems } = await supabase
        .from('order_items')
        .select(`
          quantity,
          product_id,
          products!inner (
            vendor_name,
            name,
            store_id,
            price
          )
        `)
        .eq('products.store_id', storeId)
        .gte('created_at', startDate)
        .lt('created_at', endDate);

      const vendorMap: Record<string, { name: string; value: number; revenue: number }> = {};
      vItems?.forEach((item: any) => {
        const vName = item.products?.vendor_name || 'Generic';
        const pName = item.products?.name || 'Unnamed Product';
        const price = item.products?.price || 0;
        
        // Key displays BOTH Vendor Name and Product Name!
        const key = `${vName} - ${pName}`;
        
        if (!vendorMap[key]) {
          vendorMap[key] = {
            name: key,
            value: 0,
            revenue: 0
          };
        }
        vendorMap[key].value += item.quantity;
        vendorMap[key].revenue += item.quantity * price;
      });

      const vData = Object.values(vendorMap)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      
      setVendorData(vData);

    } catch (err) {
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();

  // Access rules:
  // Non-admins switching to other stores should only see the summary cards and charts, not detailed order transactions.
  const isViewingOtherStore = activeStoreId && activeStoreId !== profile?.store_id;
  const isEmployee = profile?.role !== 'admin' && profile?.role !== 'superadmin';
  const showRestrictedView = isEmployee && isViewingOtherStore;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black" style={{fontFamily: 'var(--font-outfit)'}}>
            Good {today.getHours() < 12 ? 'morning' : today.getHours() < 18 ? 'afternoon' : 'evening'}, {profile?.full_name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-[#86868b] font-medium mt-1">Here is what&apos;s happening with your store today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white border border-gray-100 p-1 rounded-2xl shadow-sm">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-4 py-2 rounded-xl text-[12px] font-bold capitalize transition-all ${
                  timeRange === r 
                    ? 'bg-black text-white shadow-lg' 
                    : 'text-gray-400 hover:text-black hover:bg-gray-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-[#0071e3] transition-colors">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <input 
              type="date" 
              className="text-[13px] font-semibold text-gray-600 bg-transparent outline-none cursor-pointer"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          <button 
            onClick={() => fetchDashboardData(selectedDate, timeRange, activeStoreId || profile?.store_id || '')} 
            className="p-2 bg-white border border-gray-100 rounded-xl shadow-sm hover:bg-gray-50 transition-all text-gray-400 hover:text-black"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Revenue" 
          value={loading ? '...' : `₹${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`Total for ${timeRange} period`}
          icon={IndianRupee}
          color="blue"
        />
        <StatsCard 
          title="Orders Count" 
          value={loading ? '...' : stats.todaySales.toString()}
          subtitle={`Total in selected ${timeRange}`}
          icon={ShoppingBag}
          color="indigo"
        />
        <StatsCard 
          title="Total Refund Loss" 
          value={loading ? '...' : `₹${stats.totalLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Customer refund value"
          icon={ArrowDownRight}
          color="rose"
        />
        <StatsCard 
          title="Active Staff" 
          value={loading ? '...' : stats.totalProfiles.toString()}
          subtitle="Registered profiles in store"
          icon={Users}
          color="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Main Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-black" style={{fontFamily: 'var(--font-outfit)'}}>Revenue Trends</h3>
              <p className="text-[13px] text-gray-400 font-medium">Visualizing sales performance data</p>
            </div>
          </div>
          <div className="h-[300px] w-full min-h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-300" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <TrendingUp className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No sales recorded</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0071e3" stopOpacity={0.35}/>
                      <stop offset="100%" stopColor="#0071e3" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00c6ff" />
                      <stop offset="100%" stopColor="#0072ff" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e5ea" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#86868b', fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#86868b', fontSize: 12, fontWeight: 600}} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip 
                    contentStyle={{
                      borderRadius: '24px', 
                      border: 'none', 
                      boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(20px)',
                      padding: '16px'
                    }}
                    formatter={(value: any) => [`₹${value}`, 'Revenue']}
                    cursor={{stroke: '#0072ff', strokeWidth: 1.5}}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="url(#lineGrad)" strokeWidth={4} activeDot={{ r: 7, strokeWidth: 0, fill: '#0072ff' }} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Orders / Restricted View block */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-xl font-bold text-black mb-6" style={{fontFamily: 'var(--font-outfit)'}}>Recent Orders</h3>
          
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-300">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : showRestrictedView ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 py-8">
              <Lock className="h-12 w-12 mb-3 text-amber-500 opacity-80" />
              <p className="font-bold text-gray-700">Overview Restricted</p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-[200px] leading-relaxed">
                Detailed order transactions are hidden for external store profiles.
              </p>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-300 py-8">
              <ShoppingBag className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium text-gray-400">No orders yet</p>
              <p className="text-[13px] mt-1">Head to POS to complete your first sale.</p>
            </div>
          ) : (
            <div className="space-y-5 flex-1">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-black group-hover:text-[#0071e3] transition-colors">
                        #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-[11px] font-medium text-gray-400 capitalize">
                        {order.payment_method} • {format(new Date(order.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[14px] font-bold ${order.payment_status === 'voided' ? 'text-gray-400 line-through' : 'text-emerald-500'}`}>
                    {order.payment_status === 'voided' ? '' : '+'}${ (order.total_amount - (order.refunded_amount || 0)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products Leaderboard */}
        <div className="lg:col-span-3 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm mt-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-black" style={{fontFamily: 'var(--font-outfit)'}}>Product Performance</h3>
              <p className="text-[13px] text-gray-400 font-medium">Top-selling products ranked by units sold</p>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl font-bold h-9 border-gray-100 shadow-sm"
                onClick={() => {
                  const csvRows = vendorData.map(v => {
                    const parts = v.name.split(' - ');
                    const vendor = parts[0] || 'Generic';
                    const product = parts[1] || 'Unnamed';
                    return `"${vendor}","${product}",${v.value},${v.revenue.toFixed(2)}`;
                  });
                  const blob = new Blob([`Vendor,Product Name,Units Sold,Total Revenue (₹)\n${csvRows.join('\n')}`], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `vendor_product_sales_${timeRange}.csv`;
                  a.click();
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className="py-20 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-300" />
              </div>
            ) : vendorData.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-300">
                <Package className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium text-gray-400">No data available for this period</p>
              </div>
            ) : (
              vendorData.map((item, index) => {
                const maxVal = vendorData[0]?.value || 1;
                const percentage = Math.round((item.value / maxVal) * 100);
                const parts = item.name.split(' - ');
                const vendorName = parts[0] || 'Generic';
                const productName = parts[1] || item.name;
                
                const rankStyles = [
                  { bg: 'bg-gradient-to-r from-amber-400 to-yellow-300', text: 'text-amber-900', medal: '🥇', barGrad: 'from-amber-400 via-yellow-400 to-orange-400' },
                  { bg: 'bg-gradient-to-r from-gray-300 to-slate-200', text: 'text-gray-700', medal: '🥈', barGrad: 'from-slate-400 via-gray-400 to-zinc-400' },
                  { bg: 'bg-gradient-to-r from-orange-400 to-amber-600', text: 'text-orange-900', medal: '🥉', barGrad: 'from-orange-400 via-rose-400 to-pink-500' },
                  { bg: 'bg-gray-100', text: 'text-gray-500', medal: '', barGrad: 'from-violet-500 via-purple-500 to-indigo-500' },
                  { bg: 'bg-gray-100', text: 'text-gray-500', medal: '', barGrad: 'from-cyan-500 via-teal-400 to-emerald-500' },
                ];
                const style = rankStyles[index] || rankStyles[4];

                return (
                  <div 
                    key={index} 
                    className="group relative flex items-center gap-5 p-5 rounded-[1.5rem] border border-gray-50 hover:border-gray-100 bg-[#fbfbfd] hover:bg-white transition-all duration-300 hover:shadow-lg hover:shadow-black/[0.03] cursor-default"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    {/* Rank */}
                    <div className={`w-12 h-12 rounded-2xl ${style.bg} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                      {style.medal ? (
                        <span className="text-xl leading-none">{style.medal}</span>
                      ) : (
                        <span className={`text-lg font-black ${style.text}`}>#{index + 1}</span>
                      )}
                    </div>

                    {/* Product Details + Progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0 flex-1 mr-4">
                          <p className="font-black text-black text-[15px] truncate group-hover:text-[#0071e3] transition-colors">{productName}</p>
                          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">{vendorName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-black text-lg tabular-nums">{item.value} <span className="text-[11px] text-gray-400 font-bold">units</span></p>
                          <p className="text-[12px] text-emerald-500 font-bold">₹{item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      {/* Animated Progress Bar */}
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${style.barGrad} transition-all duration-1000 ease-out group-hover:shadow-lg`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subtitle, icon: Icon, color }: any) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorClasses[color]} transition-transform group-hover:scale-110`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div>
        <p className="text-[13px] font-medium text-gray-400 mb-1">{title}</p>
        <h2 className="text-3xl font-bold text-black tracking-tight">{value}</h2>
        <p className="text-[12px] text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
