'use server';

import { createClient } from '@supabase/supabase-js';

const getAdmin = () => createClient<any>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Generic query: SELECT with filters
export async function serverQuery(
  table: string,
  options?: {
    select?: string;
    filters?: { column?: string; op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'is' | 'filter' | 'or' | 'ilike'; value: any; value2?: any }[];
    order?: { column: string; ascending?: boolean };
    limit?: number;
    range?: [number, number];
    single?: boolean;
    maybeSingle?: boolean;
  }
) {
  try {
    const admin = getAdmin();
    let query = admin.from(table).select(options?.select || '*');

    if (options?.filters) {
      for (const f of options.filters) {
        if (f.op === 'or') {
          query = (query as any).or(f.value);
        } else if (f.op === 'in') {
          query = (query as any).in(f.column || '', f.value);
        } else if (f.op === 'filter') {
          query = (query as any).filter(f.column || '', f.value, f.value2);
        } else {
          query = (query as any)[f.op](f.column || '', f.value);
        }
      }
    }

    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.range) {
      query = query.range(options.range[0], options.range[1]);
    }

    if (options?.single) {
      const { data, error } = await query.single();
      return { data, error: error?.message || null };
    }

    if (options?.maybeSingle) {
      const { data, error } = await query.maybeSingle();
      return { data, error: error?.message || null };
    }

    const { data, error } = await query;
    return { data, error: error?.message || null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// Generic INSERT
export async function serverInsert(table: string, rows: any | any[], options?: { select?: string }) {
  try {
    const admin = getAdmin();
    let query: any = admin.from(table).insert(rows);
    if (options?.select) {
      query = query.select(options.select);
    }
    const { data, error } = await query;
    return { data, error: error?.message || null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// Generic UPDATE
export async function serverUpdate(
  table: string,
  values: Record<string, any>,
  filters: { column: string; op: 'eq' | 'neq'; value: any }[]
) {
  try {
    const admin = getAdmin();
    let query = admin.from(table).update(values);
    for (const f of filters) {
      query = query[f.op](f.column, f.value);
    }
    const { data, error } = await query;
    return { data, error: error?.message || null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// Generic DELETE
export async function serverDelete(
  table: string,
  filters: { column: string; op: 'eq' | 'neq'; value: any }[]
) {
  try {
    const admin = getAdmin();
    let query = admin.from(table).delete();
    for (const f of filters) {
      query = query[f.op](f.column, f.value);
    }
    const { data, error } = await query;
    return { data, error: error?.message || null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}
