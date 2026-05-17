'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Send, 
  ArrowRight, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Loader2,
  Package,
  Store,
  Printer,
  X
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function StockTransferPage() {
  const { profile } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [targetStoreId, setTargetStoreId] = useState<string>('');
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  
  // Invoice states
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedTransfer, setCompletedTransfer] = useState<any>(null);

  useEffect(() => {
    if (profile?.store_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    const { data: pData } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', profile?.store_id);
    
    const { data: sData } = await supabase
      .from('stores')
      .select('*')
      .neq('id', profile?.store_id);

    if (pData) setProducts(pData);
    if (sData) setStores(sData);
    setLoading(false);
  };

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock_quantity) {
        toast.error('Cannot exceed available stock');
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, qty: number) => {
    const product = products.find(p => p.id === id);
    if (qty > product.stock_quantity) {
      toast.error('Cannot exceed available stock');
      return;
    }
    if (qty <= 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      setCart(cart.map(item => item.id === id ? { ...item, quantity: qty } : item));
    }
  };

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleTransfer = async () => {
    if (!targetStoreId || cart.length === 0 || !profile?.store_id) {
      toast.error('Please select target store and items');
      return;
    }

    setSubmitting(true);
    try {
      const selectedStore = stores.find(s => s.id === targetStoreId);
      const targetStoreName = selectedStore ? selectedStore.name : 'Target Store';

      // 1. Create transfer record
      const { data: transfer, error: tError } = await supabase
        .from('stock_transfers')
        .insert({
          source_store_id: profile.store_id,
          target_store_id: targetStoreId,
          items: cart.map(item => ({
            product_id: item.id,
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          status: 'pending'
        })
        .select()
        .single();

      if (tError) throw tError;

      // 2. Decrease source inventory
      for (const item of cart) {
        const { error: pError } = await supabase
          .from('products')
          .update({ stock_quantity: item.stock_quantity - item.quantity })
          .eq('id', item.id);
        
        if (pError) throw pError;
      }

      // Save transfer copy for receipt print
      const transferInvoice = {
        id: transfer.id.slice(0, 8).toUpperCase(),
        targetStoreName,
        items: [...cart],
        totalQuantity,
        totalPrice,
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      setCompletedTransfer(transferInvoice);
      setShowInvoice(true);

      toast.success('Stock transfer initiated!');
      setCart([]);
      setTargetStoreId('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to transfer stock');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-700">
      <div className="space-y-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Initiate Transfer</h1>
          <p className="text-[#86868b] font-medium mt-1">Select items to send to another store location.</p>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
          <Input 
            placeholder="Search products to transfer..." 
            className="pl-12 h-14 bg-white border-gray-100 rounded-2xl shadow-sm font-medium" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-50">
                <TableHead className="pl-6">Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="pr-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-300" /></TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-gray-400">No products available</TableCell>
                </TableRow>
              ) : filteredProducts.map((p) => (
                <TableRow key={p.id} className="border-gray-50 group">
                  <TableCell className="pl-6">
                    <div>
                      <p className="font-bold text-black">{p.name}</p>
                      <p className="text-[11px] text-gray-400">{p.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-black">${p.price.toFixed(2)}</TableCell>
                  <TableCell className="font-bold">{p.stock_quantity}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-xl hover:bg-blue-50 hover:text-[#0071e3] font-bold"
                      onClick={() => addToCart(p)}
                      disabled={p.stock_quantity <= 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-8 flex flex-col h-fit sticky top-8 print:hidden">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-black">Transfer Cart</h2>
          <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            {cart.length} Items
          </div>
        </div>

        <div className="space-y-6 mb-8">
          <div className="space-y-2">
            <Label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Destination Store</Label>
            <Select value={targetStoreId} onValueChange={(val) => setTargetStoreId(val || '')}>
              <SelectTrigger className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl font-bold">
                <SelectValue placeholder="Select a store" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                {stores.map(s => (
                  <SelectItem key={s.id} value={s.id} className="font-bold rounded-xl">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 space-y-4 max-h-[300px] overflow-y-auto mb-8 pr-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-300">
              <Package className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-bold">Cart is empty</p>
            </div>
          ) : cart.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 bg-[#fbfbfd] p-4 rounded-2xl border border-gray-50">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-4">
                  <p className="text-[13px] font-bold text-black truncate">{item.name}</p>
                  <p className="text-[11px] text-gray-400 font-medium">Price: ${item.price.toFixed(2)} | Avail: {item.stock_quantity}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50 rounded-xl h-8 w-8 shrink-0" onClick={() => updateQuantity(item.id, 0)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100/50 pt-2 mt-1">
                <div className="flex items-center bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
                  <button className="p-1 hover:bg-gray-50 rounded-lg" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-3 w-3" /></button>
                  <span className="px-3 text-sm font-black min-w-8 text-center">{item.quantity}</span>
                  <button className="p-1 hover:bg-gray-50 rounded-lg" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></button>
                </div>
                <span className="font-bold text-black text-sm">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-gray-100 pt-6 mb-6 space-y-3">
            <div className="flex justify-between text-[13px] font-bold text-gray-400 uppercase tracking-widest">
              <span>Total Quantity</span>
              <span className="text-black font-black">{totalQuantity} Units</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Value</span>
              <span className="text-3xl font-black text-[#0071e3]">${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        )}

        <Button 
          className="w-full h-14 rounded-2xl bg-black hover:bg-gray-800 text-white font-bold shadow-xl shadow-black/10 transition-all active:scale-95 disabled:opacity-50"
          disabled={cart.length === 0 || !targetStoreId || submitting}
          onClick={handleTransfer}
        >
          {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
          Confirm & Send Stock
        </Button>
      </div>

      {/* PRINT INVOICE DIALOG */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white print:shadow-none print:border-none print:w-full print:max-w-full">
          <style>{`
            @media print {
              nav, aside, header, button, .print\\:hidden {
                display: none !important;
              }
              body, main, .print\\:w-full {
                width: 100% !important;
                max-width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                color: black !important;
              }
            }
          `}</style>
          
          <div className="p-8 bg-black text-white flex justify-between items-center print:bg-white print:text-black print:p-4 print:border-b print:border-gray-200">
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase">OrbitPOS</h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest print:text-gray-500">Stock Transfer Invoice</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 print:text-gray-500">TRANSFER ID</p>
              <p className="font-mono text-lg font-black text-[#0071e3] print:text-black">#{completedTransfer?.id}</p>
            </div>
          </div>

          <div className="p-8 space-y-6 print:p-4">
            <div className="grid grid-cols-2 gap-6 text-sm border-b border-gray-100 pb-6 print:border-gray-200">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Source Location</p>
                <p className="font-black text-black text-base">{profile?.stores?.name || 'Main Hub'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Destination Location</p>
                <p className="font-black text-black text-base">{completedTransfer?.targetStoreName}</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Items List</p>
              <div className="border border-gray-100 rounded-2xl overflow-hidden print:border-gray-200">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow className="border-gray-100">
                      <TableHead className="font-bold text-black pl-4">Item Details</TableHead>
                      <TableHead className="font-bold text-black text-center">Qty</TableHead>
                      <TableHead className="font-bold text-black text-right">Unit Price</TableHead>
                      <TableHead className="font-bold text-black text-right pr-4">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedTransfer?.items.map((item: any, idx: number) => (
                      <TableRow key={idx} className="border-gray-50">
                        <TableCell className="pl-4">
                          <p className="font-bold text-black">{item.name}</p>
                          <p className="text-[11px] text-gray-400 font-mono font-medium">{item.sku}</p>
                        </TableCell>
                        <TableCell className="text-center font-black text-black">{item.quantity}</TableCell>
                        <TableCell className="text-right font-semibold text-gray-600">${item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-black text-black pr-4">${(item.price * item.quantity).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-gray-100 pt-6 mt-6 print:border-gray-200">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Total Qty</p>
                <p className="text-lg font-black text-black">{completedTransfer?.totalQuantity} Units</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Grand Total Value</p>
                <p className="text-3xl font-black text-[#0071e3] print:text-black">${completedTransfer?.totalPrice.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-100 print:hidden">
              <Button variant="ghost" className="rounded-xl font-bold text-gray-400 h-12" onClick={() => setShowInvoice(false)}>
                Close
              </Button>
              <Button 
                className="rounded-xl bg-black hover:bg-gray-800 text-white font-bold h-12 shadow-lg shadow-black/10"
                onClick={() => window.print()}
              >
                <Printer className="mr-2 h-5 w-5" />
                Print Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
