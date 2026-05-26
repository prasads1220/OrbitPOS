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
import { ReceiptPrinter } from './receipt-printer';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useActiveStore } from '@/store/useActiveStore';

type CheckoutStep = 'selection' | 'cash-input' | 'card-payment' | 'processing' | 'success' | 'failed';

interface ReceiptData {
  items: any[];
  subtotal: number;
  tax: number;
  tax1?: number;
  tax2?: number;
  tax1_name?: string;
  tax1_rate?: number;
  tax2_name?: string;
  tax2_rate?: number;
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
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  pointsBalance?: number;
  pointsDiscountPercent?: number;
  pointsDiscountValue?: number;
}

export function CheckoutDialog({ 
  open, 
  onOpenChange,
  items,
  subtotal,
  tax,
  tax1 = 0,
  tax2 = 0,
  taxSettings = { tax1_name: 'CGST', tax1_rate: 4, tax2_name: 'SGST', tax2_rate: 4 },
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
  tax1?: number,
  tax2?: number,
  taxSettings?: { tax1_name: string; tax1_rate: number; tax2_name: string; tax2_rate: number },
  total: number,
  discount?: number,
  discountType?: 'amount' | 'percentage',
  initialMethod?: 'cash' | 'card'
  storeId?: string;
}) {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const { clearCart } = useCartStore();
  const customer = useCartStore(state => state.customer);
  const redeemPoints = useCartStore(state => state.redeemPoints);
  const loyaltySettings = useCartStore(state => state.loyaltySettings);
  const [step, setStep] = useState<CheckoutStep>('selection');
  const [method, setMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Split payment state
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitCard, setSplitCard] = useState<string>('');
  const [splitUpi, setSplitUpi] = useState<string>('');

  const splitCashVal = parseFloat(splitCash) || 0;
  const splitCardVal = parseFloat(splitCard) || 0;
  const splitUpiVal = parseFloat(splitUpi) || 0;
  const splitTotal = splitCashVal + splitCardVal + splitUpiVal;
  const isSplitValid = Math.abs(splitTotal - total) < 0.01;

  const storeToUse = activeStoreId || profile?.store_id;

  // Reset state when dialog closes
  useEffect(() => {
    if (open) {
      setMethod(initialMethod === 'card' ? 'card' : 'cash');
      setIsSplitPayment(false);
      setSplitCash('');
      setSplitCard('');
      setSplitUpi('');
      if (initialMethod === 'cash') {
        setStep('cash-input');
      } else {
        setStep('selection');
      }
    } else {
      setTimeout(() => {
        setStep('selection');
        setCashTendered('');
        setError(null);
        setOrderId(null);
        setReceiptData(null);
      }, 300);
    }
  }, [open, initialMethod]);

  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - total);

  const handleQuickCash = (amount: number) => {
    setCashTendered(amount.toFixed(2));
  };

  const handleRazorpayPayment = async () => {
    try {
      let paymentAmount = total;
      
      if (isSplitPayment) {
        paymentAmount = splitCardVal + splitUpiVal;
      }
      
      if (paymentAmount === 0) {
        return { success: true, paymentId: null };
      }
      
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: paymentAmount, receipt: `pos_${Date.now()}`, storeId: storeToUse }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const { orderId, keyId } = data;
 
      return new Promise<{ success: boolean; paymentId: string | null }>((resolve, reject) => {
        const options = {
          key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: Math.round(paymentAmount * 100),
          currency: 'INR',
          name: 'OrbitPOS',
          description: 'POS Transaction Checkout',
          order_id: orderId,
          handler: async (response: any) => {
            try {
              const verifyRes = await fetch('/api/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...response, storeId: storeToUse }),
              });
              const { verified, paymentId } = await verifyRes.json();
              
              if (verified) {
                resolve({ success: true, paymentId });
              } else {
                reject(new Error('Payment verification failed'));
              }
            } catch (err) {
              reject(err);
            }
          },
          prefill: {
            name: customer?.full_name || '',
            contact: customer?.phone || '',
            email: customer?.email || '',
          },
          theme: { color: '#0071e3' },
          modal: {
            ondismiss: () => {
              reject(new Error('Payment sheet cancelled by user'));
            }
          }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      });
    } catch (err: any) {
      throw new Error(err.message || 'Razorpay creation failed');
    }
  };

  const processCheckout = async () => {
    if (!storeToUse) {
      toast.error('Store ID not found. Please log in again.');
      return;
    }
    if (!items || items.length === 0) {
      toast.error('Cart is empty. Cannot process order.');
      return;
    }

    setStep('processing');
    let rzpResult: { success: boolean; paymentId: string | null } | null = null;

    try {
      // 1. Bypass actual Razorpay popup (mock success for card/upi)
      if (isSplitPayment) {
        if (!isSplitValid) {
          throw new Error(`Split total (₹${splitTotal.toFixed(2)}) must equal Total Due (₹${total.toFixed(2)})`);
        }
        if (splitCardVal > 0 || splitUpiVal > 0) {
          rzpResult = { success: true, paymentId: `rzp_mock_${Math.random().toString(36).substring(2, 10)}` };
        }
      } else if (method === 'card' || method === 'upi') {
        rzpResult = { success: true, paymentId: `rzp_mock_${Math.random().toString(36).substring(2, 10)}` };
      }

      // 2. Finalize order in Supabase
      const pointsEarned = customer ? Math.floor(total / loyaltySettings.earn_ratio) * loyaltySettings.earn_value : 0;
      const pointsRedeemed = customer && redeemPoints && customer.loyalty_points >= loyaltySettings.redeem_ratio ? loyaltySettings.redeem_ratio : 0;
      const pointsDiscount = (customer && redeemPoints && customer.loyalty_points >= loyaltySettings.redeem_ratio) ? (subtotal + tax - discount) * (loyaltySettings.discount_percent / 100) : 0;
      const finalDiscountAmount = discount + pointsDiscount;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          total_amount: total,
          tax_amount: tax,
          discount_amount: finalDiscountAmount,
          payment_method: isSplitPayment ? 'split' : method,
          payment_status: 'completed',
          store_id: storeToUse,
          cashier_id: profile?.id,
          stripe_payment_intent_id: rzpResult?.paymentId || null,
          customer_id: customer ? customer.id : null,
          points_earned: pointsEarned,
          points_redeemed: pointsRedeemed,
          split_cash_amount: isSplitPayment ? splitCashVal : (method === 'cash' ? total : 0),
          split_card_amount: isSplitPayment ? splitCardVal : (method === 'card' ? total : 0),
          split_upi_amount: isSplitPayment ? splitUpiVal : (method === 'upi' ? total : 0),
          is_split_payment: isSplitPayment
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Update customer loyalty points
      if (customer) {
        const newPoints = customer.loyalty_points - pointsRedeemed + pointsEarned;
        const { error: customerUpdateError } = await supabase
          .from('customers')
          .update({ loyalty_points: newPoints })
          .eq('id', customer.id);
        
        if (customerUpdateError) {
          console.error("Error updating customer points:", customerUpdateError);
        } else {
          useCartStore.setState({
            customer: {
              ...customer,
              loyalty_points: newPoints
            }
          });
        }
      }

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
          await supabase
            .from('product_variants')
            .update({ stock_quantity: Math.max(0, item.stock_quantity - item.quantity) })
            .eq('id', item.variant_id);

          if (item.serial_number) {
            await supabase
              .from('serialized_inventory')
              .update({ status: 'sold', order_id: order.id })
              .eq('variant_id', item.variant_id)
              .eq('serial_number', item.serial_number);
          }
        } else {
          await supabase
            .from('products')
            .update({ stock_quantity: Math.max(0, item.stock_quantity - item.quantity) })
            .eq('id', item.id);

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
      
      setReceiptData({
        items: [...items],
        subtotal,
        tax,
        tax1,
        tax2,
        tax1_name: taxSettings.tax1_name,
        tax1_rate: taxSettings.tax1_rate,
        tax2_name: taxSettings.tax2_name,
        tax2_rate: taxSettings.tax2_rate,
        total,
        orderId: order.id,
        date: new Date().toLocaleString(),
        method: isSplitPayment ? 'split' : method,
        discount,
        discountType,
        cardLast4: rzpResult?.paymentId ? rzpResult.paymentId.slice(-4) : undefined,
        cashTendered: method === 'cash' ? cashTendered : undefined,
        changeDue: method === 'cash' ? changeDue : undefined,
        cashierName: profile?.full_name || 'System',
        customerName: customer ? customer.full_name : undefined,
        customerPhone: customer ? customer.phone || undefined : undefined,
        customerEmail: customer ? customer.email || undefined : undefined,
        pointsEarned: pointsEarned,
        pointsRedeemed: pointsRedeemed,
        pointsDiscountPercent: redeemPoints ? loyaltySettings.discount_percent : 0,
        pointsDiscountValue: pointsDiscount,
        pointsBalance: customer ? (customer.loyalty_points - pointsRedeemed + pointsEarned) : 0
      });

      // Trigger WhatsApp receipt via OpenWA Docker API
      if (customer && customer.phone) {
        fetch('/api/whatsapp/send-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        }).catch(err => console.error('Background WhatsApp dispatch error:', err));
      }

      setStep('success');
      clearCart();
      toast.success('Transaction Completed');
    } catch (err: any) {
      console.error("Checkout process error:", err);
      
      // Rollback charged payment via Razorpay refund
      if (rzpResult?.paymentId) {
        try {
          const refundAmount = isSplitPayment ? (splitCardVal + splitUpiVal) : total;
          toast.info('Database save failed. Launching Razorpay rollback refund...');
          await fetch('/api/razorpay/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: rzpResult.paymentId, amount: refundAmount, storeId: storeToUse }),
          });
          toast.success('Razorpay transaction successfully rolled back.');
        } catch (refundErr: any) {
          console.error("Razorpay rollback refund exception:", refundErr);
          toast.error(`Refund rollback failed: ${refundErr.message}. Manual refund required.`);
        }
      }

      setError(err.message || 'Database error occurred during check out.');
      setStep('failed');
    }
  };

  useEffect(() => {
    const autoPrint = profile?.stores?.auto_print_receipt !== false;
    if (step === 'success' && receiptData && autoPrint) {
      handlePrint();
      const timer = setTimeout(() => {
        setReceiptData(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, receiptData, profile?.stores?.auto_print_receipt]);

  const handlePrint = () => {
    const printContent = document.getElementById('printable-receipt');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print receipts');
      return;
    }

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
              font-family: monospace !important;
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
    doc.text(`Order ID: #${receiptData.orderId.slice(0, 8)}`, 20, 56);
    doc.text(`Date: ${receiptData.date}`, 20, 63);
    doc.text(`Payment: ${receiptData.method.toUpperCase()}${receiptData.cardLast4 ? ` (Card ending in ${receiptData.cardLast4})` : ''}`, 20, 70);
    
    if (receiptData.customerName) {
      doc.setFont('helvetica', 'bold');
      doc.text('CUSTOMER DETAILS:', 20, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${receiptData.customerName}`, 20, 86);
      doc.text(`Phone: ${receiptData.customerPhone || 'N/A'} | Email: ${receiptData.customerEmail || 'N/A'}`, 20, 92);
    }

    let y = receiptData.customerName ? 104 : 85;
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
    if (receiptData.tax1 !== undefined && receiptData.tax2 !== undefined) {
      doc.text(`${receiptData.tax1_name || 'CGST'} (${(receiptData.tax1_rate || 4).toFixed(1)}%):`, 130, y);
      doc.text(`₹${receiptData.tax1.toFixed(2)}`, 190, y, { align: 'right' });
      y += 7;
      doc.text(`${receiptData.tax2_name || 'SGST'} (${(receiptData.tax2_rate || 4).toFixed(1)}%):`, 130, y);
      doc.text(`₹${receiptData.tax2.toFixed(2)}`, 190, y, { align: 'right' });
    } else {
      doc.text('Tax (8%):', 130, y);
      doc.text(`₹${receiptData.tax.toFixed(2)}`, 190, y, { align: 'right' });
    }
    if (receiptData.discount > 0) {
      y += 7;
      doc.setTextColor(220, 50, 50);
      doc.text('Discount:', 130, y);
      const discStr = receiptData.discountType === 'percentage' ? `${receiptData.discount}%` : `₹${receiptData.discount.toFixed(2)}`;
      doc.text(`-₹${discStr}`, 190, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    }

    if (receiptData.pointsRedeemed && receiptData.pointsRedeemed > 0) {
      y += 7;
      doc.setTextColor(220, 50, 50);
      const discountPct = receiptData.pointsDiscountPercent || 2;
      doc.text(`Loyalty Discount (${discountPct}%):`, 130, y);
      const pointsDiscVal = receiptData.pointsDiscountValue || ((receiptData.subtotal + receiptData.tax - (receiptData.discountType === 'percentage' ? (receiptData.subtotal + receiptData.tax) * (receiptData.discount / 100) : receiptData.discount)) * 0.02);
      doc.text(`-₹${pointsDiscVal.toFixed(2)}`, 190, y, { align: 'right' });
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

    if (receiptData.customerName) {
      y += 15;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('LOYALTY POINTS SUMMARY:', 20, y);
      doc.setFont('helvetica', 'normal');
      y += 7;
      doc.text(`Points Earned this Visit: +${receiptData.pointsEarned}`, 20, y);
      y += 7;
      doc.text(`Points Redeemed: -${receiptData.pointsRedeemed}`, 20, y);
      y += 7;
      doc.text(`New Points Balance: ${receiptData.pointsBalance} pts`, 20, y);
    }
    
    y += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for shopping with OrbitPOS!', 105, y, { align: 'center' });
    
    doc.save(`orbitpos-receipt-${receiptData.orderId.slice(0, 8)}.pdf`);
  };

  const closeAndClear = () => {
    clearCart();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val && step === 'success') {
        clearCart();
      }
      onOpenChange(val);
    }}>
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
        <div className="p-10 min-h-[400px] flex flex-col justify-start">
          
          {step === 'selection' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Amount Due</p>
                <div className="text-4xl font-black text-[#0071e3] tracking-tighter">₹{total.toFixed(2)}</div>
              </div>

              {/* Split Payment Controls (Task 1.5) */}
              <div className="space-y-3 p-5 bg-[#f5f5f7] rounded-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-[12px] font-black text-black uppercase tracking-wider">Split Payment Mode</Label>
                    <p className="text-[9px] text-gray-400 font-bold mt-0.5">Pay using a combination of Cash/Card/UPI</p>
                  </div>
                  <Button
                    type="button"
                    variant={isSplitPayment ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setIsSplitPayment(!isSplitPayment);
                      setSplitCash('');
                      setSplitCard('');
                      setSplitUpi('');
                    }}
                    className={cn("rounded-xl h-8 px-3.5 text-[10px] font-black tracking-wider uppercase transition-all", isSplitPayment ? "bg-[#0071e3] hover:bg-[#0077ed] text-white" : "border-gray-200 text-gray-400")}
                  >
                    {isSplitPayment ? "Disable" : "Enable"}
                  </Button>
                </div>
                
                {isSplitPayment && (
                  <div className="space-y-3.5 pt-3.5 border-t border-gray-200/55 animate-in fade-in duration-300">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Cash (₹)</p>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={splitCash}
                          onChange={(e) => setSplitCash(e.target.value)}
                          className="h-10 bg-white rounded-xl text-center font-bold text-[13px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Card (₹)</p>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={splitCard}
                          onChange={(e) => setSplitCard(e.target.value)}
                          className="h-10 bg-white rounded-xl text-center font-bold text-[13px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">UPI (₹)</p>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={splitUpi}
                          onChange={(e) => setSplitUpi(e.target.value)}
                          className="h-10 bg-white rounded-xl text-center font-bold text-[13px]"
                        />
                      </div>
                    </div>
                    <div className={cn("p-2.5 rounded-xl text-center font-mono text-[11px] font-bold transition-all", isSplitValid ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500")}>
                      Split Total: ₹{splitTotal.toFixed(2)} / ₹{total.toFixed(2)}
                      {!isSplitValid && <p className="text-[8px] font-sans font-bold uppercase tracking-wider mt-0.5">Amounts must equal exactly ₹{total.toFixed(2)}</p>}
                    </div>
                  </div>
                )}
              </div>

              {!isSplitPayment && (
                <div className="space-y-4 w-full">
                  <Label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Select Payment Method</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      className={cn(
                        "h-24 flex-col gap-2 rounded-2xl border-2 transition-all p-3",
                        method === 'cash' ? "border-[#0071e3] bg-blue-50/30 text-[#0071e3]" : "border-gray-100 hover:border-gray-200"
                      )}
                      onClick={() => setMethod('cash')}
                    >
                      <Banknote className="h-6 w-6" />
                      <span className="font-bold text-[13px]">Cash</span>
                    </Button>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-24 flex-col gap-2 rounded-2xl border-2 transition-all p-3",
                        method === 'card' ? "border-[#0071e3] bg-blue-50/30 text-[#0071e3]" : "border-gray-100 hover:border-gray-200"
                      )}
                      onClick={() => setMethod('card')}
                    >
                      <CreditCard className="h-6 w-6" />
                      <span className="font-bold text-[13px]">Card (Online)</span>
                    </Button>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-24 flex-col gap-2 rounded-2xl border-2 transition-all p-3",
                        method === 'upi' ? "border-[#0071e3] bg-blue-50/30 text-[#0071e3]" : "border-gray-100 hover:border-gray-200"
                      )}
                      onClick={() => setMethod('upi')}
                    >
                      <Smartphone className="h-6 w-6" />
                      <span className="font-bold text-[13px]">UPI / QR</span>
                    </Button>
                  </div>
                </div>
              )}

              <Button 
                disabled={isSplitPayment ? !isSplitValid : false}
                className="w-full h-16 rounded-2xl bg-black hover:bg-gray-800 text-white font-black text-[16px] shadow-xl shadow-black/10 mt-auto"
                onClick={() => {
                  if (isSplitPayment) {
                    processCheckout();
                  } else if (method === 'cash') {
                    setStep('cash-input');
                  } else {
                    processCheckout();
                  }
                }}
              >
                {isSplitPayment ? "Complete Split Transaction" : `Continue to ${method.toUpperCase()} Payment`}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {step === 'cash-input' && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 w-full">
              <div className="bg-[#f5f5f7] p-6 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-gray-500">Amount Due</span>
                <span className="text-2xl font-black text-black">₹{total.toFixed(2)}</span>
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
                    ₹{amt === total ? 'Exact' : amt}
                  </Button>
                ))}
              </div>

              <div className={cn(
                "p-8 rounded-[2rem] transition-all flex flex-col items-center justify-center text-center",
                changeDue > 0 ? "bg-emerald-50 border-2 border-emerald-100" : "bg-gray-50 border-2 border-gray-100 opacity-50"
              )}>
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Change Due</p>
                <div className="text-4xl font-black text-emerald-500">₹{changeDue.toFixed(2)}</div>
              </div>

              <div className="flex gap-4">
                <Button variant="ghost" className="h-14 rounded-2xl flex-1 font-bold text-gray-400" onClick={() => setStep('selection')}>
                  Back
                </Button>
                <Button 
                  className="h-14 rounded-2xl bg-black hover:bg-gray-800 text-white font-bold text-lg flex-[2] shadow-xl"
                  disabled={parseFloat(cashTendered) < total || !cashTendered}
                  onClick={() => processCheckout()}
                >
                  Complete Order
                </Button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in duration-300 w-full">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-gray-100 border-t-[#0071e3] rounded-full animate-spin" />
                <Wifi className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-[#0071e3] animate-pulse" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-black">Processing Transaction</h3>
                <p className="text-gray-400 font-medium">Securing payment...</p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex-1 flex flex-col items-center justify-center py-10 animate-in zoom-in-95 duration-500 w-full">
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
            <div className="flex-1 flex flex-col items-center justify-center py-10 animate-in zoom-in-95 duration-500 w-full">
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
