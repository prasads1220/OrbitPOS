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
  ShieldAlert,
  Undo2,
  RotateCcw,
  MessageSquare
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { downloadCSV } from '@/lib/export';

import { useAuthStore } from '@/store/useAuthStore';
import { voidOrder, refundOrder } from '@/app/actions/orders';
import { toast } from 'sonner';

export default function OrdersPage() {
  const { profile } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (profile?.store_id) {
      fetchOrders();
    }
  }, [profile]);

  const fetchOrders = async () => {
    if (!profile?.store_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          tax_amount,
          payment_method,
          payment_status,
          created_at,
          profiles ( full_name ),
          order_items (
            quantity,
            total_price,
            products ( name, price, sku )
          )
        `)
        .eq('store_id', profile.store_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    (o.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const exportOrders = () => {
    const data = filteredOrders.map(o => ({
      'Order ID': o.id,
      'Date': format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
      'Cashier': o.profiles?.full_name || 'System',
      'Payment Method': o.payment_method,
      'Status': o.payment_status,
      'Items Count': o.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
      'Total Amount': o.total_amount.toFixed(2)
    }));
    downloadCSV(data, 'orders_export.csv');
  };

  const handleVoidOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to VOID this transaction? This will restore stock and mark the order as voided.')) return;
    
    setActionLoading(true);
    const res = await voidOrder(orderId);
    if (res.success) {
      toast.success('Transaction voided successfully');
      setSelectedOrder(null);
      fetchOrders();
    } else {
      toast.error(res.error);
    }
    setActionLoading(false);
  };

  const handleRefundOrder = async () => {
    if (!selectedOrder || !refundReason) return;
    
    setActionLoading(true);
    const res = await refundOrder(selectedOrder.id, refundReason);
    if (res.success) {
      toast.success('Transaction refunded successfully');
      setIsRefundDialogOpen(false);
      setRefundReason('');
      setSelectedOrder(null);
      fetchOrders();
    } else {
      toast.error(res.error);
    }
    setActionLoading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Order History</h1>
          <p className="text-[#86868b] font-medium mt-1">Review all completed transactions and receipts.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchOrders} variant="outline" className="rounded-2xl h-11 border-gray-100 shadow-sm font-bold">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={exportOrders}
            variant="outline" 
            className="rounded-2xl h-11 border-gray-100 shadow-sm font-bold"
          >
            <Download className="mr-2 h-4 w-4 text-gray-400" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
          <Input 
            placeholder="Search by Order ID or Cashier..." 
            className="pl-12 h-12 bg-white border-gray-100 rounded-2xl shadow-sm font-medium" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-50">
              <TableHead className="font-bold text-black pl-8">Order Details</TableHead>
              <TableHead className="font-bold text-black">Cashier</TableHead>
              <TableHead className="font-bold text-black">Payment</TableHead>
              <TableHead className="font-bold text-black text-right">Items</TableHead>
              <TableHead className="font-bold text-black text-right">Total</TableHead>
              <TableHead className="font-bold text-black text-right pr-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-gray-400">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                  <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-100" />
                  <p className="text-gray-400 font-bold">No orders found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const totalItems = order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
                
                return (
                  <TableRow key={order.id} className="border-gray-50 hover:bg-gray-50/50 group">
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] flex items-center justify-center border border-gray-50">
                          <ShoppingBag className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-bold text-black">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-[12px] text-gray-400 font-medium">{format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-600">{order.profiles?.full_name || 'System'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          {order.payment_method === 'card' ? (
                            <CreditCard className="h-4 w-4 text-indigo-500" />
                          ) : (
                            <Banknote className="h-4 w-4 text-emerald-500" />
                          )}
                          <span className="font-bold text-[13px] capitalize">{order.payment_method}</span>
                        </div>
                        {order.payment_status === 'completed' ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold w-fit text-[10px]">Paid</Badge>
                        ) : order.payment_status === 'voided' ? (
                          <Badge className="bg-gray-100 text-gray-500 border-gray-200 font-bold w-fit text-[10px]">Voided</Badge>
                        ) : (
                          <Badge className="bg-rose-50 text-rose-600 border-rose-100 font-bold w-fit text-[10px] capitalize">{order.payment_status}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-gray-500">
                      {totalItems} items
                    </TableCell>
                    <TableCell className="text-right font-black text-black text-lg">
                      ${order.total_amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button 
                        variant="ghost" 
                        className="text-[#0071e3] font-bold text-[13px] hover:bg-blue-50 rounded-xl"
                        onClick={() => setSelectedOrder(order)}
                      >
                        View Receipt
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <div className="p-8 bg-[#fbfbfd] border-b border-gray-50 text-center">
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-black/10 mb-4">
              <span className="font-bold text-2xl">O</span>
            </div>
            <DialogTitle className="text-2xl font-black text-black tracking-tight">OrbitPOS Receipt</DialogTitle>
            <p className="text-gray-400 font-medium text-[13px] mt-1">{selectedOrder && format(new Date(selectedOrder.created_at), 'MMMM d, yyyy h:mm a')}</p>
            <p className="text-gray-400 font-medium text-[11px] mt-1 uppercase tracking-widest">Order #{selectedOrder?.id.slice(0, 8)}</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
              {selectedOrder?.order_items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-black text-[14px]">{item.products?.name}</p>
                    <p className="text-gray-400 text-[12px] font-medium">{item.quantity} x ${(item.total_price / item.quantity).toFixed(2)}</p>
                  </div>
                  <p className="font-bold text-black">${item.total_price.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-100 border-dashed space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Subtotal</span>
                <span className="font-bold text-gray-700">${((selectedOrder?.total_amount || 0) - (selectedOrder?.tax_amount || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Tax</span>
                <span className="font-bold text-gray-700">${(selectedOrder?.tax_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-black font-black text-lg">Total</span>
                <span className="text-emerald-600 font-black text-2xl">${selectedOrder?.total_amount?.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-center gap-2">
              <span className="text-gray-500 font-medium text-[13px]">Paid with</span>
              <span className="font-bold text-black uppercase tracking-wider text-[13px]">{selectedOrder?.payment_method}</span>
            </div>

            {selectedOrder?.payment_status === 'refunded' && (
              <div className="bg-rose-50 rounded-2xl p-4 space-y-1 border border-rose-100">
                <div className="flex items-center gap-2 text-rose-600">
                  <RotateCcw className="h-4 w-4" />
                  <span className="font-bold text-[13px]">Refunded Transaction</span>
                </div>
                <p className="text-rose-500 text-[12px] font-medium leading-relaxed italic">
                  "{selectedOrder?.refund_reason}"
                </p>
              </div>
            )}

            {selectedOrder?.payment_status === 'voided' && (
              <div className="bg-gray-100 rounded-2xl p-4 flex items-center justify-center gap-2 border border-gray-200">
                <ShieldAlert className="h-4 w-4 text-gray-400" />
                <span className="font-bold text-gray-500 text-[13px]">This transaction was voided</span>
              </div>
            )}

            {selectedOrder?.payment_status === 'completed' && (
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button 
                  variant="outline" 
                  disabled={actionLoading}
                  className="rounded-2xl h-12 border-gray-100 text-gray-500 font-bold hover:bg-gray-50 hover:text-black transition-all"
                  onClick={() => handleVoidOrder(selectedOrder.id)}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  Void Order
                </Button>
                <Button 
                  disabled={actionLoading}
                  className="rounded-2xl h-12 bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold transition-all"
                  onClick={() => setIsRefundDialogOpen(true)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Refund Items
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Reason Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <div className="p-8 bg-[#fbfbfd] border-b border-gray-50">
            <DialogHeader>
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mb-4">
                <RotateCcw className="text-rose-600 h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl font-black text-black">Refund Transaction</DialogTitle>
              <p className="text-gray-400 font-medium text-[13px] mt-1">Please provide a reason for the return.</p>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Reason for Refund</label>
              <Input 
                placeholder="e.g. Defective item, Customer changed mind"
                className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 rounded-2xl h-14 font-bold text-gray-400" onClick={() => setIsRefundDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                disabled={!refundReason || actionLoading}
                className="flex-[2] h-14 bg-black hover:bg-gray-800 text-white rounded-2xl font-bold shadow-xl shadow-black/10"
                onClick={handleRefundOrder}
              >
                {actionLoading ? <RefreshCw className="animate-spin h-5 w-5" /> : 'Confirm Refund'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
