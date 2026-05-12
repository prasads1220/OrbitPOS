'use client';

import { useState } from 'react';
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
import { useAuthStore } from '@/store/useAuthStore';

export function EditProductDialog({ product, open, onOpenChange, onProductUpdated }: { product: any, open: boolean, onOpenChange: (open: boolean) => void, onProductUpdated?: () => void }) {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    price: product?.price?.toString() || '0',
    description: product?.description || '',
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
    if (!product || !profile?.store_id) return;
    setLoading(true);

    try {
      let image_url = product.image_url;

      // Upload new image if selected
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

      const { error } = await supabase
        .from('products')
        .update({
          name: formData.name,
          sku: formData.sku,
          barcode: formData.barcode || null,
          price: parseFloat(formData.price),
          description: formData.description,
          image_url: image_url,
        })
        .eq('id', product.id);

      if (error) throw error;

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
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <div className="p-10 bg-[#fbfbfd] border-b border-gray-50">
          <DialogTitle className="text-2xl font-black text-black tracking-tight">Edit Product</DialogTitle>
          <p className="text-gray-400 font-medium text-[13px] mt-1">Modify details for {product?.name}.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Image Upload Area */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Image</Label>
            <div 
              onClick={() => document.getElementById('edit-image-upload')?.click()}
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
                id="edit-image-upload" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-name" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Name</Label>
              <Input 
                id="edit-name" 
                placeholder="e.g. iPhone 15 Pro" 
                className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sku" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">SKU</Label>
              <Input 
                id="edit-sku" 
                placeholder="IPH15-PRO-BLK" 
                className="h-14 bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-bold"
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Price ($)</Label>
              <Input 
                id="edit-price" 
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
              <Label htmlFor="edit-description" className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</Label>
              <Textarea 
                id="edit-description" 
                placeholder="Enter product details..." 
                className="bg-[#f5f5f7] border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 font-medium min-h-[100px]"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
          
          <div className="pt-6 flex items-center justify-end gap-3">
            <Button variant="ghost" type="button" className="rounded-xl font-bold text-gray-400" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-black hover:bg-gray-800 text-white font-bold h-14 px-8 rounded-2xl shadow-xl shadow-black/10" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
