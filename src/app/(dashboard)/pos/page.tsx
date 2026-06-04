'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/store/useCartStore';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  UserPlus,
  PackageX,
  ShoppingCart,
  Scan,
  LayoutGrid,
  List,
  ChevronRight,
  AlertCircle,
  UserCheck,
  History,
  X,
  Loader2,
  ArrowLeft,
  Check,
  Printer,
  ArrowRight,
  UserMinus,
  Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Database } from '@/types/supabase';
import { CheckoutDialog } from '@/components/pos/checkout-dialog';
import { ReceiptPrinter } from '@/components/pos/receipt-printer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

type Product = Database['public']['Tables']['products']['Row'] & {
  has_variants: boolean;
  is_serialized: boolean;
};
import { useAuthStore } from '@/store/useAuthStore';
import { useActiveStore } from '@/store/useActiveStore';

export default function POSPage() {
  const { profile } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  
  // Categories State
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Cart Actions
  const items = useCartStore(state => state.items);
  const addItem = useCartStore(state => state.addItem);
  const removeItem = useCartStore(state => state.removeItem);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const subtotal = useCartStore(state => state.subtotal);
  const tax = useCartStore(state => state.tax);
  const tax1 = useCartStore(state => state.tax1);
  const tax2 = useCartStore(state => state.tax2);
  const taxSettings = useCartStore(state => state.taxSettings);
  const total = useCartStore(state => state.total);
  const discount = useCartStore(state => state.discount);
  const discountType = useCartStore(state => state.discountType);
  const setDiscount = useCartStore(state => state.setDiscount);
  const clearCart = useCartStore(state => state.clearCart);

  const [initialMethod, setInitialMethod] = useState<'cash' | 'card'>('cash');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // States for Variant & Serial Overlay Prompt
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  
  const [inStockSerials, setInStockSerials] = useState<any[]>([]);
  const [selectedSerial, setSelectedSerial] = useState<string>('');
  const [manualSerialInput, setManualSerialInput] = useState('');

  // Customer & Loyalty states from Cart Store
  const customer = useCartStore(state => state.customer);
  const redeemPoints = useCartStore(state => state.redeemPoints);
  const setCustomer = useCartStore(state => state.setCustomer);
  const setRedeemPoints = useCartStore(state => state.setRedeemPoints);

  // Parked/Held Orders States (Task 1.4)
  const [heldOrders, setHeldOrders] = useState<Array<{
    id: string;
    label: string;
    items: typeof items;
    customer: typeof customer;
    discount: number;
    discountType: 'amount' | 'percentage';
    savedAt: Date;
  }>>([]);
  const [showHeldOrders, setShowHeldOrders] = useState(false);

  const holdOrder = () => {
    if (items.length === 0) return;
    const label = customer ? customer.full_name : `Order ${heldOrders.length + 1}`;
    setHeldOrders(prev => [...prev, {
      id: crypto.randomUUID(),
      label,
      items: [...items],
      customer,
      discount,
      discountType,
      savedAt: new Date(),
    }]);
    clearCart();
    toast.success(`"${label}" held. Cart cleared for new customer.`);
  };

  const resumeOrder = (heldId: string) => {
    const held = heldOrders.find(h => h.id === heldId);
    if (!held) return;
    if (items.length > 0) {
      toast.error('Clear the current cart before resuming a held order.');
      return;
    }
    held.items.forEach(item => addItem(item, {
      variant_id: item.variant_id,
      variant_name: item.variant_name,
      price: item.price,
      serial_number: item.serial_number,
      stock_quantity: item.stock_quantity,
    }));
    setCustomer(held.customer);
    setDiscount(held.discount, held.discountType);
    setHeldOrders(prev => prev.filter(h => h.id !== heldId));
    setShowHeldOrders(false);
    toast.success(`Resumed order for "${held.label}"`);
  };
  const loyaltySettings = useCartStore(state => state.loyaltySettings);
  const setLoyaltySettings = useCartStore(state => state.setLoyaltySettings);

  // Search & Register Dialog states
  const [assignOpen, setAssignOpen] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState<any[]>([]);
  const [loadingCust, setLoadingCust] = useState(false);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDOB, setNewDOB] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [submittingCust, setSubmittingCust] = useState(false);

  // Customer Order History Modal State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pastOrders, setPastOrders] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedPastOrder, setSelectedPastOrder] = useState<any | null>(null);

  // Receipt Reprinting state
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const storeToUse = activeStoreId || profile?.store_id;

  const customerStats = useMemo(() => {
    if (!pastOrders || pastOrders.length === 0) {
      return {
        lifetimeSpent: 0,
        totalOrders: 0,
        aov: 0,
        topProducts: []
      };
    }
    
    let spent = 0;
    let orderCount = 0;
    const productCounts: Record<string, { name: string; quantity: number }> = {};
    
    pastOrders.forEach(order => {
      if (order.payment_status === 'completed' || order.payment_status === 'partially_refunded') {
        spent += order.total_amount;
        orderCount++;
      }
      
      order.order_items?.forEach((item: any) => {
        const name = item.products?.name || 'Unknown Product';
        const qty = (item.quantity || 0) - (item.refunded_quantity || 0);
        if (qty > 0) {
          if (productCounts[name]) {
            productCounts[name].quantity += qty;
          } else {
            productCounts[name] = { name, quantity: qty };
          }
        }
      });
    });
    
    const topProds = Object.values(productCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
      
    return {
      lifetimeSpent: spent,
      totalOrders: orderCount,
      aov: orderCount > 0 ? spent / orderCount : 0,
      topProducts: topProds
    };
  }, [pastOrders]);

  const handleCustomerSearch = async (query: string) => {
    setCustSearch(query);
    if (!storeToUse) return;
    if (query.trim().length === 0) {
      setCustResults([]);
      return;
    }
    setLoadingCust(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', storeToUse)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);

      if (error) {
        console.error("Customer search error:", error);
        toast.error(`Customer search failed: ${error.message} (${error.code})`);
      } else if (data) {
        setCustResults(data);
      }
    } catch (err: any) {
      console.error("Customer search exception:", err);
      toast.error(`Search error: ${err.message || 'Unknown error occurred'}`);
    } finally {
      setLoadingCust(false);
    }
  };

  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeToUse) return;
    if (!newName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    setSubmittingCust(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          full_name: newName,
          phone: newPhone || null,
          email: newEmail || null,
          date_of_birth: newDOB || null,
          address: newAddress || null,
          store_id: storeToUse,
          loyalty_points: 0
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Customer registered successfully!');
      setCustomer(data);
      setAssignOpen(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewDOB('');
      setNewAddress('');
    } catch (err: any) {
      toast.error(err.message || 'Error registering customer');
    } finally {
      setSubmittingCust(false);
    }
  };

  const fetchCustomerHistory = async () => {
    if (!customer || !storeToUse) return;
    setLoadingHistory(true);
    try {
      // Synchronize latest customer details (points balance) in real-time
      const { data: latestCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customer.id)
        .single();
      
      if (latestCustomer) {
        setCustomer(latestCustomer);
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          tax_amount,
          discount_amount,
          payment_status,
          payment_method,
          created_at,
          refunded_amount,
          points_earned,
          points_redeemed,
          cashier:profiles!cashier_id ( full_name ),
          order_items (
            id,
            quantity,
            refunded_quantity,
            total_price,
            unit_price,
            variant_id,
            serial_number,
            products ( name, price, sku ),
            product_variants ( model_name, sku, barcode )
          )
        `)
        .eq('customer_id', customer.id)
        .eq('store_id', storeToUse)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPastOrders(data || []);
    } catch (err) {
      console.error('Error fetching customer history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-receipt');
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print receipts');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OrbitPOS Receipt</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; padding: 0; font-family: monospace; background: white; }
            #printable-receipt { display: block !important; width: 80mm; padding: 5mm; margin: 0; background: white; }
            * { box-sizing: border-box; color: black !important; font-family: monospace !important; }
            .space-y-4 > * + * { margin-top: 1rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .border-t { border-top: 1px solid black; }
            .border-b { border-bottom: 1px solid black; }
            .border-y { border-top: 1px solid black; border-bottom: 1px solid black; }
            .border-dashed { border-style: dashed; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .pt-2 { padding-top: 0.5rem; }
            .pt-8 { padding-top: 2rem; }
            .pb-4 { padding-bottom: 1rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-8 { margin-top: 2rem; }
            .text-xl { font-size: 1.25rem; }
            .text-lg { font-size: 1.125rem; }
            .text-[14px] { font-size: 14px; }
            .text-[12px] { font-size: 12px; }
            .text-[10px] { font-size: 10px; }
            .text-[9px] { font-size: 9px; }
            .font-mono { font-family: monospace; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .w-1/2 { width: 50%; }
            .w-1/4 { width: 25%; }
            .opacity-70 { opacity: 0.7; }
            .opacity-80 { opacity: 0.8; }
            .italic { font-style: italic; }
            .tracking-widest { letter-spacing: 0.1em; }
            .tracking-tight { letter-spacing: -0.025em; }
          </style>
        </head>
        <body>
          <div id="printable-receipt">${printContent.innerHTML}</div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    if (receiptData) {
      setTimeout(() => {
        handlePrint();
        setReceiptData(null);
      }, 500);
    }
  }, [receiptData]);

  const handleReprint = (order: any) => {
    const isRefunded = order.payment_status === 'refunded' || order.payment_status === 'partially_refunded';
    if (isRefunded) {
      const refundedItems = order.order_items.filter((item: any) => (item.refunded_quantity || 0) > 0);
      const subtotal = refundedItems.reduce((sum: number, item: any) => sum + (item.unit_price * item.refunded_quantity), 0);
      const preTaxTotal = order.total_amount - (order.tax_amount || 0);
      const taxRate = preTaxTotal > 0 ? (order.tax_amount || 0) / preTaxTotal : 0;
      const tax = subtotal * taxRate;
      setReceiptData({
        orderId: order.id,
        date: new Date(order.created_at).toLocaleString(),
        method: order.payment_method,
        items: refundedItems.map((item: any) => ({
          name: item.products?.name,
          quantity: item.refunded_quantity,
          unit_price: item.unit_price,
          price: item.unit_price,
          variant_name: item.product_variants?.model_name || null,
          serial_number: item.serial_number || null,
        })),
        subtotal: subtotal,
        tax: tax,
        total: subtotal + tax,
        discount: order.discount_amount || 0,
        customerName: customer?.full_name || null,
        customerPhone: customer?.phone || null,
        customerEmail: customer?.email || null,
        pointsEarned: order.points_earned || 0,
        pointsRedeemed: order.points_redeemed || 0,
        pointsBalance: customer?.loyalty_points || 0,
        cashierName: order.cashier?.full_name || 'System',
        type: 'refund'
      });
    } else {
      const subtotal = order.order_items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0);
      setReceiptData({
        orderId: order.id,
        date: new Date(order.created_at).toLocaleString(),
        method: order.payment_method,
        items: order.order_items.map((item: any) => ({
          name: item.products?.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          price: item.unit_price,
          variant_name: item.product_variants?.model_name || null,
          serial_number: item.serial_number || null,
        })),
        subtotal: subtotal,
        tax: order.tax_amount || 0,
        total: order.total_amount,
        discount: order.discount_amount || 0,
        customerName: customer?.full_name || null,
        customerPhone: customer?.phone || null,
        customerEmail: customer?.email || null,
        pointsEarned: order.points_earned || 0,
        pointsRedeemed: order.points_redeemed || 0,
        pointsBalance: customer?.loyalty_points || 0,
        cashierName: order.cashier?.full_name || 'System',
        type: 'sale'
      });
    }
  };

  useEffect(() => {
    if (historyOpen && customer?.id) {
      fetchCustomerHistory();
    }
  }, [historyOpen, customer?.id]);

  const fetchStoreSettings = async () => {
    if (!storeToUse) return;
    try {
      // Fetch loyalty settings along with custom taxes
      const { data, error } = await supabase
        .from('stores')
        .select('loyalty_points_earn_ratio, loyalty_points_earn_value, loyalty_points_redeem_ratio, loyalty_points_redeem_discount_percent, tax1_name, tax1_rate, tax2_name, tax2_rate')
        .eq('id', storeToUse)
        .single();
      
      if (data) {
        setLoyaltySettings({
          earn_ratio: data.loyalty_points_earn_ratio ?? 100,
          earn_value: data.loyalty_points_earn_value ?? 1,
          redeem_ratio: data.loyalty_points_redeem_ratio ?? 100,
          discount_percent: data.loyalty_points_redeem_discount_percent !== null ? parseFloat(data.loyalty_points_redeem_discount_percent) : 2.00
        });
        
        // Safely set tax settings, falling back if null/undefined
        useCartStore.getState().setTaxSettings({
          tax1_name: (data as any).tax1_name ?? 'CGST',
          tax1_rate: (data as any).tax1_rate !== null && (data as any).tax1_rate !== undefined ? parseFloat((data as any).tax1_rate) : 4.00,
          tax2_name: (data as any).tax2_name ?? 'SGST',
          tax2_rate: (data as any).tax2_rate !== null && (data as any).tax2_rate !== undefined ? parseFloat((data as any).tax2_rate) : 4.00,
        });
      } else if (error) {
        // Fallback: try fetching only basic fields if the custom columns don't exist yet
        const { data: fallbackData } = await supabase
          .from('stores')
          .select('loyalty_points_earn_ratio, loyalty_points_earn_value, loyalty_points_redeem_ratio, loyalty_points_redeem_discount_percent')
          .eq('id', storeToUse)
          .single();
        
        if (fallbackData) {
          setLoyaltySettings({
            earn_ratio: fallbackData.loyalty_points_earn_ratio ?? 100,
            earn_value: fallbackData.loyalty_points_earn_value ?? 1,
            redeem_ratio: fallbackData.loyalty_points_redeem_ratio ?? 100,
            discount_percent: fallbackData.loyalty_points_redeem_discount_percent !== null ? parseFloat(fallbackData.loyalty_points_redeem_discount_percent) : 2.00
          });
        }
      }
    } catch (err) {
      console.error('Error fetching store settings:', err);
    }
  };

  useEffect(() => {
    if (storeToUse) {
      fetchProducts();
      fetchStoreSettings();
      fetchCategories();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        searchInputRef.current?.focus();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile, activeStoreId, storeToUse]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name');
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    if (!storeToUse) return;
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeToUse)
      .eq('is_active', true);

    if (data) setProducts(data);
    setLoading(false);
  };

  // Intercept changes in search to check for barcode scans directly
  const handleSearchChange = async (val: string) => {
    setSearch(val);
    if (!storeToUse) return;

    // Check if searched value matches a product barcode directly (barcode scanner types and may press Enter)
    if (val.length >= 4) {
      // 1. First check main products table barcode
      const { data: pMatch } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', val)
        .eq('store_id', storeToUse)
        .eq('is_active', true)
        .maybeSingle();

      if (pMatch) {
        setSearch('');
        handleItemSelection(pMatch);
        return;
      }

      // 2. Then check variant barcodes
      const { data: vMatch } = await supabase
        .from('product_variants')
        .select('*, products(*)')
        .eq('barcode', val)
        .eq('store_id', storeToUse)
        .maybeSingle();

      if (vMatch && vMatch.products) {
        setSearch('');
        handleItemSelection(vMatch.products, vMatch);
        return;
      }
    }
  };

  // Handle clicking or scanning a product
  const handleItemSelection = async (product: Product, preSelectedVariant?: any) => {
    if (!storeToUse) return;

    // A. Standard Simple Product (No variants, not serialized)
    if (!product.has_variants && !product.is_serialized) {
      addItem(product);
      return;
    }

    // B. Needs Setup: Query variants & available serials
    setSelectedProduct(product);
    setCustomizerOpen(true);
    setSelectedSerial('');
    setManualSerialInput('');

    // Fetch variants if applicable
    if (product.has_variants) {
      const { data: vars } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id);
      
      setProductVariants(vars || []);
      
      if (preSelectedVariant) {
        setSelectedVariant(preSelectedVariant);
        fetchSerialsForVariant(preSelectedVariant.id);
      } else if (vars && vars.length > 0) {
        setSelectedVariant(vars[0]);
        fetchSerialsForVariant(vars[0].id);
      } else {
        setSelectedVariant(null);
      }
    } else {
      setProductVariants([]);
      setSelectedVariant(null);
      // Fetch base product serials
      fetchSerialsForProduct(product.id);
    }
  };

  const fetchSerialsForVariant = async (variantId: string) => {
    const { data: serials } = await supabase
      .from('serialized_inventory')
      .select('*')
      .eq('variant_id', variantId)
      .eq('status', 'in_stock');
    setInStockSerials(serials || []);
  };

  const fetchSerialsForProduct = async (productId: string) => {
    const { data: serials } = await supabase
      .from('serialized_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'in_stock');
    setInStockSerials(serials || []);
  };

  // Finalize adding variant/serialized product to cart
  const handleAddCustomizedToCart = () => {
    if (!selectedProduct) return;

    const requiresSerial = selectedProduct.is_serialized;
    const finalSerial = selectedSerial || manualSerialInput.trim();

    if (requiresSerial && !finalSerial) {
      toast.error('Unique Serial Number is required for this product.');
      return;
    }

    const price = selectedVariant ? parseFloat(selectedVariant.price) : selectedProduct.price;
    const sku = selectedVariant ? selectedVariant.sku : selectedProduct.sku;
    const stockQty = selectedVariant ? selectedVariant.stock_quantity : selectedProduct.stock_quantity;

    addItem(selectedProduct, {
      variant_id: selectedVariant?.id,
      variant_name: selectedVariant?.model_name,
      price: price,
      sku: sku,
      stock_quantity: stockQty,
      serial_number: finalSerial || undefined
    });

    setCustomizerOpen(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setSelectedSerial('');
    setManualSerialInput('');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode || '').includes(search)
  );

  return (
    <div className="flex flex-col xl:flex-row gap-6 min-h-0 h-full animate-in fade-in duration-700 bg-white">
      {/* Product Selection */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 group max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" />
            <Input 
              ref={searchInputRef}
              placeholder="Scan barcode or search products... (F2)" 
              className="pl-12 h-14 bg-white border-transparent rounded-2xl shadow-sm focus:ring-2 focus:ring-[#0071e3]/10 transition-all font-bold text-lg"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="flex items-center bg-white p-1.5 rounded-2xl shadow-sm border border-gray-50">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("rounded-xl h-10 w-10 transition-all", viewMode === 'grid' ? "bg-[#0071e3] text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:bg-gray-50")}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("rounded-xl h-10 w-10 transition-all", viewMode === 'list' ? "bg-[#0071e3] text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:bg-gray-50")}
              onClick={() => setViewMode('list')}
            >
              <List className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 -mr-4 pr-4">
          {loading ? (
             <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                   <div key={i} className="aspect-[4/5] bg-white animate-pulse rounded-3xl border border-gray-100" />
                ))}
             </div>
          ) : (
            <div className="flex flex-col gap-6">
              {selectedCategoryId !== null && search === '' && (
                <div className="flex items-center gap-3">
                   <Button variant="ghost" className="h-10 px-4 rounded-xl font-bold text-gray-500 hover:text-black bg-gray-50 hover:bg-gray-100 transition-colors" onClick={() => setSelectedCategoryId(null)}>
                     <ArrowLeft className="mr-2 h-4 w-4" />
                     Back to Categories
                   </Button>
                   <span className="text-xl font-black text-black">
                     {selectedCategoryId === 'uncategorized' ? 'Uncategorized' : categories.find(c => c.id === selectedCategoryId)?.name || 'Products'}
                   </span>
                </div>
              )}
              <div className={cn(
                "grid gap-6 pb-6",
                viewMode === 'grid' ? "grid-cols-2 md:grid-cols-3 2xl:grid-cols-4" : "grid-cols-1"
              )}>
                {selectedCategoryId === null && search === '' ? (
                  <>
                     {categories.map(category => {
                       const count = products.filter(p => p.category_id === category.id).length;
                       if (count === 0) return null;
                       return (
                         <div 
                           key={category.id} 
                           className="group relative bg-gradient-to-br from-[#0071e3] to-[#00bbf9] rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-500 cursor-pointer overflow-hidden aspect-[4/3] flex flex-col items-start justify-end"
                           onClick={() => setSelectedCategoryId(category.id)}
                         >
                            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white font-bold text-[12px]">
                              {count} Items
                            </div>
                            <h3 className="font-black text-white text-2xl tracking-tight z-10">{category.name}</h3>
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                         </div>
                       );
                     })}
                     {products.filter(p => !p.category_id).length > 0 && (
                       <div 
                         className="group relative bg-gradient-to-br from-gray-700 to-gray-900 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-500 cursor-pointer overflow-hidden aspect-[4/3] flex flex-col items-start justify-end"
                         onClick={() => setSelectedCategoryId('uncategorized')}
                       >
                          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white font-bold text-[12px]">
                            {products.filter(p => !p.category_id).length} Items
                          </div>
                          <h3 className="font-black text-white text-2xl tracking-tight z-10">Uncategorized</h3>
                       </div>
                     )}
                  </>
                ) : (
                  filteredProducts
                    .filter(p => selectedCategoryId === null || search !== '' ? true : (selectedCategoryId === 'uncategorized' ? !p.category_id : p.category_id === selectedCategoryId))
                    .map((product) => (
                      <div 
                        key={product.id} 
                        className={cn(
                    "group relative bg-white rounded-3xl border border-transparent hover:border-[#0071e3]/30 shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-500 cursor-pointer overflow-hidden",
                    viewMode === 'list' && "flex items-center gap-6 p-4"
                  )}
                  onClick={() => handleItemSelection(product)}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-20">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </div>

                  <div className={cn(
                    "bg-[#f5f5f7] flex items-center justify-center relative overflow-hidden transition-colors group-hover:bg-[#f0f0f2]",
                    viewMode === 'grid' ? "aspect-square w-full" : "w-24 h-24 rounded-2xl flex-shrink-0"
                  )}>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-1000" />
                    ) : (
                      <PackageX className="h-10 w-10 text-gray-300" />
                    )}
                    {product.stock_quantity < 5 && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-black text-rose-500 shadow-sm border border-rose-100 z-10">
                        LOW STOCK
                      </div>
                    )}
                  </div>
                  
                  <div className={cn("p-5 relative z-10", viewMode === 'list' && "flex-1 p-0")}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-black group-hover:text-[#0071e3] transition-colors truncate text-[15px]">{product.name}</h3>
                      <div className="flex gap-1">
                        {product.has_variants && (
                          <Badge className="bg-amber-50 text-amber-600 border-amber-100 font-bold text-[9px] px-1">Models</Badge>
                        )}
                        {product.is_serialized && (
                          <Badge className="bg-blue-50 text-blue-600 border-blue-100 font-bold text-[9px] px-1">Serial</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mb-2 truncate">{product.vendor_name || 'Generic Vendor'}</p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex flex-col">
                        <p className="text-xl font-black text-black">
                          {product.has_variants ? 'Varies' : `₹${product.price.toFixed(2)}`}
                        </p>
                        <p className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          product.stock_quantity <= 0 ? "text-rose-500" : "text-gray-400"
                        )}>
                          {product.stock_quantity <= 0 ? 'Out of Stock' : `Stock: ${product.stock_quantity}`}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 tracking-tight uppercase">
                        {product.has_variants ? 'VARIANTS' : product.sku}
                      </span>
                    </div>
                  </div>
                  
                  {viewMode === 'grid' && (
                    <div className="absolute inset-0 bg-[#0071e3]/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-30">
                      <div className="bg-[#0071e3] text-white p-3.5 rounded-2xl shadow-2xl scale-75 group-hover:scale-100 transition-all duration-500">
                        <Plus className="h-6 w-6" />
                      </div>
                    </div>
                  )}
                </div>
              ))
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart / Checkout Sidebar */}
      <div className={cn(
        "w-full xl:w-[400px] flex-col h-auto xl:h-[calc(100vh-110px)] bg-white rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden shrink-0 xl:sticky xl:top-0",
        items.length > 0 || customer || heldOrders.length > 0 ? "flex" : "hidden xl:flex"
      )}>
        {/* Cart Header */}
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-[#fbfbfd]/80 backdrop-blur-md shrink-0">
          <div>
            <h2 className="font-black text-lg text-black tracking-tight">Current Order</h2>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{items.length} items</p>
          </div>
          <div className="flex items-center gap-1">
            {heldOrders.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowHeldOrders(true)}
                className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 font-bold text-[11px] rounded-xl h-8 px-2.5">
                <History className="h-3.5 w-3.5 mr-1" />
                {heldOrders.length} Held
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={holdOrder} disabled={items.length === 0}
              className="text-gray-400 hover:text-amber-500 hover:bg-amber-50 font-bold text-[11px] rounded-xl h-8 px-2.5">
              <Pause className="h-3.5 w-3.5 mr-1" />
              Hold
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={clearCart} 
              className="text-gray-300 hover:text-rose-500 hover:bg-rose-50 h-9 w-9 rounded-xl transition-all active:scale-90"
            >
              <Trash2 className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>

        {/* Customer Identity Bar (Placed at Top) */}
        <div className="px-6 py-3.5 border-b border-gray-50 bg-gradient-to-b from-[#f8f9fa] to-white shrink-0">
          {customer ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-4 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] group">
              <div className="flex gap-3.5 items-center">
                {/* Initials Avatar with smooth premium gradient */}
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0071e3] to-[#00bbf9] flex items-center justify-center text-white text-[14px] font-black tracking-tight shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform duration-300 shrink-0">
                  {customer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                
                {/* Customer Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-black text-[14px] truncate leading-none mb-0.5">{customer.full_name}</span>
                    <Badge className="bg-[#0071e3]/10 hover:bg-[#0071e3]/15 text-[#0071e3] border-none font-black text-[9px] h-5 px-2 py-0 rounded-full select-none shrink-0">
                      {customer.loyalty_points} pts
                    </Badge>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold mt-1 tracking-tight truncate">
                    {customer.phone || customer.email || 'No contact details'}
                  </p>
                </div>
              </div>

              {/* Action Buttons styled like modern iOS controls */}
              <div className="flex gap-2 pt-1 border-t border-gray-50">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 rounded-xl text-black border-gray-100 hover:border-[#0071e3] hover:text-[#0071e3] font-bold text-[11px] gap-1.5 bg-[#fbfbfd] transition-all"
                  onClick={() => setHistoryOpen(true)}
                >
                  <History className="h-3.5 w-3.5" />
                  History
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 rounded-xl text-rose-500 border-gray-100 hover:border-rose-100 hover:bg-rose-50/50 hover:text-rose-600 transition-all p-0"
                  onClick={() => { setCustomer(null); setRedeemPoints(false); }}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Dynamic Loyalty Redemption Toggle */}
              {customer.loyalty_points >= loyaltySettings.redeem_ratio && (
                <div className="flex items-center justify-between bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 border border-emerald-500/10 p-3 rounded-2xl animate-in fade-in duration-300">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-emerald-600 tracking-wider">Loyalty Reward Available</span>
                    <span className="text-[10px] font-black text-gray-800 mt-0.5">
                      {loyaltySettings.discount_percent}% off for {loyaltySettings.redeem_ratio} points
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRedeemPoints(!redeemPoints)}
                    className={cn(
                      "w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none flex items-center shadow-inner",
                      redeemPoints ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                    )}
                  >
                    <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full text-gray-500 border-dashed border-gray-200 hover:border-[#0071e3] hover:text-[#0071e3] font-black text-[10px] h-11 rounded-2xl uppercase tracking-widest transition-all active:scale-95 bg-white shadow-sm"
              onClick={() => setAssignOpen(true)}
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Assign Customer
            </Button>
          )}
        </div>

        {/* Scrollable Cart Items */}
        <ScrollArea className="flex-1 min-h-0 px-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 py-12 text-center animate-in fade-in duration-500">
              <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mb-4 border border-gray-50">
                <ShoppingCart className="h-8 w-8 opacity-20" />
              </div>
              <p className="font-black text-gray-400 text-md tracking-tight">Cart is empty</p>
              <p className="text-[12px] mt-1 font-medium opacity-60">Add products to start.</p>
            </div>
          ) : (
            <div className="py-6 space-y-5">
              {items.map((item) => (
                <div key={item.id + '-' + (item.variant_id || '')} className="flex items-center justify-between group animate-in slide-in-from-right-4 duration-300">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[13px] font-bold text-black truncate mb-0.5">{item.name}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <p className="text-[12px] font-black text-[#0071e3]">₹{item.price.toFixed(2)}</p>
                      {item.variant_name && (
                        <Badge className="bg-amber-50 text-amber-600 border-amber-100 font-bold text-[9px] h-4 py-0 px-1 ml-0.5">
                          {item.variant_name}
                        </Badge>
                      )}
                      {item.serial_number && (
                        <Badge className="bg-blue-50 text-blue-600 border-blue-100 font-bold text-[9px] h-4 py-0 px-1 ml-0.5">
                          S/N: {item.serial_number}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-[#f5f5f7] rounded-xl p-1 border border-gray-100 shadow-sm">
                      <button 
                        className="p-1 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-30" 
                        onClick={() => updateQuantity(item.id, item.quantity - 1, item.variant_id)}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 text-[12px] font-black min-w-6 text-center">{item.quantity}</span>
                      <button 
                        className="p-1 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-30" 
                        onClick={() => updateQuantity(item.id, item.quantity + 1, item.variant_id)}
                        disabled={item.quantity >= item.stock_quantity}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-[13px] font-black min-w-14 text-right text-black">₹{(item.price * item.quantity).toFixed(2)}</p>
                    <Button 
                      variant="ghost" 
                      onClick={() => removeItem(item.id, item.variant_id)}
                      className="text-gray-300 hover:text-rose-500 rounded-lg h-7 w-7 p-0 ml-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Cart Footer */}
        <div className="px-6 py-6 bg-[#fbfbfd] border-t border-gray-100 space-y-5 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
          <div className="space-y-2">
            <div className="flex justify-between text-[13px] text-gray-400 font-bold">
              <span>Subtotal</span>
              <span className="text-black">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-gray-400 font-bold">
              <span>{taxSettings.tax1_name} ({taxSettings.tax1_rate.toFixed(1)}%)</span>
              <span className="text-black">₹{tax1.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-gray-400 font-bold">
              <span>{taxSettings.tax2_name} ({taxSettings.tax2_rate.toFixed(1)}%)</span>
              <span className="text-black">₹{tax2.toFixed(2)}</span>
            </div>
            
            <div className="bg-rose-50/30 rounded-xl p-3 border border-rose-100/40">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Discount</span>
                  <div className="flex bg-white/60 p-0.5 rounded-lg border border-rose-100/50">
                    <button 
                      onClick={() => setDiscount(discount, 'amount')}
                      className={cn("px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all", discountType === 'amount' ? "bg-rose-500 text-white" : "text-rose-400")}
                    >
                      ₹
                    </button>
                    <button 
                      onClick={() => setDiscount(discount, 'percentage')}
                      className={cn("px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all", discountType === 'percentage' ? "bg-rose-500 text-white" : "text-rose-400")}
                    >
                      %
                    </button>
                  </div>
                </div>
                <span className="text-[12px] font-black text-rose-500">
                  -{discountType === 'percentage' ? `${discount}%` : `₹${discount.toFixed(2)}`}
                </span>
              </div>
              <div className="flex gap-1.5">
                {[10, 20, 50].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setDiscount(pct, 'percentage')}
                    className={cn(
                      "flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all",
                      discount === pct && discountType === 'percentage' ? "bg-rose-500 text-white" : "bg-white text-rose-500 border-rose-100"
                    )}
                  >
                    {pct}%
                  </button>
                ))}
                <input 
                  type="number"
                  placeholder="Manual"
                  className="w-16 bg-white border border-rose-100 rounded-lg px-2 py-1 text-[10px] font-bold focus:ring-1 focus:ring-rose-500/20 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={discount || ''}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-dashed border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-black uppercase tracking-widest">Total Due</span>
              <span className="text-3xl font-black text-[#0071e3] tracking-tighter">₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-12 rounded-2xl border-gray-200 text-black font-black text-[13px] hover:border-[#0071e3] hover:text-[#0071e3] transition-all active:scale-95"
              onClick={() => { setInitialMethod('cash'); setCheckoutOpen(true); }} 
              disabled={items.length === 0}
            >
              <Banknote className="mr-2 h-5 w-5" />
              CASH
            </Button>
            <Button 
              className="h-12 rounded-2xl bg-black hover:bg-gray-900 text-white font-black text-[13px] shadow-lg shadow-black/10 transition-all active:scale-95" 
              onClick={() => { setInitialMethod('card'); setCheckoutOpen(true); }} 
              disabled={items.length === 0}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              CHARGE
            </Button>
          </div>
        </div>

        {/* Checkout Dialog */}
        <CheckoutDialog 
          open={checkoutOpen} 
          onOpenChange={setCheckoutOpen}
          items={items}
          subtotal={subtotal}
          tax={tax}
          tax1={tax1}
          tax2={tax2}
          taxSettings={taxSettings}
          total={total}
          discount={discount}
          discountType={discountType}
          initialMethod={initialMethod}
        />
      </div>

      {/* Dynamic Variant / Serial Customizer Prompt Overlay Dialog */}
      <Dialog open={customizerOpen} onOpenChange={setCustomizerOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
          <div className="p-8 bg-[#fbfbfd] border-b border-gray-50 flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black text-black tracking-tight">Configure Item</DialogTitle>
              <p className="text-gray-400 font-bold text-[11px] mt-0.5">{selectedProduct?.name}</p>
            </div>
            {selectedProduct?.is_serialized && (
              <Badge className="bg-blue-50 text-blue-600 border-blue-100 font-bold text-[9px]">Serialized</Badge>
            )}
          </div>

          <div className="p-8 space-y-6">
            {/* Step 1: Select Model/Variant if has_variants is true */}
            {selectedProduct?.has_variants && (
              <div className="space-y-3">
                <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Select Model / Variant</Label>
                <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                  {productVariants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariant(v);
                        setSelectedSerial('');
                        if (selectedProduct.is_serialized) {
                          fetchSerialsForVariant(v.id);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-3.5 rounded-xl border text-left font-bold text-[13px] transition-all",
                        selectedVariant?.id === v.id 
                          ? "border-[#0071e3] bg-blue-50/30 text-[#0071e3] shadow-sm" 
                          : "border-gray-100 hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      <div>
                        <p>{v.model_name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">SKU: {v.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-black font-black">₹{parseFloat(v.price).toFixed(2)}</p>
                        <p className="text-[9px] text-gray-400">Stock: {v.stock_quantity}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Scan / Select Serial Number if is_serialized is true */}
            {selectedProduct?.is_serialized && (
              <div className="space-y-4 pt-2 border-t border-dashed border-gray-100">
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold text-[#0071e3] uppercase tracking-widest">Scan or Select Serial Number</Label>
                  <p className="text-[10px] text-gray-400 font-medium">Please link the physical item barcode.</p>
                </div>

                {/* Direct scan or manual text input */}
                <div className="flex gap-2">
                  <Input 
                    placeholder="Scan / Type Serial S/N..."
                    className="h-11 bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white font-bold text-[13px]"
                    value={manualSerialInput}
                    onChange={(e) => {
                      setManualSerialInput(e.target.value);
                      setSelectedSerial(''); // Clear dropdown choice if manually typing
                    }}
                  />
                  <div className="h-11 w-11 bg-blue-50 text-[#0071e3] rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
                    <Scan className="h-5 w-5" />
                  </div>
                </div>

                {/* Dropdown of in-stock items */}
                {inStockSerials.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Or select available in stock ({inStockSerials.length}):</span>
                    <select
                      className="w-full h-11 bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white font-bold text-[13px] px-3 outline-none cursor-pointer"
                      value={selectedSerial}
                      onChange={(e) => {
                        setSelectedSerial(e.target.value);
                        setManualSerialInput(''); // Clear manual typing if dropdown chosen
                      }}
                    >
                      <option value="">-- Choose Serial S/N --</option>
                      {inStockSerials.map((s) => (
                        <option key={s.id} value={s.serial_number}>
                          {s.serial_number}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-rose-50/50 border border-rose-100/50 rounded-xl text-rose-600">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span className="text-[11px] font-bold">No serial numbers currently registered in stock. You can type one manually to force checkout.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-8 border-t border-gray-50 flex items-center justify-end gap-3 bg-[#fbfbfd]">
            <Button variant="ghost" className="rounded-xl font-bold text-gray-400" onClick={() => setCustomizerOpen(false)}>Cancel</Button>
            <Button 
              className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-black rounded-xl h-11 px-6 shadow-md shadow-blue-500/10 active:scale-95 transition-all"
              onClick={handleAddCustomizedToCart}
            >
              Add to Cart
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden Receipt Printer */}
      <div className="hidden">
        {receiptData && <ReceiptPrinter receiptData={receiptData} />}
      </div>

      {/* Assign Customer Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white">
          <div className="p-8 bg-[#fbfbfd] border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <UserPlus className="text-white h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-black tracking-tight">Customer CRM</DialogTitle>
                <p className="text-gray-400 font-bold text-[11px] mt-0.5">Assign or register a customer</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by name, mobile, or email..."
                className="pl-12 h-12 bg-gray-50 border-transparent rounded-xl focus:bg-white font-bold text-[13px]"
                value={custSearch}
                onChange={(e) => handleCustomerSearch(e.target.value)}
              />
            </div>

            {/* Search Results */}
            {custSearch.trim().length > 0 && (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Search Results</Label>
                {loadingCust ? (
                  <div className="text-center py-6"><Loader2 className="animate-spin h-6 w-6 text-gray-300 mx-auto" /></div>
                ) : custResults.length === 0 ? (
                  <p className="text-center py-6 text-gray-400 text-[13px] font-bold">No registered customers found.</p>
                ) : (
                  custResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:border-[#0071e3] hover:bg-blue-50/10 text-left transition-all"
                      onClick={() => {
                        setCustomer(c);
                        setAssignOpen(false);
                      }}
                    >
                      <div>
                        <p className="font-black text-black text-[13px]">{c.full_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">{c.phone || c.email || 'No contact details'}</p>
                      </div>
                      <Badge className="bg-[#0071e3]/10 text-[#0071e3] border-none font-bold text-[10px]">
                        {c.loyalty_points} pts
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Quick Registration Form */}
            <form onSubmit={handleRegisterCustomer} className="space-y-4 pt-4 border-t border-gray-100">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Register New Customer</Label>
              <div className="space-y-3">
                <Input
                  placeholder="Full Name (Required)"
                  className="h-11 bg-gray-50 border-transparent rounded-xl focus:bg-white font-bold text-[13px]"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Mobile Number"
                  type="tel"
                  className="h-11 bg-gray-50 border-transparent rounded-xl focus:bg-white font-bold text-[13px]"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
                <Input
                  placeholder="Email Address"
                  type="email"
                  className="h-11 bg-gray-50 border-transparent rounded-xl focus:bg-white font-bold text-[13px]"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <Input
                  placeholder="Date of Birth (optional)"
                  type="date"
                  className="h-11 bg-gray-50 border-transparent rounded-xl focus:bg-white font-bold text-[13px]"
                  value={newDOB}
                  onChange={(e) => setNewDOB(e.target.value)}
                />
                <Input
                  placeholder="Address (optional)"
                  className="h-11 bg-gray-50 border-transparent rounded-xl focus:bg-white font-bold text-[13px]"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={submittingCust}
                className="w-full h-11 bg-black hover:bg-gray-800 text-white font-black rounded-xl text-[13px] shadow-lg shadow-black/10 mt-2 transition-all active:scale-95"
              >
                {submittingCust ? <Loader2 className="animate-spin h-5 w-5" /> : 'Register & Assign'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Purchase History Modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-[880px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white max-h-[85vh] flex flex-col">
          {/* Modal Header */}
          <div className="p-8 bg-[#fbfbfd] border-b border-gray-50 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                  <History className="text-white h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-black tracking-tight">Customer Intelligence Profile</DialogTitle>
                  <p className="text-gray-400 font-bold text-[11px] mt-0.5">Unified CRM Dashboard</p>
                </div>
              </div>
              <Badge className="bg-[#0071e3] text-white border-none font-black text-[10px] px-3.5 py-1.5 rounded-xl shadow-md shadow-blue-500/10">
                {customer?.loyalty_points || 0} Points Balance
              </Badge>
            </div>
          </div>

          {/* Dual-Column Split Body */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
            
            {/* Left Column: Customer Profile Stats & Top Products Graph */}
            <div className="w-full md:w-[340px] border-r border-gray-100 p-8 overflow-y-auto custom-scrollbar space-y-6 bg-gray-50/20 shrink-0 flex flex-col justify-start">
              
              {/* Profile Card */}
              <div className="bg-white border border-gray-100/80 rounded-2xl p-5 shadow-sm space-y-3.5">
                <div>
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Active Customer</span>
                  <h3 className="text-[16px] font-black text-black leading-tight mt-0.5">{customer?.full_name}</h3>
                </div>
                <div className="space-y-1.5 text-[11px] font-bold text-gray-500">
                  <p className="flex justify-between"><span>Phone:</span> <span className="text-black font-extrabold">{customer?.phone || 'Not provided'}</span></p>
                  <p className="flex justify-between"><span>Email:</span> <span className="text-black font-extrabold truncate max-w-[170px]">{customer?.email || 'Not provided'}</span></p>
                  <p className="flex justify-between border-t border-gray-50 pt-2.5 mt-1">
                    <span>Member Since:</span> 
                    <span className="text-black font-extrabold">
                      {customer?.created_at ? new Date(customer.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Statistics KPIs Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">Total Spent</p>
                  <p className="text-[12px] font-black text-black mt-1">₹{customerStats.lifetimeSpent.toFixed(0)}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">Visits</p>
                  <p className="text-[12px] font-black text-black mt-1">{customerStats.totalOrders}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">AOV</p>
                  <p className="text-[12px] font-black text-black mt-1">₹{customerStats.aov.toFixed(0)}</p>
                </div>
              </div>

              {/* Top Products Graph */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4 flex-1 min-h-0 flex flex-col justify-start">
                <div>
                  <h4 className="text-[11px] font-black text-black uppercase tracking-widest">📊 Top Products Purchased</h4>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">By net unit purchase volume</p>
                </div>

                {customerStats.topProducts.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-6 text-gray-300">
                    <ShoppingCart className="h-7 w-7 opacity-30 mb-2" />
                    <p className="text-[11px] font-bold text-gray-400">No purchase volume records.</p>
                  </div>
                ) : (
                  <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1">
                    {customerStats.topProducts.map((prod, idx) => {
                      const maxQty = customerStats.topProducts[0]?.quantity || 1;
                      const percentage = Math.round((prod.quantity / maxQty) * 100);
                      return (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between text-[11px] font-bold leading-tight">
                            <span className="text-gray-700 truncate max-w-[160px]">{prod.name}</span>
                            <span className="text-[#0071e3] font-black">{prod.quantity} units</span>
                          </div>
                          <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                            <div 
                              className="h-full bg-gradient-to-r from-[#0071e3] to-[#00bbf9] rounded-full transition-all duration-700 shadow-sm" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Transaction Log Checklist */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-4">
              <h4 className="text-[11px] font-black text-black uppercase tracking-widest shrink-0 mb-1">📜 Transaction History</h4>
              
              {loadingHistory ? (
                <div className="text-center py-24"><Loader2 className="animate-spin h-8 w-8 text-gray-200 mx-auto" /></div>
              ) : pastOrders.length === 0 ? (
                <div className="text-center py-20 space-y-3">
                  <PackageX className="h-14 w-14 text-gray-200 mx-auto" />
                  <h3 className="text-lg font-black text-black">No Purchases Recorded</h3>
                  <p className="text-gray-400 font-bold text-[12px] max-w-[280px] mx-auto">This customer has not completed any transactions yet.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {pastOrders.map((order) => (
                    <div key={order.id} className="border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-md hover:scale-[1.005] transition-all space-y-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-black text-[13px] tracking-tight">ORDER #{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-1">
                            {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-black text-base">₹{order.total_amount.toFixed(2)}</span>
                          <div className="flex items-center gap-1.5 justify-end mt-1">
                            <Badge className={cn("border-none font-black text-[9px] h-4 px-1.5 rounded-lg", order.payment_status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                              {order.payment_status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Order Items Summary */}
                      <div className="bg-[#f8f9fa] rounded-xl p-3.5 space-y-1.5 text-[12px]">
                        {order.order_items.map((oi: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-gray-600">
                            <span className="font-bold truncate max-w-[260px]">{oi.products?.name} {oi.product_variants?.model_name ? `(${oi.product_variants.model_name})` : ''}</span>
                            <span className="text-gray-400 font-medium">x{oi.quantity} - ₹{(oi.quantity * oi.unit_price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 border-t border-dashed border-gray-100 pt-3">
                        <div className="flex gap-4">
                          <span>Earned: <span className="text-[#0071e3] font-black">+{order.points_earned || 0} pts</span></span>
                          {order.points_redeemed > 0 && (
                            <span>Redeemed: <span className="text-rose-500 font-black">-{order.points_redeemed} pts</span></span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-black border-gray-200 hover:border-black font-bold text-[11px] px-3 bg-white"
                            onClick={() => handleReprint(order)}
                          >
                            <Printer className="h-3.5 w-3.5 mr-1" /> Reprint
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-gray-50 bg-[#fbfbfd] flex justify-end shrink-0">
            <Button className="rounded-xl font-bold bg-black text-white hover:bg-gray-800 px-6" onClick={() => setHistoryOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Held / Parked Orders List Dialog (Task 1.4) */}
      <Dialog open={showHeldOrders} onOpenChange={setShowHeldOrders}>
        <DialogContent className="sm:max-w-[400px] p-0 rounded-[2rem] border-none shadow-2xl bg-white">
          <div className="p-6 bg-[#fbfbfd] border-b border-gray-50">
            <DialogTitle className="text-lg font-black text-black">Held Orders</DialogTitle>
            <p className="text-gray-400 font-bold text-[11px] mt-0.5">Resume a parked transaction</p>
          </div>
          <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
            {heldOrders.length === 0 ? (
              <p className="text-center text-gray-400 text-[13px] py-8">No held orders</p>
            ) : (
              heldOrders.map(held => (
                <button key={held.id} onClick={() => resumeOrder(held.id)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-[#0071e3] hover:bg-blue-50/10 text-left transition-all">
                  <div>
                    <p className="font-black text-black text-[13px]">{held.label}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">
                      {held.items.length} items · {held.savedAt.toLocaleTimeString()}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
