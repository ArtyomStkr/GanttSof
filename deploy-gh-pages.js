const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Build the project
console.log('Building project...');
execSync('ng build --configuration production --base-href /GanttSof/', { stdio: 'inherit' });

// Copy 404.html for GitHub Pages SPA routing
const distPath = path.join(__dirname, 'dist', 'GanttSof', 'browser');
const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
fs.writeFileSync(path.join(distPath, '404.html'), indexHtml);

console.log('Ready to deploy! Run:');
console.log('cd dist/GanttSof/browser');
console.log('git init');
console.log('git add .');
console.log('git commit -m "Deploy to GitHub Pages"');
console.log('git push --force https://github.com/ArtyomStkr/GanttSof.git main:gh-pages');
