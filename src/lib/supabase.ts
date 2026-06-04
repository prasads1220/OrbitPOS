import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { serverQuery, serverInsert, serverUpdate, serverDelete } from '@/app/actions/db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Original client - used for auth, storage, and realtime (which don't have RLS issues)
const supabaseClient = createClient<any>(supabaseUrl, supabaseAnonKey);

// Tables affected by the broken RLS policies
const RLS_TABLES = new Set([
  'profiles', 'products', 'orders', 'order_items', 'inventory_logs',
  'attendance', 'stores', 'categories', 'customers', 'payroll',
  'vendor_invoices', 'stock_transfers', 'shifts', 'settings',
  'product_variants', 'serialized_inventory', 'form_submissions', 'activity_logs',
  'companies', 'vendors', 'purchase_orders', 'purchase_order_items', 'cash_drawer_logs',
  'whatsapp_logs'
]);

/**
 * Build a chainable query builder that mirrors Supabase's API
 * but routes through server actions (bypassing RLS).
 */
function createSafeQueryBuilder(table: string) {
  type Filter = { column?: string; op: string; value: any; value2?: any };
  let _select = '*';
  let _filters: Filter[] = [];
  let _order: { column: string; ascending?: boolean } | undefined;
  let _limit: number | undefined;
  let _range: [number, number] | undefined;
  let _insertData: any = null;
  let _updateData: any = null;
  let _isDelete = false;

  const chain: any = {
    select(columns?: string) { _select = columns || '*'; return chain; },
    eq(col: string, val: any) { _filters.push({ column: col, op: 'eq', value: val }); return chain; },
    neq(col: string, val: any) { _filters.push({ column: col, op: 'neq', value: val }); return chain; },
    gt(col: string, val: any) { _filters.push({ column: col, op: 'gt', value: val }); return chain; },
    lt(col: string, val: any) { _filters.push({ column: col, op: 'lt', value: val }); return chain; },
    gte(col: string, val: any) { _filters.push({ column: col, op: 'gte', value: val }); return chain; },
    lte(col: string, val: any) { _filters.push({ column: col, op: 'lte', value: val }); return chain; },
    in(col: string, vals: any[]) { _filters.push({ column: col, op: 'in', value: vals }); return chain; },
    is(col: string, val: any) { _filters.push({ column: col, op: 'is', value: val }); return chain; },
    ilike(col: string, val: any) { _filters.push({ column: col, op: 'ilike', value: val }); return chain; },
    filter(col: string, op: string, val: any) { _filters.push({ column: col, op: 'filter', value: op, value2: val }); return chain; },
    or(val: string) { _filters.push({ op: 'or', value: val }); return chain; },
    order(col: string, opts?: { ascending?: boolean }) { _order = { column: col, ascending: opts?.ascending }; return chain; },
    limit(n: number) { _limit = n; return chain; },
    range(from: number, to: number) { _range = [from, to]; return chain; },
    insert(data: any) { _insertData = data; return chain; },
    update(data: any) { _updateData = data; return chain; },
    delete() { _isDelete = true; return chain; },

    async single() {
      if (_insertData) {
        const r = await serverInsert(table, _insertData, { select: _select });
        const d = Array.isArray(r.data) ? r.data[0] : r.data;
        return { data: d, error: r.error ? { message: r.error, code: 'SERVER' } : null };
      }
      const r = await serverQuery(table, { select: _select, filters: _filters as any, order: _order, limit: _limit, range: _range, single: true });
      return { data: r.data, error: r.error ? { message: r.error, code: 'SERVER' } : null };
    },

    async maybeSingle() {
      if (_insertData) {
        const r = await serverInsert(table, _insertData, { select: _select });
        const d = Array.isArray(r.data) ? r.data[0] : r.data;
        return { data: d, error: r.error ? { message: r.error, code: 'SERVER' } : null };
      }
      const r = await serverQuery(table, { select: _select, filters: _filters as any, order: _order, limit: _limit, range: _range, maybeSingle: true });
      return { data: r.data, error: r.error ? { message: r.error, code: 'SERVER' } : null };
    },

    // Make the builder thenable so `await supabase.from('x').select()` works
    then(resolve: (v: any) => void, reject?: (e?: any) => void) {
      const run = async () => {
        if (_isDelete) {
          const r = await serverDelete(table, _filters as any);
          return { data: r.data, error: r.error ? { message: r.error, code: 'SERVER' } : null };
        }
        if (_updateData) {
          const r = await serverUpdate(table, _updateData, _filters as any);
          return { data: r.data, error: r.error ? { message: r.error, code: 'SERVER' } : null };
        }
        if (_insertData) {
          const r = await serverInsert(table, _insertData, { select: _select });
          return { data: r.data, error: r.error ? { message: r.error, code: 'SERVER' } : null };
        }
        const r = await serverQuery(table, { select: _select, filters: _filters as any, order: _order, limit: _limit, range: _range });
        return { data: r.data, error: r.error ? { message: r.error, code: 'SERVER' } : null };
      };
      run().then(resolve, reject);
    }
  };

  return chain;
}

// Export a proxied supabase client that intercepts .from() for RLS-affected tables
export const supabase = new Proxy(supabaseClient, {
  get(target, prop) {
    if (prop === 'from') {
      return (table: string) => {
        if (RLS_TABLES.has(table)) {
          return createSafeQueryBuilder(table);
        }
        return target.from(table);
      };
    }
    // auth, storage, realtime, etc. → use original client
    return (target as any)[prop];
  }
});
