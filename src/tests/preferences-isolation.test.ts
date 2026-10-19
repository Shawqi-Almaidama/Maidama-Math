import {
  saveGuestPreferences,
  getGuestPreferences,
  saveUserPreferences,
  getUserPreferences,
  getActivePreferences,
  DEFAULT_GUEST_PREFERENCES,
  DEFAULT_USER_PREFERENCES,
  GUEST_PREFS_KEY,
  USER_PREFS_PREFIX,
  AUTH_USER_KEY,
  AUTH_TOKEN_KEY,
  UserPreferences,
} from '../utils/preferencesManager.ts';

// In-memory mock of localStorage for Node environment testing
const storage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => { storage[key] = String(val); },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
};

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${msg}`);
}

console.log('🧪 Starting Preferences Isolation & Guest Partition Test Suite...\n');

// 0. Initial state - Guest default
let guestPrefs = getGuestPreferences();
assert(guestPrefs.language === 'ar', 'Initial guest language is Arabic');
assert(guestPrefs.theme === 'system', 'Initial guest theme is system');

// 1. User A logs in
const userA = { id: 'usr_aaa111', name: 'User A', email: 'a@example.com' };
localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userA));
localStorage.setItem(AUTH_TOKEN_KEY, 'tok_aaa');

// Check active preferences right after login (no user prefs set yet)
let active = getActivePreferences();
assert(active.language === 'ar', 'New user initial language defaults properly');

// 2. User A changes language to English and theme to Dark
saveUserPreferences(userA.id, { language: 'en', theme: 'dark', level: 'advanced', style: 'concept' });

const userAPrefs = getUserPreferences(userA.id);
assert(userAPrefs?.language === 'en', 'User A language is English');
assert(userAPrefs?.theme === 'dark', 'User A theme is Dark');
assert(userAPrefs?.level === 'advanced', 'User A level is Advanced');

// Verify that Guest preferences were NOT touched by User A's changes!
guestPrefs = getGuestPreferences();
assert(guestPrefs.language === 'ar', 'Guest language was NOT mutated by User A');
assert(guestPrefs.theme === 'system', 'Guest theme was NOT mutated by User A');

// 3. User A logs out
localStorage.removeItem(AUTH_USER_KEY);
localStorage.removeItem(AUTH_TOKEN_KEY);

// Verify active preferences for guest after logout
active = getActivePreferences();
assert(active.language === 'ar', 'After User A logout, guest does NOT inherit English');
assert(active.theme === 'system', 'After User A logout, guest does NOT inherit Dark theme');

// 4. Guest changes language to Arabic and theme to Light
saveGuestPreferences({ language: 'ar', theme: 'light', level: 'intermediate' });
guestPrefs = getGuestPreferences();
assert(guestPrefs.language === 'ar', 'Guest language set to Arabic');
assert(guestPrefs.theme === 'light', 'Guest theme set to Light');

// Verify User A saved preferences are still intact and NOT overwritten by guest changes!
const userACheck = getUserPreferences(userA.id);
assert(userACheck?.language === 'en', 'User A language remained English despite guest activity');
assert(userACheck?.theme === 'dark', 'User A theme remained Dark despite guest activity');

// 5. User A logs back in
localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userA));
localStorage.setItem(AUTH_TOKEN_KEY, 'tok_aaa');

active = getActivePreferences();
assert(active.language === 'en', 'Upon User A re-login, original English is restored');
assert(active.theme === 'dark', 'Upon User A re-login, original Dark theme is restored');
assert(active.level === 'advanced', 'Upon User A re-login, original Advanced level is restored');

// 6. User A logs out again
localStorage.removeItem(AUTH_USER_KEY);
localStorage.removeItem(AUTH_TOKEN_KEY);

active = getActivePreferences();
assert(active.language === 'ar', 'Guest mode retains Arabic after User A logs out again');
assert(active.theme === 'light', 'Guest mode retains Light theme after User A logs out again');

// 7. Another user (User B) logs in
const userB = { id: 'usr_bbb222', name: 'User B', email: 'b@example.com' };
localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userB));
localStorage.setItem(AUTH_TOKEN_KEY, 'tok_bbb');

// User B has not set custom preferences yet
let userBPrefs = getUserPreferences(userB.id);
assert(userBPrefs === null, 'User B has no preferences saved yet');

active = getActivePreferences();
assert(active.language === DEFAULT_USER_PREFERENCES.language, 'User B starts with standard user defaults, not User A or Guest');
assert(active.theme === DEFAULT_USER_PREFERENCES.theme, 'User B does not inherit User A dark theme');

// User B sets their preferences to Arabic and Dark
saveUserPreferences(userB.id, { language: 'ar', theme: 'dark', level: 'beginner' });
userBPrefs = getUserPreferences(userB.id);
assert(userBPrefs?.level === 'beginner', 'User B preferences saved independently');

// Check User A is still intact
const userAFinal = getUserPreferences(userA.id);
assert(userAFinal?.language === 'en' && userAFinal?.theme === 'dark' && userAFinal?.level === 'advanced', 'User A preferences untouched by User B');

// Check Guest is still intact
const guestFinal = getGuestPreferences();
assert(guestFinal.language === 'ar' && guestFinal.theme === 'light', 'Guest preferences untouched by User B');

console.log('\n======================================================');
console.log('🎉 ALL PREFERENCES ISOLATION TESTS PASSED PERFECTLY!');
console.log('======================================================\n');
