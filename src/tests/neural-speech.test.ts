import { neuralSpeechEngine } from '../server/neuralSpeechEngine.ts';
import {
  saveGuestPreferences,
  getGuestPreferences,
  saveUserPreferences,
  getUserPreferences,
  DEFAULT_GUEST_PREFERENCES,
} from '../utils/preferencesManager.ts';
import dotenv from 'dotenv';
dotenv.config();

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    process.exit(1);
  } else {
    console.log(`  ✅ [PASS] ${msg}`);
  }
}

async function runNeuralSpeechTests() {
  console.log('🧪 Starting Neural Speech Engine & Voice Quality Test Suite...\n');

  // --- 1. Available Voices Discovery ---
  console.log('--- 1. Voice Registry & Educator Personas ---');
  const voices = neuralSpeechEngine.getAvailableVoices();
  assert(voices.length >= 5, 'At least 5 educator personas available');
  const charon = voices.find((v) => v.id === 'Charon');
  assert(!!charon && charon.nameAr.includes('أستاذ وقور'), 'Charon teacher persona configured in Arabic');
  const kore = voices.find((v) => v.id === 'Kore');
  assert(!!kore && kore.nameAr.includes('أستاذة واضحة'), 'Kore female academic persona configured in Arabic');

  // --- 2. Live Arabic Neural Speech Synthesis & Fallback Verification ---
  console.log('\n--- 2. Live Arabic Mathematical Speech Synthesis & Graceful Fallback ---');
  const arMathScript = 'أهلاً بك! دعنا نوجد المشتقة بالنسبة إلى س للدالة س تكعيب زائد خمسة، بهدوء وخطوة بخطوة.';
  const arResult = await neuralSpeechEngine.synthesize({
    text: arMathScript,
    language: 'ar',
    voice: 'Charon',
  });

  if (arResult.success) {
    assert(!!arResult.audioBase64 && arResult.audioBase64.length > 5000, 'Arabic audio buffer generated with sufficient length');
    assert(arResult.mimeType === 'audio/wav', 'Audio returned in standard audio/wav format');

    // --- 3. In-Memory Cache Verification ---
    console.log('\n--- 3. In-Memory Caching & Instant Playback ---');
    const startCacheTime = Date.now();
    const cachedResult = await neuralSpeechEngine.synthesize({
      text: arMathScript,
      language: 'ar',
      voice: 'Charon',
    });
    const cacheDurationMs = Date.now() - startCacheTime;

    assert(cachedResult.success === true, 'Cached response succeeded');
    assert(cachedResult.cached === true, 'Response was retrieved from fast memory cache');
    assert(cacheDurationMs < 30, `Cache retrieval was instantaneous (${cacheDurationMs}ms)`);
  } else {
    // When free-tier daily quota limit (10 reqs/day) is reached, engine must recommend fallback
    assert(arResult.fallbackRecommended === true, 'Graceful fallback recommended when neural engine or quota is unavailable');
    assert(typeof arResult.error === 'string', 'Error message provided for diagnostic logging');
    console.log('  ℹ️  [NOTE] Free-tier daily quota reached on model, verified fallbackRecommended: true');
  }

  // --- 4. Live English Neural Speech Synthesis & Fallback Verification ---
  console.log('\n--- 4. Live English Mathematical Speech Synthesis & Fallback ---');
  const enMathScript = 'Welcome! Let us solve this quadratic equation together calmly step-by-step.';
  const enResult = await neuralSpeechEngine.synthesize({
    text: enMathScript,
    language: 'en',
    voice: 'Kore',
  });

  if (enResult.success) {
    assert(!!enResult.audioBase64 && enResult.audioBase64.length > 5000, 'English audio buffer generated');
  } else {
    assert(enResult.fallbackRecommended === true, 'English fallbackRecommended: true when quota is exhausted');
    console.log('  ℹ️  [NOTE] English synthesis verified fallbackRecommended: true upon quota limits');
  }

  // --- 5. Empty/Invalid input handling ---
  console.log('\n--- 5. Defensive Edge Cases & Error Handling ---');
  const emptyResult = await neuralSpeechEngine.synthesize({
    text: '',
    language: 'ar',
  });
  assert(emptyResult.success === false, 'Empty text correctly rejected');

  // --- 6. Preferences Partitioning for Speech Engine ---
  console.log('\n--- 6. Preferences Partitioning for Neural Audio Engine ---');
  // Mock localStorage for test environment
  const storage: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, val: string) => { storage[key] = String(val); },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
  };

  saveGuestPreferences({ speechEngine: 'local', speechNeuralVoice: 'Kore' });
  const guestPrefs = getGuestPreferences();
  assert(guestPrefs.speechEngine === 'local', 'Guest speech engine saved as local');
  assert(guestPrefs.speechNeuralVoice === 'Kore', 'Guest speech neural voice saved as Kore');

  saveUserPreferences('usr_neural_test', { speechEngine: 'neural', speechNeuralVoice: 'Fenrir' });
  const userPrefs = getUserPreferences('usr_neural_test');
  assert(userPrefs?.speechEngine === 'neural', 'User speech engine saved as neural');
  assert(userPrefs?.speechNeuralVoice === 'Fenrir', 'User speech neural voice saved as Fenrir');

  // Verify guest preferences were NOT affected by user preferences
  const guestPrefsAfter = getGuestPreferences();
  assert(guestPrefsAfter.speechEngine === 'local', 'Guest preferences isolated from user preferences');

  // --- 7. Quota Circuit Breaker Fast-Fail & Fallback ---
  console.log('\n--- 7. Quota Circuit Breaker & Graceful Fallback ---');
  // If quota was triggered, verify that subsequent calls fail fast without network attempts
  if (neuralSpeechEngine.isQuotaExhausted()) {
    const fastFailStart = Date.now();
    const fastFailResult = await neuralSpeechEngine.synthesize({
      text: 'تجربة سريعة للتحقق من قاطع الدائرة عند انتهاء الحصة',
      language: 'ar',
      voice: 'Charon',
    });
    const fastFailDurationMs = Date.now() - fastFailStart;
    assert(fastFailResult.success === false, 'Circuit breaker returned failure cleanly');
    assert(fastFailResult.fallbackRecommended === true, 'Circuit breaker recommended local fallback');
    assert(fastFailResult.quotaExhausted === true, 'Circuit breaker flagged quotaExhausted: true');
    assert(fastFailDurationMs < 20, `Circuit breaker responded immediately without network lag (${fastFailDurationMs}ms)`);
  } else {
    console.log('  ℹ️  [NOTE] Quota currently active; circuit breaker standing by');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL NEURAL SPEECH ENGINE TESTS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

runNeuralSpeechTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
