import { mathEngine } from './mathEngine.ts';
import { localizeFormulaUsed } from '../utils/solutionLocalizer.ts';

/**
 * Comprehensive Automated Test Suite for Maidama Math's Symbolic and Numerical Engine
 */
function runTests() {
  console.log('🧪 Starting Maidama Math Rigorous Mathematical Verification Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // 1. Arithmetic & Exact Operations
  console.log('--- 1. Arithmetic, Rational Fractions & Division by Zero ---');
  const arith1 = mathEngine.evaluateExpression('3/4 + 5/6');
  assert('Fraction addition (3/4 + 5/6)', Boolean(arith1.success && (arith1.calculatedValue === '19/12' || Math.abs(parseFloat(arith1.calculatedValue!) - 1.583333) < 0.01)), arith1.calculatedValue);

  const arith2 = mathEngine.evaluateExpression('sqrt(144) * 2^4 / 8');
  assert('Powers and roots evaluation', Boolean(arith2.success && parseFloat(arith2.calculatedValue!) === 24), arith2.calculatedValue);

  const divZero = mathEngine.evaluateExpression('10 / (5 - 5)');
  assert('Division by zero rejected/caught', Boolean(!divZero.success && divZero.error?.includes('Division by zero')), divZero.error);

  const precedence = mathEngine.evaluateExpression('(-3)^2 - 4 * 2');
  assert('Order of operations with negative exponent: (-3)^2 - 4*2 == 1', Boolean(precedence.success && parseFloat(precedence.calculatedValue!) === 1), precedence.calculatedValue);

  // 2. Derivatives & Calculus
  console.log('\n--- 2. Derivatives & Calculus ---');
  const deriv1 = mathEngine.computeDerivative('x^3 - 3*x + 1', 'x');
  assert('Symbolic derivative of x^3 - 3*x + 1', Boolean(deriv1.success && deriv1.calculatedValue?.includes('3 * x ^ 2 - 3')), deriv1.calculatedValue);
  assert('Residual verification for derivative', Boolean(deriv1.verified && (deriv1.residual ?? 1) < 1e-4), `Residual: ${deriv1.residual}`);

  const deriv2 = mathEngine.computeDerivative('sin(x)', 'x');
  assert('Derivative of sin(x) -> cos(x)', Boolean(deriv2.success && deriv2.calculatedValue === 'cos(x)'), deriv2.calculatedValue);

  const derivExp = mathEngine.computeDerivative('exp(2*x)', 'x');
  assert('Derivative of exp(2*x) -> 2*exp(2*x)', Boolean(derivExp.success && derivExp.calculatedValue?.includes('2 * exp(2 * x)')), derivExp.calculatedValue);

  // 3. Equations & Quadratic Solver
  console.log('\n--- 3. Equation Solving & Residual Checking ---');
  // Two distinct real roots: 2x^2 - 7x + 3 = 0 -> roots are 3 and 0.5
  const quad1 = mathEngine.solveQuadratic(2, -7, 3);
  assert('Quadratic roots of 2x^2 - 7x + 3 = 0', Boolean(quad1.success && quad1.calculatedValue?.includes('3.00000') && quad1.calculatedValue?.includes('0.50000')), quad1.calculatedValue);
  assert('Residual verification for quadratic roots (f(r) == 0)', Boolean(quad1.verified && (quad1.residual ?? 1) < 1e-5), `Residual: ${quad1.residual}`);

  // Repeated real root: x^2 - 6x + 9 = 0 -> root is x = 3
  const quadRepeat = mathEngine.solveQuadratic(1, -6, 9);
  assert('Repeated root of x^2 - 6x + 9 = 0 -> x = 3', Boolean(quadRepeat.success && quadRepeat.calculatedValue === 'x = 3'), quadRepeat.calculatedValue);

  // Complex conjugate roots: x^2 + 4 = 0 -> +/- 2i
  const quadComplex = mathEngine.solveQuadratic(1, 0, 4);
  assert('Complex roots of x^2 + 4 = 0 -> +/- 2i', Boolean(quadComplex.success && quadComplex.calculatedValue?.includes('2.0000i')), quadComplex.calculatedValue);

  // Degenerate linear case: a = 0, b = 2, c = -6 -> 2x - 6 = 0 -> x = 3
  const linear = mathEngine.solveQuadratic(0, 2, -6);
  assert('Linear degenerate equation 2x - 6 = 0', Boolean(linear.success && linear.calculatedValue === 'x = 3'), linear.calculatedValue);

  // Degenerate impossible case: a = 0, b = 0, c = 5 -> no solution
  const degenerateNoSol = mathEngine.solveQuadratic(0, 0, 5);
  assert('Degenerate impossible case 0 = 5', Boolean(!degenerateNoSol.success && degenerateNoSol.error?.includes('no solution')), degenerateNoSol.error);

  // 4. Linear Algebra & Matrices
  console.log('\n--- 4. Linear Algebra & Matrices ---');
  const mat1 = [
    [2, 1],
    [5, 3]
  ]; // det = 2*3 - 1*5 = 1
  const matRes1 = mathEngine.analyzeMatrix(mat1);
  assert('Matrix determinant (det=1)', Boolean(matRes1.success && (matRes1.details as any)?.determinant === 1), matRes1.calculatedValue);
  assert('Matrix inverse identity verification (||A*A^-1 - I|| < 1e-5)', Boolean(matRes1.verified && (matRes1.residual ?? 1) < 1e-5), `Residual: ${matRes1.residual}`);

  // Singular matrix (det = 0)
  const singularMat = [
    [1, 2],
    [2, 4]
  ];
  const singularRes = mathEngine.analyzeMatrix(singularMat);
  assert('Singular matrix detection (invertible: false)', Boolean(singularRes.success && (singularRes.details as any)?.invertible === false));

  // Rectangular matrix dimension handling
  const rectMat = [
    [1, 2, 3],
    [4, 5, 6]
  ];
  const rectRes = mathEngine.analyzeMatrix(rectMat);
  assert('Rectangular matrix detection (not square for det/inv)', Boolean(rectRes.success && (rectRes.details as any)?.isSquare === false));

  // System of Linear Equations Ax = b
  // 2x + 3y = 13, 5x - y = 7 -> solution: x = 2, y = 3
  const sysA = [
    [2, 3],
    [5, -1]
  ];
  const sysB = [13, 7];
  const sysRes = mathEngine.solveLinearSystem(sysA, sysB);
  assert('Linear system solution (x=2, y=3)', Boolean(sysRes.success && sysRes.calculatedValue?.includes('x_1 = 2') && sysRes.calculatedValue?.includes('x_2 = 3')), sysRes.calculatedValue);
  assert('Linear system residual ||Ax - b|| < 1e-5', Boolean(sysRes.verified && (sysRes.residual ?? 1) < 1e-5), `Residual: ${sysRes.residual}`);

  // 5. Numerical Integration (Simpson quadrature)
  console.log('\n--- 5. Definite Integration ---');
  // integral of x^2 from 0 to 2 = [x^3/3]_0^2 = 8/3 = 2.666667
  const intRes = mathEngine.integrateNumerically('x^2', 0, 2, 200);
  assert('Definite integral of x^2 on [0, 2] == 8/3', Boolean(intRes.success && Math.abs(parseFloat(intRes.calculatedValue!) - 2.666667) < 1e-4), intRes.calculatedValue);

  // integral of sin(x) from 0 to pi = [-cos(x)]_0^pi = 1 - (-1) = 2
  const intTrig = mathEngine.integrateNumerically('sin(x)', 0, Math.PI, 300);
  assert('Definite integral of sin(x) on [0, pi] == 2.0', Boolean(intTrig.success && Math.abs(parseFloat(intTrig.calculatedValue!) - 2.0) < 1e-4), intTrig.calculatedValue);

  // 6. Descriptive Statistics (Sample vs Population)
  console.log('\n--- 6. Descriptive Statistics (Sample vs Population) ---');
  const dataset = [10, 20, 30, 40, 50];
  const statsRes = mathEngine.computeStatistics(dataset);
  assert('Mean of [10, 20, 30, 40, 50] == 30', Boolean(statsRes.success && (statsRes.details as any)?.mean === 30));
  assert('Median == 30', Boolean((statsRes.details as any)?.median === 30));
  // Population variance: (( -20^2 + -10^2 + 0 + 10^2 + 20^2 ) / 5 = (400+100+0+100+400)/5 = 1000/5 = 200
  assert('Population variance == 200', Boolean((statsRes.details as any)?.populationVariance === 200), String((statsRes.details as any)?.populationVariance));
  // Sample variance: 1000 / 4 = 250
  assert('Sample variance == 250', Boolean((statsRes.details as any)?.sampleVariance === 250), String((statsRes.details as any)?.sampleVariance));
  assert('Sample std > Population std distinction verified', Boolean((statsRes.details as any)?.sampleStd > (statsRes.details as any)?.populationStd));

  const emptyStats = mathEngine.computeStatistics([]);
  assert('Empty dataset handled gracefully', Boolean(!emptyStats.success && emptyStats.error?.includes('empty')));

  // 7. Symbolic Simplification
  console.log('\n--- 7. Symbolic Algebraic Simplification ---');
  const simpRes = mathEngine.simplifyAlgebra('2*x + 3*x + 4*x - 2 + 5');
  assert('Symbolic polynomial simplification: 2x+3x+4x-2+5 -> 9*x+3', Boolean(simpRes.success && simpRes.calculatedValue?.includes('9 * x + 3')), simpRes.calculatedValue);

  // 8. Auto-detect dispatcher
  console.log('\n--- 8. Auto-computation Dispatcher ---');
  const auto1 = mathEngine.autoComputeAndVerify('d/dx of x^2');
  assert('Auto-detect derivative query', Boolean(auto1 && auto1.success && auto1.calculatedValue === '2 * x'));

  const auto2 = mathEngine.autoComputeAndVerify('2x^2 - 7x + 3 = 0');
  assert('Auto-detect quadratic equation', Boolean(auto2 && auto2.success && auto2.type === 'roots'));

  const auto3 = mathEngine.autoComputeAndVerify('2x + 6 = 14');
  assert('Auto-detect linear equation (2x + 6 = 14 -> x = 4)', Boolean(auto3 && auto3.success && auto3.calculatedValue === 'x = 4'), auto3?.calculatedValue);

  // 9. Arabic Mathematical Curriculum & Normalization Tests
  console.log('\n--- 9. Arabic Mathematical Curriculum & Normalization ---');
  const arQuad = mathEngine.autoComputeAndVerify('٢س^٢ - ٧س + ٣ = ٠');
  assert('Arabic quadratic equation (٢س^٢ - ٧س + ٣ = ٠)', Boolean(arQuad && arQuad.success && arQuad.type === 'roots' && arQuad.verified), arQuad?.calculatedValue);

  const arDeriv = mathEngine.autoComputeAndVerify('مشتقة س^٣');
  assert('Arabic derivative query (مشتقة س^٣ -> 3 * x^2)', Boolean(arDeriv && arDeriv.success && arDeriv.calculatedValue?.replace(/\s+/g, '') === '3*x^2'), arDeriv?.calculatedValue);

  const arLinear = mathEngine.autoComputeAndVerify('٢س + ٦ = ١٤');
  assert('Arabic linear equation (٢س + ٦ = ١٤ -> x = 4)', Boolean(arLinear && arLinear.success && arLinear.calculatedValue === 'x = 4'), arLinear?.calculatedValue);

  const arFrac = mathEngine.autoComputeAndVerify('٣/٤ + ٥/٦');
  assert('Arabic fractions addition (٣/٤ + ٥/٦ == 19/12)', Boolean(arFrac && arFrac.success && arFrac.calculatedValue === '19/12'), arFrac?.calculatedValue);

  const arInt = mathEngine.autoComputeAndVerify('تكامل x^2 من 0 إلى 2');
  assert('Arabic definite integral (تكامل x^2 من 0 إلى 2)', Boolean(arInt && arInt.success && Math.abs(parseFloat(arInt.calculatedValue!) - 2.666667) < 1e-4), arInt?.calculatedValue);

  // 10. Formula & Mathematical Rule Localization
  console.log('\n--- 10. Formula & Mathematical Rule Localization (Arabic & English) ---');
  const matrixFormula = 'k · A + m · B = [k · aᵢⱼ + m · bᵢⱼ]';
  const arMatrixResult = localizeFormulaUsed(matrixFormula, 'Linear Algebra', 'ar');
  assert(
    'Matrix rule in Arabic includes «قاعدة الضرب القياسي والجمع للمصفوفات» and retains formula',
    Boolean(arMatrixResult && arMatrixResult.includes('قاعدة الضرب القياسي والجمع للمصفوفات') && arMatrixResult.includes('k · A + m · B = [k · aᵢⱼ + m · bᵢⱼ]')),
    arMatrixResult
  );

  const enMatrixResult = localizeFormulaUsed(matrixFormula, 'Linear Algebra', 'en');
  assert(
    'Matrix rule in English includes "Scalar Multiplication and Addition of Matrices" and retains formula',
    Boolean(enMatrixResult && enMatrixResult.includes('Scalar Multiplication and Addition of Matrices') && enMatrixResult.includes('k · A + m · B = [k · aᵢⱼ + m · bᵢⱼ]')),
    enMatrixResult
  );

  const arQuadResult = localizeFormulaUsed('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', 'Algebra', 'ar');
  assert(
    'Quadratic formula in Arabic includes «القانون العام للمعادلة التربيعية»',
    Boolean(arQuadResult && arQuadResult.includes('القانون العام للمعادلة التربيعية')),
    arQuadResult
  );

  const enQuadResult = localizeFormulaUsed('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', 'Algebra', 'en');
  assert(
    'Quadratic formula in English includes "Quadratic Formula"',
    Boolean(enQuadResult && enQuadResult.includes('Quadratic Formula')),
    enQuadResult
  );

  console.log(`\n======================================================`);
  console.log(`Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}


runTests();
