const fs = require('fs');
const lines = fs.readFileSync('D:/GEN AI-2026/Phase-2-week-9/no-code-editor/no-code-editor/logs/combined.log', 'utf8').split('\n');
// Find lines around the "undefined" error for the failing execution
const targetId = '223724f6';
const failLines = [];
let capture = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes(targetId)) {
    if (line.includes('Remove') || line.includes('undefined') || line.includes('locator') || line.includes('Resolving') || line.includes('snapshot') || line.includes('cart')) {
      failLines.push(i + ':' + line.substring(0, 300));
    }
  }
}
// Show the last 80 relevant lines
const show = failLines.slice(-80);
show.forEach(l => console.log(l));
