'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardList, 
  Search, 
  Download,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Banknote,
  Clock,
  Printer,
  ChevronRight,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ReceiptPrinter } from '@/components/pos/receipt-printer';
import { refundOrder } from '@/app/actions/orders';

import { useActiveStore } from '@/store/useActiveStore';

export default function OrdersPage() {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  
  // Date Filter State
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundItems, setRefundItems] = useState<{id: string, quantity: number, max: number}[]>([]);
  const [refundReason, setRefundReason] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  const itemsPerPage = 15;

  const storeToUse = activeStoreId || profile?.store_id;

  useEffect(() => {
    if (storeToUse) {
      fetchOrders();
    }
  }, [profile, activeStoreId, storeToUse, startDate, endDate]);

  const fetchOrders = async () => {
    if (!storeToUse) return;
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
          points_earned,
          points_redeemed,
          cashier:profiles!cashier_id ( full_name ),
          customer:customers!customer_id ( full_name, email, phone, loyalty_points ),
          order_items (
            id,
            quantity,
            refunded_quantity,
            total_price,
            unit_price,
            variant_id,
            serial_number,
            products ( name, price, sku ),
            product_variants ( model_name, sku, barcode )
          )
        `)
        .eq('store_id', storeToUse)
        .gte('created_at', startOfDay(s).toISOString())
        .lte('created_at', endOfDay(e).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      setCurrentPage(1);
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

  const handlePrint = () => {
    const printContent = document.getElementById('printable-receipt');
    if (!printContent) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print receipts');
      return;
    }

    // Write the receipt content with specific thermal styles (MATCHES POS EXACTLY)
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OrbitPOS Receipt</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: monospace;
              background: white;
            }
            #printable-receipt {
              display: block !important;
              width: 80mm;
              padding: 5mm;
              margin: 0;
              background: white;
            }
            * {
              box-sizing: border-box;
              color: black !important;
            }
            .space-y-4 > * + * { margin-top: 1rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .border-t { border-top: 1px solid black; }
            .border-b { border-bottom: 1px solid black; }
            .border-y { border-top: 1px solid black; border-bottom: 1px solid black; }
            .border-dashed { border-style: dashed; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .pt-2 { padding-top: 0.5rem; }
            .pt-8 { padding-top: 2rem; }
            .pb-4 { padding-bottom: 1rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-8 { margin-top: 2rem; }
            .text-xl { font-size: 1.25rem; }
            .text-lg { font-size: 1.125rem; }
            .text-[14px] { font-size: 14px; }
            .text-[12px] { font-size: 12px; }
            .text-[10px] { font-size: 10px; }
            .text-[9px] { font-size: 9px; }
            .font-mono { font-family: monospace; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .w-1/2 { width: 50%; }
            .w-1/4 { width: 25%; }
            .opacity-70 { opacity: 0.7; }
            .opacity-80 { opacity: 0.8; }
            .italic { font-style: italic; }
            .tracking-widest { letter-spacing: 0.1em; }
            .tracking-tight { letter-spacing: -0.025em; }
          </style>
        </head>
        <body>
          <div id="printable-receipt">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  useEffect(() => {
    if (receiptData) {
      setTimeout(() => {
        handlePrint();
        setReceiptData(null);
      }, 500);
    }
  }, [receiptData]);

  const handleReprint = (order: any) => {
    const isRefunded = order.payment_status === 'refunded' || order.payment_status === 'partially_refunded';

    if (isRefunded) {
      const refundedItems = order.order_items.filter((item: any) => (item.refunded_quantity || 0) > 0);
      const subtotal = refundedItems.reduce((sum: number, item: any) => sum + (item.unit_price * item.refunded_quantity), 0);
      
      const preTaxTotal = order.total_amount - (order.tax_amount || 0);
      const taxRate = preTaxTotal > 0 ? (order.tax_amount || 0) / preTaxTotal : 0;
      const tax = subtotal * taxRate;

      setReceiptData({
        orderId: order.id,
        date: format(parseISO(order.created_at), 'MMM d, yyyy h:mm a'),
        method: order.payment_method,
        items: refundedItems.map((item: any) => ({
          name: item.products?.name,
          quantity: item.refunded_quantity,
          unit_price: item.unit_price,
          price: item.unit_price,
          variant_name: item.product_variants?.model_name || null,
          serial_number: item.serial_number || null,
        })),
        subtotal: subtotal,
        tax: tax,
        total: subtotal + tax,
        discount: order.discount_amount || 0,
        cashierName: order.cashier?.full_name || 'System',
        type: 'refund',
        customerName: order.customer ? order.customer.full_name : undefined,
        customerPhone: order.customer ? order.customer.phone : undefined,
        customerEmail: order.customer ? order.customer.email : undefined,
        pointsEarned: order.points_earned || 0,
        pointsRedeemed: order.points_redeemed || 0,
        pointsBalance: order.customer ? order.customer.loyalty_points : 0
      });
    } else {
      const subtotal = order.order_items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0);
      setReceiptData({
        orderId: order.id,
        date: format(parseISO(order.created_at), 'MMM d, yyyy h:mm a'),
        method: order.payment_method,
        items: order.order_items.map((item: any) => ({
          name: item.products?.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          price: item.unit_price,
          variant_name: item.product_variants?.model_name || null,
          serial_number: item.serial_number || null,
        })),
        subtotal: subtotal,
        tax: order.tax_amount || 0,
        total: order.total_amount,
        discount: order.discount_amount || 0,
        cashierName: order.cashier?.full_name || 'System',
        type: 'sale',
        customerName: order.customer ? order.customer.full_name : undefined,
        customerPhone: order.customer ? order.customer.phone : undefined,
        customerEmail: order.customer ? order.customer.email : undefined,
        pointsEarned: order.points_earned || 0,
        pointsRedeemed: order.points_redeemed || 0,
        pointsBalance: order.customer ? order.customer.loyalty_points : 0
      });
    }
  };

  const handleInitiateRefund = () => {
    setIsRefunding(true);
    setRefundReason('');
    setRefundItems(
      selectedOrder.order_items.map((item: any) => ({
        id: item.id,
        quantity: 0,
        max: item.quantity - (item.refunded_quantity || 0)
      }))
    );
  };

  const handleSubmitRefund = async () => {
    const itemsToRefund = refundItems.filter(i => i.quantity > 0).map(({id, quantity}) => ({id, quantity}));
    if (itemsToRefund.length === 0) {
      toast.error('Please select items to refund');
      return;
    }
    
    setIsSubmittingRefund(true);
    const res = await refundOrder(selectedOrder.id, itemsToRefund, refundReason || 'Customer Request');
    setIsSubmittingRefund(false);

    if (res.success) {
      toast.success('Refund successful');
      setIsRefunding(false);
      
      let subtotal = 0;
      const receiptItems = [];
      for (const req of itemsToRefund) {
        const oi = selectedOrder.order_items.find((i: any) => i.id === req.id);
        if (oi) {
          subtotal += oi.unit_price * req.quantity;
          receiptItems.push({
            name: oi.products?.name,
            quantity: req.quantity,
            unit_price: oi.unit_price,
            price: oi.unit_price,
            variant_name: oi.product_variants?.model_name || null,
            serial_number: oi.serial_number || null,
          });
        }
      }
      const preTaxTotal = selectedOrder.total_amount - (selectedOrder.tax_amount || 0);
      const taxRate = preTaxTotal > 0 ? (selectedOrder.tax_amount || 0) / preTaxTotal : 0;
      const tax = subtotal * taxRate;
      
      setReceiptData({
        orderId: selectedOrder.id,
        date: format(new Date(), 'MMM d, yyyy h:mm a'),
        method: selectedOrder.payment_method,
        items: receiptItems,
        subtotal: subtotal,
        tax: tax,
        total: subtotal + tax,
        cashierName: profile?.full_name || 'System',
        type: 'refund',
        refundReason: refundReason || 'Customer Request'
      });

      setSelectedOrder(null);
      fetchOrders();
    } else {
      toast.error(res.error || 'Refund failed');
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    (o.cashier?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.customer?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.customer?.phone || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.customer?.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const groupedOrders = paginatedOrders.reduce((acc: any, order) => {
    const dateKey = format(parseISO(order.created_at), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(order);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a));

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Hidden Receipt Printer for Thermal Printing */}
      <div className="hidden">
        {receiptData && <ReceiptPrinter receiptData={receiptData} />}
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-black">Order Explorer</h1>
            <p className="text-gray-400 font-bold mt-1">Audit sales and reprint receipts.</p>
          </div>
          <div className="flex items-center gap-3">
             <Button onClick={() => downloadCSV(filteredOrders, 'orders.csv')} variant="outline" className="rounded-2xl h-11 px-6 font-bold">
                <Download className="mr-2 h-4 w-4" /> CSV
             </Button>
             <Button onClick={fetchOrders} className="rounded-2xl h-11 px-8 bg-black hover:bg-gray-800 text-white font-bold">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Update
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
              <Input placeholder="Search Order ID..." className="pl-12 h-13 bg-gray-50 border-transparent rounded-2xl focus:bg-white font-bold" value={search} onChange={(e) => setSearch(e.target.value)} />
           </div>
        </div>
      </div>

      <div className="space-y-10">
        {loading ? (
          <div className="py-40 text-center"><RefreshCw className="h-12 w-12 animate-spin mx-auto text-gray-200" /></div>
        ) : sortedDates.length === 0 ? (
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
                        <TableHead className="text-right text-[10px] font-black uppercase text-black">Amount</TableHead>
                        <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-black">Actions</TableHead>
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
                          <TableCell className="text-right">
                             <div className="flex flex-col items-end">
                                <span className="font-black text-black text-lg">₹{order.total_amount.toFixed(2)}</span>
                                <Badge className={cn("border-none font-black text-[9px] h-4", order.payment_status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                                   {order.payment_status.toUpperCase()}
                                </Badge>
                             </div>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                             <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100" onClick={() => handleReprint(order)}>
                                   <Printer className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" className="h-10 px-4 rounded-xl font-black text-[12px] text-blue-600 hover:bg-blue-50" onClick={() => setSelectedOrder(order)}>
                                   Details <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                             </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-gray-100">
                 <p className="text-[13px] text-gray-400 font-bold uppercase">Page {currentPage} of {totalPages}</p>
                 <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-5 w-5" /></Button>
                    <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-5 w-5" /></Button>
                 </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Re-Styled Dialog with Print Button */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => {
        if (!open) {
          setSelectedOrder(null);
          setIsRefunding(false);
        }
      }}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <div className="p-8 bg-[#fbfbfd] border-b border-gray-50 text-center">
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-4"><ShoppingBag className="h-8 w-8" /></div>
            <DialogTitle className="text-2xl font-black text-black">{isRefunding ? 'Process Refund' : 'Order Receipt'}</DialogTitle>
            <p className="text-gray-400 font-bold text-[11px] mt-1 uppercase tracking-widest">#{selectedOrder?.id}</p>
          </div>
          <div className="p-8 space-y-6">
             <div className="space-y-4">
                {selectedOrder?.order_items?.map((item: any, idx: number) => {
                  const ri = refundItems.find(r => r.id === item.id);
                  const isFullyRefunded = item.quantity === (item.refunded_quantity || 0);
                  return (
                    <div key={idx} className="flex justify-between items-start">
                      <div>
                        <p className={cn("font-black text-[15px]", isFullyRefunded ? "text-gray-400 line-through" : "text-black")}>{item.products?.name}</p>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className="text-[11px] text-gray-400 font-bold uppercase">{item.quantity} x ₹{item.unit_price?.toFixed(2)}</span>
                          {item.product_variants?.model_name && (
                            <Badge className="bg-amber-50 text-amber-600 border-amber-100 font-bold text-[9px] h-4 py-0 px-1 ml-0.5">
                              {item.product_variants.model_name}
                            </Badge>
                          )}
                          {item.refunded_quantity > 0 && !isRefunding && (
                            <Badge className="bg-rose-50 text-rose-600 border-rose-100 font-bold text-[9px] h-4 py-0 px-1 ml-0.5">
                              Refunded: {item.refunded_quantity}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {isRefunding ? (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" size="icon" className="h-8 w-8 rounded-lg"
                            disabled={!ri || ri.quantity <= 0}
                            onClick={() => setRefundItems(prev => prev.map(p => p.id === item.id ? {...p, quantity: p.quantity - 1} : p))}
                          >-</Button>
                          <span className="font-bold w-4 text-center">{ri?.quantity || 0}</span>
                          <Button 
                            variant="outline" size="icon" className="h-8 w-8 rounded-lg"
                            disabled={!ri || ri.quantity >= ri.max}
                            onClick={() => setRefundItems(prev => prev.map(p => p.id === item.id ? {...p, quantity: p.quantity + 1} : p))}
                          >+</Button>
                        </div>
                      ) : (
                        <span className="font-black text-black">₹{item.total_price.toFixed(2)}</span>
                      )}
                    </div>
                  );
                })}
             </div>
             
             {selectedOrder?.customer && (
               <div className="pt-4 border-t border-gray-100 space-y-2 text-[12px]">
                 <p className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Customer Details</p>
                 <div className="bg-gray-50/50 p-3.5 rounded-xl space-y-1 text-[11px]">
                   <p className="font-black text-black">{selectedOrder.customer.full_name}</p>
                   <p className="text-gray-500 font-medium">{selectedOrder.customer.phone || selectedOrder.customer.email || 'No contact details'}</p>
                   <div className="flex gap-4 pt-1.5 font-bold text-gray-400">
                     <span>Earned: <span className="text-[#0071e3] font-black">+{selectedOrder.points_earned || 0} pts</span></span>
                     {selectedOrder.points_redeemed > 0 && (
                       <span>Redeemed: <span className="text-rose-500 font-black">-{selectedOrder.points_redeemed} pts</span></span>
                     )}
                   </div>
                 </div>
               </div>
             )}

             {!isRefunding ? (
               <>
                 <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-lg font-black uppercase text-gray-400 tracking-widest">Total Paid</span>
                    <span className="text-3xl font-black text-black">₹{selectedOrder?.total_amount.toFixed(2)}</span>
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-4">
                    <Button variant="outline" className="h-14 rounded-2xl font-black" onClick={() => setSelectedOrder(null)}>Close</Button>
                    <div className="flex gap-2">
                      <Button variant="outline" className="h-14 flex-1 rounded-2xl text-rose-600 border-rose-200 hover:bg-rose-50" disabled={selectedOrder?.payment_status === 'refunded'} onClick={handleInitiateRefund}>
                         Refund
                      </Button>
                      <Button className="h-14 flex-1 rounded-2xl bg-black text-white font-black" onClick={() => handleReprint(selectedOrder)}>
                         <Printer className="h-5 w-5" />
                      </Button>
                    </div>
                 </div>
               </>
             ) : (
               <>
                 <div className="space-y-2 pt-4">
                   <Label className="text-[10px] font-black uppercase text-gray-400">Refund Reason (Optional)</Label>
                   <Input 
                     placeholder="e.g. Defective item, changed mind..."
                     className="bg-gray-50 border-transparent rounded-xl"
                     value={refundReason}
                     onChange={e => setRefundReason(e.target.value)}
                   />
                 </div>
                 <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-lg font-black uppercase text-gray-400 tracking-widest">Refund Amt</span>
                    <span className="text-3xl font-black text-rose-500">
                      ₹{refundItems.reduce((acc, curr) => {
                        const oi = selectedOrder?.order_items.find((i: any) => i.id === curr.id);
                        return acc + (oi ? oi.unit_price * curr.quantity : 0);
                      }, 0).toFixed(2)}
                      <span className="text-sm text-gray-400 block text-right font-medium">+ Tax</span>
                    </span>
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-4">
                    <Button variant="outline" className="h-14 rounded-2xl font-black" onClick={() => setIsRefunding(false)}>Cancel</Button>
                    <Button 
                      className="h-14 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black" 
                      onClick={handleSubmitRefund}
                      disabled={isSubmittingRefund || refundItems.every(i => i.quantity === 0)}
                    >
                       Confirm Refund
                    </Button>
                 </div>
               </>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
