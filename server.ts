import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { geminiMathSolver } from './src/server/geminiMathSolver.ts';
import { mathEngine } from './src/server/mathEngine.ts';
import { MathCategory } from './src/types/math.ts';
import { authStore } from './src/server/authStore.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);


// Increase JSON and URL-encoded limits to accommodate camera images, audio recordings, and PDF documents
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Modular registry of mathematical categories and operations
const CATEGORIES: MathCategory[] = [
  {
    id: 'arithmetic',
    nameEn: 'Arithmetic & Number Theory',
    nameAr: 'الحساب ونظرية الأعداد',
    descriptionEn: 'Fractions, percentages, powers, roots, scientific notation, prime factorization.',
    descriptionAr: 'الكسور، النسب المئوية، الجذور والأسس، الترميز العلمي، وتحليل الأعداد الأولية.',
    icon: 'Calculator',
    status: 'supported',
    examples: [
      {
        titleEn: 'Fraction arithmetic',
        titleAr: 'جمع وطرح الكسور',
        query: '3/4 + 5/6 - 2/9',
        queryAr: '٣/٤ + ٥/٦ - ٢/٩',
        queryEn: '3/4 + 5/6 - 2/9'
      },
      {
        titleEn: 'Roots & powers',
        titleAr: 'الجذور والأسس',
        query: 'sqrt(144) * 2^4 / 8',
        queryAr: 'جذر(١٤٤) × ٢^٤ ÷ ٨',
        queryEn: 'sqrt(144) * 2^4 / 8'
      },
      {
        titleEn: 'Order of operations',
        titleAr: 'أولويات العمليات',
        query: '(15 - 3 * 2)^2 / 3 + 7',
        queryAr: '(١٥ - ٣ × ٢)^٢ ÷ ٣ + ٧',
        queryEn: '(15 - 3 * 2)^2 / 3 + 7'
      }
    ]
  },
  {
    id: 'algebra',
    nameEn: 'Algebra & Equations',
    nameAr: 'الجبر والمعادلات',
    descriptionEn: 'Linear, quadratic, polynomials, exponential, systems of equations, inequalities.',
    descriptionAr: 'المعادلات الخطية والتربيعية، كثيرات الحدود، المعادلات الأسية واللوغاريتمية، والمتباينات.',
    icon: 'Variable',
    status: 'supported',
    examples: [
      {
        titleEn: 'Quadratic equation',
        titleAr: 'حل معادلة تربيعية',
        query: '2x^2 - 7x + 3 = 0',
        queryAr: '٢س^٢ - ٧س + ٣ = ٠',
        queryEn: '2x^2 - 7x + 3 = 0'
      },
      {
        titleEn: 'System of equations',
        titleAr: 'نظام معادلتين',
        query: '2x + 3y = 13, 5x - y = 7',
        queryAr: '٢س + ٣ص = ١٣ ، ٥س - ص = ٧',
        queryEn: '2x + 3y = 13, 5x - y = 7'
      },
      {
        titleEn: 'Polynomial factorization',
        titleAr: 'تحليل كثير حدود',
        query: 'Factorize x^3 - 6x^2 + 11x - 6',
        queryAr: 'حلل كثير الحدود س^٣ - ٦س^٢ + ١١س - ٦ إلى عوامله',
        queryEn: 'Factorize x^3 - 6x^2 + 11x - 6'
      },
      {
        titleEn: 'Logarithmic equation',
        titleAr: 'معادلة لوغاريتمية',
        query: 'log2(x + 3) + log2(x - 3) = 4',
        queryAr: 'لوغاريتم(س + ٣) للأساس ٢ + لوغاريتم(س - ٣) للأساس ٢ = ٤',
        queryEn: 'log2(x + 3) + log2(x - 3) = 4'
      }
    ]
  },
  {
    id: 'calculus',
    nameEn: 'Calculus & Analysis',
    nameAr: 'التفاضل والتكامل والتحليل',
    descriptionEn: 'Limits, derivatives, definite and indefinite integrals, series, differential equations.',
    descriptionAr: 'النهايات، قواعد الاشتقاق وتطبيقاته، التكامل المحدد وغير المحدد، والمعادلات التفاضلية.',
    icon: 'TrendingUp',
    status: 'supported',
    examples: [
      {
        titleEn: 'Derivative of polynomial',
        titleAr: 'مشتقة دالة',
        query: 'd/dx of x^3 * sin(x)',
        queryAr: 'مشتقة س^٣ × جا(س)',
        queryEn: 'd/dx of x^3 * sin(x)'
      },
      {
        titleEn: 'Definite integral',
        titleAr: 'تكامل محدد',
        query: 'integrate x^2 * exp(x) from 0 to 2',
        queryAr: 'تكامل س^٢ × هـ^س من ٠ إلى ٢',
        queryEn: 'integrate x^2 * exp(x) from 0 to 2'
      },
      {
        titleEn: 'Limit calculation',
        titleAr: 'حساب نهاية',
        query: 'lim (sin(3x) / x) as x -> 0',
        queryAr: 'نهاية (جا(٣س) ÷ س) عندما س تقترب من ٠',
        queryEn: 'lim (sin(3x) / x) as x -> 0'
      },
      {
        titleEn: 'Optimization',
        titleAr: 'القيم العظمى والصغرى',
        query: 'Find the local extrema of f(x) = x^3 - 3x^2 - 9x + 5',
        queryAr: 'أوجد القيم العظمى والصغرى ونقاط الانقلاب للدالة د(س) = س^٣ - ٣س^٢ - ٩س + ٥',
        queryEn: 'Find the local extrema of f(x) = x^3 - 3x^2 - 9x + 5'
      }
    ]
  },
  {
    id: 'geometry',
    nameEn: 'Geometry & Trigonometry',
    nameAr: 'الهندسة وحساب المثلثات',
    descriptionEn: 'Triangles, circles, coordinate geometry, surface areas, volumes, trig identities.',
    descriptionAr: 'المثلثات، الدوائر، الهندسة التحليلية، المساحات والحجوم، والمتطابقات المثلثية.',
    icon: 'Shapes',
    status: 'supported',
    examples: [
      {
        titleEn: 'Trigonometric identity',
        titleAr: 'متطابقة مثلثية',
        query: 'Prove: sin^2(x) + cos^2(x) = 1',
        queryAr: 'أثبت صحة المتطابقة المثلثية: جا^٢(س) + جتا^٢(س) = ١',
        queryEn: 'Prove: sin^2(x) + cos^2(x) = 1'
      },
      {
        titleEn: 'Pythagorean & triangle',
        titleAr: 'مثلث قائم الزاوية',
        query: 'Right triangle with hypotenuse 10 and one side 6, find other side and area',
        queryAr: 'مثلث قائم الزاوية طول وتره ١٠ وطول أحد أضلاعه ٦، احسب طول الضلع الآخر ومساحته',
        queryEn: 'Right triangle with hypotenuse 10 and one side 6, find other side and area'
      },
      {
        titleEn: 'Cylinder volume & surface',
        titleAr: 'حجم ومساحة أسطوانة',
        query: 'Volume and total surface area of cylinder with radius 4cm and height 10cm',
        queryAr: 'احسب حجم ومساحة أسطوانة دائرية نصف قطر قاعدتها ٤ سم وارتفاعها ١٠ سم',
        queryEn: 'Volume and total surface area of cylinder with radius 4cm and height 10cm'
      }
    ]
  },
  {
    id: 'linear-algebra',
    nameEn: 'Linear Algebra',
    nameAr: 'الجبر الخطي والمصفوفات',
    descriptionEn: 'Matrices, determinants, inverses, eigenvalues, eigenvectors, vector dot and cross products.',
    descriptionAr: 'المصفوفات، المحددات، المعكوس، القيم الذاتية، والمتجهات (الضرب النقطي والاتجاهي).',
    icon: 'Grid',
    status: 'supported',
    examples: [
      {
        titleEn: 'Matrix determinant & inverse',
        titleAr: 'محدد ومعكوس مصفوفة',
        query: 'Find determinant and inverse of matrix [[2, 1], [5, 3]]',
        queryAr: 'أوجد محدد ومعكوس المصفوفة [[٢, ١], [٥, ٣]]',
        queryEn: 'Find determinant and inverse of matrix [[2, 1], [5, 3]]'
      },
      {
        titleEn: 'Matrix multiplication',
        titleAr: 'ضرب المصفوفات',
        query: 'Multiply [[1, 2], [3, 4]] by [[5, 6], [7, 8]]',
        queryAr: 'احسب حاصل ضرب المصفوفتين [[١, ٢], [٣, ٤]] × [[٥, ٦], [٧, ٨]]',
        queryEn: 'Multiply [[1, 2], [3, 4]] by [[5, 6], [7, 8]]'
      },
      {
        titleEn: 'Eigenvalues 2x2',
        titleAr: 'القيم الذاتية لمصفوفة',
        query: 'Find eigenvalues of matrix [[4, 2], [1, 3]]',
        queryAr: 'أوجد القيم الذاتية (Eigenvalues) للمصفوفة [[٤, ٢], [١, ٣]]',
        queryEn: 'Find eigenvalues of matrix [[4, 2], [1, 3]]'
      }
    ]
  },
  {
    id: 'statistics',
    nameEn: 'Statistics & Probability',
    nameAr: 'الإحصاء والاحتمالات',
    descriptionEn: 'Mean, median, variance, standard deviation, permutations, combinations, binomial distribution.',
    descriptionAr: 'المتوسط، الوسيط، التباين والانحراف المعياري، التوافيق والتباديل، وتوزيع ذي الحدين.',
    icon: 'BarChart2',
    status: 'supported',
    examples: [
      {
        titleEn: 'Descriptive stats',
        titleAr: 'إحصاء وصفي لمجموعة بيانات',
        query: 'Calculate mean, median, standard deviation of: 12, 15, 18, 22, 25, 30, 32',
        queryAr: 'احسب المتوسط الحسابي والوسيط والانحراف المعياري للقيم: ١٢، ١٥، ١٨، ٢٢، ٢٥، ٣٠، ٣٢',
        queryEn: 'Calculate mean, median, standard deviation of: 12, 15, 18, 22, 25, 30, 32'
      },
      {
        titleEn: 'Combinatorics',
        titleAr: 'التوافيق والتباديل',
        query: 'Find 10 C 3 and 10 P 3',
        queryAr: 'احسب التوافيق والتباديل: ١٠ ق ٣ (توافيق) و ١٠ ل ٣ (تباديل)',
        queryEn: 'Find 10 C 3 and 10 P 3'
      },
      {
        titleEn: 'Probability rule',
        titleAr: 'احتمال رمي حجري نرد',
        query: 'Probability of getting a sum greater than 8 when rolling two fair dice',
        queryAr: 'ما احتمال الحصول على مجموع أكبر من ٨ عند إلقاء حجري نرد عادلين؟',
        queryEn: 'Probability of getting a sum greater than 8 when rolling two fair dice'
      }
    ]
  },
  {
    id: 'word-problems',
    nameEn: 'Applied Math & Word Problems',
    nameAr: 'المسائل اللفظية والتطبيقية',
    descriptionEn: 'Real-world modeling, physics rate problems, mixture problems, finance interest, optimization.',
    descriptionAr: 'النمذجة الرياضية، مسائل الحركة والسرعة، مسائل الخلائط والفوائد البنكية، والمسائل الهندسية.',
    icon: 'HelpCircle',
    status: 'supported',
    examples: [
      {
        titleEn: 'Motion and speed',
        titleAr: 'مسألة قطارين وسرعة نسبية',
        query: 'قطاران ينطلقان من نفس المحطة في اتجاهين متعاكسين، الأول بسرعة 60 كم/س والثاني بسرعة 90 كم/س. بعد كم ساعة تصبح المسافة بينهما 450 كم؟',
        queryAr: 'قطاران ينطلقان من نفس المحطة في اتجاهين متعاكسين، الأول بسرعة 60 كم/س والثاني بسرعة 90 كم/س. بعد كم ساعة تصبح المسافة بينهما 450 كم؟',
        queryEn: 'Two trains leave stations 450 km apart at speeds 60 and 90 km/h. When do they meet?'
      },
      {
        titleEn: 'Compound interest',
        titleAr: 'الفائدة المركبة',
        query: 'A principal of $5000 is invested at 6% annual interest compounded monthly for 5 years. Find the total amount.',
        queryAr: 'استُثمر مبلغ ٥٠٠٠ دولار بفائدة سنوية مركبة ٦٪ تُضاف شهرياً لمدة ٥ سنوات، احسب الرصيد النهائي',
        queryEn: 'A principal of $5000 is invested at 6% annual interest compounded monthly for 5 years. Find the total amount.'
      },
      {
        titleEn: 'Work rate problem',
        titleAr: 'مسألة معدل العمل المشترك',
        query: 'أحمد ينجز عملاً في 4 ساعات ومحمد ينجزه في 6 ساعات، كم يستغرقان معاً؟',
        queryAr: 'أحمد ينجز عملاً في 4 ساعات ومحمد ينجزه في 6 ساعات، كم يستغرقان معاً؟',
        queryEn: 'Person A completes a job in 4 hours and Person B in 6 hours. How long working together?'
      }
    ]
  }
];

