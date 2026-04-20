const fs = require('fs');
const lines = fs.readFileSync('D:/GEN AI-2026/Phase-2-week-9/no-code-editor/no-code-editor/logs/combined.log', 'utf8').split('\n');
// Show last 100 lines of the log to find the error context
const last = lines.slice(-100);
last.forEach((l, i) => console.log((lines.length - 100 + i) + ':' + l.substring(0, 300)));
