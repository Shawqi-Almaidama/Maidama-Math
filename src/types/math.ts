export type ExplanationStyle = 'quick' | 'step-by-step' | 'concept' | 'exam';

export type EducationLevel = 'beginner' | 'intermediate' | 'advanced' | 'school' | 'university';

export type Language = 'ar' | 'en';

export type VerificationStatus = 'verified' | 'numerical_approximation' | 'ai_reasoned' | 'unsupported';

export interface SolutionStep {
  stepNumber: number;
  title: string;
  latex?: string;
  explanation: string;
  subSteps?: string[];
}

export interface PlotPoint {
  x: number;
  y: number;
  label: string;
  type?: 'root' | 'extrema' | 'intercept' | 'critical';
}

export interface PlotConfig {
  functionLatex: string;
  functionExpr: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  pointsOfInterest?: PlotPoint[];
  curves?: Array<{
    expr: string;
    label: string;
    color?: string;
  }>;
}

export interface VerificationResult {
  status: VerificationStatus;
  method: string;
  explanation: string;
  residual?: number;
}

export interface MathSolution {
  id: string;
  timestamp: number;
  originalQuestion: string;
  interpretedProblem: string;
  interpretedLatex?: string;
  category: string;
  topic: string;
  style: ExplanationStyle;
  level: EducationLevel;
  language: Language;
  assumptions: string[];
  formulaUsed?: string;
  steps: SolutionStep[];
  finalAnswer: string;
  plainAnswer: string;
  verification: VerificationResult;
  alternativeMethod?: {
    title: string;
    summary: string;
    latex?: string;
  };
  plotConfig?: PlotConfig;
  didYouKnow?: string;
  ambiguities?: string[];
  isFavorite?: boolean;
  notes?: string;
  inputMethod: 'text' | 'voice' | 'camera' | 'file';
}

export interface MathCategory {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  status: 'supported' | 'partially_supported' | 'advanced';
  examples: Array<{
    titleEn: string;
    titleAr: string;
    query: string;
    queryAr?: string;
    queryEn?: string;
  }>;
}

export interface CalculationHistoryItem {
  id: string;
  timestamp: number;
  problem: string;
  finalAnswer: string;
  category: string;
  topic: string;
  verificationStatus: VerificationStatus;
  inputMethod: 'text' | 'voice' | 'camera' | 'file';
  isFavorite: boolean;
  notes?: string;
  solution: MathSolution;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  latex?: string;
  timestamp: number;
}
