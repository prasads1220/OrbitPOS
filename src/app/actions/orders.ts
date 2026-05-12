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

export async function voidOrder(orderId: string) {
  const supabase = getSupabaseAdmin();
  
  try {
    // 1. Fetch order and its items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;
    if (order.payment_status === 'voided') throw new Error('Order is already voided');

    // 2. Mark as voided
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        payment_status: 'voided',
        voided_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // 3. Restore inventory
    for (const item of order.order_items) {
      // Increment stock
      const { error: stockError } = await supabase.rpc('increment_stock', {
        row_id: item.product_id,
        amount: item.quantity
      });

      // If RPC fails (not defined), fall back to manual update
      if (stockError) {
        const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
        await supabase
          .from('products')
          .update({ stock_quantity: (product?.stock_quantity || 0) + item.quantity })
          .eq('id', item.product_id);
      }

      // Log inventory change
      await supabase.from('inventory_logs').insert({
        product_id: item.product_id,
        store_id: order.store_id,
        change_amount: item.quantity,
        reason: 'void'
      });
    }

    revalidatePath('/orders');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Void order error:', error);
    return { success: false, error: error.message };
  }
}

export async function refundOrder(orderId: string, reason: string) {
  const supabase = getSupabaseAdmin();
  
  try {
    // 1. Fetch order and its items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;
    if (order.payment_status === 'refunded') throw new Error('Order is already refunded');

    // 2. Mark as refunded
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        payment_status: 'refunded',
        refunded_at: new Date().toISOString(),
        refund_reason: reason
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // 3. Restore inventory
    for (const item of order.order_items) {
      // Increment stock
      const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
      await supabase
        .from('products')
        .update({ stock_quantity: (product?.stock_quantity || 0) + item.quantity })
        .eq('id', item.product_id);

      // Log inventory change
      await supabase.from('inventory_logs').insert({
        product_id: item.product_id,
        store_id: order.store_id,
        change_amount: item.quantity,
        reason: 'refund'
      });
    }

    revalidatePath('/orders');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Refund order error:', error);
    return { success: false, error: error.message };
  }
}