// API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Maidama Math API',
  });
});

app.get('/api/categories', (_req: Request, res: Response) => {
  res.json({ categories: CATEGORIES });
});

// Authentication and User Profile API
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    const result = authStore.register(name, email, password);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = authStore.login(email, password);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Login failed.' });
  }
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const user = authStore.getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized or session expired.' });
  }
  res.json({ success: true, user });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token) {
    authStore.logout(token);
  }
  res.json({ success: true });
});

// User Cloud Data Synchronization
app.post('/api/user/sync', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const user = authStore.getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required to sync data.' });
  }

  const { history, favorites, settings } = req.body;
  const synced = authStore.saveUserData(user.id, { history, favorites, settings });
  res.json({ success: true, synced });
});

app.get('/api/user/data', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const user = authStore.getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const data = authStore.getUserData(user.id);
  res.json({ success: true, data });
});

// In-flight concurrency and basic rate limiting guard
let activeSolvingRequests = 0;
const MAX_CONCURRENT_SOLVES = 10;

// Primary solving endpoint
app.post('/api/solve', async (req: Request, res: Response) => {
  if (activeSolvingRequests >= MAX_CONCURRENT_SOLVES) {
    return res.status(429).json({
      error: 'The server is currently processing maximum mathematical calculations. Please try again in a few moments.'
    });
  }

  activeSolvingRequests++;
  try {
    const { problem, style, level, language, imageBase64, imageMimeType, fileBase64, fileMimeType, fileName, inputMethod } = req.body;

    if (!problem && !imageBase64 && !fileBase64) {
      return res.status(400).json({ error: 'Please provide a mathematical problem statement, image, or document.' });
    }

    if (problem && typeof problem === 'string' && problem.length > 5000) {
      return res.status(400).json({ error: 'Problem query length exceeds 5,000 characters.' });
    }

    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 35 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image file exceeds maximum allowable payload size (25MB).' });
    }

    const solution = await geminiMathSolver.solveProblem({
      problem: (problem || '').trim(),
      style: style || 'step-by-step',
      level: level || 'school',
      language: language || 'ar',
      imageBase64,
      imageMimeType,
      fileBase64,
      fileMimeType,
      fileName,
      inputMethod: inputMethod || 'text',
    });

    res.json({ success: true, solution });
  } catch (error: any) {
    console.error('Solve error:', error);
    const errMsg = String(error?.message || '');
    const isOverloaded =
      errMsg.includes('503') ||
      errMsg.includes('UNAVAILABLE') ||
      errMsg.includes('high demand') ||
      errMsg.includes('overloaded');
    const isQuota =
      errMsg.includes('429') ||
      errMsg.includes('RESOURCE_EXHAUSTED') ||
      errMsg.includes('quota');
    const status = isOverloaded ? 503 : isQuota ? 429 : 500;

    res.status(status).json({
      error: error.message || 'An error occurred while solving the mathematical problem.',
    });
  } finally {
    activeSolvingRequests--;
  }
});

