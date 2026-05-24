const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log("Supabase URL:", SUPABASE_URL);

  // Check columns of customers table
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?select=id,full_name,email,phone,loyalty_points,created_at,store_id&limit=1`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Customers select status:", res.status);
    const data = await res.json();
    console.log("Customers select data:", data);
  } catch (err) {
    console.error("Customers error:", err.message);
  }

  // Check columns of orders table
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=customer_id,points_earned,points_redeemed&limit=1`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Orders select status:", res.status);
    const data = await res.json();
    console.log("Orders select data:", data);
  } catch (err) {
    console.error("Orders error:", err.message);
  }
}

main();
