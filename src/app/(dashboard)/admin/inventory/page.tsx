'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Package, 
  Search, 
  AlertTriangle,
  ArrowUpDown,
  Plus,
  Minus,
  RefreshCw,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function InventoryPage() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);

  useEffect(() => {
    if (profile?.store_id) {
      fetchInventory();
    }
  }, [profile]);

  const fetchInventory = async (silent = false) => {
    if (!profile?.store_id) return;
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', profile.store_id)
      .order('stock_quantity', { ascending: true });
      
    if (error) {
      console.error('Inventory fetch error:', error);
      toast.error('Failed to load inventory');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = products.filter(p => p.stock_quantity <= p.low_stock_threshold);

  const handleAdjust = async (product: any, delta: number) => {
    const newQty = Math.max(0, product.stock_quantity + delta);
    
    // Optimistic Update
    setProducts(prev => prev.map(p => 
      p.id === product.id ? { ...p, stock_quantity: newQty } : p
    ));

    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: newQty } as any)
      .eq('id', product.id);
 
    if (error) {
      toast.error('Failed to update stock');
      // Revert on error
      fetchInventory(true);
      return;
    }
 
    // Log the change
    await supabase.from('inventory_logs').insert({
      product_id: product.id,
      change_amount: delta,
      reason: delta > 0 ? 'restock' : 'adjustment',
    });
 
    toast.success(`Stock updated: ${product.name}`);
    fetchInventory(true);
    setAdjustingId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Inventory</h1>
          <p className="text-[#86868b] font-medium mt-1">Monitor stock levels and adjust quantities.</p>
        </div>
        <Button onClick={() => fetchInventory()} variant="outline" className="rounded-2xl h-11 font-bold">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-amber-800">Low Stock Warning</p>
            <p className="text-[13px] text-amber-700 mt-1">
              {lowStock.length} product{lowStock.length > 1 ? 's are' : ' is'} running low:{' '}
              {lowStock.map(p => p.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
        <Input
          placeholder="Search by product name or SKU..."
          className="pl-12 h-12 bg-white border-gray-100 rounded-2xl shadow-sm font-medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-50">
              <TableHead className="font-bold text-black pl-8">Product</TableHead>
              <TableHead className="font-bold text-black">SKU</TableHead>
              <TableHead className="font-bold text-black text-right">Current Stock</TableHead>
              <TableHead className="font-bold text-black text-right">Threshold</TableHead>
              <TableHead className="font-bold text-black">Status</TableHead>
              {isAdmin && <TableHead className="font-bold text-black text-center">Adjust</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-gray-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading inventory...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 font-medium">No products found</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => {
                const isLow = product.stock_quantity <= product.low_stock_threshold;
                const isOut = product.stock_quantity === 0;
                return (
                  <TableRow key={product.id} className="border-gray-50 hover:bg-gray-50/50">
                    <TableCell className="pl-8">
                      <div>
                        <p className="font-bold text-black">{product.name}</p>
                        <p className="text-[12px] text-gray-400 truncate max-w-[200px]">{product.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-gray-500">{product.sku}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        'text-2xl font-black',
                        isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-black'
                      )}>
                        {product.stock_quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-gray-400 font-medium">
                      {product.low_stock_threshold}
                    </TableCell>
                    <TableCell>
                      {isOut ? (
                        <Badge className="bg-rose-50 text-rose-600 border-rose-100 font-bold">Out of Stock</Badge>
                      ) : isLow ? (
                        <Badge className="bg-amber-50 text-amber-600 border-amber-100 font-bold">Low Stock</Badge>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold">In Stock</Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-xl border-gray-200 hover:border-rose-300 hover:text-rose-600"
                            onClick={() => handleAdjust(product, -1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-xl border-gray-200 hover:border-emerald-300 hover:text-emerald-600"
                            onClick={() => handleAdjust(product, 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-xl border-gray-200 text-[#0071e3] font-bold hover:bg-blue-50"
                            onClick={() => handleAdjust(product, 10)}
                          >
                            +10
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
