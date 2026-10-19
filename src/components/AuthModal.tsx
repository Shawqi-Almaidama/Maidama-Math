import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  LogIn, 
  UserPlus, 
  LogOut, 
  X, 
  CheckCircle2, 
  AlertCircle,
  CloudCheck,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLocalization } from '../localization/LocalizationContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, login, register, logout, isLoading } = useAuth();
  const { language, t, isRTL } = useLocalization();
  const isAr = language === 'ar';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMsg(isAr ? 'يرجى كتابة الاسم الكامل.' : 'Please enter your full name.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg(isAr ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Please enter a valid email.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg(isAr ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف.' : 'Password must be at least 6 characters.');
        return;
      }

      const res = await register(name, email, password);
      if (res.success) {
        setSuccessMsg(isAr ? 'تم إنشاء الحساب بنجاح! تم تسجيل دخولك.' : 'Account created successfully! You are now logged in.');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || (isAr ? 'فشل إنشاء الحساب.' : 'Registration failed.'));
      }
    } else {
      if (!email.trim() || !password) {
        setErrorMsg(isAr ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' : 'Please enter your email and password.');
        return;
      }

      const res = await login(email, password);
      if (res.success) {
        setSuccessMsg(isAr ? 'تم تسجيل الدخول بنجاح!' : 'Logged in successfully!');
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setErrorMsg(res.error || (isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password.'));
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    setSuccessMsg(isAr ? 'تم تسجيل الخروج بنجاح.' : 'Logged out successfully.');
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-slate-800 dark:text-slate-100 max-h-[92vh] overflow-y-auto transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 id="auth-modal-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {user 
                  ? (isAr ? 'الملف الشخصي والحساب' : 'User Account & Profile') 
                  : (mode === 'login' ? (isAr ? 'تسجيل الدخول' : 'Sign In') : (isAr ? 'إنشاء حساب جديد' : 'Create Account'))}
              </h3>
              <p className="text-[11px] text-slate-500">
                {user 
                  ? (isAr ? 'مزامنة السجل والمفضلة بأمان' : 'Synced history and favorites') 
                  : (isAr ? 'احفظ مسائلك ومفضلتك عبر أجهزتك' : 'Sync your problems and favorites')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LOGGED IN VIEW */}
        {user ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white font-bold text-base shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{user.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CloudCheck className="w-4 h-4" />
                  {isAr ? 'المزامنة السحابية نشطة' : 'Cloud sync active'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(user.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                </span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <span>
                {isAr 
                  ? 'يتم تشفير كلمات المرور وتأمين بياناتك وسجلك ومفضلتك على الخادم دون مشاركتها مع أي جهة خارجية.' 
                  : 'Passwords are salted and hashed. Your history and favorites are securely stored on the server.'}
              </span>
            </div>

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer min-h-[42px]"
            >
              <LogOut className="w-4 h-4" />
              <span>{isAr ? 'تسجيل الخروج' : 'Log Out'}</span>
            </button>
          </div>
        ) : (
          /* LOGIN & REGISTER VIEW */
          <div className="space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {isAr ? 'تسجيل الدخول' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {isAr ? 'حساب جديد' : 'New Account'}
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'الاسم الكامل' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute top-3 rtl:right-3 ltr:left-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isAr ? 'مثال: أحمد عبد الله' : 'e.g. John Doe'}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute top-3 rtl:right-3 ltr:left-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute top-3 rtl:right-3 ltr:left-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 rtl:pr-9 rtl:pl-9 ltr:pl-9 ltr:pr-9 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-2.5 rtl:left-2.5 ltr:right-2.5 text-slate-400 hover:text-slate-600 p-1"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {isAr ? '6 أحرف على الأقل.' : 'Minimum 6 characters.'}
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer min-h-[42px] mt-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{isAr ? 'إنشاء حساب جديد' : 'Create Account'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
