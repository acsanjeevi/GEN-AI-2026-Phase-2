const fs = require('fs');
const lines = fs.readFileSync('D:/GEN AI-2026/Phase-2-week-9/no-code-editor/no-code-editor/logs/combined.log', 'utf8').split('\n');
// Find lines around the undefined/Remove failure in scenario 3
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('"undefined"') || (line.includes('Remove') && line.includes('locator')) || line.includes('cannot execute action')) {
    // Print context: 2 lines before and after
    const start = Math.max(0, i - 1);
    const end = Math.min(lines.length - 1, i + 2);
    for (let j = start; j <= end; j++) {
      console.log(j + ':' + lines[j].substring(0, 400));
    }
    console.log('---');
  }
}
