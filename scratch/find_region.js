const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const projectRef = 'krtkqnuhqmymmaucrstx';
const password = process.env.SUPABASE_SERVICE_ROLE_KEY;

const regions = [
  'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
  'ca-central-1', 'sa-east-1'
];

async function main() {
  console.log("Searching for the correct AWS region for project:", projectRef);
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const client = new Client({
      host: host,
      port: 6543,
      database: 'postgres',
      user: `postgres.${projectRef}`,
      password: password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });
    
    try {
      await client.connect();
      console.log(`\n🎉 SUCCESS! Connected via region: ${region}`);
      
      // Let's run a query to verify
      const res = await client.query("SELECT current_user;");
      console.log("Connected as:", res.rows[0].current_user);
      
      await client.end();
      break;
    } catch (err) {
      if (err.message.includes("ENOTFOUND") || err.message.includes("Tenant or user not found") || err.message.includes("not found")) {
        // This is a "wrong region" error, print a small dot or skip quietly
        process.stdout.write('.');
      } else {
        // Pervasive error (e.g. auth failed, password incorrect), print details
        console.log(`\n⚠️ Region ${region} resolved but failed with: ${err.message}`);
      }
    }
  }
  console.log("\nDone searching.");
}

main();
