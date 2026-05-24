const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local manually to be safe
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

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE URL or SERVICE KEY in env.");
  process.exit(1);
}

async function main() {
  console.log("Supabase URL:", SUPABASE_URL);

  // Let's query customers table
  console.log("\nChecking customers table...");
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?select=*&limit=1`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Customers Table Response status:", res.status);
    const data = await res.json();
    console.log("Customers Table Response data (1 row or error):", data);
  } catch (err) {
    console.error("Error fetching customers:", err.message);
  }

  // Let's query orders table
  console.log("\nChecking orders table columns...");
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&limit=1`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Orders Table Response status:", res.status);
    const data = await res.json();
    console.log("Orders Table Response data (1 row or error):", data);
  } catch (err) {
    console.error("Error fetching orders:", err.message);
  }
}

main();
