const fs = require('fs');
const path = require('path');

function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory() && f !== 'node_modules') {
      walk(p);
    } else if (p.endsWith('.js')) {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes('returnDocument: 'after'')) {
        fs.writeFileSync(p, content.replace(/new:\s*true/g, "returnDocument: 'after'"));
        console.log('Updated ' + p);
      }
    }
  });
}

walk(__dirname);
