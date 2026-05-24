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
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  console.log("Supabase URL:", SUPABASE_URL);

  const query = '9885432225';
  const storeToUse = '8e710a08-4336-4a41-a493-aec10eead5a6';
  
  // Format matching the exact Supabase JS client .or() construction:
  // .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
  // URL equivalent: or=(full_name.ilike.%259885432225%25,email.ilike.%259885432225%25,phone.ilike.%259885432225%25)
  const url = `${SUPABASE_URL}/rest/v1/customers?select=*&store_id=eq.${storeToUse}&or=(full_name.ilike.%25${query}%25,email.ilike.%25${query}%25,phone.ilike.%25${query}%25)&limit=10`;

  try {
    const res = await fetch(url, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Response status:", res.status);
    const data = await res.json();
    console.log("Response data:", data);
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

main();
