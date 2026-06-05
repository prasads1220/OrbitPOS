'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useActiveStore } from '@/store/useActiveStore';
import { 
  Users, 
  Search, 
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  Award,
  ChevronRight,
  TrendingUp,
  Clock,
  Printer,
  Receipt,
  Megaphone
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ReceiptPrinter } from '@/components/pos/receipt-printer';

export default function CustomersPage() {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any | null>(null);
  
  // Broadcast State
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastChannel, setBroadcastChannel] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');
  
  // WhatsApp Status
  const [waStatus, setWaStatus] = useState('DISCONNECTED');
  const [waQrCode, setWaQrCode] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const storeToUse = activeStoreId || profile?.store_id;

  useEffect(() => {
    if (storeToUse) {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        if (searchParam) {
          // If the search param is a UUID (from clicking a customer in another page),
          // don't put it in the search bar, just load the specific customer
          if (searchParam.length > 20 && searchParam.includes('-')) {
            fetchSpecificCustomer(searchParam);
          } else {
            setSearch(searchParam);
            fetchCustomers();
          }
        } else {
          fetchCustomers();
        }
      } else {
        fetchCustomers();
      }
    }
  }, [profile, activeStoreId, storeToUse]);

  const fetchCustomers = async () => {
    if (!storeToUse) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', storeToUse)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecificCustomer = async (customerId: string) => {
    if (!storeToUse) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', storeToUse);
        
      if (error) throw error;
      setCustomers(data || []);
      
      const targetCustomer = data?.find(c => c.id === customerId);
      if (targetCustomer) {
        handleViewCustomer(targetCustomer);
      }
    } catch (err: any) {
      toast.error('Failed to load specific customer');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId: string) => {
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          tax_amount,
          discount_amount,
          payment_status,
          payment_method,
          created_at,
          points_earned,
          points_redeemed,
          order_items (
            id, quantity, unit_price, products(name)
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomerOrders(data || []);
    } catch (err: any) {
      console.error('Failed to load customer orders', err);
      toast.error('Failed to load order history');
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleViewCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerOrders([]);
    fetchCustomerOrders(customer.id);
  };

  const handleCloseCustomerModal = () => {
    setSelectedCustomer(null);
    setSearch('');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('search')) {
        url.searchParams.delete('search');
        window.history.replaceState({}, '', url.toString());
      }
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (broadcastModalOpen && broadcastChannel === 'whatsapp' && waStatus !== 'AUTHENTICATED') {
      const fetchWaStatus = async () => {
        try {
          const res = await fetch('/api/whatsapp/status');
          const data = await res.json();
          setWaStatus(data.status);
          if (data.qrCode) {
            setWaQrCode(data.qrCode);
          }
        } catch (e) {
          console.error('Failed to fetch WA status', e);
        }
      };
      fetchWaStatus();
      interval = setInterval(fetchWaStatus, 3000); // Check every 3 seconds
    }
    return () => clearInterval(interval);
  }, [broadcastModalOpen, broadcastChannel, waStatus]);

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('Please enter a message to broadcast');
      return;
    }
    
    setIsBroadcasting(true);
    try {
      const endpoint = broadcastChannel === 'email' ? '/api/email/send-promotion' : 
                       broadcastChannel === 'sms' ? '/api/sms/send-promotion' : 
                       '/api/whatsapp/send-promotion';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: storeToUse,
          message: broadcastMessage
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send broadcast');
      }

      toast.success(`Broadcast complete! Sent: ${data.successCount}, Failed: ${data.failureCount}`);
      setBroadcastModalOpen(false);
      setBroadcastMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send broadcast');
    } finally {
      setIsBroadcasting(false);
    }
  };

  useEffect(() => {
    if (receiptOrder) {
      const timer = setTimeout(() => {
        executePrint();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [receiptOrder]);

  const executePrint = () => {
    const printContent = document.getElementById('printable-receipt');
    if (!printContent) return;

    let iframe = document.getElementById('receipt-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'receipt-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OrbitPOS Receipt</title>
          <style>
            body { margin: 0; padding: 0; font-family: monospace; background: white; }
            #printable-receipt { display: block !important; width: 80mm; padding: 5mm; margin: 0; background: white; }
            * { box-sizing: border-box; color: black !important; font-family: monospace !important; text-align: left; }
            .space-y-4 > * + * { margin-top: 1rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .border-t { border-top: 1px dashed black; }
            .border-b { border-bottom: 1px dashed black; }
            .border-y { border-top: 1px dashed black; border-bottom: 1px dashed black; }
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
            .text-[14px] { font-size: 14px; }
            .text-[12px] { font-size: 12px; }
            .text-[10px] { font-size: 10px; }
            .text-[9px] { font-size: 9px; }
            .font-mono { font-family: monospace; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .w-1\\/2 { width: 50%; }
            .w-1\\/4 { width: 25%; }
            .opacity-70 { opacity: 0.7; }
            .opacity-80 { opacity: 0.8; }
            .italic { font-style: italic; }
            .tracking-widest { letter-spacing: 0.1em; }
          </style>
        </head>
        <body>
          <div id="printable-receipt">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 150);
  };

  const handlePrintReceipt = (order: any) => {
    const isRefunded = order.payment_status === 'refunded' || order.payment_status === 'partially_refunded';
    const isSwap = order.payment_status === 'exchanged';
    
    const receiptItems = order.order_items?.map((item: any) => ({
      name: item.products?.name,
      quantity: item.quantity,
      price: item.unit_price,
      unit_price: item.unit_price,
      variant_name: null,
      serial_number: null,
      is_return: isRefunded && item.refunded_quantity > 0,
      is_swap: false
    })) || [];
    
    const subtotal = order.total_amount - (order.tax_amount || 0) + (order.discount_amount || 0);

    setReceiptOrder({
      orderId: order.id,
      date: format(parseISO(order.created_at), 'MMM d, yyyy h:mm a'),
      method: order.payment_method,
      items: receiptItems,
      subtotal: subtotal,
      tax: order.tax_amount || 0,
      total: order.total_amount,
      discount: order.discount_amount || 0,
      cashierName: 'System',
      type: isRefunded ? 'refund' : isSwap ? 'swap' : 'sale',
      customerName: selectedCustomer?.full_name,
      customerPhone: selectedCustomer?.phone,
      customerEmail: selectedCustomer?.email,
      pointsEarned: order.points_earned || 0,
      pointsRedeemed: order.points_redeemed || 0,
      pointsBalance: selectedCustomer?.loyalty_points || 0
    });
  };

  const filtered = search.trim().length === 0 ? customers : customers.filter(c =>
    (c.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedCustomers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalSpent = customerOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
  const totalVisits = customerOrders.length;
  const avgOrderValue = totalVisits > 0 ? totalSpent / totalVisits : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Customer CRM</h1>
          <p className="text-[#86868b] font-medium mt-1">Manage customers, view purchase history, and track loyalty.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setBroadcastModalOpen(true)} 
            className="rounded-2xl h-11 font-bold bg-[#0071e3] hover:bg-[#0077ED] text-white shadow-sm"
          >
            <Megaphone className="mr-2 h-4 w-4" />
            Broadcast
          </Button>
          <Button onClick={fetchCustomers} variant="outline" className="rounded-2xl h-11 font-bold">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-50 text-[#0071e3] border border-blue-100">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-black">{customers.length}</p>
            <p className="text-[13px] text-gray-400 font-medium">Total Customers</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-black">{customers.filter(c => c.loyalty_points > 0).length}</p>
            <p className="text-[13px] text-gray-400 font-medium">Active Loyalty Members</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-black">{customers.reduce((acc, c) => acc + (c.loyalty_points || 0), 0)}</p>
            <p className="text-[13px] text-gray-400 font-medium">Total Points Issued</p>
          </div>
        </div>
      </div>

      <div className="relative max-w-md group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
        <Input
          placeholder="Search by name, email, or phone..."
          className="pl-12 h-12 bg-white border-gray-100 rounded-2xl shadow-sm font-medium"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-50">
              <TableHead className="font-bold text-black pl-8">Customer</TableHead>
              <TableHead className="font-bold text-black">Contact</TableHead>
              <TableHead className="font-bold text-black text-center">Loyalty Points</TableHead>
              <TableHead className="font-bold text-black">Joined</TableHead>
              <TableHead className="font-bold text-black text-right pr-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-gray-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading customers...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 font-medium">
                    No customers found matching your search.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCustomers.map((c) => (
                <TableRow key={c.id} className="border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => handleViewCustomer(c)}>
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center font-black text-sm">
                        {c.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-black">{c.full_name || 'Unknown'}</p>
                        <p className="text-[11px] text-gray-400 font-medium font-mono mt-0.5">ID: {c.id.split('-')[0]}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-[13px]">
                      {c.phone && <div className="flex items-center text-gray-600"><Phone className="h-3 w-3 mr-1.5 opacity-50" /> {c.phone}</div>}
                      {c.email && <div className="flex items-center text-gray-600"><Mail className="h-3 w-3 mr-1.5 opacity-50" /> {c.email}</div>}
                      {!c.phone && !c.email && <span className="text-gray-400 italic">No contact info</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 font-black">
                      {c.loyalty_points || 0} pts
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 font-medium">
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-2 opacity-40" />
                      {c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <Button variant="ghost" className="h-9 px-4 rounded-xl font-black text-[12px] text-[#0071e3] hover:bg-blue-50">
                      View CRM <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500 font-medium">
              Showing <span className="font-bold text-black">{filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-black">{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-bold text-black">{filtered.length}</span> customers
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-xl h-9 font-bold"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl h-9 font-bold"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && handleCloseCustomerModal()}>
        <DialogContent className="sm:max-w-3xl w-full p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <div className="bg-gradient-to-b from-gray-50 to-white max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="p-8 border-b border-gray-100 flex items-start justify-between">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-[1.5rem] bg-black text-white flex items-center justify-center font-black text-3xl shadow-lg">
                  {selectedCustomer?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-black">{selectedCustomer?.full_name}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    {selectedCustomer?.phone && (
                      <div className="flex items-center text-[13px] font-medium text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                        <Phone className="h-3.5 w-3.5 mr-2 opacity-50" /> {selectedCustomer?.phone}
                      </div>
                    )}
                    {selectedCustomer?.email && (
                      <div className="flex items-center text-[13px] font-medium text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                        <Mail className="h-3.5 w-3.5 mr-2 opacity-50" /> {selectedCustomer?.email}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 pb-4">
              <h3 className="text-[12px] font-black uppercase text-gray-400 tracking-wider mb-4">Lifetime Analytics</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total Spent</p>
                  <p className="text-xl font-black text-emerald-600">₹{totalSpent.toFixed(2)}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Visits</p>
                  <p className="text-xl font-black text-black">{totalVisits}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Avg Order</p>
                  <p className="text-xl font-black text-blue-600">₹{avgOrderValue.toFixed(2)}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Points</p>
                  <p className="text-xl font-black text-amber-500">{selectedCustomer?.loyalty_points || 0}</p>
                </div>
              </div>
            </div>

            <div className="p-8 pt-4">
              <h3 className="text-[12px] font-black uppercase text-gray-400 tracking-wider mb-4">Purchase History</h3>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="text-[10px] font-black uppercase text-gray-500 pl-6 py-4">Order</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500">Items</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500 text-right pr-6">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-gray-400">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                          Loading history...
                        </TableCell>
                      </TableRow>
                    ) : customerOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10">
                          <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                          <p className="text-gray-400 text-sm font-medium">No past purchases</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      customerOrders.map((order) => (
                        <TableRow key={order.id} className="border-gray-50 hover:bg-gray-50/50">
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
                                <ShoppingBag className="h-4 w-4 text-gray-400" />
                              </div>
                              <div>
                                <p className="font-bold text-[13px] text-black">#{order.order_number || order.id.slice(0, 8)}</p>
                                <p className="text-[10px] text-gray-400 font-bold flex items-center mt-0.5">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {format(parseISO(order.created_at), 'MMM d, yyyy h:mm a')}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {order.order_items?.map((item: any, idx: number) => (
                                <p key={idx} className="text-[11px] font-medium text-gray-600 truncate max-w-[200px]">
                                  {item.quantity}x {item.products?.name || 'Item'}
                                </p>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              order.payment_status === 'completed' ? "bg-emerald-50 text-emerald-600 border-none font-bold" : 
                              order.payment_status === 'exchanged' ? "bg-blue-50 text-[#0071e3] border-none font-bold" : 
                              "bg-rose-50 text-rose-600 border-none font-bold"
                            }>
                              {order.payment_status?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6 align-top">
                            <p className="font-black text-[14px] text-black">₹{order.total_amount?.toFixed(2)}</p>
                            {order.payment_method && <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{order.payment_method}</p>}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="mt-2 h-7 px-2 text-[10px] font-bold text-gray-500 hover:text-black hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintReceipt(order);
                              }}
                            >
                              <Receipt className="h-3 w-3 mr-1" /> Receipt
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Broadcast Modal */}
      <Dialog open={broadcastModalOpen} onOpenChange={(open) => !isBroadcasting && setBroadcastModalOpen(open)}>
        <DialogContent className="sm:max-w-md w-full p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <div className="bg-gradient-to-br from-white to-gray-50/80 p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-black flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-[#0071e3]">
                  <Megaphone className="h-5 w-5" />
                </div>
                Broadcast Promotion
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm text-gray-500 font-medium">
                Send a promotional message to all eligible customers.
              </p>
              
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700">Channel</label>
                <div className="flex items-center gap-3 mb-2">
                  <Button
                    variant={broadcastChannel === 'whatsapp' ? 'default' : 'outline'}
                    className={`rounded-xl h-10 ${broadcastChannel === 'whatsapp' ? 'bg-[#25D366] hover:bg-[#20bd5a] text-white border-none' : ''}`}
                    onClick={() => setBroadcastChannel('whatsapp')}
                  >
                    WhatsApp
                  </Button>
                  <Button
                    variant={broadcastChannel === 'email' ? 'default' : 'outline'}
                    className={`rounded-xl h-10 ${broadcastChannel === 'email' ? 'bg-[#ea4335] hover:bg-[#d33c2f] text-white border-none' : ''}`}
                    onClick={() => setBroadcastChannel('email')}
                  >
                    Email
                  </Button>
                  <Button
                    variant={broadcastChannel === 'sms' ? 'default' : 'outline'}
                    className={`rounded-xl h-10 ${broadcastChannel === 'sms' ? 'bg-[#0071e3] hover:bg-[#0077ED] text-white border-none' : ''}`}
                    onClick={() => setBroadcastChannel('sms')}
                  >
                    SMS
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700">Message Content</label>
                <textarea 
                  className="w-full min-h-[120px] p-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all resize-none text-[15px]"
                  placeholder="e.g. Special weekend offer! Get 20% off all shoes at OrbitPOS!"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  disabled={isBroadcasting || (broadcastChannel === 'whatsapp' && waStatus !== 'AUTHENTICATED')}
                />
              </div>
            </div>

            {broadcastChannel === 'whatsapp' && waStatus !== 'AUTHENTICATED' && (
              <div className="mt-6 p-6 border border-amber-200 bg-amber-50 rounded-2xl flex flex-col items-center justify-center text-center">
                <h4 className="font-bold text-amber-800 mb-2">WhatsApp Device Linking Required</h4>
                {waStatus === 'INITIALIZING' ? (
                  <div className="py-4">
                    <RefreshCw className="h-6 w-6 animate-spin text-amber-600 mx-auto mb-2" />
                    <p className="text-sm text-amber-700">Starting WhatsApp Web Client...</p>
                  </div>
                ) : waStatus === 'QR_READY' && waQrCode ? (
                  <div className="py-2">
                    <p className="text-[13px] text-amber-700 mb-4">Open WhatsApp on your phone, tap Linked Devices, and scan this QR code.</p>
                    <img src={waQrCode} alt="WhatsApp QR Code" className="w-48 h-48 mx-auto rounded-xl shadow-sm" />
                  </div>
                ) : (
                  <p className="text-sm text-amber-700">Please wait while we connect to WhatsApp...</p>
                )}
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
              <Button
                variant="outline"
                className="rounded-xl h-11 font-bold"
                onClick={() => setBroadcastModalOpen(false)}
                disabled={isBroadcasting}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl h-11 font-bold bg-[#0071e3] hover:bg-[#0077ED] text-white shadow-sm px-6"
                onClick={handleBroadcast}
                disabled={isBroadcasting || !broadcastMessage.trim() || (broadcastChannel === 'whatsapp' && waStatus !== 'AUTHENTICATED')}
              >
                {isBroadcasting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Megaphone className="mr-2 h-4 w-4" />
                    Send Broadcast
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <ReceiptPrinter receiptData={receiptOrder} />
    </div>
  );
}
