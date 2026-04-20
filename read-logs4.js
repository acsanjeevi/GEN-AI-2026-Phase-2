const fs = require('fs');
const lines = fs.readFileSync('D:/GEN AI-2026/Phase-2-week-9/no-code-editor/no-code-editor/logs/combined.log', 'utf8').split('\n');
// Look for error logs specifically during the failing run (13:44:53 to 13:46:20 window)
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const ts = line.match(/"timestamp":"2026-04-20T13:4[4-6]/);
  if (!ts) continue;
  if (line.includes('"error"') || line.includes('"warn"') || line.includes('failed') || line.includes('failed') || line.includes('cannot') || line.includes('undefined')) {
    console.log(i + ':' + line.substring(0, 500));
  }
}
