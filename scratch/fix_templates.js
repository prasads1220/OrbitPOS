const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir(srcDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // This regex looks for backticks containing ₹{...} and replaces the ₹ with $
    // We only want to replace inside JS template literals, not in JSX text.
    // An easy heuristic: find `...₹{...` and replace ₹{ with ${
    // Actually, simply replacing ₹{ with ${ inside any backtick string is safe.
    
    // A simpler global replacement:
    // If it's ₹{ and it's inside backticks... 
    // Since we don't naturally write ₹{ anywhere EXCEPT where we previously had ${, 
    // we can just replace all ₹{ with ${ EXCEPT when it's immediately after a > (like >₹{ )
    // Wait, in JSX: <p>₹{price}</p> -> this is valid and means print '₹' and then JS expression {price}.
    // If we change it to <p>${price}</p>, it will print '$' and JS expression {price}, breaking the currency.
    // So we MUST NOT replace ₹{ if we actually want the Rupee symbol.
    // When do we want the Rupee symbol before an expression?
    // In JSX text: >₹{price}
    // In JSX strings: "₹{price}" -- wait, in React, className={`...`} uses template literals.
    // How about we just manually replace the specific broken ones? There are only a few!
    
    const fixes = [
      { find: '`\\">₹{strVal.replace(/\\"/g, \'\\"\\"\')}\\"`', rep: '`\\">₹\\${strVal.replace(/\\"/g, \'\\"\\"\')}\\"`' }, // export.ts
      { find: '`orbitpos-receipt-₹{receiptData.orderId.slice(0, 8)}.pdf`', rep: '`orbitpos-receipt-\\${receiptData.orderId.slice(0, 8)}.pdf`' }, // checkout-dialog.tsx
      { find: '`-₹{discStr}`', rep: '`-\u20B9\\${discStr}`' }, // checkout-dialog.tsx
      { find: '₹{printContent.innerHTML}', rep: '\\${printContent.innerHTML}' }, // checkout-dialog.tsx and orders/page.tsx
      { find: '`${sourceProduct.sku}-₹{profile.store_id.slice(0, 4)}`', rep: '`${sourceProduct.sku}-\\${profile.store_id.slice(0, 4)}`' }, // transfer
      { find: '`${sourceProduct.barcode}-₹{profile.store_id.slice(0, 4)}`', rep: '`${sourceProduct.barcode}-\\${profile.store_id.slice(0, 4)}`' }, // transfer
      { find: '`SKU Conflict Resolved: Product was added with a store-specific SKU: \\">₹{retrySku}\\". Please run the recommended SQL update in your Supabase Editor for a clean permanent fix.`', rep: '`SKU Conflict Resolved: Product was added with a store-specific SKU: \\"\\${retrySku}\\". Please run the recommended SQL update in your Supabase Editor for a clean permanent fix.`' },
      { find: '`${skuBase}-₹{Date.now().toString(36).toUpperCase()}`', rep: '`${skuBase}-\\${Date.now().toString(36).toUpperCase()}`' },
      { find: '`Are you sure you want to PERMANENTLY delete \\">₹{storeName}\\"? This will wipe all products, orders, and logins for this company.`', rep: '`Are you sure you want to PERMANENTLY delete \\"\\${storeName}\\"? This will wipe all products, orders, and logins for this company.`' },
      { find: '`\\">₹{vendor}\\",\\">₹{product}\\",${v.value},${v.revenue.toFixed(2)}`', rep: '`\\"\\${vendor}\\",\\"\\${product}\\",${v.value},${v.revenue.toFixed(2)}`' }, // dashboard
      { find: '`cell-₹{index}`', rep: '`cell-\\${index}`' }, // reports
    ];

    fixes.forEach(fix => {
      if (content.includes(fix.find.replace(/\\/g, ''))) {
          // simple string replacement
          content = content.split(fix.find.replace(/\\/g, '')).join(fix.rep.replace(/\\/g, ''));
          modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log('Fixed', filePath);
    }
  }
});
