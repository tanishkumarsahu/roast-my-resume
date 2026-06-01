const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'frontend/src/app/globals.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Replace #0a0a0a with var(--border-color) where appropriate
css = css.replace(/radial-gradient\(#0a0a0a/g, 'radial-gradient(var(--border-color)');
css = css.replace(/solid #0a0a0a/g, 'solid var(--border-color)');
css = css.replace(/box-shadow: (.+?) #0a0a0a/g, 'box-shadow: $1 var(--border-color)');
css = css.replace(/color: #0a0a0a/g, 'color: var(--text-primary)');
css = css.replace(/border-color: #0a0a0a/g, 'border-color: var(--border-color)');
css = css.replace(/background: #0a0a0a/g, 'background: var(--text-primary)');
css = css.replace(/--color: #0a0a0a/g, '--color: var(--text-primary)');

// Replace #fff with var(--card-bg) for backgrounds
css = css.replace(/background: #fff/g, 'background: var(--card-bg)');
css = css.replace(/background-color: white/g, 'background-color: var(--card-bg)');

fs.writeFileSync(cssPath, css);
console.log('Fixed globals.css');