// Fast deterministic computation & verification endpoint
app.post('/api/compute-verify', (req: Request, res: Response) => {
  try {
    const { expression, type, params } = req.body;
    if (!expression && !params) {
      return res.status(400).json({ error: 'Expression or parameters required.' });
    }

    let result;
    if (type === 'derivative') {
      result = mathEngine.computeDerivative(expression, params?.variable || 'x');
    } else if (type === 'quadratic') {
      result = mathEngine.solveQuadratic(params.a, params.b, params.c);
    } else if (type === 'matrix') {
      result = mathEngine.analyzeMatrix(params.matrix);
    } else if (type === 'linear-system') {
      result = mathEngine.solveLinearSystem(params.A, params.b);
    } else if (type === 'simplify') {
      result = mathEngine.simplifyAlgebra(expression);
    } else if (type === 'integral') {
      result = mathEngine.integrateNumerically(expression, params.a, params.b, params.n);
    } else if (type === 'statistics') {
      result = mathEngine.computeStatistics(params.data);
    } else {
      result = mathEngine.evaluateExpression(expression);
    }

    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Voice transcription endpoint
app.post('/api/transcribe-voice', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType, language } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required.' });
    }

    const transcribed = await geminiMathSolver.transcribeVoiceAudio(audioBase64, mimeType || 'audio/webm', language || 'ar');
    res.json({ success: true, transcribedText: transcribed, text: transcribed });
  } catch (error: any) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message || 'Voice transcription failed.' });
  }
});

// Camera image OCR & mathematical extraction endpoint
app.post('/api/extract-image', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, language } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    const extracted = await geminiMathSolver.extractMathFromImage(imageBase64, mimeType || 'image/jpeg', language || 'ar');
    res.json({ success: true, ...extracted });
  } catch (error: any) {
    console.error('Image extraction error:', error);
    res.status(500).json({ error: error.message || 'Image math extraction failed.' });
  }
});

// Interactive step-by-step follow-up Q&A tutor endpoint
app.post('/api/chat-followup', async (req: Request, res: Response) => {
  try {
    const { solution, userQuery, history, language, level } = req.body;
    if (!solution || !userQuery) {
      return res.status(400).json({ error: 'Solution context and user query are required.' });
    }

    const answer = await geminiMathSolver.answerFollowupQuestion(
      solution,
      userQuery,
      history || [],
      language || solution.language || 'ar',
      level || solution.level || 'intermediate'
    );
    res.json({ success: true, answer });
  } catch (error: any) {
    console.error('Chat follow-up error:', error);
    res.status(500).json({ error: error.message || 'Follow-up query failed.' });
  }
});

// Set up Vite dev server or production static serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Maidama Math server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
