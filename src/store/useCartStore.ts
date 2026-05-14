import { create } from 'zustand';
import { Database } from '@/types/supabase';
import { toast } from 'sonner';

type Product = Database['public']['Tables']['products']['Row'];

interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: 'amount' | 'percentage';
  setDiscount: (amount: number, type?: 'amount' | 'percentage') => void;
  calculateTotals: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (product) => {
    const items = get().items;
    const existingItem = items.find((item) => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast.error(`Only ${product.stock_quantity} items available in stock`);
        return;
      }
      set({
        items: items.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ),
      });
    } else {
      if (product.stock_quantity <= 0) {
        toast.error('Item is out of stock');
        return;
      }
      set({ items: [...items, { ...product, quantity: 1 }] });
    }
    get().calculateTotals();
  },
  removeItem: (productId) => {
    set({ items: get().items.filter((item) => item.id !== productId) });
    get().calculateTotals();
  },
  updateQuantity: (productId, quantity) => {
    const items = get().items;
    const item = items.find(i => i.id === productId);
    
    if (!item) return;

    if (quantity > item.stock_quantity) {
      toast.error(`Only ${item.stock_quantity} items available in stock`);
      return;
    }

    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: items.map((i) =>
        i.id === productId ? { ...i, quantity } : i
      ),
    });
    get().calculateTotals();
  },
  setDiscount: (amount, type) => {
    set({ 
      discount: amount, 
      discountType: type || get().discountType 
    });
    get().calculateTotals();
  },
  clearCart: () => set({ items: [], total: 0, subtotal: 0, tax: 0, discount: 0, discountType: 'amount' }),
  subtotal: 0,
  tax: 0,
  discount: 0,
  discountType: 'amount',
  total: 0,
  calculateTotals: () => {
    const items = get().items;
    const discount = get().discount;
    const discountType = get().discountType;
    
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const tax = subtotal * 0.08; // 8% tax
    
    let discountValue = 0;
    if (discountType === 'percentage') {
      discountValue = (subtotal + tax) * (discount / 100);
    } else {
      discountValue = discount;
    }

    const total = Math.max(0, subtotal + tax - discountValue);
    set({ subtotal, tax, total });
  },
}));
