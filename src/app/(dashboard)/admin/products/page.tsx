'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Package,
  ArrowUpDown,
  Download,
  RefreshCw
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Database } from '@/types/supabase';
import { AddProductDialog } from '@/components/admin/add-product-dialog';
import { EditProductDialog } from '@/components/admin/edit-product-dialog';
import { AdjustStockDialog } from '@/components/admin/adjust-stock-dialog';
import { cn } from '@/lib/utils';
import { downloadCSV } from '@/lib/export';

type Product = Database['public']['Tables']['products']['Row'];

export default function ProductsPage() {
  const { profile } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingStockProduct, setAdjustingStockProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (profile?.store_id) {
      fetchProducts();
    }

    const channel = supabase
      .channel('products_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'products',
        filter: `store_id=eq.${profile?.store_id}` 
      }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchProducts = async () => {
    if (!profile?.store_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', profile.store_id)
      .order('created_at', { ascending: false });

    if (data) setProducts(data);
    setLoading(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete product');
    } else {
      toast.success('Product deleted');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Product Catalog</h1>
          <p className="text-[#86868b] font-medium mt-1">Manage your digital shelves and inventory details.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="rounded-2xl h-11 border-gray-100 shadow-sm font-bold"
            onClick={() => downloadCSV(filteredProducts, 'products_catalog.csv')}
          >
            <Download className="mr-2 h-4 w-4 text-gray-400" />
            Export CSV
          </Button>
          {profile?.role === 'admin' && <AddProductDialog onProductAdded={fetchProducts} />}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-[#0071e3] rounded-2xl flex items-center justify-center">
               <Package className="h-6 w-6" />
            </div>
            <div>
               <p className="text-2xl font-black text-black">{products.length}</p>
               <p className="text-[13px] text-gray-400 font-medium">Total Products</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
               <RefreshCw className="h-6 w-6" />
            </div>
            <div>
               <p className="text-2xl font-black text-black">{products.filter(p => p.is_active).length}</p>
               <p className="text-[13px] text-gray-400 font-medium">Active Items</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
               <ArrowUpDown className="h-6 w-6" />
            </div>
            <div>
               <p className="text-2xl font-black text-black">{products.filter(p => p.stock_quantity <= p.low_stock_threshold).length}</p>
               <p className="text-[13px] text-gray-400 font-medium">Low Stock Alerts</p>
            </div>
         </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
          <Input 
            placeholder="Search by name or SKU..." 
            className="pl-12 h-12 bg-white border-gray-100 rounded-2xl shadow-sm font-medium" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="rounded-xl font-bold text-gray-400 hover:text-black">
            <Filter className="mr-2 h-4 w-4" />
            Category
          </Button>
          <Button variant="ghost" className="rounded-xl font-bold text-gray-400 hover:text-black">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Price
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-50">
              <TableHead className="font-bold text-black pl-8">Item</TableHead>
              <TableHead className="font-bold text-black">SKU</TableHead>
              <TableHead className="font-bold text-black text-right">Price</TableHead>
              <TableHead className="font-bold text-black text-right">Stock</TableHead>
              <TableHead className="font-bold text-black">Status</TableHead>
              {profile?.role === 'admin' && <TableHead className="w-[80px] pr-8"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-gray-400">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-100" />
                  <p className="text-gray-400 font-bold">No products found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id} className="border-gray-50 hover:bg-gray-50/50 group">
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-14 h-14 rounded-2xl bg-[#f5f5f7] flex items-center justify-center overflow-hidden border border-gray-100 cursor-zoom-in hover:shadow-md transition-all group/img"
                        onClick={() => {
                          if (product.image_url) {
                            window.open(product.image_url, '_blank');
                          }
                        }}
                      >
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" />
                        ) : (
                          <Package className="h-7 w-7 text-gray-300" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-black group-hover:text-[#0071e3] transition-colors">{product.name}</p>
                        <p className="text-[11px] text-gray-400 font-medium truncate max-w-[150px]">{product.description || 'No description'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-gray-500">{product.sku}</TableCell>
                  <TableCell className="text-right font-black text-black text-lg">
                    ${product.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "font-black text-lg",
                      product.stock_quantity <= product.low_stock_threshold ? "text-rose-500" : "text-black"
                    )}>
                      {product.stock_quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    {product.is_active ? (
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold">Active</Badge>
                    ) : (
                      <Badge className="bg-gray-50 text-gray-400 border-gray-100 font-bold">Inactive</Badge>
                    )}
                  </TableCell>
                  {profile?.role === 'admin' && (
                    <TableCell className="pr-8 text-right">
                      <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-gray-100">
                          <MoreHorizontal className="h-5 w-5 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-gray-100 shadow-xl p-2">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-2">Manage Item</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-gray-50" />
                            <DropdownMenuItem className="rounded-xl font-bold cursor-pointer focus:bg-blue-50 focus:text-[#0071e3]" onClick={() => setEditingProduct(product)}>
                              <Pencil className="mr-3 h-4 w-4" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-xl font-bold cursor-pointer focus:bg-blue-50 focus:text-[#0071e3]" onClick={() => setAdjustingStockProduct(product)}>
                              <ArrowUpDown className="mr-3 h-4 w-4" />
                              Adjust Stock
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-50" />
                            <DropdownMenuItem className="text-rose-500 rounded-xl font-bold cursor-pointer focus:bg-rose-50" onClick={() => deleteProduct(product.id)}>
                              <Trash2 className="mr-3 h-4 w-4" />
                              Delete Product
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          onProductUpdated={() => {
            fetchProducts();
            setEditingProduct(null);
          }}
        />
      )}

      {adjustingStockProduct && (
        <AdjustStockDialog
          product={adjustingStockProduct}
          open={!!adjustingStockProduct}
          onOpenChange={(open) => !open && setAdjustingStockProduct(null)}
          onProductUpdated={() => {
            fetchProducts();
            setAdjustingStockProduct(null);
          }}
        />
      )}
    </div>
  );
}
