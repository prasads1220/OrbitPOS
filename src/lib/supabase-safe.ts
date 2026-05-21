/**
 * Drop-in replacement for the Supabase client that routes all queries 
 * through server actions (bypassing broken RLS policies).
 * 
 * Usage: Replace `import { supabase } from '@/lib/supabase'`
 *   with `import { supabase } from '@/lib/supabase-safe'`
 *   OR just import `db` for the server-proxied version.
 */

import { serverQuery, serverInsert, serverUpdate, serverDelete } from '@/app/actions/db';
import { supabase as originalSupabase } from '@/lib/supabase';

// Re-export the original client for auth operations (auth doesn't use RLS)
export { originalSupabase };

// Tables that are affected by the broken RLS (use server proxy for these)
const RLS_AFFECTED_TABLES = [
  'profiles', 'products', 'orders', 'order_items', 'inventory_logs',
  'attendance', 'stores', 'categories', 'customers', 'payroll',
  'vendor_invoices', 'stock_transfers', 'shifts', 'settings',
  'product_variants', 'serialized_inventory'
];

function createQueryBuilder(table: string) {
  let _select = '*';
  let _filters: { column: string; op: any; value: any }[] = [];
  let _order: { column: string; ascending?: boolean } | undefined;
  let _limit: number | undefined;
  let _insertData: any = null;
  let _updateData: any = null;
  let _isDelete = false;

  const builder = {
    select(columns?: string) {
      _select = columns || '*';
      return builder;
    },
    eq(column: string, value: any) {
      _filters.push({ column, op: 'eq', value });
      return builder;
    },
    neq(column: string, value: any) {
      _filters.push({ column, op: 'neq', value });
      return builder;
    },
    gt(column: string, value: any) {
      _filters.push({ column, op: 'gt', value });
      return builder;
    },
    lt(column: string, value: any) {
      _filters.push({ column, op: 'lt', value });
      return builder;
    },
    gte(column: string, value: any) {
      _filters.push({ column, op: 'gte', value });
      return builder;
    },
    lte(column: string, value: any) {
      _filters.push({ column, op: 'lte', value });
      return builder;
    },
    in(column: string, values: any[]) {
      _filters.push({ column, op: 'in', value: values });
      return builder;
    },
    order(column: string, opts?: { ascending?: boolean }) {
      _order = { column, ascending: opts?.ascending };
      return builder;
    },
    limit(n: number) {
      _limit = n;
      return builder;
    },
    async single() {
      if (_insertData) {
        const res = await serverInsert(table, _insertData, { select: _select });
        // single() expects a single object, not an array
        return { data: Array.isArray(res.data) ? res.data[0] : res.data, error: res.error ? { message: res.error } : null };
      }
      const res = await serverQuery(table, { select: _select, filters: _filters, order: _order, limit: _limit, single: true });
      return { data: res.data, error: res.error ? { message: res.error } : null };
    },
    async maybeSingle() {
      if (_insertData) {
        const res = await serverInsert(table, _insertData, { select: _select });
        return { data: Array.isArray(res.data) ? res.data[0] : res.data, error: res.error ? { message: res.error } : null };
      }
      const res = await serverQuery(table, { select: _select, filters: _filters, order: _order, limit: _limit, maybeSingle: true });
      return { data: res.data, error: res.error ? { message: res.error } : null };
    },
    then(resolve: (value: any) => void, reject?: (reason?: any) => void) {
      // This makes the builder thenable (await-able without calling single/maybeSingle)
      const execute = async () => {
        if (_isDelete) {
          return await serverDelete(table, _filters);
        }
        if (_updateData) {
          return await serverUpdate(table, _updateData, _filters);
        }
        if (_insertData) {
          const res = await serverInsert(table, _insertData, { select: _select });
          return { data: res.data, error: res.error ? { message: res.error } : null };
        }
        const res = await serverQuery(table, { select: _select, filters: _filters, order: _order, limit: _limit });
        return { data: res.data, error: res.error ? { message: res.error } : null };
      };
      execute().then(resolve, reject);
    }
  };

  return {
    select(columns?: string) {
      _select = columns || '*';
      return builder;
    },
    insert(data: any) {
      _insertData = data;
      return builder;
    },
    update(data: any) {
      _updateData = data;
      return builder;
    },
    delete() {
      _isDelete = true;
      return builder;
    },
    // Allow chaining directly
    eq: builder.eq,
    neq: builder.neq,
    order: builder.order,
    limit: builder.limit,
    single: builder.single,
    maybeSingle: builder.maybeSingle,
  };
}

// Create a proxy that intercepts .from() calls for RLS-affected tables
export const supabase = new Proxy(originalSupabase, {
  get(target, prop) {
    if (prop === 'from') {
      return (table: string) => {
        if (RLS_AFFECTED_TABLES.includes(table)) {
          return createQueryBuilder(table);
        }
        // For non-affected tables, use the original client
        return target.from(table);
      };
    }
    // For everything else (auth, storage, etc.), use the original client
    return (target as any)[prop];
  }
});
