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

    // 2b. Reverse Customer Loyalty Points
    if (order.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('loyalty_points')
        .eq('id', order.customer_id)
        .maybeSingle();

      if (customer) {
        const newPoints = Math.max(0, customer.loyalty_points - (order.points_earned || 0) + (order.points_redeemed || 0));
        await supabase
          .from('customers')
          .update({ loyalty_points: newPoints })
          .eq('id', order.customer_id);
      }
    }

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

export async function refundOrder(orderId: string, itemsToRefund: { id: string, quantity: number }[], reason: string) {
  const supabase = getSupabaseAdmin();
  
  try {
    // 1. Fetch order and its items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    let totalRefundAmount = 0;

    // 2. Process each item to refund
    for (const itemRefund of itemsToRefund) {
      const orderItem = order.order_items.find((oi: any) => oi.id === itemRefund.id);
      if (!orderItem) continue;

      const remainingQty = orderItem.quantity - (orderItem.refunded_quantity || 0);
      if (itemRefund.quantity > remainingQty) throw new Error(`Cannot refund more than remaining quantity for ${orderItem.product_id}`);

      // Update order item refunded quantity
      const { error: itemUpdateError } = await supabase
        .from('order_items')
        .update({ refunded_quantity: (orderItem.refunded_quantity || 0) + itemRefund.quantity })
        .eq('id', orderItem.id);

      if (itemUpdateError) throw itemUpdateError;

      // Automatic inventory restoration removed as per new returns workflow

      totalRefundAmount += orderItem.unit_price * itemRefund.quantity;
    }

    // 3. (Removed Stripe Refund Logic)

    // 4. Update order status and refunded amount (Internal records)
    const preTaxTotal = order.total_amount - (order.tax_amount || 0);
    const taxRate = preTaxTotal > 0 ? (order.tax_amount || 0) / preTaxTotal : 0;
    const totalRefundWithTax = totalRefundAmount * (1 + taxRate);
    
    const newRefundedAmount = (order.refunded_amount || 0) + totalRefundWithTax;

    const isFullRefund = newRefundedAmount >= order.total_amount;

    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
        refunded_at: new Date().toISOString(),
        refund_reason: reason,
        refunded_amount: newRefundedAmount
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // 4b. Adjust Customer Loyalty Points
    if (order.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('loyalty_points')
        .eq('id', order.customer_id)
        .maybeSingle();

      if (customer) {
        const pointsToDeduct = Math.floor(totalRefundWithTax / 100);
        const pointsToRestore = isFullRefund ? (order.points_redeemed || 0) : 0;
        const newPoints = Math.max(0, customer.loyalty_points - pointsToDeduct + pointsToRestore);
        await supabase
          .from('customers')
          .update({ loyalty_points: newPoints })
          .eq('id', order.customer_id);
      }
    }

    revalidatePath('/orders');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Refund order error:', error);
    return { success: false, error: error.message };
  }
}

