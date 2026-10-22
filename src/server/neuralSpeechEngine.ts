import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';

export interface SynthesizeSpeechOptions {
  text: string;
  language: 'ar' | 'en';
  voice?: string;
  stylePrompt?: string;
}

export interface SynthesizeSpeechResult {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  cached?: boolean;
  error?: string;
  fallbackRecommended?: boolean;
  quotaExhausted?: boolean;
}

// In-memory cache to prevent redundant synthesis and reduce latency
interface CacheEntry {
  audioBase64: string;
  mimeType: string;
  createdAt: number;
}

class NeuralSpeechEngine {
  private ai: GoogleGenAI;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly MAX_CACHE_ITEMS = 150;
  private activeRequests = 0;
  private readonly MAX_CONCURRENT_REQUESTS = 5;
  private quotaExhaustedUntil = 0;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  /**
   * Supported pre-built neural voices
   */
  public getAvailableVoices() {
    return [
      {
        id: 'Charon',
        nameAr: 'أستاذ وقور وهادئ (شارون - موصى به)',
        nameEn: 'Charon (Calm & Authoritative Professor - Recommended)',
        gender: 'male',
        accent: 'pan-arabic / neutral en',
      },
      {
        id: 'Kore',
        nameAr: 'أستاذة واضحة ومطمئنة (كوري)',
        nameEn: 'Kore (Clear & Gentle Academic)',
        gender: 'female',
        accent: 'pan-arabic / neutral en',
      },
      {
        id: 'Fenrir',
        nameAr: 'مذيع تعليمي متزن (فنرير)',
        nameEn: 'Fenrir (Balanced Educational Broadcaster)',
        gender: 'male',
        accent: 'pan-arabic / neutral en',
      },
      {
        id: 'Puck',
        nameAr: 'شرح تفاعلي مشرق (باك)',
        nameEn: 'Puck (Bright & Engaging Tutor)',
        gender: 'male',
        accent: 'pan-arabic / neutral en',
      },
      {
        id: 'Zephyr',
        nameAr: 'شرح صبور ورزين (زفير)',
        nameEn: 'Zephyr (Patient & Mild Instructor)',
        gender: 'female',
        accent: 'pan-arabic / neutral en',
      },
    ];
  }

  private computeCacheKey(text: string, language: string, voice: string): string {
    const norm = `${language}:${voice}:${text.trim()}`;
    return crypto.createHash('sha256').update(norm).digest('hex');
  }

  public isQuotaExhausted(): boolean {
    return Date.now() < this.quotaExhaustedUntil;
  }

  public async synthesize(options: SynthesizeSpeechOptions): Promise<SynthesizeSpeechResult> {
    const { text, language = 'ar', voice = 'Charon', stylePrompt } = options;

    if (!text || !text.trim()) {
      return {
        success: false,
        error: 'Text is required for speech synthesis.',
        fallbackRecommended: false,
      };
    }

    const cleanText = text.trim();
    const voiceToUse = ['Charon', 'Kore', 'Fenrir', 'Puck', 'Zephyr'].includes(voice) ? voice : 'Charon';

    // 1. Check in-memory cache first (cached responses bypass quota limits)
    const cacheKey = this.computeCacheKey(cleanText, language, voiceToUse);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        success: true,
        audioBase64: cached.audioBase64,
        mimeType: cached.mimeType,
        cached: true,
      };
    }

    // 2. Circuit breaker: if daily free-tier quota is currently exhausted, route immediately to local educator fallback
    if (Date.now() < this.quotaExhaustedUntil) {
      return {
        success: false,
        error: 'Free-tier neural daily quota limit active. Using intelligent local educator voice.',
        fallbackRecommended: true,
        quotaExhausted: true,
      };
    }

    // 3. Concurrency guard
    if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
      return {
        success: false,
        error: 'Speech engine is currently at maximum capacity. Falling back to local synthesizer.',
        fallbackRecommended: true,
      };
    }

    this.activeRequests++;

    try {
      const defaultStyle = language === 'ar'
        ? (stylePrompt || 'Calm, articulate, warm Arabic mathematics professor explaining clearly step-by-step with natural pacing and proper educational pauses.')
        : (stylePrompt || 'Calm, articulate, reassuring English mathematics professor explaining step-by-step with natural pacing and pedagogical clarity.');

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: defaultStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceToUse },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const mimeType = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';

      if (!base64Audio) {
        return {
          success: false,
          error: 'No audio data received from neural model.',
          fallbackRecommended: true,
        };
      }

      // Store in LRU cache
      if (this.cache.size >= this.MAX_CACHE_ITEMS) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }
      this.cache.set(cacheKey, {
        audioBase64: base64Audio,
        mimeType,
        createdAt: Date.now(),
      });

      return {
        success: true,
        audioBase64: base64Audio,
        mimeType,
        cached: false,
      };
    } catch (err: any) {
      const errMsg = String(err?.message || err || '');
      const isQuotaOrRateLimit =
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('Quota exceeded') ||
        errMsg.includes('GenerateRequestsPerDayPerProjectPerModel-FreeTier');

      if (isQuotaOrRateLimit) {
        // Parse retryDelay in seconds if present
        let cooldownMs = 60 * 60 * 1000; // default 1 hour cooldown
        const retryMatch = errMsg.match(/retryDelay["']?\s*:\s*["']?(\d+)s?/i) || errMsg.match(/retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i);
        if (retryMatch) {
          if (retryMatch[1] && !retryMatch[2]) {
            const secs = parseInt(retryMatch[1], 10);
            if (!isNaN(secs) && secs > 0) cooldownMs = secs * 1000;
          } else {
            const h = parseInt(retryMatch[1] || '0', 10);
            const m = parseInt(retryMatch[2] || '0', 10);
            const s = parseFloat(retryMatch[3] || '0');
            const totalMs = (h * 3600 + m * 60 + s) * 1000;
            if (totalMs > 0) cooldownMs = totalMs;
          }
        }
        this.quotaExhaustedUntil = Date.now() + cooldownMs;
        console.info(`[NeuralSpeechEngine] Free-tier daily quota limit active. Cooldown set until ${new Date(this.quotaExhaustedUntil).toISOString()}. Seamlessly routing requests to browser educator voice.`);

        return {
          success: false,
          error: 'Free-tier daily quota reached on neural model. Using smart browser voice fallback.',
          fallbackRecommended: true,
          quotaExhausted: true,
        };
      }

      console.info('[NeuralSpeechEngine] Speech synthesis info:', errMsg);
      return {
        success: false,
        error: errMsg || 'Neural speech synthesis unavailable.',
        fallbackRecommended: true,
        quotaExhausted: false,
      };
    } finally {
      this.activeRequests--;
    }
  }
}

export const neuralSpeechEngine = new NeuralSpeechEngine();
