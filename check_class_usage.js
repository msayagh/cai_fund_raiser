const fs = require('fs');

// Read CSS file
const css = fs.readFileSync('src/mosque-donation.css', 'utf-8');
// Extract all class names from CSS
const cssClasses = new Set();
const classRegex = /\.([a-zA-Z-_]+)\s*\{/g;
let match;
while ((match = classRegex.exec(css)) !== null) {
  cssClasses.add(match[1]);
}

// Read JSX file
const jsx = fs.readFileSync('src/mosque-donation.jsx', 'utf-8');

// Find which CSS classes are used in JSX
const usedClasses = new Set();
const unusedClasses = new Set();

cssClasses.forEach(className => {
  // Look for className="..." or className='...'
  if (jsx.includes(`className="${className}"`) || jsx.includes(`className='${className}'`)) {
    usedClasses.add(className);
  } else {
    unusedClasses.add(className);
  }
});

console.log('=== ALL CSS CLASSES ===');
const sortedAll = Array.from(cssClasses).sort();
sortedAll.forEach(c => console.log(c));

console.log('\n=== POTENTIALLY UNUSED CLASSES ===');
const sortedUnused = Array.from(unusedClasses).sort();
if (sortedUnused.lengt
// Read CSS file
const ('(const css = fs. {// sortedUnused.forEach(c => console.log(c));
}
