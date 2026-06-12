import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { store_id } = await req.json();
    
    if (!store_id) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('store_id', store_id)
      .eq('role', 'admin')
      .single();

    if (!adminProfile?.email) {
      return NextResponse.json({ error: 'No admin email found' }, { status: 400 });
    }

    const { data: lowStockProducts } = await supabase
      .from('products')
      .select('name, sku, stock_quantity, low_stock_threshold')
      .eq('store_id', store_id)
      .eq('is_active', true);

    // Filter low stock products in memory or using JS filter, since stock_quantity <= low_stock_threshold is compared against column value
    const filteredLowStock = (lowStockProducts || []).filter(
      p => p.stock_quantity <= (p.low_stock_threshold || 0)
    );

    if (filteredLowStock.length === 0) {
      return NextResponse.json({ message: 'No low stock products', notified: 0 });
    }

    const productRows = filteredLowStock.map(p =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${p.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${p.sku || 'N/A'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#e53e3e;font-weight:bold;">${p.stock_quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${p.low_stock_threshold || 0}</td>
      </tr>`
    ).join('');

    await resend.emails.send({
      from: 'OrbitPOS <noreply@yourdomain.com>',
      to: adminProfile.email,
      subject: `⚠️ Low Stock Alert — ${filteredLowStock.length} product(s) need restocking`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fbfbfd;border-radius:24px;border:1px solid #f0f0f0;box-shadow:0 8px 30px rgba(0,0,0,0.02);">
          <div style="display:flex;align-items:center;margin-bottom:20px;">
            <div style="background:#ff3b30;color:white;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-center;font-weight:black;font-size:20px;text-align:center;line-height:40px;margin-right:12px;">⚠️</div>
            <h2 style="color:#1d1d1f;margin:0;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Low Stock Alert</h2>
          </div>
          <p style="color:#86868b;font-size:14px;font-weight:500;">Hi ${adminProfile.full_name},</p>
          <p style="color:#1d1d1f;font-size:14px;font-weight:500;margin-bottom:24px;">The following products in your store inventory have fallen below their configured safety thresholds and need restocking:</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <thead>
              <tr style="background:#f5f5f7;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#86868b;text-transform:uppercase;">Product</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#86868b;text-transform:uppercase;">SKU</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#86868b;text-transform:uppercase;">Current Stock</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#86868b;text-transform:uppercase;">Threshold</th>
              </tr>
            </thead>
            <tbody>
              ${productRows}
            </tbody>
          </table>
          <div style="margin-top:32px;text-align:center;">
            <a href="${process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace('.supabase.co', '') : '#'}" style="background:#0071e3;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:13px;display:inline-block;box-shadow:0 4px 12px rgba(0,113,227,0.2);">Log in to OrbitPOS Dashboard</a>
          </div>
          <p style="margin-top:32px;color:#86868b;font-size:11px;text-align:center;font-weight:500;">This is an automated inventory alert from OrbitPOS. Please do not reply to this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, notified: filteredLowStock.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
