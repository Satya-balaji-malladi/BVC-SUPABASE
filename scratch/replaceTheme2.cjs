const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/components/modules');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  content = content.replace(/border:\s*'1px dashed rgba\(255,255,255,0\.1\)'/g, "border: '1px dashed var(--glass-border)'");
  content = content.replace(/background:\s*'rgba\(255,255,255,0\.1\)'/g, "background: 'var(--bg-tertiary)'");
  content = content.replace(/background:\s*'rgba\(255,255,255,0\.8\)'/g, "background: 'var(--bg-tertiary)'");

  fs.writeFileSync(path.join(dir, file), content);
});

console.log('Modules updated round 2!');
