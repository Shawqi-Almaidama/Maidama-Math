import { 
  Sparkles, 
  Cpu, 
  ShieldCheck, 
  Layers, 
  Keyboard, 
  Camera, 
  Mic, 
  FileText, 
  LineChart, 
  GraduationCap, 
  Lock, 
  Code2, 
  CheckCircle2, 
  BookOpen, 
  UserCheck,
  ArrowRight,
  ArrowLeft,
  Mail,
  Github,
  Linkedin,
  ExternalLink
} from 'lucide-react';
import { useLocalization } from '../localization/LocalizationContext.tsx';

interface AboutViewProps {
  onBack?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onBack }) => {
  const { t, isRTL } = useLocalization();

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2 sm:py-4">
      {/* Back Button if navigated from an internal view */}
      {onBack && (
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition shadow-xs"
          >
            {isRTL ? <ArrowRight className="w-4 h-4 shrink-0" /> : <ArrowLeft className="w-4 h-4 shrink-0" />}
            <span>{t('nav.backButton')}</span>
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span>{t('about.badge')}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t('about.title')}
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {t('about.subtitle')}
        </p>
      </div>

      {/* Mission Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm transition-colors space-y-3">
        <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
          <BookOpen className="w-5 h-5 shrink-0" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {t('about.missionTitle')}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {t('about.missionDesc')}
        </p>
      </div>

      {/* Dual-Engine Architecture Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm transition-colors space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Cpu className="w-5 h-5 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {t('about.dualEngineTitle')}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('about.dualEngineDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI Engine Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                {t('about.aiEngineTitle')}
              </h3>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {t('about.aiEngineDesc')}
            </p>
            <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-mono pt-1">
              • Socratic step-by-step reasoning<br/>
              • Natural language multilingual comprehension<br/>
              • OCR tokenization & error diagnosis
            </div>
          </div>

          {/* CAS Symbolic Engine Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200">
                {t('about.symbolicEngineTitle')}
              </h3>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {t('about.symbolicEngineDesc')}
            </p>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono pt-1">
              • MathJS symbolic AST & simplification<br/>
              • Residual check: <span dir="ltr">|f(x*) - y| &lt; 1e-9</span><br/>
              • Deterministic polynomial root isolation
            </div>
          </div>
        </div>
      </div>

      {/* Multimodal Inputs Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm transition-colors space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>{t('about.inputMethodsTitle')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t('about.inputMethodsDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shrink-0">
              <Keyboard className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                {isRTL ? 'لوحة المفاتيح الرياضية الافتراضية' : 'Virtual Math Keyboard'}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('about.inputKeyboards')}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                {isRTL ? 'ماسح الكاميرا والتعرف الضوئي OCR' : 'Camera OCR Problem Scanner'}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('about.inputCamera')}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                {isRTL ? 'المدخلات الصوتية ومعالجة الكلام' : 'Voice Input & Speech Normalization'}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('about.inputVoice')}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                {isRTL ? 'معالجة المستندات وأوراق PDF' : 'PDF Document & Exam Ingestion'}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('about.inputFile')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features & Pedagogical Adaptability */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm transition-colors space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>{t('about.featuresTitle')}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <LineChart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
              {isRTL ? 'الآلة البيانية الديكارتية' : '2D Graphing Engine'}
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('about.graphingFeature')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <Sparkles className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
              {isRTL ? 'أربعة أساليب شرح' : '4 Pedagogical Styles'}
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('about.stylesFeature')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
              {isRTL ? 'ثلاثة مستويات أكاديمية' : '3 Academic Levels'}
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('about.levelsFeature')}
            </p>
          </div>
        </div>
      </div>

      {/* DEVELOPER & PLATFORM IDENTITY */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm transition-colors space-y-4">
        <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
          <UserCheck className="w-5 h-5 shrink-0" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {t('about.developerSectionTitle')}
          </h2>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t('about.developerFullName')}
              </h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                {t('about.developerRole')} ({t('about.developerCompactName')})
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 self-start sm:self-center">
              {isRTL ? 'ميدمة ماث' : 'Maidama Math'}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('about.productDescription')}
          </p>

          {/* Verified Contact & Professional Profile Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <a
              href="mailto:shawqiali234@gmail.com"
              className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-xs font-medium shadow-2xs group"
            >
              <Mail className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-600 dark:text-slate-300 block">{t('about.developerEmailLabel')}</span>
                <span className="font-mono text-[11px] truncate block" dir="ltr">shawqiali234@gmail.com</span>
              </div>
            </a>

            <a
              href="https://github.com/Shawqi-Almaidama"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-xs font-medium shadow-2xs group"
            >
              <Github className="w-4 h-4 text-slate-900 dark:text-slate-100 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-600 dark:text-slate-300 block">{t('about.developerGithubLabel')}</span>
                <span className="font-mono text-[11px] truncate block" dir="ltr">Shawqi-Almaidama</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>

            <a
              href="https://www.linkedin.com/in/shawgi-al-maidama-165b59437"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-xs font-medium shadow-2xs group"
            >
              <Linkedin className="w-4 h-4 text-sky-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-600 dark:text-slate-300 block">{t('about.developerLinkedinLabel')}</span>
                <span className="font-mono text-[11px] truncate block" dir="ltr">shawgi-al-maidama</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
          </div>

          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
            {t('about.copyright')}
          </div>
        </div>
      </div>

      {/* Privacy & Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Privacy Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs sm:text-sm font-bold">
              {t('about.privacyTitle')}
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('about.privacyDesc')}
          </p>
        </div>

        {/* Specs Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs sm:text-sm font-bold">
              {t('about.versionTitle')}
            </h3>
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
            {t('about.versionNumber')}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {t('about.techStack')}
          </div>
        </div>
      </div>
    </div>
  );
};
