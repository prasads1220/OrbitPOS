'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardList, 
  Search, 
  ArrowRight,
  Download,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Banknote,
  Clock,
  Printer,
  ChevronRight,
  Filter,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { format, parseISO, isToday, startOfDay, endOfDay, isValid } from 'date-fns';
import { downloadCSV } from '@/lib/export';
import { useAuthStore } from '@/store/useAuthStore';
import { voidOrder } from '@/app/actions/orders';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function OrdersPage() {
  const { profile } = useAuthStore();
  
  // Date Filter State
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    if (profile?.store_id) {
      fetchOrders();
    }
  }, [profile, startDate, endDate]);

  const fetchOrders = async () => {
    if (!profile?.store_id) return;
    
    // Validate Dates
    const s = parseLocalDate(startDate);
    const e = parseLocalDate(endDate);
    if (!isValid(s) || !isValid(e)) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          tax_amount,
          discount_amount,
          payment_status,
          payment_method,
          created_at,
          refunded_amount,
          cashier:profiles!cashier_id ( full_name ),
          order_items (
            id,
            quantity,
            refunded_quantity,
            total_price,
            unit_price,
            products ( name, price, sku )
          )
        `)
        .eq('store_id', profile.store_id)
        .gte('created_at', startOfDay(s).toISOString())
        .lte('created_at', endOfDay(e).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      setCurrentPage(1); // Reset to page 1 on filter change
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    (o.cashier?.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Group Paginated Orders by Day
  const groupedOrders = paginatedOrders.reduce((acc: any, order) => {
    const dateKey = format(parseISO(order.created_at), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(order);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a));

  const exportOrders = () => {
    const data = filteredOrders.map(o => ({
      'Order ID': o.id,
      'Date': format(parseISO(o.created_at), 'yyyy-MM-dd HH:mm'),
      'Cashier': o.cashier?.full_name || 'System',
      'Total Amount': o.total_amount.toFixed(2)
    }));
    downloadCSV(data, 'orders_export.csv');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header & Date Selection */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-black">Order Explorer</h1>
            <p className="text-gray-400 font-bold mt-1">Select a range to analyze history.</p>
          </div>
          <div className="flex items-center gap-3">
             <Button onClick={exportOrders} variant="outline" className="rounded-2xl h-11 px-6 font-bold">
                <Download className="mr-2 h-4 w-4" />
                CSV
             </Button>
             <Button onClick={fetchOrders} className="rounded-2xl h-11 px-8 bg-black hover:bg-gray-800 text-white font-bold">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Update
             </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
           <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3 px-3">
                 <Label className="text-[10px] font-black uppercase text-gray-400">From</Label>
                 <Input type="date" className="h-9 w-40 rounded-lg border-transparent bg-white font-bold text-[13px]" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex items-center gap-3 px-3">
                 <Label className="text-[10px] font-black uppercase text-gray-400">To</Label>
                 <Input type="date" className="h-9 w-40 rounded-lg border-transparent bg-white font-bold text-[13px]" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
           </div>

           <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input 
                placeholder="Quick search by Order ID..." 
                className="pl-12 h-13 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-gray-100 font-bold" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
        </div>
      </div>

      {/* Grouped Results */}
      <div className="space-y-10">
        {loading ? (
          <div className="py-40 text-center"><RefreshCw className="h-12 w-12 animate-spin mx-auto text-gray-200" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-dashed border-gray-200 py-40 text-center">
            <ClipboardList className="h-20 w-20 mx-auto mb-6 text-gray-100" />
            <h3 className="text-xl font-black text-black">No Records Found</h3>
          </div>
        ) : (
          <>
            {sortedDates.map((dateKey) => (
              <div key={dateKey} className="space-y-4">
                <div className="flex items-center gap-4 px-4">
                  <Badge className={cn("px-4 py-1.5 rounded-xl font-black text-[10px]", isToday(parseLocalDate(dateKey)) ? "bg-blue-600" : "bg-gray-100 text-gray-500")}>
                    {format(parseLocalDate(dateKey), 'EEEE').toUpperCase()}
                  </Badge>
                  <h2 className="text-xl font-black text-black">{format(parseLocalDate(dateKey), 'MMMM dd, yyyy')}</h2>
                  <div className="h-px bg-gray-100 flex-1" />
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                        <TableHead className="pl-8 py-5 text-[10px] font-black uppercase text-black">Transaction</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-black">Payment</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-black">Cashier</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-black">Amount</TableHead>
                        <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-black">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedOrders[dateKey].map((order: any) => (
                        <TableRow key={order.id} className="group border-gray-50 hover:bg-gray-50/30 transition-colors">
                          <TableCell className="pl-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                                <ShoppingBag className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-black text-black leading-none uppercase">#{order.id.slice(0, 8)}</p>
                                <p className="text-[11px] text-gray-400 font-bold mt-1.5">{format(parseISO(order.created_at), 'hh:mm a')}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                               {order.payment_method === 'card' ? <CreditCard className="h-3.5 w-3.5 text-indigo-500" /> : <Banknote className="h-3.5 w-3.5 text-emerald-500" />}
                               <span className="font-bold text-[13px] capitalize">{order.payment_method}</span>
                            </div>
                          </TableCell>
                          <TableCell><span className="font-bold text-gray-500 text-[13px]">{order.cashier?.full_name || 'System'}</span></TableCell>
                          <TableCell className="text-right">
                             <div className="flex flex-col items-end">
                                <span className="font-black text-black text-lg">${order.total_amount.toFixed(2)}</span>
                                <Badge className={cn("border-none font-black text-[9px] h-4", order.payment_status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                                   {order.payment_status.toUpperCase()}
                                </Badge>
                             </div>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                             <Button variant="ghost" className="h-10 px-4 rounded-xl font-black text-[12px] text-blue-600 hover:bg-blue-50" onClick={() => setSelectedOrder(order)}>
                               View <ChevronRight className="ml-1 h-4 w-4" />
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-gray-100">
                 <p className="text-[13px] text-gray-400 font-bold uppercase tracking-wider">
                   Records <span className="text-black">{(currentPage - 1) * itemsPerPage + 1} — {Math.min(filteredOrders.length, currentPage * itemsPerPage)}</span> of {filteredOrders.length}
                 </p>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 disabled:opacity-30" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                       <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-1 mx-2">
                       {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                         <Button key={page} variant={currentPage === page ? 'default' : 'ghost'} className={cn("h-10 w-10 rounded-xl font-black text-[13px]", currentPage === page ? "bg-black text-white" : "text-gray-400")} onClick={() => setCurrentPage(page)}>
                            {page}
                         </Button>
                       ))}
                    </div>
                    <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 disabled:opacity-30" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                       <ChevronRight className="h-5 w-5" />
                    </Button>
                 </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <div className="p-8 bg-[#fbfbfd] border-b border-gray-50 text-center">
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-black">Order Receipt</DialogTitle>
            <p className="text-gray-400 font-bold text-[11px] mt-1 uppercase tracking-widest">#{selectedOrder?.id}</p>
          </div>
          <div className="p-8 space-y-6">
             <div className="space-y-4">
                {selectedOrder?.order_items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-black text-[15px]">{item.products?.name}</p>
                      <p className="text-[11px] text-gray-400 font-bold uppercase">{item.quantity} x ${item.unit_price?.toFixed(2)}</p>
                    </div>
                    <span className="font-black text-black">${item.total_price.toFixed(2)}</span>
                  </div>
                ))}
             </div>
             <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                <span className="text-lg font-black uppercase text-gray-400 tracking-widest">Total Paid</span>
                <span className="text-3xl font-black text-black">${selectedOrder?.total_amount.toFixed(2)}</span>
             </div>
             <Button className="w-full h-14 rounded-2xl bg-black text-white font-black" onClick={() => setSelectedOrder(null)}>Close Receipt</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
