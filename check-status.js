const http = require('http');
const id = process.argv[2] || '223724f6-a31b-42f0-ac32-8818dd51c0c4';
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/execution/' + id,
  method: 'GET'
}, function(res) {
  let d = '';
  res.on('data', function(c) { d += c; });
  res.on('end', function() {
    try {
      const parsed = JSON.parse(d);
      const exec = parsed.execution || parsed.data || parsed;
      console.log('STATUS:', exec.status);
      console.log('PROGRESS:', exec.progress);
      if (exec.items) {
        exec.items.forEach(function(item) {
          console.log('\nSCENARIO:', item.name || item.scenarioName);
          console.log('  STATUS:', item.status);
          if (item.steps) {
            item.steps.forEach(function(step) {
              const s = step.status !== 'passed' ? ' [' + step.status + ']' : '';
              console.log('  STEP:', step.stepText || step.text, s);
              if (step.error) console.log('    ERROR:', step.error);
            });
          }
        });
      }
      if (exec.error) console.log('\nEXEC ERROR:', exec.error);
    } catch(e) {
      console.log(d.substring(0, 2000));
    }
  });
});
req.on('error', function(e) { console.log('ERROR:', e.message); });
req.end();
