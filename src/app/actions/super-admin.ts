'use server';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const getSupabaseAdmin = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in Vercel Environment Variables');
  }
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export async function createStore(name: string, branding_logo?: string) {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('stores')
      .insert({ name, branding_logo })
      .select()
      .single();

    if (error) throw error;
    return { success: true, store: data };
  } catch (error: any) {
    console.error('Error creating store:', error);
    return { error: error.message || 'Failed to create store' };
  }
}

export async function deleteStore(storeId: string) {
  try {
    // 1. Fetch all users belonging to this store first
    const { data: users } = await getSupabaseAdmin()
      .from('profiles')
      .select('id')
      .eq('store_id', storeId);

    // 2. Delete each user from Supabase Auth
    if (users && users.length > 0) {
      for (const user of users) {
        await getSupabaseAdmin().auth.admin.deleteUser(user.id);
      }
    }

    // 3. Delete all transactional data (Avoid FK violations)
    await getSupabaseAdmin().from('order_items').delete().eq('store_id', storeId);
    await getSupabaseAdmin().from('orders').delete().eq('store_id', storeId);
    await getSupabaseAdmin().from('inventory').delete().eq('store_id', storeId);
    await getSupabaseAdmin().from('products').delete().eq('store_id', storeId);
    await getSupabaseAdmin().from('attendance').delete().eq('store_id', storeId);
    await getSupabaseAdmin().from('payroll').delete().eq('store_id', storeId);
    
    // 4. Delete profiles (This is redundant if Auth Delete triggered it, but safe)
    await getSupabaseAdmin().from('profiles').delete().eq('store_id', storeId);

    // 5. Finally, delete the store itself
    const { error } = await getSupabaseAdmin()
      .from('stores')
      .delete()
      .eq('id', storeId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Delete store error:', error);
    return { success: false, error: error.message };
  }
}

export async function createStoreAdmin(formData: {
  email: string;
  full_name: string;
  store_id: string;
  password?: string;
}) {
  try {
    // 1. Create user in Auth
    const { data: authData, error: authError } = await getSupabaseAdmin().auth.admin.createUser({
      email: formData.email,
      password: formData.password || 'OrbitAdmin123!',
      email_confirm: true,
      user_metadata: {
        full_name: formData.full_name,
        role: 'admin',
        store_id: formData.store_id
      }
    });

    if (authError) throw authError;

    // 2. Create profile entry
    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: formData.email,
        full_name: formData.full_name,
        role: 'admin',
        store_id: formData.store_id,
        hourly_rate: 0,
      });

    if (profileError) {
      await getSupabaseAdmin().auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error creating store admin:', error);
    return { error: error.message || 'Failed to create store admin' };
  }
}

export async function getAllStores() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('stores')
      .select(`
        *,
        profiles!profiles_store_id_fkey(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Also fetch the admin for each store
    const storesWithAdmins = await Promise.all((data || []).map(async (store) => {
      const { data: admins } = await getSupabaseAdmin()
        .from('profiles')
        .select('id, email, full_name')
        .eq('store_id', store.id)
        .eq('role', 'admin')
        .limit(1);
      
      return { ...store, admin: admins?.[0] || null };
    }));

    return { success: true, stores: storesWithAdmins };
  } catch (error: any) {
    console.error('Error fetching stores:', error);
    return { error: error.message || 'Failed to fetch stores' };
  }
}

export async function updateStore(id: string, name: string) {
  try {
    const { error } = await getSupabaseAdmin()
      .from('stores')
      .update({ name })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating store:', error);
    return { error: error.message || 'Failed to update store' };
  }
}

export async function toggleStoreSuspension(id: string, isSuspended: boolean) {
  try {
    const { error } = await getSupabaseAdmin()
      .from('stores')
      .update({ is_suspended: isSuspended })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error toggling suspension:', error);
    return { error: error.message || 'Failed to toggle suspension' };
  }
}

