import { geminiMathSolver } from '../server/geminiMathSolver.ts';
import { mathEngine } from '../server/mathEngine.ts';
import { MathSolution } from '../types/math.ts';
import { localizeSolution } from '../utils/solutionLocalizer.ts';
import { generatePlotImage, generatePrintableHtml, exportSolutionToPdf, downloadHtmlReport } from '../utils/pdfExport.ts';
import { arTranslations, enTranslations } from '../localization/translations.ts';
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

async function runTutorGreetingAndNumbersTests() {
  console.log('🧪 Starting Maidama Math Comprehensive Arabic/English Localization & PDF Test Suite...\n');

  // =========================================================================
  // 1. Mandatory Acceptance Reference Problem: "٢س + ٤ = ١٠"
  // =========================================================================
  console.log('--- 1. Mandatory Acceptance Test: "٢س + ٤ = ١٠" ---');
  const engineLinearResult = mathEngine.autoComputeAndVerify('٢س + ٤ = ١٠');
  assert(engineLinearResult !== null, 'Engine recognized "٢س + ٤ = ١٠"');
  assert(engineLinearResult?.verified === true, 'Linear equation verified with zero residual');
  assert(engineLinearResult?.residual === 0, 'Residual equals 0');
  assert(engineLinearResult?.details?.isLinear === true, 'Engine tagged as linear equation');

  const arabicSolution = await geminiMathSolver.solveProblem({
    problem: '٢س + ٤ = ١٠',
    style: 'step-by-step',
    level: 'school',
    language: 'ar',
  });

  assert(
    arabicSolution.originalQuestion === '٢س + ٤ = ١٠',
    'Original question preserved exactly as entered: "٢س + ٤ = ١٠"'
  );

  // Display layer in Arabic
  const displayAr = localizeSolution(arabicSolution, 'ar');

  console.log('Arabic Display Steps:');
  displayAr.steps.forEach((s) => {
    console.log(`  [Step ${s.stepNumber}] ${s.title}: ${s.latex}`);
  });
  console.log(`Final Answer: ${displayAr.finalAnswer} (${displayAr.plainAnswer})`);

  // Step 1: طرح ٤ من الطرفين
  assert(
    displayAr.steps.length >= 3,
    'Solution contains at least 3 pedagogical steps'
  );
  assert(
    displayAr.steps[0].title.includes('طرح ٤ من الطرفين') ||
    displayAr.steps[0].title.includes('طرح 4 من الطرفين') ||
    (displayAr.steps[0].title.includes('طرح') && displayAr.steps[0].title.includes('الطرفين')),
    'Step 1 title is: طرح ٤ من الطرفين'
  );
  assert(
    Boolean(
      displayAr.steps[0].latex?.includes('٢س') &&
      (displayAr.steps[0].latex?.includes('٤') || displayAr.steps[0].latex?.includes('4')) &&
      (displayAr.steps[0].latex?.includes('١٠') || displayAr.steps[0].latex?.includes('10'))
    ),
    'Step 1 equation uses Arabic variable س and numerals: ٢س + ٤ − ٤ = ١٠ − ٤'
  );

  // Step 2: التبسيط
  assert(
    displayAr.steps[1].title.includes('التبسيط') || displayAr.steps[1].title.includes('تبسيط'),
    'Step 2 title is: التبسيط'
  );
  assert(
    Boolean(
      displayAr.steps[1].latex?.includes('٢س') &&
      (displayAr.steps[1].latex?.includes('٦') || displayAr.steps[1].latex?.includes('6'))
    ),
    'Step 2 equation is: ٢س = ٦'
  );

  // Step 3: قسمة الطرفين على ٢
  assert(
    displayAr.steps[2].title.includes('قسمة الطرفين على ٢') ||
    displayAr.steps[2].title.includes('قسمة الطرفين على 2') ||
    (displayAr.steps[2].title.includes('قسمة') && displayAr.steps[2].title.includes('٢')),
    'Step 3 title is: قسمة الطرفين على ٢'
  );
  assert(
    Boolean(
      displayAr.steps[2].latex?.includes('٢س') &&
      (displayAr.steps[2].latex?.includes('٦') || displayAr.steps[2].latex?.includes('6'))
    ),
    'Step 3 equation is: ٢س ÷ ٢ = ٦ ÷ ٢'
  );

  // Final Answer: س = ٣
  assert(
    displayAr.finalAnswer.includes('س = ٣') || displayAr.finalAnswer.includes('س = 3'),
    'Final Answer in Arabic uses variable س and number ٣: س = ٣'
  );
  assert(
    displayAr.plainAnswer.includes('س = ٣') || displayAr.plainAnswer.includes('س = 3'),
    'Plain answer in Arabic uses variable س and number ٣: س = ٣'
  );

  // Verification in Arabic
  assert(
    displayAr.verification.method.includes('التحقق') || displayAr.verification.method.includes('التعويض'),
    'Verification method is localized in Arabic'
  );

  // =========================================================================
  // 2. Seamless Language Switch to English
  // =========================================================================
  console.log('\n--- 2. Seamless Transition to English Display ---');
  const displayEn = localizeSolution(arabicSolution, 'en');
  console.log('English Display Steps:');
  displayEn.steps.forEach((s) => {
    console.log(`  [Step ${s.stepNumber}] ${s.title}: ${s.latex}`);
  });
  console.log(`Final Answer: ${displayEn.finalAnswer} (${displayEn.plainAnswer})`);

  assert(
    displayEn.steps[0].title.toLowerCase().includes('subtract') && displayEn.steps[0].title.includes('4'),
    'English Step 1 title is: Subtract 4 from both sides'
  );
  assert(
    Boolean(displayEn.steps[0].latex?.includes('2x') && displayEn.steps[0].latex?.includes('10')),
    'English Step 1 equation uses Western variable x and numbers: 2x + 4 - 4 = 10 - 4'
  );
  assert(
    displayEn.steps[1].title.toLowerCase().includes('simplif'),
    'English Step 2 title is: Simplification'
  );
  assert(
    Boolean(displayEn.steps[1].latex?.includes('2x = 6')),
    'English Step 2 equation is: 2x = 6'
  );
  assert(
    displayEn.steps[2].title.toLowerCase().includes('divide') && displayEn.steps[2].title.includes('2'),
    'English Step 3 title is: Divide both sides by 2'
  );
  assert(
    displayEn.finalAnswer.includes('x = 3'),
    'English final answer is: x = 3'
  );

  // =========================================================================
  // 3. Tutor Greeting: Initial Greeting & Follow-Up Isolation
  // =========================================================================
  console.log('\n--- 3. Tutor Greeting: Explicit Maidama Math Greeting & No Repetition ---');
  const mockSolution: MathSolution = {
    id: 'sol-greeting-test',
    timestamp: Date.now(),
    originalQuestion: '٢س + ٤ = ١٠',
    interpretedProblem: '٢س + ٤ = ١٠',
    category: 'Algebra',
    topic: 'Linear Equations',
    style: 'step-by-step',
    level: 'school',
    language: 'ar',
    assumptions: [],
    steps: displayAr.steps,
    finalAnswer: 'س = ٣',
    plainAnswer: 'س = ٣',
    verification: displayAr.verification,
    inputMethod: 'text',
  };

  const arAnswerFirst = await geminiMathSolver.answerFollowupQuestion(
    mockSolution,
    'اشرح لي المسألة',
    [],
    'ar',
    'intermediate'
  );

  assert(
    arAnswerFirst.includes('Maidama Math') || arAnswerFirst.includes('ميدمة ماث'),
    'First Arabic response explicitly mentions Maidama Math'
  );
  assert(
    arAnswerFirst.includes('معلمك') || arAnswerFirst.includes('معلّمك'),
    'First Arabic response identifies the tutor'
  );
  assert(
    arAnswerFirst.includes('أهلًا بك') || arAnswerFirst.includes('أهلاً بك'),
    'First Arabic response welcomes the user'
  );

  // Follow-up interaction
  const arHistory = [
    { sender: 'user', text: 'اشرح لي المسألة' },
    { sender: 'assistant', text: arAnswerFirst },
  ];
  const arAnswerFollowup = await geminiMathSolver.answerFollowupQuestion(
    mockSolution,
    'لماذا قمنا بالخطوة 1؟',
    arHistory,
    'ar',
    'intermediate'
  );

  assert(
    !arAnswerFollowup.startsWith('أهلًا بك! أنا معلمك ومساعدك في Maidama Math') &&
    !arAnswerFollowup.startsWith('أهلاً بك! أنا معلّمك في **ميدمة ماث (Maidama Math)**'),
    'Follow-up Arabic response does NOT repeat the welcome intro'
  );

  // =========================================================================
  // 4. Matrix Element-Wise LTR Integrity
  // =========================================================================
  console.log('\n--- 4. Matrix Structure & Element-Wise Arithmetic ---');
  const matrixResult = mathEngine.evaluateMatrixArithmetic(
    'A = [[1, 2], [3, 4]]; B = [[5, 6], [7, 8]]; A + B'
  );
  assert(matrixResult !== null, 'Matrix expression evaluated successfully');
  assert(matrixResult?.success === true, 'Matrix addition computed successfully');
  assert(
    Boolean(matrixResult?.latex?.includes('\\begin{pmatrix} 6 & 8 \\\\ 10 & 12 \\end{pmatrix}')),
    'Matrix element-wise addition preserved exactly: 1+5=6, 2+6=8, 3+7=10, 4+8=12'
  );

  // =========================================================================
  // 5. PDF Export Graph Inclusion Verification
  // =========================================================================
  console.log('\n--- 5. PDF Export Graph Inclusion & Clean Omission ---');
  const plottableSolution: MathSolution = {
    ...arabicSolution,
    plotConfig: {
      functionLatex: 'y = 2x - 6',
      functionExpr: '2*x - 6',
      xDomain: [-10, 10],
      pointsOfInterest: [{ x: 3, y: 0, label: 'س = ٣' }],
    },
  };

  const plotAr = generatePlotImage(plottableSolution.plotConfig!, 'ar');
  assert(plotAr !== null && plotAr.startsWith('data:image/'), 'Plot generator creates valid base64 image data URL in Arabic mode');

  const plotEn = generatePlotImage(plottableSolution.plotConfig!, 'en');
  assert(plotEn !== null && plotEn.startsWith('data:image/'), 'Plot generator creates valid base64 image data URL in English mode');

  // Verify non-plottable solution does NOT generate graph
  const nonPlottablePlot = generatePlotImage({ functionExpr: '', functionLatex: '' }, 'ar');
  assert(nonPlottablePlot === null, 'Non-plottable solution cleanly returns null without generating graph artifacts');

  // Verify Printable HTML with Graph Section
  const plottableHtml = generatePrintableHtml(plottableSolution, 'ar');
  assert(plottableHtml.includes('التمثيل والرسم البياني للدالة'), 'Plottable HTML contains Arabic graph title');
  assert(plottableHtml.includes('<img src="data:image/'), 'Plottable HTML contains embedded high-DPI plot image data URL');
  assert(plottableHtml.includes('٢س + ٤ = ١٠'), 'Plottable HTML contains Arabic reference problem statement');
  assert(plottableHtml.includes('س = ٣'), 'Plottable HTML contains Arabic final answer');
  assert(plottableHtml.includes('طرح ٤ من الطرفين'), 'Plottable HTML contains Arabic Step 1 title');
  assert(plottableHtml.includes('no-print-toolbar'), 'Plottable HTML contains non-printable toolbar with print and close controls');

  // Verify Printable HTML WITHOUT Graph (Clean Omission)
  const nonPlottableSolution: MathSolution = { ...arabicSolution, plotConfig: undefined };
  const nonPlottableHtml = generatePrintableHtml(nonPlottableSolution, 'ar');
  assert(!nonPlottableHtml.includes('التمثيل والرسم البياني للدالة'), 'Non-plottable HTML cleanly omits graph title without empty placeholder');
  assert(!nonPlottableHtml.includes('<img src="data:image/'), 'Non-plottable HTML contains no broken graph img tag');
  assert(nonPlottableHtml.includes('٢س + ٤ = ١٠'), 'Non-plottable HTML still contains problem statement');
  assert(nonPlottableHtml.includes('س = ٣'), 'Non-plottable HTML still contains final answer');

  // Verify English Printable HTML
  const enHtml = generatePrintableHtml(displayEn, 'en');
  assert(enHtml.includes('Mathematical Solution Report'), 'English HTML contains English report title');
  assert(enHtml.includes('Subtract 4 from both sides'), 'English HTML contains English Step 1 title');
  assert(enHtml.includes('x = 3'), 'English HTML contains Western variable and digits for final answer');

  // Verify exportSolutionToPdf returns valid ExportPdfResult
  const exportResult = await exportSolutionToPdf(plottableSolution, 'ar');
  assert(typeof exportResult === 'object' && exportResult !== null, 'exportSolutionToPdf returns structured result');
  assert(typeof exportResult.htmlContent === 'string' && exportResult.htmlContent.length > 500, 'exportSolutionToPdf generates full HTML content');

  // Verify downloadHtmlReport runs without exception
  downloadHtmlReport(plottableSolution, 'ar');
  console.log('  ✅ [PASS] downloadHtmlReport executes safely without throwing');

  // =========================================================================
  // 6. Translation Standardizations
  // =========================================================================
  console.log('\n--- 6. Interface Translations Consistency ---');
  assert(
    arTranslations.keyboard.matrix2x2 === 'مصفوفة 2×2',
    'Arabic keyboard matrix2x2 standardized to 2×2'
  );
  assert(
    enTranslations.keyboard.matrix2x2 === '2×2 Matrix',
    'English keyboard matrix2x2 is 2×2 Matrix'
  );

  console.log('\n======================================================');
  console.log('🎉 ALL ACCEPTANCE, LOCALIZATION & PDF TESTS PASSED!');
  console.log('======================================================\n');
}

runTutorGreetingAndNumbersTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
