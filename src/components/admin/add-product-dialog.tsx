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
import { Plus, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';

export function AddProductDialog({ onProductAdded }: { onProductAdded?: () => void }) {
  const { profile } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    price: '',
    stock_quantity: '0',
    description: '',
  });

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
    if (!profile?.store_id) {
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
        const filePath = `${profile.store_id}/${fileName}`;

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

      // 2. Insert product
      const { error } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          sku: formData.sku,
          barcode: formData.barcode || null,
          price: parseFloat(formData.price),
          stock_quantity: parseInt(formData.stock_quantity),
          description: formData.description,
          store_id: profile.store_id,
          image_url: image_url,
        });

      if (error) throw error;

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
    setFormData({ name: '', sku: '', barcode: '', price: '', stock_quantity: '0', description: '' });
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
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <div className="p-10 bg-[#fbfbfd] border-b border-gray-50">
          <DialogTitle className="text-2xl font-black text-black tracking-tight">New Product</DialogTitle>
          <p className="text-gray-400 font-medium text-[13px] mt-1">Add a new item to your store catalog.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Image Upload Area */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Image</Label>
            <div 
              onClick={() => document.getElementById('image-upload')?.click()}
              className="relative h-40 rounded-3xl bg-[#f5f5f7] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all overflow-hidden group"
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="text-white h-8 w-8" />
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-[13px] text-gray-400 font-medium">Click to upload image</p>
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

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. iPhone 15 Pro" 
                className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">SKU</Label>
              <Input 
                id="sku" 
                placeholder="IPH15-PRO-BLK" 
                className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Price ($)</Label>
              <Input 
                id="price" 
                type="number" 
                step="0.01" 
                placeholder="999.99" 
                className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required 
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Enter product details..." 
                className="bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-medium min-h-[100px]"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
          
          <div className="pt-6 flex items-center justify-end gap-3">
            <Button variant="ghost" type="button" className="rounded-xl font-bold text-gray-400" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-black hover:bg-gray-800 text-white font-bold h-14 px-8 rounded-2xl shadow-xl shadow-black/10" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Save Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