export async function exchangeOrder(
  orderId: string,
  itemsToRefund: { id: string; quantity: number }[],
  newItems: { product_id: string; quantity: number; variant_id?: string; serial_number?: string; unit_price: number }[],
  paymentMethod: string,
  netDifference: number,
  reason: string
) {
  const supabase = getSupabaseAdmin();

  try {
    // 1. Fetch order and its items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // 2. Process each item to refund (returned items)
    let totalRefundAmount = 0;
    for (const itemRefund of itemsToRefund) {
      const orderItem = order.order_items.find((oi: any) => oi.id === itemRefund.id);
      if (!orderItem) continue;

      const remainingQty = orderItem.quantity - (orderItem.refunded_quantity || 0);
      if (itemRefund.quantity > remainingQty) {
        throw new Error(`Cannot refund more than remaining quantity for ${orderItem.product_id}`);
      }

      // Update order item refunded quantity
      const { error: itemUpdateError } = await supabase
        .from('order_items')
        .update({ refunded_quantity: (orderItem.refunded_quantity || 0) + itemRefund.quantity })
        .eq('id', orderItem.id);

      if (itemUpdateError) throw itemUpdateError;

      // Automatic inventory restoration removed as per new returns workflow

      totalRefundAmount += orderItem.unit_price * itemRefund.quantity;
    }

    // 3. Process new exchange items
    let totalNewAmount = 0;
    const newItemsToInsert: any[] = [];

    for (const newItem of newItems) {
      // Decrement stock in DB
      if (newItem.variant_id) {
        const { data: variant } = await supabase
          .from('product_variants')
          .select('stock_quantity')
          .eq('id', newItem.variant_id)
          .single();

        if (!variant || variant.stock_quantity < newItem.quantity) {
          throw new Error(`Insufficient stock for variant ${newItem.variant_id}`);
        }

        await supabase
          .from('product_variants')
          .update({ stock_quantity: Math.max(0, variant.stock_quantity - newItem.quantity) })
          .eq('id', newItem.variant_id);

        if (newItem.serial_number) {
          await supabase
            .from('serialized_inventory')
            .update({ status: 'sold', order_id: order.id })
            .eq('variant_id', newItem.variant_id)
            .eq('serial_number', newItem.serial_number);
        }
      } else {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', newItem.product_id)
          .single();

        if (!product || product.stock_quantity < newItem.quantity) {
          throw new Error(`Insufficient stock for product ${newItem.product_id}`);
        }

        await supabase
          .from('products')
          .update({ stock_quantity: Math.max(0, product.stock_quantity - newItem.quantity) })
          .eq('id', newItem.product_id);

        if (newItem.serial_number) {
          await supabase
            .from('serialized_inventory')
            .update({ status: 'sold', order_id: order.id })
            .eq('product_id', newItem.product_id)
            .eq('serial_number', newItem.serial_number);
        }
      }

      // Log inventory change
      await supabase.from('inventory_logs').insert({
        product_id: newItem.product_id,
        store_id: order.store_id,
        change_amount: -newItem.quantity,
        reason: 'sale'
      });

      newItemsToInsert.push({
        order_id: order.id,
        product_id: newItem.product_id,
        quantity: newItem.quantity,
        unit_price: newItem.unit_price,
        total_price: newItem.unit_price * newItem.quantity,
        store_id: order.store_id, // Pass store_id to avoid foreign key constraints
        variant_id: newItem.variant_id || null,
        serial_number: newItem.serial_number || null,
        refunded_quantity: 0
      });

      totalNewAmount += newItem.unit_price * newItem.quantity;
    }

    // Insert new items into database
    if (newItemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(newItemsToInsert);

      if (itemsError) throw itemsError;
    }

    // 4. Recalculate and update order totals
    const preTaxTotal = order.total_amount - (order.tax_amount || 0);
    const taxRate = preTaxTotal > 0 ? (order.tax_amount || 0) / preTaxTotal : 0.08; // fallback 8%
    
    // Tax differences
    const returnedTax = totalRefundAmount * taxRate;
    const returnedTotalWithTax = totalRefundAmount + returnedTax;

    const newTax = totalNewAmount * taxRate;
    const newTotalWithTax = totalNewAmount + newTax;

    const actualNetDiffWithTax = newTotalWithTax - returnedTotalWithTax;

    const updatedTotalAmount = Math.max(0, order.total_amount + actualNetDiffWithTax);
    const updatedTaxAmount = Math.max(0, (order.tax_amount || 0) + (newTax - returnedTax));
    const newRefundedAmount = (order.refunded_amount || 0) + returnedTotalWithTax;

    // Determine loyalty point adjustments
    let pointsAdjustment = 0;
    if (order.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('loyalty_points')
        .eq('id', order.customer_id)
        .maybeSingle();

      if (customer) {
        // net spend difference in rupees / 100 = points to change
        pointsAdjustment = Math.floor(actualNetDiffWithTax / 100);
        const newPoints = Math.max(0, customer.loyalty_points + pointsAdjustment);
        
        await supabase
          .from('customers')
          .update({ loyalty_points: newPoints })
          .eq('id', order.customer_id);
      }
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        total_amount: updatedTotalAmount,
        tax_amount: updatedTaxAmount,
        refunded_amount: newRefundedAmount,
        refund_reason: reason,
        points_earned: Math.max(0, (order.points_earned || 0) + pointsAdjustment),
        payment_status: 'exchanged',
        refunded_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    revalidatePath('/orders');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Exchange order error:', error);
    return { success: false, error: error.message };
  }
}
