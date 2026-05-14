'use client';

import { useAuthStore } from '@/store/useAuthStore';

interface ReceiptPrinterProps {
  receiptData: {
    orderId: string;
    date: string;
    method: string;
    items: any[];
    subtotal: number;
    tax: number;
    total: number;
    discount: number;
    cardLast4?: string;
    cashTendered?: string;
    changeDue?: number;
    type?: 'sale' | 'refund' | 'void';
    refundReason?: string;
  } | null;
}

export function ReceiptPrinter({ receiptData }: ReceiptPrinterProps) {
  const { profile } = useAuthStore();

  if (!receiptData) return null;

  return (
    <div id="printable-receipt" className="hidden print:block p-8 bg-white text-black font-mono text-[12px] w-[80mm]">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; }
          #printable-receipt {
            position: fixed;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 10mm;
            background: white;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}} />
      <div className="space-y-4">
        <div className="text-center border-b pb-4 mb-4">
          <h1 className="text-xl font-bold uppercase">OrbitPOS</h1>
          <p className="text-[10px] font-medium opacity-70">Modern Retail Experience</p>
          <p className="text-[10px] font-medium">{profile?.stores?.name || 'Store #1'}</p>
        </div>

        <div className="text-center py-1 border-y border-dashed mb-4">
          <p className="font-bold uppercase tracking-widest text-[14px]">
            {receiptData.type === 'refund' ? '*** REFUND RECEIPT ***' : 
             receiptData.type === 'void' ? '*** VOID RECEIPT ***' : 
             '*** SALES RECEIPT ***'}
          </p>
        </div>

        <div className="space-y-1 text-[10px]">
          <p className="flex justify-between"><span>ORDER:</span> <span>#{receiptData.orderId.slice(0, 8)}</span></p>
          <p className="flex justify-between"><span>DATE:</span> <span>{receiptData.date}</span></p>
          <p className="flex justify-between"><span>METHOD:</span> <span>{receiptData.method.toUpperCase()} {receiptData.cardLast4 ? `(*${receiptData.cardLast4})` : ''}</span></p>
        </div>

        <div className="border-t border-b py-2 space-y-2">
          <div className="flex justify-between font-bold">
            <span className="w-1/2">ITEM</span>
            <span className="w-1/4 text-center">QTY</span>
            <span className="w-1/4 text-right">TOTAL</span>
          </div>
          {receiptData.items.map((item, i) => (
            <div key={i} className="flex justify-between">
              <span className="w-1/2 truncate">{item.name || item.products?.name}</span>
              <span className="w-1/4 text-center">x{item.quantity}</span>
              <span className="w-1/4 text-right">
                {receiptData.type === 'refund' ? '-' : ''}${((item.quantity * (item.price || item.unit_price)) || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-1 pt-2">
          <p className="flex justify-between">
            <span>SUBTOTAL:</span> 
            <span>{receiptData.type === 'refund' ? '-' : ''}${receiptData.subtotal.toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span>TAX:</span> 
            <span>{receiptData.type === 'refund' ? '-' : ''}${receiptData.tax.toFixed(2)}</span>
          </p>
          {receiptData.discount > 0 && (
            <p className="flex justify-between text-rose-600">
              <span>DISCOUNT:</span> 
              <span>-${receiptData.discount.toFixed(2)}</span>
            </p>
          )}
          <p className="flex justify-between text-lg font-bold border-t pt-2">
            <span>TOTAL:</span> 
            <span>{receiptData.type === 'refund' ? '-' : ''}${receiptData.total.toFixed(2)}</span>
          </p>
        </div>

        {receiptData.method === 'cash' && receiptData.type === 'sale' && (
          <div className="space-y-1 border-t pt-2 opacity-80">
            <p className="flex justify-between"><span>CASH TENDERED:</span> <span>${(parseFloat(receiptData.cashTendered || '0') || receiptData.total).toFixed(2)}</span></p>
            <p className="flex justify-between"><span>CHANGE DUE:</span> <span>${(receiptData.changeDue || 0).toFixed(2)}</span></p>
          </div>
        )}

        {receiptData.refundReason && (
          <div className="pt-2 border-t text-[10px] italic opacity-70">
            <p>Reason: {receiptData.refundReason}</p>
          </div>
        )}

        <div className="text-center pt-8 border-t border-dashed mt-8">
          <p className="font-bold">THANK YOU FOR SHOPPING!</p>
          <p className="text-[9px] mt-1 italic">Visit us again soon.</p>
        </div>
      </div>
    </div>
  );
}
