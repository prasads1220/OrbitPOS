'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, 
  CreditCard, 
  Banknote, 
  Loader2, 
  Receipt,
  Download,
  X,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Wifi,
  Smartphone,
  Wallet
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { 
  createPaymentIntent, 
  getStorePublishableKey,
  getPaymentMethodDetails 
} from '@/app/actions/stripe';
import StripePayment from './stripe-payment';
import { ReceiptPrinter } from './receipt-printer';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useActiveStore } from '@/store/useActiveStore';

type CheckoutStep = 'selection' | 'cash-input' | 'card-payment' | 'processing' | 'success' | 'failed';

interface ReceiptData {
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  orderId: string;
  date: string;
  method: string;
  discount: number;
  discountType: 'amount' | 'percentage';
  cardLast4?: string;
  cardBrand?: string;
  cashTendered?: string;
  changeDue?: number;
  cashierName?: string;
}

export function CheckoutDialog({ 
  open, 
  onOpenChange,
  items,
  subtotal,
  tax,
  total,
  discount = 0,
  discountType = 'amount',
  initialMethod = 'cash'
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  items: any[],
  subtotal: number,
  tax: number,
  total: number,
  discount?: number,
  discountType?: 'amount' | 'percentage',
  initialMethod?: 'cash' | 'card'
  storeId?: string;
}) {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const { clearCart } = useCartStore();
  const [step, setStep] = useState<CheckoutStep>('selection');
  const [method, setMethod] = useState<'cash' | 'card'>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [stripeIntentId, setStripeIntentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const storeToUse = activeStoreId || profile?.store_id;

  // Reset state when dialog closes
  useEffect(() => {
    if (open) {
      setMethod(initialMethod);
      if (initialMethod === 'cash') {
        setStep('cash-input');
      } else {
        handleMethodContinue(initialMethod);
      }
    } else {
      setTimeout(() => {
        setStep('selection');
        setCashTendered('');
        setError(null);
        setClientSecret('');
        setStripeIntentId('');
        setOrderId(null);
        setReceiptData(null);
      }, 300);
    }
  }, [open, initialMethod]);

  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - total);

  const handleQuickCash = (amount: number) => {
    setCashTendered(amount.toFixed(2));
  };

  const finalizeOrder = async (stripeId?: string, last4?: string, brand?: string) => {
    if (!storeToUse) {
      toast.error('Store ID not found. Please log in again.');
      return;
    }
    if (!items || items.length === 0) {
      toast.error('Cart is empty. Cannot process order.');
      return;
    }
    setStep('processing');
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          total_amount: total,
          tax_amount: tax,
          discount_amount: discount,
          payment_method: method,
          payment_status: 'completed',
          store_id: storeToUse,
          cashier_id: profile?.id,
          stripe_payment_intent_id: stripeId || (method === 'card' ? stripeIntentId : null),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        store_id: storeToUse,
        variant_id: item.variant_id || null,
        serial_number: item.serial_number || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update inventory
      for (const item of items) {
        if (item.variant_id) {
          // Decrement variant stock
          await supabase
            .from('product_variants')
            .update({ stock_quantity: Math.max(0, item.stock_quantity - item.quantity) })
            .eq('id', item.variant_id);

          // If serialized, flag scanned serial as sold
          if (item.serial_number) {
            await supabase
              .from('serialized_inventory')
              .update({ status: 'sold', order_id: order.id })
              .eq('variant_id', item.variant_id)
              .eq('serial_number', item.serial_number);
          }
        } else {
          // Decrement parent product stock
          await supabase
            .from('products')
            .update({ stock_quantity: Math.max(0, item.stock_quantity - item.quantity) })
            .eq('id', item.id);

          // If serialized (but no variants), flag scanned serial as sold
          if (item.serial_number) {
            await supabase
              .from('serialized_inventory')
              .update({ status: 'sold', order_id: order.id })
              .eq('product_id', item.id)
              .eq('serial_number', item.serial_number);
          }
        }
          
        await supabase
          .from('inventory_logs')
          .insert({
            product_id: item.id,
            change_amount: -item.quantity,
            reason: 'sale',
            store_id: storeToUse,
          });
      }

      setOrderId(order.id);
      
      // Capture receipt data before clearing
      setReceiptData({
        items: [...items],
        subtotal,
        tax,
        total,
        orderId: order.id,
        date: new Date().toLocaleString(),
        method,
        discount,
        discountType,
        cardLast4: last4,
        cardBrand: brand,
        cashTendered: method === 'cash' ? cashTendered : undefined,
        changeDue: method === 'cash' ? changeDue : undefined,
        cashierName: profile?.full_name || 'System'
      });

      setStep('success');
      clearCart(); // We can safely clear now
      toast.success('Transaction Completed');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Database error occurred');
      setStep('failed');
    }
  };

  const handleMethodContinue = async (selectedMethod?: 'cash' | 'card') => {
    const currentMethod = selectedMethod || method;
    setMethod(currentMethod);
    
    if (currentMethod === 'cash') {
      setStep('cash-input');
    } else {
      try {
        setLoading(true);
        if (!storeToUse) throw new Error('Store ID missing');
        
        const [intentRes, keyRes] = await Promise.all([
          createPaymentIntent(total, storeToUse, profile?.store_name || 'OrbitPOS Store'),
          getStorePublishableKey(storeToUse)
        ]);

        setClientSecret(intentRes.clientSecret || '');
        setPublishableKey(keyRes);
        setStep('card-payment');
      } catch (err: any) {
        toast.error('Could not initialize card payment: ' + err.message);
        setStep('selection');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const autoPrint = profile?.stores?.auto_print_receipt !== false;
    if (step === 'success' && receiptData && autoPrint) {
      handlePrint();
      // Clear data after a delay to prevent re-triggering during re-renders
      const timer = setTimeout(() => {
        setReceiptData(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, receiptData, profile?.stores?.auto_print_receipt]);

  const handlePrint = () => {
    const printContent = document.getElementById('printable-receipt');
    if (!printContent) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print receipts');
      return;
    }

    // Write the receipt content with specific thermal styles
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
            /* Reset the hidden/print:block logic since we are in a dedicated window */
            #printable-receipt {
              display: block !important;
              width: 80mm;
              padding: 5mm;
              margin: 0;
              background: white;
            }
            /* Professional thermal receipt styling */
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

  const downloadReceipt = () => {
    if (!receiptData) return;
    
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('ORBITPOS', 105, 30, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('MODERN RETAIL EXPERIENCE', 105, 38, { align: 'center' });
    doc.text('----------------------------------------------------', 105, 45, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(`Order ID: #${receiptData.orderId.slice(0, 8)}`, 20, 60);
    doc.text(`Date: ${receiptData.date}`, 20, 68);
    doc.text(`Payment: ${receiptData.method.toUpperCase()}${receiptData.cardLast4 ? ` (Card ending in ${receiptData.cardLast4})` : ''}`, 20, 76);
    
    let y = 90;
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM', 20, y);
    doc.text('QTY', 120, y);
    doc.text('PRICE', 150, y);
    doc.text('TOTAL', 180, y, { align: 'right' });
    
    doc.line(20, y + 2, 190, y + 2);
    y += 12;
    
    doc.setFont('helvetica', 'normal');
    receiptData.items.forEach(item => {
      doc.text(item.name.substring(0, 30), 20, y);
      doc.text(item.quantity.toString(), 122, y);
      doc.text(`₹${item.price.toFixed(2)}`, 150, y);
      doc.text(`₹${(item.quantity * item.price).toFixed(2)}`, 190, y, { align: 'right' });
      y += 10;
    });

    y += 5;
    doc.line(130, y, 190, y);
    y += 10;
    doc.text('Subtotal:', 130, y);
    doc.text(`₹${receiptData.subtotal.toFixed(2)}`, 190, y, { align: 'right' });
    y += 7;
    doc.text('Tax (8%):', 130, y);
    doc.text(`₹${receiptData.tax.toFixed(2)}`, 190, y, { align: 'right' });
    if (receiptData.discount > 0) {
      y += 7;
      doc.setTextColor(220, 50, 50);
      doc.text('Discount:', 130, y);
      const discStr = receiptData.discountType === 'percentage' ? `${receiptData.discount}%` : `₹${receiptData.discount.toFixed(2)}`;
      doc.text(`-${discStr}`, 190, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    }
    y += 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 130, y);
    doc.text(`₹${receiptData.total.toFixed(2)}`, 190, y, { align: 'right' });

    if (receiptData.method === 'cash') {
      y += 15;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Amount Tendered:', 130, y);
      doc.text(`₹${(parseFloat(receiptData.cashTendered || '0') || receiptData.total).toFixed(2)}`, 190, y, { align: 'right' });
      y += 7;
      doc.text('Change:', 130, y);
      doc.text(`₹${(receiptData.changeDue || 0).toFixed(2)}`, 190, y, { align: 'right' });
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for shopping with OrbitPOS!', 105, y + 30, { align: 'center' });
    
    doc.save(`orbitpos-receipt-${receiptData.orderId.slice(0, 8)}.pdf`);
  };

  const closeAndClear = () => {
    clearCart();
    onOpenChange(false);
  };

  const handleStripeSuccess = async (intentId: string, last4?: string, brand?: string) => {
    let finalLast4 = last4;
    let finalBrand = brand;

    // If details are missing, fetch them from server
    if (!finalLast4 && profile?.store_id) {
      const details = await getPaymentMethodDetails(profile.store_id, intentId);
      if (details) {
        finalLast4 = details.last4;
        finalBrand = details.brand;
      }
    }

    finalizeOrder(intentId, finalLast4, finalBrand);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none shadow-2xl bg-white">
        
        <ReceiptPrinter receiptData={receiptData ? { ...receiptData, type: 'sale' } : null} />

        {/* Header Section */}
        <div className="p-10 bg-[#fbfbfd] border-b border-gray-50 relative">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <Receipt className="text-white h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-black tracking-tight">
                {step === 'success' ? 'Payment Successful' : step === 'failed' ? 'Payment Failed' : 'Checkout'}
              </h2>
              <p className="text-gray-400 font-medium text-[13px]">
                {step === 'success' ? `Order #${orderId?.slice(0, 8)}` : 'Secure transaction terminal'}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Content Section */}
        <div className="p-10 min-h-[400px] flex flex-col">
          
          {step === 'selection' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Amount Due</p>
                <div className="text-5xl font-black text-[#0071e3] tracking-tighter">${total.toFixed(2)}</div>
              </div>

              <div className="space-y-4">
                <Label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Select Payment Method</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className={cn(
                      "h-32 flex-col gap-3 rounded-3xl border-2 transition-all",
                      method === 'cash' ? "border-[#0071e3] bg-blue-50/30 text-[#0071e3]" : "border-gray-100 hover:border-gray-200"
                    )}
                    onClick={() => setMethod('cash')}
                  >
                    <div className={cn("p-4 rounded-2xl", method === 'cash' ? "bg-[#0071e3] text-white" : "bg-gray-100 text-gray-400")}>
                      <Banknote className="h-7 w-7" />
                    </div>
                    <span className="font-bold text-[15px]">Cash Payment</span>
                  </Button>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-32 flex-col gap-3 rounded-3xl border-2 transition-all",
                      method === 'card' ? "border-[#0071e3] bg-blue-50/30 text-[#0071e3]" : "border-gray-100 hover:border-gray-200"
                    )}
                    onClick={() => setMethod('card')}
                  >
                    <div className={cn("p-4 rounded-2xl", method === 'card' ? "bg-[#0071e3] text-white" : "bg-gray-100 text-gray-400")}>
                      <CreditCard className="h-7 w-7" />
                    </div>
                    <div className="text-center">
                      <span className="font-bold text-[15px] block">Contactless Card</span>
                      <span className="text-[10px] font-medium opacity-60">Tap, Insert or Swipe</span>
                    </div>
                  </Button>
                </div>
              </div>

              <Button 
                disabled={loading}
                className="w-full h-16 rounded-2xl bg-black hover:bg-gray-800 text-white font-black text-lg shadow-xl shadow-black/10 mt-auto"
                onClick={() => handleMethodContinue()}
              >
                {loading ? <Loader2 className="animate-spin" /> : <>Continue to {method === 'cash' ? 'Cash' : 'Card'}<ArrowRight className="ml-2 h-5 w-5" /></>}
              </Button>
            </div>
          )}

          {step === 'cash-input' && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-[#f5f5f7] p-6 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-gray-500">Amount Due</span>
                <span className="text-2xl font-black text-black">${total.toFixed(2)}</span>
              </div>

              <div className="space-y-4">
                <Label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Amount Tendered</Label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">₹</span>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    className="h-20 pl-12 text-3xl font-black rounded-2xl border-2 border-gray-100 focus:border-[#0071e3] bg-white transition-all"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[total, 20, 50, 100].map((amt) => (
                  <Button 
                    key={amt}
                    variant="outline" 
                    className="h-14 rounded-xl border-gray-100 font-bold text-gray-600 hover:bg-[#0071e3] hover:text-white hover:border-[#0071e3] transition-all"
                    onClick={() => handleQuickCash(amt)}
                  >
                    ${amt === total ? 'Exact' : amt}
                  </Button>
                ))}
              </div>

              <div className={cn(
                "p-8 rounded-[2rem] transition-all flex flex-col items-center justify-center text-center",
                changeDue > 0 ? "bg-emerald-50 border-2 border-emerald-100" : "bg-gray-50 border-2 border-gray-100 opacity-50"
              )}>
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Change Due</p>
                <div className="text-4xl font-black text-emerald-500">${changeDue.toFixed(2)}</div>
              </div>

              <div className="flex gap-4">
                <Button variant="ghost" className="h-14 rounded-2xl flex-1 font-bold text-gray-400" onClick={() => setStep('selection')}>
                  Back
                </Button>
                <Button 
                  className="h-14 rounded-2xl bg-black hover:bg-gray-800 text-white font-bold text-lg flex-[2] shadow-xl"
                  disabled={parseFloat(cashTendered) < total || !cashTendered}
                  onClick={() => finalizeOrder()}
                >
                  Complete Order
                </Button>
              </div>
            </div>
          )}

          {step === 'card-payment' && clientSecret && publishableKey && (
            <StripePayment 
              publishableKey={publishableKey}
              clientSecret={clientSecret} 
              amount={total} 
              onSuccess={handleStripeSuccess} 
              onCancel={() => setStep('selection')} 
            />
          )}

          {step === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in duration-300">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-gray-100 border-t-[#0071e3] rounded-full animate-spin" />
                <Wifi className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-[#0071e3] animate-pulse" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-black">Processing Transaction</h3>
                <p className="text-gray-400 font-medium">Securing payment with bank...</p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex-1 flex flex-col items-center justify-center py-10 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-[2rem] animate-ping" />
                <CheckCircle2 className="h-12 w-12 text-emerald-500 relative" />
              </div>
              <h2 className="text-3xl font-black text-black mb-3 tracking-tight">Payment Complete</h2>
              <p className="text-gray-400 font-medium mb-10 leading-relaxed text-center">
                Order <span className="text-black font-bold">#{orderId?.slice(0, 8)}</span> has been confirmed. <br />
                The stock has been updated automatically.
              </p>
              
              <div className="grid grid-cols-1 gap-4 w-full">
                <Button 
                  variant="outline" 
                  className="h-14 rounded-2xl border-gray-100 text-black font-bold text-[15px] hover:bg-gray-50 shadow-sm" 
                  onClick={downloadReceipt}
                >
                  <Download className="mr-2 h-5 w-5 text-gray-400" />
                  Save PDF Invoice
                </Button>
                <Button 
                  className="h-14 rounded-2xl bg-black hover:bg-gray-800 text-white font-bold text-[15px] shadow-xl" 
                  onClick={closeAndClear}
                >
                  Next Order
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {step === 'failed' && (
            <div className="flex-1 flex flex-col items-center justify-center py-10 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-rose-50 rounded-[2rem] flex items-center justify-center mb-8">
                <AlertCircle className="h-12 w-12 text-rose-500" />
              </div>
              <h2 className="text-2xl font-black text-black mb-2">Payment Failed</h2>
              <p className="text-gray-400 font-medium mb-10 text-center max-w-[300px]">
                {error || 'An unknown error occurred during processing.'}
              </p>
              <Button 
                className="h-14 w-full rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold"
                onClick={() => setStep('selection')}
              >
                Try Different Method
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
