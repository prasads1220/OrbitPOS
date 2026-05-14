import { create } from 'zustand';
import { Database } from '@/types/supabase';

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
      set({
        items: items.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ),
      });
    } else {
      set({ items: [...items, { ...product, quantity: 1 }] });
    }
    get().calculateTotals();
  },
  removeItem: (productId) => {
    set({ items: get().items.filter((item) => item.id !== productId) });
    get().calculateTotals();
  },
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: get().items.map((item) =>
        item.id === productId ? { ...item, quantity } : item
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
