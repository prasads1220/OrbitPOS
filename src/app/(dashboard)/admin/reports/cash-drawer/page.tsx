'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useActiveStore } from '@/store/useActiveStore';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { 
  Banknote, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Printer, 
  Calendar as CalendarIcon, 
  History as HistoryIcon,
  RefreshCw,
  Clock,
  TrendingDown,
  ShoppingBag,
  IndianRupee,
  ChevronRight,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

export default function CashDrawerPage() {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const storeToUse = activeStoreId || profile?.store_id;

  // Active form closure state
  const [declaredCash, setDeclaredCash] = useState('');
  const [expectedCash, setExpectedCash] = useState(0);
  const [cardTotal, setCardTotal] = useState(0);
  const [upiTotal, setUpiTotal] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [refundsTotal, setRefundsTotal] = useState(0);
  const [discountsTotal, setDiscountsTotal] = useState(0);
  const [itemsCount, setItemsCount] = useState(0);
  
  const [firstSaleTime, setFirstSaleTime] = useState<string | null>(null);
  const [lastSaleTime, setLastSaleTime] = useState<string | null>(null);
  const [shiftStartString, setShiftStartString] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastCreatedLog, setLastCreatedLog] = useState<any>(null);

  // History state
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (storeToUse) {
      fetchActiveShiftTotals();
      fetchHistoryLogs();
    }
  }, [storeToUse, selectedHistoryDate]);

  const fetchActiveShiftTotals = async () => {
    if (!storeToUse) return;
    setLoading(true);
    try {
      // 1. Find the last close log to determine the active shift's start time
      const { data: lastLogs } = await supabase
        .from('cash_drawer_logs')
        .select('created_at')
        .eq('store_id', storeToUse)
        .order('created_at', { ascending: false })
        .limit(1);

      let shiftStartDate = startOfDay(new Date()).toISOString();
      if (lastLogs && lastLogs.length > 0) {
        shiftStartDate = new Date(lastLogs[0].created_at).toISOString();
      }
      
      const shiftEndDate = new Date().toISOString();
      setShiftStartString(shiftStartDate);

      // 2. Fetch all completed orders since the last shift close
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id, total_amount, tax_amount, discount_amount, refunded_amount, payment_method, payment_status, is_split_payment, split_cash_amount, split_card_amount, split_upi_amount, created_at,
          order_items(quantity)
        `)
        .eq('store_id', storeToUse)
        .gte('created_at', shiftStartDate)
        .lt('created_at', shiftEndDate)
        .eq('payment_status', 'completed');

      if (error) throw error;

      if (orders && orders.length > 0) {
        let expectedCashAmount = 0;
        let expectedCardAmount = 0;
        let expectedUpiAmount = 0;
        let refunds = 0;
        let discounts = 0;
        let items = 0;
        
        const saleTimes = orders.map(o => new Date(o.created_at).getTime());
        const minTime = new Date(Math.min(...saleTimes)).toISOString();
        const maxTime = new Date(Math.max(...saleTimes)).toISOString();

        orders.forEach(order => {
          refunds += (order.refunded_amount || 0);
          discounts += (order.discount_amount || 0);
          
          if (order.order_items) {
            order.order_items.forEach((item: any) => {
              items += (item.quantity || 0);
            });
          }

          if (order.is_split_payment) {
            expectedCashAmount += (order.split_cash_amount || 0);
            expectedCardAmount += (order.split_card_amount || 0);
            expectedUpiAmount += (order.split_upi_amount || 0);
          } else {
            const net = order.total_amount - (order.refunded_amount || 0);
            if (order.payment_method === 'cash') {
              expectedCashAmount += net;
            } else if (order.payment_method === 'card') {
              expectedCardAmount += net;
            } else if (order.payment_method === 'upi') {
              expectedUpiAmount += net;
            }
          }
        });
        
        setExpectedCash(expectedCashAmount);
        setCardTotal(expectedCardAmount);
        setUpiTotal(expectedUpiAmount);
        setOrderCount(orders.length);
        setRefundsTotal(refunds);
        setDiscountsTotal(discounts);
        setItemsCount(items);
        setFirstSaleTime(minTime);
        setLastSaleTime(maxTime);
      } else {
        // Reset active shift parameters if no new sales
        setExpectedCash(0);
        setCardTotal(0);
        setUpiTotal(0);
        setOrderCount(0);
        setRefundsTotal(0);
        setDiscountsTotal(0);
        setItemsCount(0);
        setFirstSaleTime(null);
        setLastSaleTime(null);
      }
    } catch (err: any) {
      toast.error('Failed to parse active cashier shift: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryLogs = async () => {
    if (!storeToUse) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('cash_drawer_logs')
        .select('*, profiles(full_name, email, role)')
        .eq('store_id', storeToUse)
        .eq('date', selectedHistoryDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryLogs(data || []);
    } catch (err: any) {
      console.error('Fetch history failed:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const printTillReport = (log: any, cashierProfile: any, storeName: string) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('ORBITPOS TILL REPORT', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(storeName.toUpperCase(), 105, 38, { align: 'center' });
    doc.text('----------------------------------------------------', 105, 45, { align: 'center' });
    
    // Cashier details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIFT CLOSING AUDIT METADATA:', 20, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cashier Name: ${cashierProfile?.full_name || 'N/A'}`, 20, 63);
    doc.text(`Email: ${cashierProfile?.email || 'N/A'} | Role: ${cashierProfile?.role || 'Staff'}`, 20, 70);
    doc.text(`Date Closed: ${format(new Date(log.created_at || new Date()), 'MMM dd, yyyy · hh:mm a')}`, 20, 77);
    
    const startStr = log.first_sale_time ? format(new Date(log.first_sale_time), 'hh:mm a') : 'N/A';
    const endStr = log.last_sale_time ? format(new Date(log.last_sale_time), 'hh:mm a') : 'N/A';
    doc.text(`Shift Timing: ${startStr} to ${endStr}`, 20, 84);
    
    // Transaction Audit
    doc.setFont('helvetica', 'bold');
    doc.text('SHIFT TRANSACTION TOTALS:', 20, 96);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Sales Completed: ${log.order_count}`, 20, 103);
    doc.text(`Total Products/Items Sold: ${log.items_count || 0}`, 20, 110);
    doc.text(`Total Refunds Deducted: -₹${(log.refunds_total || 0).toFixed(2)}`, 20, 117);
    doc.text(`Total Discounts Credited: -₹${(log.discounts_total || 0).toFixed(2)}`, 20, 124);
    
    // Payment audit
    doc.setFont('helvetica', 'bold');
    doc.text('EXPECTED PAYMENT COUNTS:', 20, 136);
    doc.setFont('helvetica', 'normal');
    doc.text(`Expected Cash in Till: ₹${log.expected_cash.toFixed(2)}`, 20, 143);
    doc.text(`Expected Card Sales: ₹${log.card_total.toFixed(2)}`, 20, 150);
    doc.text(`Expected UPI Sales: ₹${log.upi_total.toFixed(2)}`, 20, 157);
    doc.text(`Total Electronic (Card + UPI): ₹${(log.card_total + log.upi_total).toFixed(2)}`, 20, 164);
    
    doc.line(20, 172, 190, 172);
    
    // Balancing Ledger
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('TILL BALANCING LEDGER:', 20, 182);
    doc.text(`Expected Cash Sales: ₹${log.expected_cash.toFixed(2)}`, 20, 191);
    doc.text(`Declared Cash Counter: ₹${log.declared_cash.toFixed(2)}`, 20, 200);
    
    const diff = log.difference || 0;
    const isZero = Math.abs(diff) < 0.01;
    const isShort = diff < 0;
    
    doc.setFontSize(14);
    if (isZero) {
      doc.setTextColor(16, 124, 65); // Green
      doc.text('TILL BALANCE STATUS: PERFECTLY BALANCED (₹0.00)', 20, 212);
    } else if (isShort) {
      doc.setTextColor(229, 62, 62); // Rose/Red
      doc.text(`TILL BALANCE STATUS: SHORT BY -₹${Math.abs(diff).toFixed(2)}`, 20, 212);
    } else {
      doc.setTextColor(217, 119, 6); // Amber
      doc.text(`TILL BALANCE STATUS: OVER BY +₹${diff.toFixed(2)}`, 20, 212);
    }
    
    doc.setTextColor(0, 0, 0); // reset color
    doc.setFontSize(10);
    doc.text('----------------------------------------------------', 105, 230, { align: 'center' });
    doc.text('OrbitPOS Till Closing Ledger · Shift Completed', 105, 238, { align: 'center' });
    
    doc.save(`Till_Close_Report_${log.date}_${log.id.slice(0, 8)}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const declared = parseFloat(declaredCash);
    const difference = declared - expectedCash;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('cash_drawer_logs')
        .insert({
          store_id: storeToUse,
          cashier_id: profile?.id,
          date: today,
          expected_cash: expectedCash,
          declared_cash: declared,
          difference,
          card_total: cardTotal,
          upi_total: upiTotal,
          order_count: orderCount,
          refunds_total: refundsTotal,
          discounts_total: discountsTotal,
          items_count: itemsCount,
          first_sale_time: firstSaleTime,
          last_sale_time: lastSaleTime,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Cash drawer logged and shift closed successfully!');
      setLastCreatedLog(data);
      
      // Auto-trigger print
      const storeName = (profile as any)?.stores?.name || 'OrbitPOS';
      printTillReport(data, profile, storeName);
      
      setSubmitted(true);
      setDeclaredCash('');
      
      // Refresh list and start new shift totals immediately
      await fetchActiveShiftTotals();
      await fetchHistoryLogs();
    } catch (err: any) {
      toast.error('Failed to log till close report: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeDifference = parseFloat(declaredCash || '0') - expectedCash;
  const isShort = activeDifference < 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin/reports" className="inline-flex items-center text-sm font-bold text-gray-400 hover:text-black mb-4 gap-1.5 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Reports
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-black">End of Day — Cash Drawer Closing Ledger</h1>
          <p className="text-[#86868b] font-medium mt-1">Reconcile physical cash counts, review payment segments, and lock till balances.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CLOSING DRAWER ACTIONS (COLUMN 1 & 2) */}
        <div className="lg:col-span-2 space-y-6">
          {submitted ? (
            <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm text-center space-y-5 animate-in zoom-in-95 duration-500">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
              <h2 className="text-2xl font-black text-black">Shift Closed & Audited</h2>
              <p className="text-gray-400 font-medium max-w-md mx-auto">
                Till closing records logged successfully. The audit report PDF has been printed. 
                You can now start a new till closing sequence or continue POS checkouts.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Button onClick={() => {
                  const storeName = (profile as any)?.stores?.name || 'OrbitPOS';
                  printTillReport(lastCreatedLog, profile, storeName);
                }} variant="outline" className="rounded-xl font-bold h-11 px-6">
                  <Printer className="mr-2 h-4 w-4 text-gray-400" /> Reprint Report
                </Button>
                <Button onClick={() => setSubmitted(false)} className="rounded-xl font-bold bg-black text-white hover:bg-gray-800 h-11 px-6">
                  Start New Shift
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* CURRENT SHIFT TOTALS CARDS */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Expected Cash</p>
                  <p className="text-2xl font-black text-black">₹{expectedCash.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Credit/Electronic</p>
                  <p className="text-2xl font-black text-black">₹{(cardTotal + upiTotal).toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Orders Processed</p>
                  <p className="text-2xl font-black text-black">{orderCount}</p>
                </div>
              </div>

              {/* CURRENT CASH AUDIT SUMMARY DETAILS */}
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-[14px] font-bold text-gray-400 uppercase tracking-widest">Active Shift Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
                  <div>
                    <p className="text-gray-400 font-bold text-[10px] uppercase">Shift Started</p>
                    <p className="font-bold text-black mt-0.5">{shiftStartString ? format(new Date(shiftStartString), 'hh:mm a') : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-bold text-[10px] uppercase">Products Sold</p>
                    <p className="font-bold text-black mt-0.5">{itemsCount} units</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-bold text-[10px] uppercase">Total Refunds</p>
                    <p className="font-bold text-rose-500 mt-0.5">₹{refundsTotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-bold text-[10px] uppercase">Total Discounts</p>
                    <p className="font-bold text-[#0071e3] mt-0.5">₹{discountsTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* DECLARATION FORM */}
              <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-black">Close active Till Drawer</h3>
                  <Button onClick={fetchActiveShiftTotals} variant="outline" size="sm" className="rounded-xl h-8 px-3 text-[11px] font-bold">
                    <RefreshCw className={loading ? 'animate-spin h-3.5 w-3.5 mr-1.5' : 'h-3.5 w-3.5 mr-1.5'} /> Sync Live Till
                  </Button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">Declared Drawer Cash counted (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[16px] font-black text-gray-400">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-16 pl-10 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white font-black text-2xl"
                        value={declaredCash}
                        onChange={e => setDeclaredCash(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {declaredCash && (
                    <div className={`p-5 rounded-2xl flex items-center gap-4 ${Math.abs(activeDifference) < 0.01 ? 'bg-emerald-50 border border-emerald-100' : isShort ? 'bg-rose-50 border border-rose-100' : 'bg-amber-50 border border-amber-100'}`}>
                      {Math.abs(activeDifference) < 0.01 ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-rose-500 shrink-0" />
                      )}
                      <div>
                        <p className="font-black text-black text-[14px]">
                          {Math.abs(activeDifference) < 0.01 ? 'Balanced perfectly' : isShort ? `Short by -₹${Math.abs(activeDifference).toFixed(2)}` : `Over by +₹${activeDifference.toFixed(2)}`}
                        </p>
                        <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                          Expected Cash: ₹{expectedCash.toFixed(2)} · Declared Cash: ₹{parseFloat(declaredCash || '0').toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={submitting} className="w-full h-14 bg-black hover:bg-gray-800 text-white font-black rounded-2xl text-[14px] shadow-lg shadow-black/10 transition-transform active:scale-[0.98]">
                    {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Banknote className="mr-2 h-5 w-5" />}
                    Close Active Till & Print Audit PDF
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* HISTORICAL CALENDAR & PAST SHIFTS LEDGER (COLUMN 3) */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 flex flex-col h-[600px] overflow-hidden">
          <div className="shrink-0 space-y-2">
            <h3 className="text-lg font-bold text-black flex items-center gap-2">
              <HistoryIcon className="h-5 w-5 text-gray-400" />
              Till Closing Ledger
            </h3>
            <p className="text-gray-400 font-bold text-[11px] uppercase tracking-wider">Inspect and reprint past closed shifts</p>
          </div>

          {/* Calendar Picker */}
          <div className="shrink-0 space-y-2">
            <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Select History Date</Label>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-transparent focus-within:border-gray-200">
              <CalendarIcon className="h-4 w-4 text-gray-400" />
              <input 
                type="date"
                className="text-[13px] font-bold text-gray-600 bg-transparent outline-none cursor-pointer w-full"
                value={selectedHistoryDate}
                onChange={e => setSelectedHistoryDate(e.target.value)}
                max={today}
              />
            </div>
          </div>

          <Separator className="bg-gray-50 shrink-0" />

          {/* Shifts closed List */}
          <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-black animate-spin" />
              </div>
            ) : historyLogs.length === 0 ? (
              <p className="text-center text-gray-400 text-[12px] py-12 font-bold">No closed shifts logged for this date.</p>
            ) : (
              historyLogs.map(log => {
                const diff = log.difference || 0;
                const isZero = Math.abs(diff) < 0.01;
                const isShortVal = diff < 0;
                
                return (
                  <div key={log.id} className="p-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-black text-[13px]">{log.profiles?.full_name || 'Staff'}</p>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(log.created_at), 'hh:mm a')}</span>
                        </div>
                      </div>
                      
                      {isZero ? (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-full font-bold text-[9px] px-2 py-0">Balanced</Badge>
                      ) : isShortVal ? (
                        <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-full font-bold text-[9px] px-2 py-0">Short ₹{Math.abs(diff).toFixed(2)}</Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-full font-bold text-[9px] px-2 py-0">Over +₹{diff.toFixed(2)}</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50 p-2.5 rounded-xl text-gray-500 font-medium">
                      <p>Expected: <span className="font-bold text-black">₹{log.expected_cash.toFixed(2)}</span></p>
                      <p>Declared: <span className="font-bold text-black">₹{log.declared_cash.toFixed(2)}</span></p>
                    </div>

                    <Button 
                      onClick={() => {
                        const storeName = (profile as any)?.stores?.name || 'OrbitPOS';
                        printTillReport(log, log.profiles, storeName);
                      }} 
                      variant="outline" 
                      size="sm" 
                      className="w-full rounded-xl font-bold h-8 text-[11px]"
                    >
                      <Printer className="mr-1.5 h-3.5 w-3.5" /> Reprint Till Report
                    </Button>
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

function Separator({ className }: { className?: string }) {
  return <div className={`h-[1px] w-full bg-gray-100 ${className}`} />;
}
