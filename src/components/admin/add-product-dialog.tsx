'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Plus, Loader2, Image as ImageIcon, ScanBarcode, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';

// Default color palette for easy selection
const DEFAULT_COLORS = [
  'Black', 'White', 'Silver', 'Space Gray', 'Gold', 'Rose Gold',
  'Red', 'Blue', 'Green', 'Purple', 'Pink', 'Orange',
  'Yellow', 'Navy', 'Teal', 'Graphite', 'Midnight', 'Starlight',
  'Natural Titanium', 'Blue Titanium', 'Desert Titanium', 'Lavender',
  'Cream', 'Mint', 'Coral', 'Phantom Black', 'Phantom White',
  'Burgundy', 'Bronze', 'Champagne', 'Emerald', 'Obsidian'
];

interface SmartDropdownProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  required?: boolean;
  id: string;
}

function SmartDropdown({ label, placeholder, value, onChange, suggestions, required, id }: SmartDropdownProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter(s => 
    s.toLowerCase().includes((filter || value).toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      <Label htmlFor={id} className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          placeholder={placeholder}
          className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold pr-10"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setFilter(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          required={required}
          autoComplete="off"
        />
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-2xl border border-gray-100 shadow-2xl max-h-[200px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
          {filtered.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-5 py-3 text-[13px] font-bold text-gray-700 hover:bg-[#0071e3]/5 hover:text-[#0071e3] transition-colors first:rounded-t-2xl last:rounded-b-2xl"
              onClick={() => {
                onChange(s);
                setFilter('');
                setOpen(false);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddProductDialog({ onProductAdded, storeId }: { onProductAdded?: () => void; storeId?: string }) {
  const { profile } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    brand_name: '',
    model: '',
    color: '',
    vendor_name: '',
    product_type: 'non-gadget' as 'gadget' | 'non-gadget',
    price: '',
    barcode: '',
    stock_quantity: '1',
    category_name: '',
  });

  // Autocomplete suggestions from existing products in the store
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [vendorSuggestions, setVendorSuggestions] = useState<string[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const targetStoreId = storeId || profile?.store_id;

  // Fetch existing values for autocomplete when dialog opens
  useEffect(() => {
    if (open && targetStoreId) {
      fetchSuggestions();
    }
  }, [open, targetStoreId]);

  const fetchSuggestions = async () => {
    if (!targetStoreId) return;
    const { data: products } = await supabase
      .from('products')
      .select('name, brand_name, model, vendor_name')
      .eq('store_id', targetStoreId);

    if (products) {
      const uniqueBrands = [...new Set(products.map(p => p.brand_name).filter(Boolean))] as string[];
      const uniqueModels = [...new Set(products.map(p => (p as any).model).filter(Boolean))] as string[];
      const uniqueVendors = [...new Set(products.map(p => p.vendor_name).filter(Boolean))] as string[];
      const uniqueNames = [...new Set(products.map(p => p.name).filter(Boolean))] as string[];

      setBrandSuggestions(uniqueBrands);
      setModelSuggestions(uniqueModels);
      setVendorSuggestions(uniqueVendors);
      setNameSuggestions(uniqueNames);
    }

    const { data: categories } = await supabase.from('categories').select('name');
    if (categories) {
      setCategorySuggestions([...new Set(categories.map(c => c.name).filter(Boolean))]);
    }
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
          // Don't block the product creation if image upload fails
          toast.warning('Image upload failed, product will be saved without image.');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(filePath);
          image_url = publicUrl;
        }
      }

      // 2. Build the product name from fields if not explicitly typed
      const productName = formData.name || 
        [formData.brand_name, formData.model, formData.color].filter(Boolean).join(' ');

      if (!productName.trim()) {
        toast.error('Please enter a Product Name or Brand + Model.');
        setLoading(false);
        return;
      }

      // Auto-generate SKU from brand + model + color + unique suffix
      const skuBase = [formData.brand_name, formData.model, formData.color]
        .filter(Boolean)
        .join('-')
        .toUpperCase()
        .replace(/\s+/g, '') || productName.toUpperCase().replace(/\s+/g, '-').slice(0, 20);
      const autoSku = `${skuBase}-${Date.now().toString(36).toUpperCase()}`;

      // 3. Handle Category Creation
      let finalCategoryId = null;
      if (formData.category_name) {
        const { data: existingCats } = await supabase
          .from('categories')
          .select('id')
          .ilike('name', formData.category_name)
          .limit(1);
        
        if (existingCats && existingCats.length > 0) {
          finalCategoryId = existingCats[0].id;
        } else {
          const { data: newCategory, error: catError } = await supabase
            .from('categories')
            .insert({ name: formData.category_name })
            .select('id')
            .single();
          if (catError) throw catError;
          if (newCategory) finalCategoryId = newCategory.id;
        }
      }

      // 4. Insert product
      const { error: pError } = await supabase
        .from('products')
        .insert({
          name: productName,
          sku: autoSku,
          barcode: formData.barcode || null,
          price: parseFloat(formData.price || '0'),
          stock_quantity: parseInt(formData.stock_quantity || '1'),
          vendor_name: formData.vendor_name || null,
          brand_name: formData.brand_name || null,
          color: formData.color || null,
          model: formData.model || null,
          product_type: formData.product_type,
          category_id: finalCategoryId,
          store_id: targetStoreId,
          image_url: image_url,
          has_variants: false,
          is_serialized: false,
        });

      if (pError) throw pError;

      toast.success('Product added to inventory!');
      setOpen(false);
      resetForm();
      if (onProductAdded) onProductAdded();
    } catch (error: any) {
      console.error('Add product error:', error);
      toast.error(error.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand_name: '',
      model: '',
      color: '',
      vendor_name: '',
      product_type: 'non-gadget',
      price: '',
      barcode: '',
      stock_quantity: '1',
      category_name: '',
    });
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
          <DialogTitle className="text-2xl font-black text-black tracking-tight">Add to Inventory</DialogTitle>
          <p className="text-gray-400 font-medium text-[13px] mt-1">Scan or enter product details to add to your store.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* Row 1: Image + Product Name */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1 space-y-2">
              <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Image</Label>
              <div 
                onClick={() => document.getElementById('add-image-upload')?.click()}
                className="relative h-[140px] rounded-2xl bg-[#f5f5f7] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-[#0071e3]/30 transition-all overflow-hidden group"
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
                  id="add-image-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange}
                />
              </div>
            </div>

            <div className="col-span-2 space-y-4">
              <SmartDropdown
                id="product-name"
                label="Product Name"
                placeholder="e.g. iPhone 15 Pro Max"
                value={formData.name}
                onChange={(v) => setFormData({...formData, name: v})}
                suggestions={nameSuggestions}
                required
              />
            </div>
          </div>

          {/* Row 2: Brand + Model */}
          <div className="grid grid-cols-2 gap-6">
            <SmartDropdown
              id="brand-name"
              label="Brand Name"
              placeholder="e.g. Apple, Samsung, Google"
              value={formData.brand_name}
              onChange={(v) => setFormData({...formData, brand_name: v})}
              suggestions={brandSuggestions}
            />
            <SmartDropdown
              id="model-name"
              label="Model"
              placeholder="e.g. Pro Max 256GB"
              value={formData.model}
              onChange={(v) => setFormData({...formData, model: v})}
              suggestions={modelSuggestions}
            />
          </div>

          {/* Row 3: Category + Color + Vendor */}
          <div className="grid grid-cols-3 gap-6">
            <SmartDropdown
              id="category"
              label="Category"
              placeholder="e.g. Smartphones"
              value={formData.category_name}
              onChange={(v) => setFormData({...formData, category_name: v})}
              suggestions={categorySuggestions}
            />
            <SmartDropdown
              id="color"
              label="Color"
              placeholder="e.g. Space Gray"
              value={formData.color}
              onChange={(v) => setFormData({...formData, color: v})}
              suggestions={DEFAULT_COLORS}
            />
            <SmartDropdown
              id="vendor-name"
              label="Vendor (Supplier)"
              placeholder="e.g. Apple Inc."
              value={formData.vendor_name}
              onChange={(v) => setFormData({...formData, vendor_name: v})}
              suggestions={vendorSuggestions}
            />
          </div>

          {/* Row 4: Type + Price + Stock */}
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="product-type" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Type</Label>
              <select 
                id="product-type"
                className="w-full h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold px-4 outline-none appearance-none cursor-pointer text-[14px]"
                value={formData.product_type}
                onChange={(e) => setFormData({...formData, product_type: e.target.value as any})}
              >
                <option value="non-gadget">Non-Gadget</option>
                <option value="gadget">Gadget</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Retail Price (₹)</Label>
              <Input 
                id="price" 
                type="number" 
                step="0.01" 
                placeholder="799.00" 
                className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-qty" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Stock Qty</Label>
              <Input 
                id="stock-qty" 
                type="number" 
                placeholder="1" 
                className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                required
              />
            </div>
          </div>

          {/* Row 5: Barcode Scanner Field */}
          <div className="space-y-2">
            <Label htmlFor="barcode" className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <ScanBarcode className="h-4 w-4 text-[#0071e3]" />
              Barcode Number
              <span className="text-[9px] text-[#0071e3] font-black bg-blue-50 px-2 py-0.5 rounded-full ml-1">SCAN TO AUTO-FILL</span>
            </Label>
            <Input 
              ref={barcodeRef}
              id="barcode" 
              placeholder="Scan product barcode or type manually..." 
              className="h-14 bg-gradient-to-r from-[#f0f7ff] to-[#f5f5f7] border-2 border-[#0071e3]/20 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] font-bold text-lg tracking-wider transition-all"
              value={formData.barcode}
              onChange={(e) => setFormData({...formData, barcode: e.target.value})}
              autoComplete="off"
            />
            <p className="text-[10px] text-gray-400 font-medium ml-1">Point your barcode scanner at this field — the number updates automatically.</p>
          </div>
          
          {/* Submit */}
          <div className="pt-6 flex items-center justify-end gap-3 border-t border-gray-50">
            <Button variant="ghost" type="button" className="rounded-xl font-bold text-gray-400" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold h-14 px-8 rounded-2xl shadow-xl shadow-blue-500/10 active:scale-95 transition-all" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
              Add to Inventory
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
