'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Package, User, Receipt, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useActiveStore } from '@/store/useActiveStore';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ products: any[]; customers: any[]; orders: any[] }>({ products: [], customers: [], orders: [] });
  const router = useRouter();
  const { activeStoreId } = useActiveStore();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim() || !activeStoreId) {
      setResults({ products: [], customers: [], orders: [] });
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      const searchTerm = `%${query}%`;
      
      try {
        const [prodRes, custRes, orderRes] = await Promise.all([
          supabase.from('products').select('id, name, barcode').eq('store_id', activeStoreId).or(`name.ilike.${searchTerm},barcode.ilike.${searchTerm}`).limit(5),
          supabase.from('customers').select('id, full_name, phone').eq('store_id', activeStoreId).or(`full_name.ilike.${searchTerm},phone.ilike.${searchTerm}`).limit(5),
          supabase.from('orders').select('id, receipt_number').eq('store_id', activeStoreId).ilike('receipt_number', searchTerm).limit(5)
        ]);

        setResults({
          products: prodRes.data || [],
          customers: custRes.data || [],
          orders: orderRes.data || []
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [query, activeStoreId]);

  return (
    <div className="relative w-full group" ref={wrapperRef}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#0071e3] transition-colors z-10" />
      <Input 
        placeholder="Search products, orders, or customers..." 
        className="pl-11 pr-10 h-11 bg-white border-gray-100 rounded-2xl focus:ring-2 focus:ring-gray-100 font-medium text-[14px]"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      {query && (
        <button 
          onClick={() => { setQuery(''); setIsOpen(false); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 z-10"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {isOpen && query.trim() && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm font-medium">Searching...</span>
            </div>
          ) : results.products.length === 0 && results.customers.length === 0 && results.orders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium text-black">No results found</p>
              <p className="text-xs">We couldn't find anything for "{query}"</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
              {results.products.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-black text-gray-400 uppercase tracking-wider">Products</div>
                  <div className="space-y-1">
                    {results.products.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => { setIsOpen(false); router.push(`/admin/inventory?search=${encodeURIComponent(p.barcode || p.name)}`); }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0071e3] flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-black truncate">{p.name}</div>
                          {p.barcode && <div className="text-xs text-gray-500 font-medium">{p.barcode}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.customers.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-black text-gray-400 uppercase tracking-wider">Customers</div>
                  <div className="space-y-1">
                    {results.customers.map(c => (
                      <button 
                        key={c.id}
                        onClick={() => { setIsOpen(false); router.push(`/pos?customer=${c.id}`); }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-black truncate">{c.full_name}</div>
                          {c.phone && <div className="text-xs text-gray-500 font-medium">{c.phone}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.orders.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-black text-gray-400 uppercase tracking-wider">Orders</div>
                  <div className="space-y-1">
                    {results.orders.map(o => (
                      <button 
                        key={o.id}
                        onClick={() => { setIsOpen(false); router.push(`/orders?receipt=${o.receipt_number}`); }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <Receipt className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-black truncate">{o.receipt_number}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
