const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
        callback(dirPath);
      }
    }
  });
}

let modifiedCount = 0;

walkDir(srcDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // 1. Literal $ before template interpolations: `$${` -> `₹${`
  content = content.replace(/\$\$\{/g, '₹${');
  
  // 2. Prices in parens: `($)` -> `(₹)`
  content = content.replace(/\(\$\)/g, '(₹)');
  
  // 3. Isolated React text nodes: `>$<` -> `>₹<`
  content = content.replace(/>\$</g, '>₹<');
  
  // 4. Literal dollar sign followed by a digit: `$123` -> `₹123`
  content = content.replace(/\$(?=\d)/g, '₹');
  
  // 5. String literals of just a dollar sign
  content = content.replace(/"\$"/g, '"₹"');
  content = content.replace(/'\$'/g, "'₹'");
  content = content.replace(/`\$`/g, '`₹`');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
    console.log(`Modified: ${filePath.replace(srcDir, 'src')}`);
  }
});

console.log(`\nFinished replacing currency symbols in ${modifiedCount} files.`);
