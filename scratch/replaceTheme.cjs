const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/components/modules');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  // Replace table headers
  content = content.replace(/background:\s*'rgba\(15,\s*23,\s*42,\s*0\.95\)'\s*,\s*backdropFilter:\s*'blur\(10px\)'/g, "background: 'var(--bg-tertiary)'");
  
  // Replace tr border bottom
  content = content.replace(/borderBottom:\s*'1px solid rgba\(255,255,255,0\.05\)'/g, "borderBottom: '1px solid var(--glass-border)'");
  
  // Replace card backgrounds
  content = content.replace(/background:\s*'rgba\(255,255,255,0\.02\)'/g, "background: 'var(--bg-tertiary)'");
  content = content.replace(/border:\s*'1px solid rgba\(255,255,255,0\.05\)'/g, "border: '1px solid var(--glass-border)'");
  content = content.replace(/borderBottom:\s*'1px solid rgba\(255,255,255,0\.1\)'/g, "borderBottom: '1px solid var(--glass-border)'");
  
  // Replacing other things
  content = content.replace(/background:\s*'rgba\(255,\s*255,\s*255,\s*0\.05\)'/g, "background: 'var(--bg-tertiary)'");
  content = content.replace(/background:\s*'rgba\(255,255,255,0\.1\)'/g, "background: 'var(--bg-tertiary)'");
  
  fs.writeFileSync(path.join(dir, file), content);
});

console.log('Modules updated!');
