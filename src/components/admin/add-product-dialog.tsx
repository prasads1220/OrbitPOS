'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';

interface VariantInput {
  model_name: string;
  sku: string;
  barcode: string;
  price: string;
  cost_price: string;
  stock_quantity: string;
  serials: string;
}

export function AddProductDialog({ onProductAdded, storeId }: { onProductAdded?: () => void; storeId?: string }) {
  const { profile } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Toggles for Variants & Serial Numbers
  const [hasVariants, setHasVariants] = useState(false);
  const [isSerialized, setIsSerialized] = useState(false);

  // Main Form States
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    price: '',
    stock_quantity: '0',
    description: '',
    vendor_name: '',
    brand_name: '',
    color: '',
    product_type: 'non-gadget' as 'gadget' | 'non-gadget',
  });

  // Dynamic States for Variants & Serials
  const [variants, setVariants] = useState<VariantInput[]>([
    { model_name: '', sku: '', barcode: '', price: '', cost_price: '', stock_quantity: '0', serials: '' }
  ]);
  const [globalSerials, setGlobalSerials] = useState(''); // Serials for non-variant serialized products

  const targetStoreId = storeId || profile?.store_id;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addVariantField = () => {
    setVariants([...variants, { model_name: '', sku: '', barcode: '', price: '', cost_price: '', stock_quantity: '0', serials: '' }]);
  };

  const removeVariantField = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: keyof VariantInput, value: string) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStoreId) {
      toast.error('Store ID not found. Please log in again.');
      return;
    }
    setLoading(true);

    try {
      let image_url = null;

      // 1. Upload image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${targetStoreId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, imageFile);

        if (uploadError) {
          console.error('Image upload error:', uploadError);
          throw new Error('Failed to upload product image');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);
        
        image_url = publicUrl;
      }

      // 2. Insert main product
      const { data: product, error: pError } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          sku: hasVariants ? `${formData.sku || formData.name.toUpperCase()}-PARENT` : formData.sku,
          barcode: hasVariants ? null : (formData.barcode || null),
          price: hasVariants ? 0 : parseFloat(formData.price || '0'),
          stock_quantity: hasVariants ? 0 : (isSerialized ? 0 : parseInt(formData.stock_quantity || '0')),
          description: formData.description,
          vendor_name: formData.vendor_name || null,
          brand_name: formData.brand_name || null,
          color: hasVariants ? null : (formData.color || null),
          product_type: formData.product_type,
          store_id: targetStoreId,
          image_url: image_url,
          has_variants: hasVariants,
          is_serialized: isSerialized
        })
        .select()
        .single();

      if (pError) throw pError;

      // 3. Handle Variants insertion if checked
      if (hasVariants) {
        for (const v of variants) {
          const parsedSerials = v.serials.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
          const computedQty = isSerialized ? parsedSerials.length : parseInt(v.stock_quantity || '0');

          const { data: dbVariant, error: vError } = await supabase
            .from('product_variants')
            .insert({
              product_id: product.id,
              store_id: targetStoreId,
              model_name: v.model_name,
              sku: v.sku,
              barcode: v.barcode,
              price: parseFloat(v.price),
              cost_price: v.cost_price ? parseFloat(v.cost_price) : null,
              stock_quantity: computedQty
            })
            .select()
            .single();

          if (vError) throw vError;

          // 4. Handle Serial Numbers for this variant
          if (isSerialized && parsedSerials.length > 0) {
            for (const serial of parsedSerials) {
              const { error: sError } = await supabase
                .from('serialized_inventory')
                .insert({
                  product_id: product.id,
                  variant_id: dbVariant.id,
                  store_id: targetStoreId,
                  serial_number: serial,
                  status: 'in_stock'
                });
              if (sError) throw sError;
            }
          }
        }
      } else {
        // 5. Handle Serial Numbers for base product if serialized but has no variants
        if (isSerialized) {
          const parsedSerials = globalSerials.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
          if (parsedSerials.length > 0) {
            for (const serial of parsedSerials) {
              const { error: sError } = await supabase
                .from('serialized_inventory')
                .insert({
                  product_id: product.id,
                  store_id: targetStoreId,
                  serial_number: serial,
                  status: 'in_stock'
                });
              if (sError) throw sError;
            }

            // Sync base product quantity with serial count
            await supabase
              .from('products')
              .update({ stock_quantity: parsedSerials.length })
              .eq('id', product.id);
          }
        }
      }

      toast.success('Product added successfully');
      setOpen(false);
      resetForm();
      if (onProductAdded) onProductAdded();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      sku: '', 
      barcode: '', 
      price: '', 
      stock_quantity: '0', 
      description: '',
      vendor_name: '',
      brand_name: '',
      color: '',
      product_type: 'non-gadget'
    });
    setVariants([{ model_name: '', sku: '', barcode: '', price: '', cost_price: '', stock_quantity: '0', serials: '' }]);
    setGlobalSerials('');
    setHasVariants(false);
    setIsSerialized(false);
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger 
        render={
          <Button className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold rounded-2xl h-11 px-6 shadow-lg shadow-blue-500/10 transition-all active:scale-95">
            <Plus className="mr-2 h-5 w-5" />
            Add Product
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <div className="p-10 bg-[#fbfbfd] border-b border-gray-50">
          <DialogTitle className="text-2xl font-black text-black tracking-tight">New Product</DialogTitle>
          <p className="text-gray-400 font-medium text-[13px] mt-1">Add standard, multi-variant, or serialized items to your store.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* Image & Basic Details */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1 space-y-2">
              <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Image</Label>
              <div 
                onClick={() => document.getElementById('image-upload')?.click()}
                className="relative h-32 rounded-2xl bg-[#f5f5f7] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all overflow-hidden group"
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImageIcon className="text-white h-6 w-6" />
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-8 w-8 text-gray-300 mb-1" />
                    <span className="text-[11px] text-gray-400 font-bold">Upload</span>
                  </>
                )}
                <input 
                  id="image-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange}
                />
              </div>
            </div>

            <div className="col-span-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Google Pixel 8" 
                  className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required 
                />
              </div>
            </div>
          </div>

          {/* Configuration Toggles */}
          <div className="grid grid-cols-2 gap-4 p-5 bg-gray-50 rounded-3xl border border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                className="h-5 w-5 rounded-md border-gray-300 text-[#0071e3] focus:ring-[#0071e3]"
                checked={hasVariants}
                onChange={(e) => setHasVariants(e.target.checked)}
              />
              <div>
                <p className="text-[13px] font-bold text-black">Track Models (Variants)</p>
                <p className="text-[10px] text-gray-400 font-medium">For different colors, sizes, specs.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                className="h-5 w-5 rounded-md border-gray-300 text-[#0071e3] focus:ring-[#0071e3]"
                checked={isSerialized}
                onChange={(e) => setIsSerialized(e.target.checked)}
              />
              <div>
                <p className="text-[13px] font-bold text-black">Track Serial Numbers</p>
                <p className="text-[10px] text-gray-400 font-medium">Requires unique S/N on checkout.</p>
              </div>
            </label>
          </div>

          {/* Standard Fields (Only shown if NOT tracking variants) */}
          {!hasVariants && (
            <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
              <div className="space-y-2">
                <Label htmlFor="sku" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">SKU</Label>
                <Input 
                  id="sku" 
                  placeholder="e.g. PIX8-128-HZL" 
                  className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  required={!hasVariants}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Barcode (Model Barcode)</Label>
                <Input 
                  id="barcode" 
                  placeholder="e.g. 190199..." 
                  className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Retail Price ($)</Label>
                <Input 
                  id="price" 
                  type="number" 
                  step="0.01" 
                  placeholder="799.00" 
                  className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  required={!hasVariants}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_quantity" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Stock Quantity</Label>
                <Input 
                  id="stock_quantity" 
                  type="number" 
                  className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                  value={formData.stock_quantity}
                  disabled={isSerialized} // Serials list determines stock count
                  onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                />
                {isSerialized && (
                  <p className="text-[10px] text-[#0071e3] font-bold mt-1">Determined automatically by Serial count.</p>
                )}
              </div>
            </div>
          )}

          {/* Dynamic Variant Section */}
          {hasVariants && (
            <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-300">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-bold text-black text-sm">Product Models (Variants)</h4>
                <Button 
                  type="button" 
                  onClick={addVariantField}
                  variant="outline" 
                  className="rounded-xl border-gray-200 text-[#0071e3] font-bold text-xs"
                >
                  + Add Model
                </Button>
              </div>

              <div className="space-y-6">
                {variants.map((v, i) => (
                  <div key={i} className="p-6 bg-white border border-gray-100 rounded-3xl space-y-4 shadow-sm relative group">
                    {variants.length > 1 && (
                      <Button 
                        type="button"
                        onClick={() => removeVariantField(i)}
                        variant="ghost" 
                        className="absolute top-4 right-4 h-8 w-8 p-0 text-gray-400 hover:text-red-500 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Model Name</Label>
                        <Input 
                          placeholder="e.g. Hazel / 128GB"
                          className="h-11 bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white font-bold text-[13px]"
                          value={v.model_name}
                          onChange={(e) => handleVariantChange(i, 'model_name', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SKU</Label>
                        <Input 
                          placeholder="PIX8-128-HZL"
                          className="h-11 bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white font-bold text-[13px]"
                          value={v.sku}
                          onChange={(e) => handleVariantChange(i, 'sku', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Model Barcode</Label>
                        <Input 
                          placeholder="190199..."
                          className="h-11 bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white font-bold text-[13px]"
                          value={v.barcode}
                          onChange={(e) => handleVariantChange(i, 'barcode', e.target.value)}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price ($)</Label>
                          <Input 
                            type="number"
                            placeholder="799"
                            className="h-11 bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white font-bold text-[13px]"
                            value={v.price}
                            onChange={(e) => handleVariantChange(i, 'price', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stock</Label>
                          <Input 
                            type="number"
                            className="h-11 bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white font-bold text-[13px]"
                            value={v.stock_quantity}
                            disabled={isSerialized}
                            onChange={(e) => handleVariantChange(i, 'stock_quantity', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {isSerialized && (
                      <div className="space-y-1 border-t border-dashed border-gray-100 pt-3">
                        <Label className="text-[10px] font-bold text-[#0071e3] uppercase tracking-widest">Serial Numbers (Comma / Newline Separated)</Label>
                        <Textarea 
                          placeholder="e.g. SN-HZL101&#10;SN-HZL102"
                          className="bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white font-bold text-[12px] min-h-[70px]"
                          value={v.serials}
                          onChange={(e) => handleVariantChange(i, 'serials', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Global Serial Numbers (Only shown if NOT tracking variants but is serialized) */}
          {!hasVariants && isSerialized && (
            <div className="space-y-2 p-5 bg-blue-50 border border-blue-100 rounded-3xl animate-in slide-in-from-bottom-5">
              <Label htmlFor="global-serials" className="text-[11px] font-bold text-[#0071e3] uppercase tracking-widest ml-1">
                Serial Numbers (One per line / Comma separated)
              </Label>
              <Textarea 
                id="global-serials" 
                placeholder="e.g. SN-PIXEL001&#10;SN-PIXEL002"
                className="bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white font-bold text-[12px] min-h-[90px]"
                value={globalSerials}
                onChange={(e) => setGlobalSerials(e.target.value)}
                required={isSerialized}
              />
              <p className="text-[10px] text-blue-800 font-medium">Each listed S/N represents one physical product in stock.</p>
            </div>
          )}

          {/* Vendor, Brand, Color and Type */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div className="space-y-2">
              <Label htmlFor="vendor_name" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Vendor Name</Label>
              <Input 
                id="vendor_name" 
                placeholder="e.g. Apple Inc." 
                className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                value={formData.vendor_name}
                onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_name" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Brand Name</Label>
              <Input 
                id="brand_name" 
                placeholder="e.g. iPhone" 
                className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                value={formData.brand_name}
                onChange={(e) => setFormData({...formData, brand_name: e.target.value})}
              />
            </div>
            {!hasVariants && (
              <div className="space-y-2">
                <Label htmlFor="color" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Color</Label>
                <Input 
                  id="color" 
                  placeholder="e.g. Space Gray" 
                  className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="product_type" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Type</Label>
              <select 
                id="product_type"
                className="w-full h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold px-4 outline-none appearance-none cursor-pointer"
                value={formData.product_type}
                onChange={(e) => setFormData({...formData, product_type: e.target.value as any})}
              >
                <option value="non-gadget">Non-Gadget</option>
                <option value="gadget">Gadget</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Enter product specifications and details..." 
              className="bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-medium min-h-[90px]"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          
          <div className="pt-6 flex items-center justify-end gap-3 border-t border-gray-50">
            <Button variant="ghost" type="button" className="rounded-xl font-bold text-gray-400" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold h-14 px-8 rounded-2xl shadow-xl shadow-blue-500/10 active:scale-95 transition-all" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Save Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
