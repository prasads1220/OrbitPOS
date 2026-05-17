'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';

interface VariantInput {
  id?: string;
  model_name: string;
  sku: string;
  barcode: string;
  price: string;
  cost_price: string;
  stock_quantity: string;
  serials: string;
}

export function EditProductDialog({ 
  product, 
  open, 
  onOpenChange, 
  onProductUpdated 
}: { 
  product: any; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onProductUpdated?: () => void; 
}) {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    price: '0',
    stock_quantity: '0',
    description: '',
    vendor_name: '',
    brand_name: '',
    color: '',
    product_type: 'non-gadget',
  });

  // Dynamic States for Variants & Serials
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [globalSerials, setGlobalSerials] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        price: product.price?.toString() || '0',
        stock_quantity: product.stock_quantity?.toString() || '0',
        description: product.description || '',
        vendor_name: product.vendor_name || '',
        brand_name: product.brand_name || '',
        color: product.color || '',
        product_type: product.product_type || 'non-gadget',
      });
      setImagePreview(product.image_url || null);
      
      if (open) {
        fetchProductDetails();
      }
    }
  }, [product, open]);

  const fetchProductDetails = async () => {
    if (!product) return;
    setLoadingDetails(true);
    try {
      if (product.has_variants) {
        const { data: vData } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', product.id);

        const loadedVariants = await Promise.all((vData || []).map(async (v) => {
          const { data: sData } = await supabase
            .from('serialized_inventory')
            .select('serial_number')
            .eq('variant_id', v.id)
            .eq('status', 'in_stock');
          
          return {
            id: v.id,
            model_name: v.model_name,
            sku: v.sku,
            barcode: v.barcode,
            price: v.price.toString(),
            cost_price: v.cost_price?.toString() || '',
            stock_quantity: v.stock_quantity.toString(),
            serials: sData?.map(s => s.serial_number).join('\n') || ''
          };
        }));
        setVariants(loadedVariants);
      } else if (product.is_serialized) {
        const { data: sData } = await supabase
          .from('serialized_inventory')
          .select('serial_number')
          .eq('product_id', product.id)
          .eq('status', 'in_stock');
        setGlobalSerials(sData?.map(s => s.serial_number).join('\n') || '');
      }
    } catch (err) {
      console.error('Failed to load variants/serials details:', err);
    }
    setLoadingDetails(false);
  };

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

  const removeVariantField = async (index: number) => {
    const vToRemove = variants[index];
    if (vToRemove.id) {
      if (!confirm('Are you sure you want to permanently delete this model?')) return;
      try {
        const { error } = await supabase
          .from('product_variants')
          .delete()
          .eq('id', vToRemove.id);
        if (error) throw error;
        toast.success('Model deleted successfully');
      } catch (err: any) {
        toast.error('Cannot delete model; it has transaction history.');
        return;
      }
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: keyof VariantInput, value: string) => {
    const newVariants = [...variants];
    newVariants[index][field] = value as any;
    setVariants(newVariants);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !profile?.store_id) return;
    setLoading(true);

    try {
      let image_url = product.image_url;

      // 1. Upload image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${profile.store_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);
        
        image_url = publicUrl;
      }

      // 2. Update base product
      const { error: pError } = await supabase
        .from('products')
        .update({
          name: formData.name,
          sku: product.has_variants ? `${formData.sku || formData.name.toUpperCase()}-PARENT` : formData.sku,
          barcode: product.has_variants ? null : (formData.barcode || null),
          price: product.has_variants ? 0 : parseFloat(formData.price || '0'),
          stock_quantity: product.has_variants ? 0 : (product.is_serialized ? 0 : parseInt(formData.stock_quantity || '0')),
          description: formData.description,
          vendor_name: formData.vendor_name || null,
          brand_name: formData.brand_name || null,
          color: product.has_variants ? null : (formData.color || null),
          product_type: formData.product_type,
          image_url: image_url,
        })
        .eq('id', product.id);

      if (pError) throw pError;

      // 3. Update Variants if applicable
      if (product.has_variants) {
        for (const v of variants) {
          const parsedSerials = v.serials.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
          const computedQty = product.is_serialized ? parsedSerials.length : parseInt(v.stock_quantity || '0');

          let variantId = v.id;

          if (variantId) {
            // Update existing variant
            const { error: vError } = await supabase
              .from('product_variants')
              .update({
                model_name: v.model_name,
                sku: v.sku,
                barcode: v.barcode,
                price: parseFloat(v.price),
                cost_price: v.cost_price ? parseFloat(v.cost_price) : null,
                stock_quantity: computedQty
              })
              .eq('id', variantId);
            if (vError) throw vError;
          } else {
            // Insert new variant
            const { data: newV, error: vError } = await supabase
              .from('product_variants')
              .insert({
                product_id: product.id,
                store_id: profile.store_id,
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
            variantId = newV.id;
          }

          // 4. Update Variant Serials
          if (product.is_serialized) {
            // Clear existing in_stock serials to avoid duplicates
            await supabase
              .from('serialized_inventory')
              .delete()
              .eq('variant_id', variantId)
              .eq('status', 'in_stock');

            for (const serial of parsedSerials) {
              await supabase
                .from('serialized_inventory')
                .insert({
                  product_id: product.id,
                  variant_id: variantId,
                  store_id: profile.store_id,
                  serial_number: serial,
                  status: 'in_stock'
                });
            }
          }
        }
      } else {
        // 5. Update Base Product Serials
        if (product.is_serialized) {
          const parsedSerials = globalSerials.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

          await supabase
            .from('serialized_inventory')
            .delete()
            .eq('product_id', product.id)
            .eq('status', 'in_stock');

          for (const serial of parsedSerials) {
            await supabase
              .from('serialized_inventory')
              .insert({
                product_id: product.id,
                store_id: profile.store_id,
                serial_number: serial,
                status: 'in_stock'
              });
          }

          // Sync base product quantity with serial count
          await supabase
            .from('products')
            .update({ stock_quantity: parsedSerials.length })
            .eq('id', product.id);
        }
      }

      toast.success('Product updated successfully');
      onOpenChange(false);
      if (onProductUpdated) onProductUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <div className="p-10 bg-[#fbfbfd] border-b border-gray-50">
          <DialogTitle className="text-2xl font-black text-black tracking-tight">Edit Product</DialogTitle>
          <p className="text-gray-400 font-medium text-[13px] mt-1">Modify details, variants, or serial tracking records.</p>
        </div>

        {loadingDetails ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-[#0071e3]" />
            <p className="font-bold text-gray-400">Loading catalog assets...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            
            {/* Image & Basic Title */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-1 space-y-2">
                <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Image</Label>
                <div 
                  onClick={() => document.getElementById('edit-image-upload')?.click()}
                  className="relative h-28 rounded-2xl bg-[#f5f5f7] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all overflow-hidden group"
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
                    id="edit-image-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageChange}
                  />
                </div>
              </div>

              <div className="col-span-2 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Name</Label>
                  <Input 
                    id="edit-name" 
                    placeholder="e.g. Google Pixel 8" 
                    className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required 
                  />
                </div>
              </div>
            </div>

            {/* Standard fields (Only if has_variants is false) */}
            {!product?.has_variants && (
              <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <Label htmlFor="edit-sku" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">SKU</Label>
                  <Input 
                    id="edit-sku" 
                    className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white font-bold"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-barcode" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Barcode</Label>
                  <Input 
                    id="edit-barcode" 
                    className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white font-bold"
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Retail Price ($)</Label>
                  <Input 
                    id="edit-price" 
                    type="number" 
                    step="0.01" 
                    className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white font-bold"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stock" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Stock Quantity</Label>
                  <Input 
                    id="edit-stock" 
                    type="number" 
                    className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white font-bold"
                    value={formData.stock_quantity}
                    disabled={product?.is_serialized}
                    onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                  />
                  {product?.is_serialized && (
                    <p className="text-[10px] text-[#0071e3] font-bold mt-1">Determined automatically by Serial count.</p>
                  )}
                </div>
              </div>
            )}

            {/* Dynamic Variant Editors */}
            {product?.has_variants && (
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
                      <Button 
                        type="button"
                        onClick={() => removeVariantField(i)}
                        variant="ghost" 
                        className="absolute top-4 right-4 h-8 w-8 p-0 text-gray-400 hover:text-red-500 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </Button>

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
                              disabled={product?.is_serialized}
                              onChange={(e) => handleVariantChange(i, 'stock_quantity', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {product?.is_serialized && (
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

            {/* Global Serials (Only if has_variants is false but is serialized) */}
            {!product?.has_variants && product?.is_serialized && (
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
                  required={product?.is_serialized}
                />
                <p className="text-[10px] text-blue-800 font-medium">Each listed S/N represents one physical product in stock.</p>
              </div>
            )}

            {/* Extra product details */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              <div className="space-y-2">
                <Label htmlFor="edit-vendor" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Vendor Name</Label>
                <Input 
                  id="edit-vendor" 
                  className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white font-bold"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-brand" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Brand Name</Label>
                <Input 
                  id="edit-brand" 
                  className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white font-bold"
                  value={formData.brand_name}
                  onChange={(e) => setFormData({...formData, brand_name: e.target.value})}
                />
              </div>
              {!product?.has_variants && (
                <div className="space-y-2">
                  <Label htmlFor="edit-color" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Color</Label>
                  <Input 
                    id="edit-color" 
                    className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white font-bold"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-type" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Type</Label>
                <select 
                  id="edit-type"
                  className="w-full h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white font-bold px-4 outline-none appearance-none cursor-pointer"
                  value={formData.product_type}
                  onChange={(e) => setFormData({...formData, product_type: e.target.value as any})}
                >
                  <option value="non-gadget">Non-Gadget</option>
                  <option value="gadget">Gadget</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-desc" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</Label>
              <Textarea 
                id="edit-desc" 
                placeholder="Enter details..." 
                className="bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white font-medium min-h-[90px]"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <div className="pt-6 flex items-center justify-end gap-3 border-t border-gray-50">
              <Button variant="ghost" type="button" className="rounded-xl font-bold text-gray-400" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold h-14 px-8 rounded-2xl shadow-xl shadow-blue-500/10 active:scale-95 transition-all" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
