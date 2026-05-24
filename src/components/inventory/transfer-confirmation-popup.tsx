'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useTransferStore } from '@/store/useTransferStore';
import { 
  Package, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowRight,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function TransferConfirmationPopup() {
  const { profile } = useAuthStore();
  const { 
    isOpen: open, 
    setIsOpen: setOpen, 
    pendingTransfer, 
    setPendingTransfer 
  } = useTransferStore();
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.store_id) {
      checkPendingTransfers();
      
      // Subscribe to new transfers
      const channel = supabase
        .channel('new_transfers')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'stock_transfers',
          filter: `target_store_id=eq.${profile.store_id}` 
        }, () => {
          checkPendingTransfers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  const checkPendingTransfers = async () => {
    if (!profile?.store_id) return;
    try {
      const { data, error } = await supabase
        .from('stock_transfers')
        .select('*')
        .eq('target_store_id', profile.store_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching transfers:', error);
        return;
      }

      if (data) {
        // Fetch source store name dynamically to avoid POSTGREST relationship constraint bugs
        let storeQuery = supabase.from('stores').select('name').eq('id', data.source_store_id);
        if (profile?.role !== 'super_admin' && profile?.company_id) {
          storeQuery = storeQuery.eq('company_id', profile.company_id);
        }
        const { data: storeData } = await storeQuery.maybeSingle();

        setPendingTransfer({
          ...data,
          source_store_name: storeData ? storeData.name : 'Admin Hub/Other Store'
        });
        setOpen(true);
      }
    } catch (err) {
      console.error('Exception in checkPendingTransfers:', err);
    }
  };

  const handleConfirm = async () => {
    if (!pendingTransfer || !profile?.store_id) return;
    setLoading(true);

    try {
      const items = pendingTransfer.items as any[];

      for (const item of items) {
        // 1. Try to find existing product by SKU in target store
        const { data: existingProduct } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', profile.store_id)
          .eq('sku', item.sku)
          .maybeSingle();

        if (existingProduct) {
          // Update existing stock
          const { error } = await supabase
            .from('products')
            .update({ stock_quantity: (existingProduct.stock_quantity || 0) + item.quantity })
            .eq('id', existingProduct.id);
          if (error) throw error;
        } else {
          // 2. If not found, copy from source store
          const { data: sourceProduct } = await supabase
            .from('products')
            .select('*')
            .eq('id', item.product_id)
            .single();

          if (sourceProduct) {
            const productData = {
              name: sourceProduct.name,
              sku: sourceProduct.sku,
              barcode: sourceProduct.barcode,
              description: sourceProduct.description,
              price: sourceProduct.price,
              cost_price: sourceProduct.cost_price,
              stock_quantity: item.quantity,
              category_id: null, // Avoid foreign key constraints in multi-tenant environment!
              image_url: sourceProduct.image_url,
              vendor_name: sourceProduct.vendor_name,
              brand_name: sourceProduct.brand_name,
              color: sourceProduct.color,
              product_type: sourceProduct.product_type,
              store_id: profile.store_id
            };

            const { error: insertError } = await supabase
              .from('products')
              .insert(productData);

            if (insertError) {
              // Double-safety net: If it violates products_sku_key constraint, append store ID suffix to SKU!
              if (insertError.message.includes('products_sku_key') || insertError.code === '23505') {
                const retrySku = `${sourceProduct.sku}-₹{profile.store_id.slice(0, 4)}`;
                const retryBarcode = sourceProduct.barcode ? `${sourceProduct.barcode}-₹{profile.store_id.slice(0, 4)}` : null;

                const { error: retryError } = await supabase
                  .from('products')
                  .insert({
                    ...productData,
                    sku: retrySku,
                    barcode: retryBarcode
                  });

                if (retryError) throw retryError;
                
                toast.warning(`SKU Conflict Resolved: Product was added with a store-specific SKU: ">₹{retrySku}". Please run the recommended SQL update in your Supabase Editor for a clean permanent fix.`);
              } else {
                throw insertError;
              }
            }
          }
        }
      }

      // 3. Mark transfer as confirmed
      const { error: updateError } = await supabase
        .from('stock_transfers')
        .update({ 
          status: 'confirmed', 
          confirmed_at: new Date().toISOString(),
          confirmed_by: profile.id
        })
        .eq('id', pendingTransfer.id);

      if (updateError) throw updateError;

      toast.success('Inventory updated successfully!');
      setOpen(false);
      setPendingTransfer(null);
      
      // Auto refresh current page inventory if we are on the inventory page
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm transfer');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!pendingTransfer) return;
    if (!confirm('Are you sure you want to decline this transfer? Stock will be automatically returned to the source store.')) return;

    setLoading(true);
    try {
      const items = pendingTransfer.items as any[];

      // Revert stock quantities back to source store's inventory
      for (const item of items) {
        const { data: sourceProduct } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .maybeSingle();

        if (sourceProduct) {
          const { error: revertError } = await supabase
            .from('products')
            .update({ stock_quantity: (sourceProduct.stock_quantity || 0) + item.quantity })
            .eq('id', item.product_id);
          if (revertError) throw revertError;
        }
      }

      const { error } = await supabase
        .from('stock_transfers')
        .update({ status: 'cancelled' })
        .eq('id', pendingTransfer.id);

      if (error) throw error;

      toast.success('Transfer declined and stock returned to source store.');
      setOpen(false);
      setPendingTransfer(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel transfer');
    } finally {
      setLoading(false);
    }
  };

  if (!pendingTransfer) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <div className="p-8 bg-[#0071e3] text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">Incoming Stock Order</DialogTitle>
              <p className="text-white/70 text-[13px] font-medium">New items arriving from {pendingTransfer.source_store_name}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
            <Info className="h-5 w-5 text-[#0071e3] shrink-0" />
            <p className="text-[13px] font-medium text-blue-800 leading-relaxed">
              An admin has initiated a stock transfer to your store. Please verify the items below. Confirming will add these quantities to your store's inventory.
            </p>
          </div>

          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {(pendingTransfer.items as any[]).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[13px] font-bold text-black truncate">{item.name}</p>
                  <p className="text-[11px] text-gray-400 font-medium">SKU: {item.sku}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3 text-gray-300" />
                  <span className="text-lg font-black text-[#0071e3]">{item.quantity} Units</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button 
              variant="ghost" 
              className="rounded-xl font-bold text-gray-400 h-12 hover:bg-rose-50 hover:text-rose-500" 
              onClick={handleDecline}
              disabled={loading}
            >
              Decline
            </Button>
            <Button 
              className="rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold h-12 shadow-lg shadow-blue-500/20"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
              Confirm Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
