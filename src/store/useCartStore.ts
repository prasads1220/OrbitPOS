import { create } from 'zustand';
import { Database } from '@/types/supabase';
import { toast } from 'sonner';

type Product = Database['public']['Tables']['products']['Row'] & {
  has_variants?: boolean;
  is_serialized?: boolean;
};

interface CartItem extends Product {
  quantity: number;
  variant_id?: string;
  variant_name?: string;
  serial_number?: string;
  selected_serials?: string[];
}

export interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  loyalty_points: number;
  created_at?: string;
}

export interface LoyaltySettings {
  earn_ratio: number;
  redeem_ratio: number;
  discount_percent: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, details?: { variant_id?: string; variant_name?: string; price?: number; serial_number?: string; selected_serials?: string[]; sku?: string; stock_quantity?: number }) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: 'amount' | 'percentage';
  setDiscount: (amount: number, type?: 'amount' | 'percentage') => void;
  calculateTotals: () => void;
  customer: Customer | null;
  redeemPoints: boolean;
  setCustomer: (customer: Customer | null) => void;
  setRedeemPoints: (redeem: boolean) => void;
  loyaltySettings: LoyaltySettings;
  setLoyaltySettings: (settings: Partial<LoyaltySettings>) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  redeemPoints: false,
  loyaltySettings: {
    earn_ratio: 100,
    redeem_ratio: 100,
    discount_percent: 2,
  },
  setLoyaltySettings: (settings) => {
    set((state) => ({
      loyaltySettings: { ...state.loyaltySettings, ...settings }
    }));
    get().calculateTotals();
  },
  setCustomer: (customer) => {
    set({ customer, redeemPoints: false });
    get().calculateTotals();
  },
  setRedeemPoints: (redeemPoints) => {
    set({ redeemPoints });
    get().calculateTotals();
  },
  addItem: (product, details) => {
    const items = get().items;
    const existingItem = items.find((item) => 
      item.id === product.id && 
      item.variant_id === details?.variant_id
    );

    const priceToUse = details?.price !== undefined ? details.price : product.price;
    const skuToUse = details?.sku || product.sku;
    const stockLimit = details?.stock_quantity !== undefined ? details.stock_quantity : product.stock_quantity;

    if (existingItem) {
      if (existingItem.quantity >= stockLimit) {
        toast.error(`Only ${stockLimit} items available in stock`);
        return;
      }
      set({
        items: items.map((item) =>
          (item.id === product.id && item.variant_id === details?.variant_id) 
            ? { 
                ...item, 
                quantity: item.quantity + 1,
                selected_serials: [...(item.selected_serials || []), ...(details?.serial_number ? [details.serial_number] : [])]
              } 
            : item
        ),
      });
    } else {
      if (stockLimit <= 0) {
        toast.error('Item is out of stock');
        return;
      }
      set({ 
        items: [
          ...items, 
          { 
            ...product, 
            price: priceToUse,
            sku: skuToUse,
            stock_quantity: stockLimit,
            quantity: 1,
            variant_id: details?.variant_id,
            variant_name: details?.variant_name,
            serial_number: details?.serial_number,
            selected_serials: details?.serial_number ? [details.serial_number] : []
          }
        ] 
      });
    }
    get().calculateTotals();
  },
  removeItem: (productId, variantId) => {
    set({ 
      items: get().items.filter((item) => 
        !(item.id === productId && item.variant_id === variantId)
      ) 
    });
    get().calculateTotals();
  },
  updateQuantity: (productId, quantity, variantId) => {
    const items = get().items;
    const item = items.find(i => i.id === productId && i.variant_id === variantId);
    
    if (!item) return;

    if (quantity > item.stock_quantity) {
      toast.error(`Only ${item.stock_quantity} items available in stock`);
      return;
    }

    if (quantity <= 0) {
      get().removeItem(productId, variantId);
      return;
    }
    set({
      items: items.map((i) =>
        (i.id === productId && i.variant_id === variantId) ? { ...i, quantity } : i
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
  clearCart: () => set({ items: [], total: 0, subtotal: 0, tax: 0, discount: 0, discountType: 'amount', customer: null, redeemPoints: false }),
  subtotal: 0,
  tax: 0,
  discount: 0,
  discountType: 'amount',
  total: 0,
  calculateTotals: () => {
    const items = get().items;
    const discount = get().discount;
    const discountType = get().discountType;
    const customer = get().customer;
    const redeemPoints = get().redeemPoints;
    
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const tax = subtotal * 0.08; // 8% tax
    
    let discountValue = 0;
    if (discountType === 'percentage') {
      discountValue = (subtotal + tax) * (discount / 100);
    } else {
      discountValue = discount;
    }

    // Apply dynamic discount if customer is selected, has >= redeem_ratio points, and points redemption is toggled
    let pointsDiscountValue = 0;
    const loyaltySettings = get().loyaltySettings;
    if (redeemPoints && customer && customer.loyalty_points >= loyaltySettings.redeem_ratio) {
      pointsDiscountValue = (subtotal + tax - discountValue) * (loyaltySettings.discount_percent / 100);
    }

    const total = Math.max(0, subtotal + tax - discountValue - pointsDiscountValue);
    set({ subtotal, tax, total });
  },
}));;
