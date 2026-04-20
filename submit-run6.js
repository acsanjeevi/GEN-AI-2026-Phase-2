const http = require('http');
const fs = require('fs');
const featureContent = fs.readFileSync('D:/GEN AI-2026/Phase-2-week-9/no-code-editor/no-code-editor/features/saucedemo-cart-logout.feature', 'utf8');
const body = JSON.stringify({ name:'SauceDemo Fixed Run v6', featureContent, isFeatureContent:true, baseUrl:'https://www.saucedemo.com', browserConfig:{browser:'chromium',headless:false,slowMo:50} });
const options = { hostname:'localhost', port:3000, path:'/api/execution/run', method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)} };
const req = http.request(options, res => {
  let data = '';
  res.once('data', chunk => {
    data += chunk.toString();
    try {
      const parsed = JSON.parse(data);
      console.log('EXEC_ID=' + (parsed.data && parsed.data.id || parsed.id));
    } catch(e) {
      // Try regex for partial JSON
      const match = data.match(/"id":"([^"]+)"/);
      if (match) console.log('EXEC_ID=' + match[1]);
      else console.log('PARTIAL:' + data.substring(0, 300));
    }
    res.on('data', () => {});
    res.on('end', () => console.log('DONE'));
  });
  res.on('error', () => {});
});
req.on('error', () => {});
req.write(body);
req.end();
