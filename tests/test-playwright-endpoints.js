/**
 * Playwright Endpoints Test Script
 * Automated test script to verify all Playwright MCP endpoints
 * 
 * Usage: node tests/test-playwright-endpoints.js
 */

const API_BASE = 'http://localhost:3000/api/mcp';

/**
 * Helper function to make HTTP requests
 */
async function makeRequest(endpoint, body = {}) {
  const url = `${API_BASE}${endpoint}`;
  console.log(`\n📤 ${endpoint}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success: ${response.status}`);
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ Failed: ${response.status}`);
      console.log(JSON.stringify(data, null, 2));
    }
    
    return { success: response.ok, data };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Run all tests sequentially
 */
async function runTests() {
  console.log('🚀 Starting Playwright MCP Endpoints Tests\n');
  console.log('=' .repeat(60));
  
  // Test 1: Navigate
  await makeRequest('/playwright/navigate', {
    url: 'https://example.com',
  });
  
  // Wait a bit for page to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Snapshot
  const snapshotResult = await makeRequest('/playwright/snapshot', {});
  
  // Test 3: Navigate back
  await makeRequest('/playwright/navigate-back', {});
  
  // Test 4: Navigate forward
  await makeRequest('/playwright/navigate-forward', {});
  
  // Test 5: Click (requires ref from snapshot)
  await makeRequest('/playwright/click', {
    element: 'link',
    ref: '1',
  });
  
  // Test 6: Type
  await makeRequest('/playwright/type', {
    element: 'input',
    ref: '2',
    text: 'Test input',
  });
  
  // Test 7: Press key
  await makeRequest('/playwright/press-key', {
    key: 'Enter',
  });
  
  // Test 8: Hover
  await makeRequest('/playwright/hover', {
    element: 'button',
    ref: '3',
  });
  
  // Test 9: Select option
  await makeRequest('/playwright/select-option', {
    element: 'select',
    ref: '4',
    values: ['option1'],
  });
  
  // Test 10: Take screenshot
  await makeRequest('/playwright/take-screenshot', {
    filename: 'test-screenshot.png',
    fullPage: false,
    type: 'png',
  });
  
  // Test 11: Console messages
  await makeRequest('/playwright/console-messages', {
    onlyErrors: false,
  });
  
  // Test 12: Network requests
  await makeRequest('/playwright/network-requests', {});
  
  // Test 13: Wait
  await makeRequest('/playwright/wait-for', {
    time: 1000,
  });
  
  // Test 14: Tab list
  await makeRequest('/playwright/tab-list', {});
  
  // Test 15: New tab
  await makeRequest('/playwright/tab-new', {
    url: 'https://github.com',
  });
  
  // Test 16: Select tab
  await makeRequest('/playwright/tab-select', {
    index: 0,
  });
  
  // Test 17: Close tab
  await makeRequest('/playwright/tab-close', {
    index: 1,
  });
  
  // Test 18: Resize
  await makeRequest('/playwright/resize', {
    width: 1280,
    height: 720,
  });
  
  // Test 19: Close browser (run last)
  await makeRequest('/playwright/close', {});
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!\n');
}

// Run tests
runTests().catch(console.error);
