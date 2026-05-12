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
  Mail,
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
import { cn } from '@/lib/utils';

type CheckoutStep = 'selection' | 'cash-input' | 'card-simulation' | 'processing' | 'success' | 'failed';

export function CheckoutDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { items, total, subtotal, tax, clearCart } = useCartStore();
  const [step, setStep] = useState<CheckoutStep>('selection');
  const [method, setMethod] = useState<'cash' | 'card'>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('selection');
        setCashTendered('');
        setError(null);
      }, 300);
    }
  }, [open]);

  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - total);

  const handleQuickCash = (amount: number) => {
    setCashTendered(amount.toFixed(2));
  };

  const finalizeOrder = async () => {
    if (!profile?.store_id) {
      toast.error('Store ID not found. Please log in again.');
      return;
    }
    setStep('processing');
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          total_amount: total,
          tax_amount: tax,
          payment_method: method,
          payment_status: 'completed',
          store_id: profile.store_id,
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
        store_id: profile.store_id,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update inventory
      for (const item of items) {
        await supabase
          .from('products')
          .update({ stock_quantity: Math.max(0, item.stock_quantity - item.quantity) })
          .eq('id', item.id);
          
        await supabase
          .from('inventory_logs')
          .insert({
            product_id: item.id,
            change_amount: -item.quantity,
            reason: 'sale',
            store_id: profile.store_id,
          });
      }

      setOrderId(order.id);
      setStep('success');
      toast.success('Transaction Completed');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Database error occurred');
      setStep('failed');
    }
  };

  const startCardSimulation = () => {
    setStep('card-simulation');
  };

  const simulateProcessing = () => {
    setStep('processing');
    // 90% success rate for simulation
    const isSuccess = Math.random() > 0.1;
    
    setTimeout(() => {
      if (isSuccess) {
        finalizeOrder();
      } else {
        setError('Card declined by issuer. Please try another card or payment method.');
        setStep('failed');
      }
    }, 2500);
  };

  const downloadReceipt = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('ORBITPOS', 105, 30, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('MODERN RETAIL EXPERIENCE', 105, 38, { align: 'center' });
    doc.text('----------------------------------------------------', 105, 45, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(`Order ID: #${orderId?.slice(0, 8)}`, 20, 60);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 68);
    doc.text(`Payment: ${method.toUpperCase()}`, 20, 76);
    
    let y = 90;
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM', 20, y);
    doc.text('QTY', 120, y);
    doc.text('PRICE', 150, y);
    doc.text('TOTAL', 180, y, { align: 'right' });
    
    doc.line(20, y + 2, 190, y + 2);
    y += 12;
    
    doc.setFont('helvetica', 'normal');
    items.forEach(item => {
      doc.text(item.name.substring(0, 30), 20, y);
      doc.text(item.quantity.toString(), 122, y);
      doc.text(`$${item.price.toFixed(2)}`, 150, y);
      doc.text(`$${(item.quantity * item.price).toFixed(2)}`, 190, y, { align: 'right' });
      y += 10;
    });

    y += 5;
    doc.line(130, y, 190, y);
    y += 10;
    doc.text('Subtotal:', 130, y);
    doc.text(`$${subtotal.toFixed(2)}`, 190, y, { align: 'right' });
    y += 7;
    doc.text('Tax (8%):', 130, y);
    doc.text(`$${tax.toFixed(2)}`, 190, y, { align: 'right' });
    y += 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 130, y);
    doc.text(`$${total.toFixed(2)}`, 190, y, { align: 'right' });

    if (method === 'cash') {
      y += 15;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Amount Tendered:', 130, y);
      doc.text(`$${(parseFloat(cashTendered) || total).toFixed(2)}`, 190, y, { align: 'right' });
      y += 7;
      doc.text('Change:', 130, y);
      doc.text(`$${changeDue.toFixed(2)}`, 190, y, { align: 'right' });
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for shopping with OrbitPOS!', 105, y + 30, { align: 'center' });
    
    doc.save(`orbitpos-receipt-${orderId?.slice(0, 8)}.pdf`);
  };

  const closeAndClear = () => {
    clearCart();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white">
        
        {/* Header Section */}
        <div className="p-10 bg-[#fbfbfd] border-b border-gray-50 relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-6 right-6 text-gray-300 hover:text-black rounded-full"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
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
                    <span className="font-bold text-[15px]">Card / Apple Pay</span>
                  </Button>
                </div>
              </div>

              <Button 
                className="w-full h-16 rounded-2xl bg-black hover:bg-gray-800 text-white font-black text-lg shadow-xl shadow-black/10 mt-auto"
                onClick={() => method === 'cash' ? setStep('cash-input') : startCardSimulation()}
              >
                Continue to {method === 'cash' ? 'Cash' : 'Card'}
                <ArrowRight className="ml-2 h-5 w-5" />
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
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">$</span>
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
                  onClick={finalizeOrder}
                >
                  Complete Order
                </Button>
              </div>
            </div>
          )}

          {step === 'card-simulation' && (
            <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-10 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-32 h-32 bg-blue-50 rounded-[2.5rem] flex items-center justify-center relative">
                <div className="absolute inset-0 bg-blue-500/10 rounded-[2.5rem] animate-ping duration-[2000ms]" />
                <CreditCard className="h-12 w-12 text-[#0071e3] relative" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-black">Ready to Pay</h3>
                <p className="text-gray-400 font-medium">Please Insert, Tap or Swipe Card</p>
              </div>

              <div className="grid grid-cols-3 gap-6 w-full">
                <button onClick={simulateProcessing} className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100 group">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <Smartphone className="h-6 w-6 text-gray-400" />
                  </div>
                  <span className="font-bold text-[13px] text-gray-500">Tap</span>
                </button>
                <button onClick={simulateProcessing} className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100 group">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <Wallet className="h-6 w-6 text-gray-400" />
                  </div>
                  <span className="font-bold text-[13px] text-gray-500">Insert</span>
                </button>
                <button onClick={simulateProcessing} className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100 group">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <CreditCard className="h-6 w-6 text-gray-400" />
                  </div>
                  <span className="font-bold text-[13px] text-gray-500">Swipe</span>
                </button>
              </div>

              <Button variant="ghost" className="font-bold text-gray-300" onClick={() => setStep('selection')}>
                Cancel Transaction
              </Button>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in duration-300">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-gray-100 border-t-[#0071e3] rounded-full animate-spin" />
                <Wifi className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-[#0071e3] animate-pulse" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-black">Processing Payment</h3>
                <p className="text-gray-400 font-medium">Communicating with bank terminal...</p>
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
                  Save PDF Receipt
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
              <h2 className="text-3xl font-black text-black mb-3 tracking-tight">Payment Declined</h2>
              <p className="text-rose-500 font-medium mb-10 leading-relaxed text-center bg-rose-50 p-4 rounded-2xl border border-rose-100">
                {error || 'Transaction failed. Please try again.'}
              </p>
              
              <div className="grid grid-cols-2 gap-4 w-full">
                <Button 
                  variant="outline" 
                  className="h-14 rounded-2xl border-gray-100 text-black font-bold text-[15px]" 
                  onClick={() => setStep('selection')}
                >
                  Other Method
                </Button>
                <Button 
                  className="h-14 rounded-2xl bg-black hover:bg-gray-800 text-white font-bold text-[15px]" 
                  onClick={() => method === 'cash' ? finalizeOrder() : startCardSimulation()}
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Retry
                </Button>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
