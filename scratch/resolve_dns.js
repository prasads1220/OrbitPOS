const dns = require('dns');

dns.resolveCname('krtkqnuhqmymmaucrstx.supabase.co', (err, addresses) => {
  if (err) {
    console.log("CNAME Error:", err.message);
    dns.resolve4('krtkqnuhqmymmaucrstx.supabase.co', (err2, ips) => {
      if (err2) {
        console.error("IP Error:", err2.message);
      } else {
        console.log("IP Addresses:", ips);
        if (ips.length > 0) {
          dns.reverse(ips[0], (err3, hostnames) => {
            if (err3) {
              console.error("Reverse DNS Error:", err3.message);
            } else {
              console.log("Reverse DNS Hostnames:", hostnames);
            }
          });
        }
      }
    });
  } else {
    console.log("CNAME Addresses:", addresses);
  }
});
