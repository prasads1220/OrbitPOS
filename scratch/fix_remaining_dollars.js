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

  // 1. >$ inside JSX
  content = content.replace(/>\$/g, '>₹');
  
  // 2. > $ inside JSX
  content = content.replace(/>\s+\$/g, match => match.replace('$', '₹'));
  
  // 3. Price: $
  content = content.replace(/Price:\s*\$/g, match => match.replace('$', '₹'));
  
  // 4. "$ or '$ or `$
  content = content.replace(/['"`]\$['"`]/g, match => match.replace('$', '₹'));
  
  // 5. -$
  content = content.replace(/-\$/g, '-₹');
  
  // 6. ">${" inside JSX where there are spaces or newlines before
  // Actually, let's catch ">   $"
  
  // 7. "\">$"
  content = content.replace(/">?\$/g, '">₹');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
    console.log(`Modified: ${filePath.replace(srcDir, 'src')}`);
  }
});

console.log(`\nFinished replacing remaining dollars in ${modifiedCount} files.`);
