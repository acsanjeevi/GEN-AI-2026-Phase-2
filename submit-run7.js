const http = require('http');
const fs = require('fs');
const featureContent = fs.readFileSync('D:/GEN AI-2026/Phase-2-week-9/no-code-editor/no-code-editor/features/saucedemo-cart-logout.feature', 'utf8');
const body = JSON.stringify({
  name: 'SauceDemo Run v7',
  featureContent,
  isFeatureContent: true,
  baseUrl: 'https://www.saucedemo.com',
  browserConfig: { browser: 'chromium', headless: false, slowMo: 50 }
});
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/execution/run',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
};
const req = http.request(options, function(res) {
  var data = '';
  res.on('data', function(chunk) { data += chunk.toString(); });
  res.on('end', function() {
    try {
      var parsed = JSON.parse(data);
      var id = (parsed.execution && parsed.execution.id) || (parsed.data && parsed.data.id) || parsed.id;
      console.log('RUN_ID=' + id);
    } catch(e) {
      var lines = data.split('"id":"');
      if (lines.length > 1) {
        console.log('RUN_ID=' + lines[1].split('"')[0]);
      } else {
        console.log('RESPONSE=' + data.substring(0, 400));
      }
    }
  });
});
req.on('error', function(e) { console.log('ERROR=' + e.message); });
req.write(body);
req.end();
