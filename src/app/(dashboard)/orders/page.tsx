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
import { jsPDF } from 'jspdf';

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
  const [refundItems, setRefundItems] = useState<Record<string, number>>({});
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
            id,
            quantity,
            refunded_quantity,
            total_price,
            unit_price,
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
    
    const itemsToRefund = Object.entries(refundItems)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({ id, quantity: qty }));

    if (itemsToRefund.length === 0) {
      toast.error('Please select at least one item to refund');
      return;
    }
    
    setActionLoading(true);
    const res = await refundOrder(selectedOrder.id, itemsToRefund, refundReason);
    if (res.success) {
      toast.success('Refund processed successfully');
      setIsRefundDialogOpen(false);
      setRefundReason('');
      setRefundItems({});
      setSelectedOrder(null);
      fetchOrders();
    } else {
      toast.error(res.error);
    }
    setActionLoading(false);
  };

  const calculateRefundTotal = () => {
    if (!selectedOrder) return 0;
    
    // Calculate subtotal for items being refunded
    const refundSubtotal = Object.entries(refundItems).reduce((sum, [id, qty]) => {
      const item = selectedOrder.order_items.find((oi: any) => oi.id === id);
      return sum + (item?.unit_price || 0) * qty;
    }, 0);

    // Calculate tax rate from the original order
    const originalSubtotal = selectedOrder.total_amount - (selectedOrder.tax_amount || 0);
    const taxRate = originalSubtotal > 0 ? (selectedOrder.tax_amount || 0) / originalSubtotal : 0;
    
    // Total = Subtotal + Tax on that subtotal
    return refundSubtotal * (1 + taxRate);
  };

  const downloadOrderReceipt = (order: any) => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('ORBITPOS', 105, 30, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('MODERN RETAIL EXPERIENCE', 105, 38, { align: 'center' });
    doc.text('----------------------------------------------------', 105, 45, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(`Order ID: #${order.id.slice(0, 8)}`, 20, 60);
    doc.text(`Date: ${format(new Date(order.created_at), 'yyyy-MM-dd HH:mm')}`, 20, 68);
    doc.text(`Payment: ${order.payment_method.toUpperCase()}`, 20, 76);
    doc.text(`Status: ${order.payment_status.toUpperCase()}`, 20, 84);
    
    let y = 100;
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM', 20, y);
    doc.text('QTY', 120, y);
    doc.text('PRICE', 150, y);
    doc.text('TOTAL', 180, y, { align: 'right' });
    
    doc.line(20, y + 2, 190, y + 2);
    y += 12;
    
    doc.setFont('helvetica', 'normal');
    order.order_items.forEach((item: any) => {
      doc.text(item.products?.name.substring(0, 30) || 'Product', 20, y);
      doc.text(item.quantity.toString(), 122, y);
      doc.text(`$${(item.unit_price || 0).toFixed(2)}`, 150, y);
      doc.text(`$${item.total_price.toFixed(2)}`, 190, y, { align: 'right' });
      
      if (item.refunded_quantity > 0) {
        y += 6;
        doc.setFontSize(9);
        doc.setTextColor(220, 38, 38);
        doc.text(`(Refunded: ${item.refunded_quantity})`, 25, y);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
      }
      y += 10;
    });

    y += 5;
    doc.line(130, y, 190, y);
    y += 10;

    // Calculate remaining totals accurately from items
    let remainingSubtotal = 0;
    order.order_items.forEach((item: any) => {
      const remainingQty = item.quantity - (item.refunded_quantity || 0);
      remainingSubtotal += (item.unit_price || 0) * remainingQty;
    });

    const originalSubtotal = order.total_amount - (order.tax_amount || 0);
    const taxRate = originalSubtotal > 0 ? (order.tax_amount || 0) / originalSubtotal : 0.08;
    const remainingTax = remainingSubtotal * taxRate;
    const remainingTotal = remainingSubtotal + remainingTax;

    doc.text('Remaining Subtotal:', 130, y);
    doc.text(`$${remainingSubtotal.toFixed(2)}`, 190, y, { align: 'right' });
    y += 7;
    doc.text(`Tax (${(taxRate * 100).toFixed(1)}%):`, 130, y);
    doc.text(`$${remainingTax.toFixed(2)}`, 190, y, { align: 'right' });
    
    if (order.refunded_amount > 0) {
      y += 7;
      doc.setTextColor(220, 38, 38);
      doc.text('Total Refunded:', 130, y);
      doc.text(`-$${order.refunded_amount.toFixed(2)}`, 190, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    }

    y += 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('NEW TOTAL:', 130, y);
    doc.text(`$${remainingTotal.toFixed(2)}`, 190, y, { align: 'right' });



    if (order.refund_reason) {
      y += 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(`Refund Reason: ${order.refund_reason}`, 20, y);
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for shopping with OrbitPOS!', 105, y + 30, { align: 'center' });
    
    doc.save(`orbitpos-receipt-${order.id.slice(0, 8)}.pdf`);
    toast.success('Invoice generated successfully');
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
                      {order.refunded_amount > 0 && (
                        <p className="text-[10px] text-rose-500 font-bold -mb-1">-${order.refunded_amount.toFixed(2)}</p>
                      )}
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

          <div className="p-8 space-y-8">
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Description</span>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Amount</span>
              </div>
              {selectedOrder?.order_items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start group/item">
                  <div className="space-y-1">
                    <p className="font-bold text-black text-[15px] leading-none">{item.products?.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-400 text-[12px] font-medium">{item.quantity} x ${(item.unit_price || item.total_price / item.quantity).toFixed(2)}</p>
                      {item.refunded_quantity > 0 && (
                        <Badge className="bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-50 px-1.5 py-0 text-[9px] font-bold">
                          {item.refunded_quantity} Returned
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-black text-[15px]">${item.total_price.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-100 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Remaining Subtotal</span>
                <span className="font-bold text-gray-900">
                  ${(selectedOrder?.order_items?.reduce((sum: number, item: any) => sum + (item.unit_price || 0) * (item.quantity - (item.refunded_quantity || 0)), 0) || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Tax</span>
                <span className="font-bold text-gray-900">
                  ${(selectedOrder?.tax_amount ? (
                    (selectedOrder?.order_items?.reduce((sum: number, item: any) => sum + (item.unit_price || 0) * (item.quantity - (item.refunded_quantity || 0)), 0) || 0) * 
                    (selectedOrder.tax_amount / (selectedOrder.total_amount - selectedOrder.tax_amount || 1))
                  ) : 0).toFixed(2)}
                </span>
              </div>
              
              {selectedOrder?.refunded_amount > 0 && (
                <div className="flex justify-between items-center text-sm py-2 px-3 bg-rose-50 rounded-xl text-rose-600">
                  <span className="font-bold">Total Refunded</span>
                  <span className="font-black">-${selectedOrder?.refunded_amount?.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">New Total</p>
                  <p className="text-3xl font-black text-black tracking-tighter">
                    ${(
                      (selectedOrder?.order_items?.reduce((sum: number, item: any) => sum + (item.unit_price || 0) * (item.quantity - (item.refunded_quantity || 0)), 0) || 0) * 
                      (1 + (selectedOrder?.tax_amount || 0) / ((selectedOrder?.total_amount || 0) - (selectedOrder?.tax_amount || 0) || 1))
                    ).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Method</p>
                  <p className="font-bold text-black capitalize">{selectedOrder?.payment_method}</p>
                </div>
              </div>
            </div>

            {selectedOrder?.refund_reason && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100/50">
                <div className="flex items-center gap-2 text-amber-700 mb-1">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-bold text-[13px]">Refund Note</span>
                </div>
                <p className="text-amber-600/80 text-[12px] font-medium leading-relaxed italic">
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

            <div className="grid grid-cols-1 gap-3 pt-4">
              <Button 
                variant="outline" 
                className="h-14 rounded-2xl border-gray-100 text-black font-bold shadow-sm hover:bg-gray-50"
                onClick={() => downloadOrderReceipt(selectedOrder)}
              >
                <Download className="mr-2 h-5 w-5 text-gray-400" />
                Download PDF Invoice
              </Button>
              
              {(selectedOrder?.payment_status === 'completed' || selectedOrder?.payment_status === 'partially_refunded') && (
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="ghost" 
                    disabled={actionLoading}
                    className="rounded-2xl h-14 font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => handleVoidOrder(selectedOrder.id)}
                  >
                    <Undo2 className="mr-2 h-4 w-4" />
                    Void Order
                  </Button>
                  <Button 
                    disabled={actionLoading}
                    className="rounded-2xl h-14 bg-black hover:bg-gray-800 text-white font-bold shadow-lg shadow-black/10"
                    onClick={() => {
                      const initial: Record<string, number> = {};
                      selectedOrder.order_items.forEach((oi: any) => initial[oi.id] = 0);
                      setRefundItems(initial);
                      setIsRefundDialogOpen(true);
                    }}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Refund Items
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Items Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent className="max-w-[480px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <div className="p-8 bg-[#fbfbfd] border-b border-gray-50">
            <DialogHeader>
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mb-4">
                <RotateCcw className="text-rose-600 h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl font-black text-black">Refund Items</DialogTitle>
              <p className="text-gray-400 font-medium text-[13px] mt-1">Select the items and quantities to return.</p>
            </DialogHeader>
          </div>
          
          <div className="p-8 space-y-6 bg-white max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {selectedOrder?.order_items?.map((item: any) => {
                const remaining = item.quantity - (item.refunded_quantity || 0);
                if (remaining <= 0) return null;
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-2xl border border-gray-100">
                    <div className="flex-1">
                      <p className="font-bold text-black text-sm">{item.products?.name}</p>
                      <p className="text-[11px] text-gray-400 font-medium">Available: {remaining}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg bg-white"
                        onClick={() => setRefundItems({...refundItems, [item.id]: Math.max(0, (refundItems[item.id] || 0) - 1)})}
                      >
                        -
                      </Button>
                      <span className="font-bold text-lg min-w-[20px] text-center">{refundItems[item.id] || 0}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg bg-white"
                        onClick={() => setRefundItems({...refundItems, [item.id]: Math.min(remaining, (refundItems[item.id] || 0) + 1)})}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Reason for Refund</label>
              <Input 
                placeholder="e.g. Defective item, Incorrect order"
                className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>

            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Total Refund (Inc. Tax)</p>
                <p className="text-2xl font-black text-rose-500">${calculateRefundTotal().toFixed(2)}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" className="rounded-2xl h-14 font-bold text-gray-400" onClick={() => setIsRefundDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  disabled={!refundReason || calculateRefundTotal() <= 0 || actionLoading}
                  className="h-14 bg-black hover:bg-gray-800 text-white rounded-2xl px-8 font-bold shadow-xl shadow-black/10"
                  onClick={handleRefundOrder}
                >
                  {actionLoading ? <RefreshCw className="animate-spin h-5 w-5" /> : 'Process Refund'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
