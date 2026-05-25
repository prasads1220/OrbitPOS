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
    cardBrand?: string;
    cashTendered?: string;
    changeDue?: number;
    cashierName?: string;
    type?: 'sale' | 'refund' | 'void';
    refundReason?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    pointsEarned?: number;
    pointsRedeemed?: number;
    pointsBalance?: number;
    pointsDiscountPercent?: number;
    pointsDiscountValue?: number;
  } | null;
}

export function ReceiptPrinter({ receiptData }: ReceiptPrinterProps) {
  const { profile } = useAuthStore();

  if (!receiptData) return null;

  return (
    <div id="printable-receipt" className="hidden p-8 bg-white text-black font-mono text-[12px] w-[80mm]">
      {/* 
        This component is hidden from the main UI. 
        The content is captured and printed in a dedicated popup window via handlePrint() 
        in CheckoutDialog.tsx to ensure perfect thermal formatting.
      */}
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
          <p className="flex justify-between uppercase">
            <span>METHOD:</span> 
            <span>
              {receiptData.method === 'card' 
                ? `${receiptData.cardBrand || 'CARD'} **** ${receiptData.cardLast4 || '****'}` 
                : receiptData.method}
            </span>
          </p>
          {receiptData.cashierName && (
            <p className="flex justify-between uppercase">
              <span>CASHIER:</span> 
              <span>{receiptData.cashierName}</span>
            </p>
          )}

          {receiptData.customerName && (
            <div className="border-t border-dashed pt-1.5 mt-1.5 space-y-0.5">
              <p className="flex justify-between"><span>CUSTOMER:</span> <span className="font-bold">{receiptData.customerName}</span></p>
              {receiptData.customerPhone && (
                <p className="flex justify-between"><span>PHONE:</span> <span>{receiptData.customerPhone}</span></p>
              )}
              {receiptData.customerEmail && (
                <p className="flex justify-between"><span>EMAIL:</span> <span>{receiptData.customerEmail}</span></p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-b py-2 space-y-2">
          <div className="flex justify-between font-bold">
            <span className="w-1/2">ITEM</span>
            <span className="w-1/4 text-center">QTY</span>
            <span className="w-1/4 text-right">TOTAL</span>
          </div>
          {receiptData.items.map((item, i) => (
            <div key={i} className="space-y-0.5 border-b border-gray-50 pb-1">
              <div className="flex justify-between">
                <span className="w-1/2 truncate">{item.name || item.products?.name}</span>
                <span className="w-1/4 text-center">x{item.quantity}</span>
                <span className="w-1/4 text-right">
                  {receiptData.type === 'refund' ? '-' : ''}₹{((item.quantity * (item.price || item.unit_price)) || 0).toFixed(2)}
                </span>
              </div>
              {(item.variant_name || item.serial_number) && (
                <div className="text-[9px] opacity-75 italic pl-2 flex flex-col">
                  {item.variant_name && <span>Model: {item.variant_name}</span>}
                  {item.serial_number && <span>S/N: {item.serial_number}</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-1 pt-2">
          <p className="flex justify-between">
            <span>SUBTOTAL:</span> 
            <span>{receiptData.type === 'refund' ? '-' : ''}₹{receiptData.subtotal.toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span>TAX:</span> 
            <span>{receiptData.type === 'refund' ? '-' : ''}₹{receiptData.tax.toFixed(2)}</span>
          </p>
          {receiptData.discount > 0 && (
            <p className="flex justify-between text-rose-600">
              <span>DISCOUNT:</span> 
              <span>-₹{receiptData.discount.toFixed(2)}</span>
            </p>
          )}
          {receiptData.pointsRedeemed && receiptData.pointsRedeemed > 0 && (
            <p className="flex justify-between text-rose-600">
              <span>POINTS DISCOUNT ({receiptData.pointsDiscountPercent || 2}%):</span> 
              <span>-₹{(receiptData.pointsDiscountValue || ((receiptData.subtotal + receiptData.tax - receiptData.discount) * 0.02)).toFixed(2)}</span>
            </p>
          )}
          <p className="flex justify-between text-lg font-bold border-t pt-2">
            <span>TOTAL:</span> 
            <span>{receiptData.type === 'refund' ? '-' : ''}₹{receiptData.total.toFixed(2)}</span>
          </p>
        </div>

        {receiptData.method === 'cash' && receiptData.type === 'sale' && (
          <div className="space-y-1 border-t pt-2 opacity-80">
            <p className="flex justify-between"><span>CASH TENDERED:</span> <span>₹{(parseFloat(receiptData.cashTendered || '0') || receiptData.total).toFixed(2)}</span></p>
            <p className="flex justify-between"><span>CHANGE DUE:</span> <span>₹{(receiptData.changeDue || 0).toFixed(2)}</span></p>
          </div>
        )}

        {receiptData.customerName && (
          <div className="border-t border-b border-dashed py-2 space-y-1 text-[10px] opacity-90">
            <p className="font-bold text-center uppercase tracking-wider text-[11px] mb-1">Loyalty Points Summary</p>
            <p className="flex justify-between"><span>POINTS EARNED:</span> <span className="font-bold text-[#0071e3] font-mono">+{receiptData.pointsEarned || 0}</span></p>
            <p className="flex justify-between"><span>POINTS REDEEMED:</span> <span className="font-bold text-rose-500 font-mono">-{receiptData.pointsRedeemed || 0}</span></p>
            <p className="flex justify-between border-t border-gray-100 pt-1 mt-1 font-bold"><span>CURRENT BALANCE:</span> <span>{receiptData.pointsBalance || 0} pts</span></p>
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
