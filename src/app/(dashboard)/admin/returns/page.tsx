'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useActiveStore } from '@/store/useActiveStore';
import { restockReturnedItem } from '@/app/actions/returns';
import { 
  Undo2, 
  Search, 
  RefreshCw,
  Download,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, parseISO, subDays, startOfDay, endOfDay, subMonths, subYears } from 'date-fns';
import Papa from 'papaparse';

export default function ReturnsPage() {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const isAdmin = profile?.role === 'admin';
  const storeToUse = activeStoreId || profile?.store_id;

  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Restock dialog state
  const [restockItem, setRestockItem] = useState<any | null>(null);
  const [restockQty, setRestockQty] = useState<number>(1);
  const [isRestocking, setIsRestocking] = useState(false);

  useEffect(() => {
    if (storeToUse) {
      fetchReturns();
    }
  }, [profile, activeStoreId, storeToUse]);

  const fetchReturns = async () => {
    if (!storeToUse) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        product_id,
        quantity,
        unit_price,
        refunded_quantity,
        restocked_quantity,
        created_at,
        serial_number,
        orders (
          id,
          created_at,
          payment_status
        ),
        products (
          name,
          sku
        ),
        product_variants (
          model_name,
          sku
        )
      `)
      .eq('store_id', storeToUse)
      .gt('refunded_quantity', 0)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching returns:', error);
      toast.error('Failed to load returned items');
    } else {
      setReturns(data || []);
    }
    setLoading(false);
  };

  const handleRestockSubmit = async () => {
    if (!restockItem) return;
    if (restockQty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    const available = restockItem.refunded_quantity - (restockItem.restocked_quantity || 0);
    if (restockQty > available) {
      toast.error(`Cannot restock more than ${available}`);
      return;
    }

    setIsRestocking(true);
    const res = await restockReturnedItem(restockItem.id, restockQty);
    setIsRestocking(false);

    if (res.success) {
      toast.success('Items successfully restocked to inventory');
      setRestockItem(null);
      fetchReturns();
    } else {
      toast.error(res.error || 'Failed to restock item');
    }
  };

  const downloadCSV = (period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all') => {
    const now = new Date();
    let startDate: Date | null = null;

    if (period === 'daily') startDate = startOfDay(now);
    if (period === 'weekly') startDate = subDays(now, 7);
    if (period === 'monthly') startDate = subMonths(now, 1);
    if (period === 'yearly') startDate = subYears(now, 1);

    const filtered = returns.filter(item => {
      if (!startDate) return true;
      const d = parseISO(item.created_at);
      return d >= startDate && d <= endOfDay(now);
    });

    if (filtered.length === 0) {
      toast.info('No returned items found for this period');
      return;
    }

    const exportData = filtered.map(item => ({
      'Date': format(parseISO(item.created_at), 'yyyy-MM-dd HH:mm'),
      'Order ID': item.order_id,
      'Product Name': item.products?.name,
      'Variant/Model': item.product_variants?.model_name || 'N/A',
      'SKU': item.product_variants?.sku || item.products?.sku || 'N/A',
      'Unit Price': item.unit_price,
      'Total Returned Qty': item.refunded_quantity,
      'Already Restocked': item.restocked_quantity || 0,
      'Pending Restock': item.refunded_quantity - (item.restocked_quantity || 0),
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `returns_report_${period}_${format(now, 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredReturns = returns.filter(item => {
    const term = search.toLowerCase();
    const productName = item.products?.name?.toLowerCase() || '';
    const orderId = item.order_id?.toLowerCase() || '';
    return productName.includes(term) || orderId.includes(term);
  });

  const totalReturned = returns.reduce((sum, item) => sum + item.refunded_quantity, 0);
  const totalRestocked = returns.reduce((sum, item) => sum + (item.restocked_quantity || 0), 0);
  const pendingRestock = totalReturned - totalRestocked;

  if (!isAdmin) {
    return <div className="p-8 text-center text-gray-500">Access Denied. Admins only.</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black flex items-center gap-2">
            Returned Items <AlertCircle className="h-6 w-6 text-rose-500" />
          </h1>
          <p className="text-[#86868b] font-medium mt-1">Manage refunds, exchanges, and restock inventory.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => fetchReturns()} variant="outline" className="rounded-2xl h-11 font-bold">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <div className="flex gap-2">
            <Button onClick={() => downloadCSV('daily')} variant="secondary" className="rounded-xl font-bold">Daily</Button>
            <Button onClick={() => downloadCSV('weekly')} variant="secondary" className="rounded-xl font-bold">Weekly</Button>
            <Button onClick={() => downloadCSV('monthly')} variant="secondary" className="rounded-xl font-bold">Monthly</Button>
            <Button onClick={() => downloadCSV('yearly')} variant="secondary" className="rounded-xl font-bold">Yearly</Button>
            <Button onClick={() => downloadCSV('all')} className="bg-black hover:bg-gray-800 text-white rounded-xl font-bold">
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Returned Products</p>
          <p className="text-4xl font-black mt-2 text-black">{totalReturned}</p>
        </div>
        <div className="bg-rose-50 rounded-[2rem] p-6 border border-rose-100 shadow-sm">
          <p className="text-sm font-medium text-rose-600 uppercase tracking-wider">Pending Restock</p>
          <p className="text-4xl font-black mt-2 text-rose-700">{pendingRestock}</p>
        </div>
        <div className="bg-emerald-50 rounded-[2rem] p-6 border border-emerald-100 shadow-sm">
          <p className="text-sm font-medium text-emerald-600 uppercase tracking-wider">Already Restocked</p>
          <p className="text-4xl font-black mt-2 text-emerald-700">{totalRestocked}</p>
        </div>
      </div>

      <div className="relative max-w-md group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
        <Input
          placeholder="Search by product name or order ID..."
          className="pl-12 h-12 bg-white border-gray-100 rounded-2xl shadow-sm font-medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-50">
              <TableHead className="font-bold text-black pl-8">Date</TableHead>
              <TableHead className="font-bold text-black">Order ID</TableHead>
              <TableHead className="font-bold text-black">Product</TableHead>
              <TableHead className="font-bold text-black text-center">Returned Qty</TableHead>
              <TableHead className="font-bold text-black text-center">Restocked</TableHead>
              <TableHead className="font-bold text-black text-center">Pending</TableHead>
              <TableHead className="font-bold text-black text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-gray-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading returns...
                </TableCell>
              </TableRow>
            ) : filteredReturns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <p className="text-gray-400 font-medium">No returned items found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredReturns.map((item) => {
                const pending = item.refunded_quantity - (item.restocked_quantity || 0);
                return (
                  <TableRow key={item.id} className="border-gray-50 hover:bg-gray-50/50">
                    <TableCell className="pl-8 text-[13px] font-medium">
                      {format(parseISO(item.created_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-gray-500">
                      {item.order_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-black">{item.products?.name}</p>
                      {item.product_variants?.model_name && (
                        <p className="text-[12px] text-gray-500">Model: {item.product_variants.model_name}</p>
                      )}
                      {item.serial_number && (
                        <p className="text-[12px] text-gray-500">S/N: {item.serial_number}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-bold">{item.refunded_quantity}</TableCell>
                    <TableCell className="text-center font-bold text-emerald-600">{item.restocked_quantity || 0}</TableCell>
                    <TableCell className="text-center font-bold text-rose-600">{pending}</TableCell>
                    <TableCell className="text-center">
                      {pending > 0 ? (
                        <Button 
                          onClick={() => {
                            setRestockItem(item);
                            setRestockQty(pending);
                          }}
                          size="sm"
                          className="bg-black hover:bg-gray-800 text-white rounded-xl"
                        >
                          Restock
                        </Button>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100">Done</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!restockItem} onOpenChange={(o) => !o && setRestockItem(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Restock Item</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium">
              How many units of <span className="font-bold text-black">{restockItem?.products?.name}</span> do you want to add back to inventory?
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
              Quantity to Restock (Max: {restockItem ? restockItem.refunded_quantity - (restockItem.restocked_quantity || 0) : 0})
            </label>
            <Input 
              type="number" 
              min={1} 
              max={restockItem ? restockItem.refunded_quantity - (restockItem.restocked_quantity || 0) : 0}
              value={restockQty} 
              onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
              className="h-14 bg-gray-50 border-0 rounded-2xl text-xl font-bold px-4"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockItem(null)} className="h-12 rounded-xl font-bold">
              Cancel
            </Button>
            <Button 
              onClick={handleRestockSubmit} 
              disabled={isRestocking}
              className="h-12 rounded-xl font-bold bg-[#0071e3] hover:bg-[#0077ED] text-white"
            >
              {isRestocking ? 'Restocking...' : 'Confirm Restock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
