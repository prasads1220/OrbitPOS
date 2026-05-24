const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const projectRef = 'krtkqnuhqmymmaucrstx';

async function main() {
  const password = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log("Connected to DB.");
    
    // Check if table exists
    const resExist = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customers'
      );
    `);
    
    console.log("Customers table exists:", resExist.rows[0].exists);

    if (resExist.rows[0].exists) {
      // Get table columns
      const resColumns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'customers';
      `);
      console.log("Columns in customers:");
      resColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}), Nullable: ${col.is_nullable}, Default: ${col.column_default}`);
      });
    }

    // Check columns on orders table as well to see if customer_id exists
    const resOrdersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'orders';
    `);
    console.log("\nColumns in orders:");
    resOrdersColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}), Nullable: ${col.is_nullable}, Default: ${col.column_default}`);
    });
    
  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    await client.end();
  }
}

main();
