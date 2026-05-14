'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/store/useCartStore';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  UserPlus,
  PackageX,
  ShoppingCart,
  Scan,
  LayoutGrid,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Database } from '@/types/supabase';
import { CheckoutDialog } from '@/components/pos/checkout-dialog';
import { cn } from '@/lib/utils';

type Product = Database['public']['Tables']['products']['Row'];

import { useAuthStore } from '@/store/useAuthStore';

export default function POSPage() {
  const { profile } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { items, addItem, removeItem, updateQuantity, subtotal, tax, total, discount, discountType, setDiscount, clearCart } = useCartStore();
  const [initialMethod, setInitialMethod] = useState<'cash' | 'card'>('cash');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.store_id) {
      fetchProducts();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        searchInputRef.current?.focus();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile]);

  const fetchProducts = async () => {
    if (!profile?.store_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', profile.store_id)
      .eq('is_active', true);

    if (data) setProducts(data);
    setLoading(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search)
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-0 h-full animate-in fade-in duration-700 bg-white">
      {/* Product Selection */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 group max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
            <Input 
              ref={searchInputRef}
              placeholder="Scan barcode or search products... (F2)" 
              className="pl-12 h-14 bg-white border-transparent rounded-2xl shadow-sm focus:ring-2 focus:ring-[#0071e3]/10 transition-all font-medium text-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center bg-white p-1.5 rounded-2xl shadow-sm border border-gray-50">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("rounded-xl h-10 w-10 transition-all", viewMode === 'grid' ? "bg-[#0071e3] text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:bg-gray-50")}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("rounded-xl h-10 w-10 transition-all", viewMode === 'list' ? "bg-[#0071e3] text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:bg-gray-50")}
              onClick={() => setViewMode('list')}
            >
              <List className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 -mr-4 pr-4">
          {loading ? (
             <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                   <div key={i} className="aspect-[4/5] bg-white animate-pulse rounded-3xl border border-gray-100" />
                ))}
             </div>
          ) : (
            <div className={cn(
              "grid gap-6 pb-6",
              viewMode === 'grid' ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
            )}>
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className={cn(
                    "group relative bg-white rounded-3xl border border-transparent hover:border-[#0071e3]/30 shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-500 cursor-pointer overflow-hidden",
                    viewMode === 'list' && "flex items-center gap-6 p-4"
                  )}
                  onClick={() => addItem(product)}
                >
                  {/* Glossy Shine Effect Overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-20">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </div>

                  <div className={cn(
                    "bg-[#f5f5f7] flex items-center justify-center relative overflow-hidden transition-colors group-hover:bg-[#f0f0f2]",
                    viewMode === 'grid' ? "aspect-square w-full" : "w-24 h-24 rounded-2xl flex-shrink-0"
                  )}>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-1000" />
                    ) : (
                      <PackageX className="h-10 w-10 text-gray-300" />
                    )}
                    {product.stock_quantity < 5 && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-black text-rose-500 shadow-sm border border-rose-100 z-10">
                        LOW STOCK
                      </div>
                    )}
                  </div>
                  
                  <div className={cn("p-5 relative z-10", viewMode === 'list' && "flex-1 p-0")}>
                    <h3 className="font-bold text-black group-hover:text-[#0071e3] transition-colors truncate text-[15px]">{product.name}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xl font-black text-black">${product.price.toFixed(2)}</p>
                      <span className="text-[10px] font-bold text-gray-400 tracking-tight uppercase">
                        {product.sku}
                      </span>
                    </div>
                  </div>
                  
                  {viewMode === 'grid' && (
                    <div className="absolute inset-0 bg-[#0071e3]/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-30">
                      <div className="bg-[#0071e3] text-white p-3.5 rounded-2xl shadow-2xl scale-75 group-hover:scale-100 transition-all duration-500">
                        <Plus className="h-6 w-6" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart / Checkout */}
      <div className="w-full lg:w-[400px] flex flex-col h-[calc(100vh-150px)] bg-white rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden shrink-0 sticky top-0">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-[#fbfbfd]/50">
          <div>
            <h2 className="font-black text-xl text-black tracking-tight">Current Order</h2>
            <p className="text-[12px] text-gray-400 font-medium">{items.length} items in cart</p>
          </div>
          <Button variant="ghost" size="icon" onClick={clearCart} className="text-gray-300 hover:text-rose-500 hover:bg-rose-50 h-10 w-10 rounded-xl transition-colors">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-8">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 py-20 text-center animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-[#f5f5f7] rounded-[2rem] flex items-center justify-center mb-6 border border-gray-50">
                <ShoppingCart className="h-10 w-10 opacity-20" />
              </div>
              <p className="font-black text-gray-400 text-lg tracking-tight">Cart is empty</p>
              <p className="text-[13px] mt-2 font-medium leading-relaxed">Select products to start <br /> a new checkout.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between group animate-in slide-in-from-right-4 duration-300">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[14px] font-bold text-black truncate mb-0.5">{item.name}</p>
                    <p className="text-[13px] font-black text-[#0071e3]">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-[#f5f5f7] rounded-xl p-1 border border-gray-50 shadow-sm">
                      <button 
                        className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-30" 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-3 text-[13px] font-black min-w-8 text-center">{item.quantity}</span>
                      <button 
                        className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all" 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-[14px] font-black min-w-16 text-right text-black">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-8 bg-[#fbfbfd] border-t border-gray-50 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-[14px] text-gray-500 font-bold">
              <span>Subtotal</span>
              <span className="text-black">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[14px] text-gray-500 font-bold">
              <span>Tax (8%)</span>
              <span className="text-black">${tax.toFixed(2)}</span>
            </div>
              <div className="bg-rose-50/30 rounded-2xl p-4 space-y-4 border border-rose-100/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-black text-rose-500 uppercase tracking-wider">Discount</span>
                    <div className="flex bg-white/50 p-1 rounded-xl border border-rose-100 shadow-sm">
                      <button 
                        onClick={() => setDiscount(discount, 'amount')}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[11px] font-bold transition-all", 
                          discountType === 'amount' ? "bg-rose-500 text-white shadow-md" : "text-rose-400 hover:text-rose-500"
                        )}
                      >
                        $
                      </button>
                      <button 
                        onClick={() => setDiscount(discount, 'percentage')}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[11px] font-bold transition-all", 
                          discountType === 'percentage' ? "bg-rose-500 text-white shadow-md" : "text-rose-400 hover:text-rose-500"
                        )}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <span className="text-sm font-black text-rose-500">
                    -{discountType === 'percentage' ? `${discount}%` : `$${discount.toFixed(2)}`}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 20, 25, 50].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setDiscount(pct, 'percentage')}
                      className={cn(
                        "px-3 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 border",
                        discount === pct && discountType === 'percentage'
                          ? "bg-rose-500 text-white border-rose-500 shadow-md"
                          : "bg-white text-rose-500 border-rose-100 hover:bg-rose-50"
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 font-bold text-xs pointer-events-none group-focus-within:text-rose-500 transition-colors">
                    {discountType === 'percentage' ? '%' : '$'}
                  </div>
                  <input 
                    type="number"
                    placeholder="Enter manual discount..."
                    className="w-full bg-white border border-rose-100 rounded-xl pl-9 pr-4 py-3 text-[13px] font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={discount || ''}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-dashed border-gray-200">
            <div className="flex justify-between items-center">
               <span className="text-lg font-black text-black uppercase tracking-widest">Total Due</span>
               <span className="text-4xl font-black text-[#0071e3] tracking-tighter">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-16 rounded-2xl border-gray-200 text-black font-black text-[15px] transition-all active:scale-95 shadow-sm hover:bg-white hover:border-[#0071e3] hover:text-[#0071e3]"
              onClick={() => {
                setInitialMethod('cash');
                setCheckoutOpen(true);
              }} 
              disabled={items.length === 0}
            >
              <Banknote className="mr-2 h-6 w-6" />
              CASH
            </Button>
            <Button 
              className="h-16 rounded-2xl bg-black hover:bg-gray-800 text-white font-black text-[15px] transition-all active:scale-95 shadow-2xl shadow-black/20" 
              onClick={() => {
                setInitialMethod('card');
                setCheckoutOpen(true);
              }} 
              disabled={items.length === 0}
            >
              <CreditCard className="mr-2 h-6 w-6" />
              CHARGE
            </Button>
          </div>
          
          <Button variant="ghost" className="w-full text-gray-400 font-black text-[11px] h-10 hover:text-[#0071e3] hover:bg-blue-50/50 rounded-xl uppercase tracking-widest">
            <UserPlus className="mr-2 h-4 w-4" />
            Assign Customer
          </Button>
        <CheckoutDialog 
          open={checkoutOpen} 
          onOpenChange={setCheckoutOpen}
          items={items}
          subtotal={subtotal}
          tax={tax}
          total={total}
          discount={discount}
          discountType={discountType}
          initialMethod={initialMethod}
        />
      </div>
    </div>
  );
}
