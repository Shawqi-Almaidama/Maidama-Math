import assert from 'node:assert';
import { clientMathSolver } from '../utils/clientMathSolver.ts';
import { getApiUrl, isCapacitorNative, getCustomApiBaseUrl, setCustomApiBaseUrl } from '../utils/apiConfig.ts';

// In-memory mock of localStorage for Node environment testing
const storage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => { storage[key] = String(val); },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
};

console.log('🧪 Starting ClientMathSolver and API Routing Tests...\n');

// Test 1: Arithmetic evaluation
{
  const sol = clientMathSolver.solveLocally('2 + 2', 'step-by-step', 'school', 'ar');
  assert(sol !== null, 'Solution should not be null');
  assert.strictEqual(sol?.finalAnswer, '4', 'Final answer should be 4');
  assert(sol?.steps.length >= 1, 'Should have at least 1 step');
  assert.strictEqual(sol?.verification.status, 'verified', 'Status should be verified');
  console.log('  ✓ Test 1: Arithmetic evaluation passes');
}

// Test 2: Linear equation solving in Arabic
{
  const sol = clientMathSolver.solveLocally('2x + 4 = 10', 'step-by-step', 'school', 'ar');
  assert(sol !== null, 'Solution should not be null');
  assert(sol?.finalAnswer.includes('س = ٣'), 'Final answer should contain Arabic x = 3');
  assert.strictEqual(sol?.topic, 'المعادلات الخطية', 'Topic should be Linear Equations in Arabic');
  assert.strictEqual(sol?.verification.status, 'verified', 'Status should be verified');
  console.log('  ✓ Test 2: Linear equation solving in Arabic passes');
}

// Test 3: Symbolic derivative in English
{
  const sol = clientMathSolver.solveLocally('derivative of x^2', 'step-by-step', 'school', 'en');
  assert(sol !== null, 'Solution should not be null');
  assert.strictEqual(sol?.finalAnswer, '2 * x', 'Derivative should be 2 * x');
  assert.strictEqual(sol?.verification.status, 'verified', 'Status should be verified');
  console.log('  ✓ Test 3: Symbolic derivative in English passes');
}

// Test 4: Relative API routing in web browser
{
  assert.strictEqual(isCapacitorNative(), false, 'isCapacitorNative should be false in node/web environment');
  assert.strictEqual(getApiUrl('/api/solve'), '/api/solve', 'getApiUrl should return relative path in web');
  console.log('  ✓ Test 4: Relative API URL routing in web passes');
}

// Test 5: Custom API URL configuration
{
  setCustomApiBaseUrl('https://my-backend.example.com');
  assert.strictEqual(getCustomApiBaseUrl(), 'https://my-backend.example.com');
  assert.strictEqual(getApiUrl('/api/solve'), 'https://my-backend.example.com/api/solve');

  setCustomApiBaseUrl(null);
  assert.strictEqual(getCustomApiBaseUrl(), '');
  assert.strictEqual(getApiUrl('/api/solve'), '/api/solve');
  console.log('  ✓ Test 5: Custom API base URL configuration passes');
}

console.log('\n🎉 All ClientMathSolver and API Routing tests passed successfully!\n');
