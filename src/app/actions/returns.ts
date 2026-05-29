'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const getSupabaseAdmin = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export async function restockReturnedItem(orderItemId: string, quantityToRestock: number) {
  const supabase = getSupabaseAdmin();
  
  try {
    // 1. Fetch order item to check available refund quantity
    const { data: orderItem, error: fetchError } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', orderItemId)
      .single();

    if (fetchError) throw fetchError;
    if (!orderItem) throw new Error('Order item not found');

    const availableToRestock = (orderItem.refunded_quantity || 0) - (orderItem.restocked_quantity || 0);

    if (quantityToRestock > availableToRestock) {
      throw new Error(`Cannot restock more than the available returned quantity (${availableToRestock})`);
    }

    // 2. Update order_items table
    const newRestockedQuantity = (orderItem.restocked_quantity || 0) + quantityToRestock;
    const { error: itemUpdateError } = await supabase
      .from('order_items')
      .update({ restocked_quantity: newRestockedQuantity })
      .eq('id', orderItem.id);

    if (itemUpdateError) throw itemUpdateError;

    // 3. Restore inventory
    if (orderItem.variant_id) {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('stock_quantity')
        .eq('id', orderItem.variant_id)
        .single();

      await supabase
        .from('product_variants')
        .update({ stock_quantity: (variant?.stock_quantity || 0) + quantityToRestock })
        .eq('id', orderItem.variant_id);

      if (orderItem.serial_number) {
        await supabase
          .from('serialized_inventory')
          .update({ status: 'in_stock', order_id: null })
          .eq('variant_id', orderItem.variant_id)
          .eq('serial_number', orderItem.serial_number);
      }
    } else {
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', orderItem.product_id)
        .single();

      await supabase
        .from('products')
        .update({ stock_quantity: (product?.stock_quantity || 0) + quantityToRestock })
        .eq('id', orderItem.product_id);

      if (orderItem.serial_number) {
        await supabase
          .from('serialized_inventory')
          .update({ status: 'in_stock', order_id: null })
          .eq('product_id', orderItem.product_id)
          .eq('serial_number', orderItem.serial_number);
      }
    }

    // 4. Log inventory change
    await supabase.from('inventory_logs').insert({
      product_id: orderItem.product_id,
      store_id: orderItem.store_id,
      change_amount: quantityToRestock,
      reason: 'restocked_from_return'
    });

    revalidatePath('/admin/returns');
    revalidatePath('/admin/inventory');
    return { success: true };
  } catch (error: any) {
    console.error('Restock returned item error:', error);
    return { success: false, error: error.message };
  }
}
