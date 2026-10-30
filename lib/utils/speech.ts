/**
 * Natural Speech Synthesis Utility for Vayanai Virtual Interviewer (Ananya)
 * 
 * Prioritizes natural female Indian English voices (e.g. Microsoft Neerja Online,
 * Microsoft Heera, Google English India, Google Hindi), with graceful fallbacks to
 * natural English female voices with warm pitch and conversational cadence.
 * 
 * Incorporates robust Chromium workarounds:
 * 1. Module-level activeUtterance reference to prevent premature V8 garbage collection.
 * 2. Unpause/resume verification before and after speak() to counter Chromium's silent pause bug.
 * 3. Asynchronous dispatch after cancel() to prevent dropped utterances.
 * 4. Fresh voice resolution from window.speechSynthesis.getVoices().
 */

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  displayName: string;
  isIndian: boolean;
  isFemale: boolean;
}

const INDIAN_FEMALE_VOICE_NAMES = [
  'neerja',
  'heera',
  'swara',
  'veena',
  'ananya',
  'priya',
  'aditi',
  'kavya',
  'kalpana',
  'geeta',
  'shruti',
  'sunita',
  'radha',
  'leela',
  'vani',
  'sheetal',
  'alpa',
  'diya',
  'aarohi'
];

const KNOWN_MALE_NAMES = [
  'ravi',
  'david',
  'mark',
  'george',
  'richard',
  'james',
  'guy',
  'prabhat',
  'madhav',
  'stefan',
  'pavel',
  'male'
];

const GENERAL_FEMALE_VOICE_NAMES = [
  'jenny',
  'aria',
  'zira',
  'samantha',
  'victoria',
  'karen',
  'catherine',
  'female',
  'hazel',
  'susan',
  'linda',
  'serena'
];

// Persistent module-level reference preventing V8 garbage collection mid-speech
let activeUtterance: SpeechSynthesisUtterance | null = null;
let speechDispatchTimer: any = null;

/**
 * Retrieves all available browser voices, safely handling the async onvoiceschanged event.
 */
export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      resolve(voices);
      return;
    }

    // Wait for voices to load asynchronously
    const handleVoicesChanged = () => {
      const loaded = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = null;
      resolve(loaded);
    };

    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;

    // Timeout fallback after 1.2s if onvoiceschanged doesn't fire
    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 1200);
  });
}

/**
 * Categorizes and formats available browser voices for candidate selection.
 */
export function categorizeVoices(voices: SpeechSynthesisVoice[]): {
  indianVoices: Array<{ voice: SpeechSynthesisVoice; label: string }>;
  femaleVoices: Array<{ voice: SpeechSynthesisVoice; label: string }>;
  otherVoices: Array<{ voice: SpeechSynthesisVoice; label: string }>;
} {
  const indianVoices: Array<{ voice: SpeechSynthesisVoice; label: string }> = [];
  const femaleVoices: Array<{ voice: SpeechSynthesisVoice; label: string }> = [];
  const otherVoices: Array<{ voice: SpeechSynthesisVoice; label: string }> = [];

  voices.forEach((v) => {
    const nameLower = v.name.toLowerCase();
    const langLower = (v.lang || '').toLowerCase();
    const isIndianLang =
      langLower.includes('en-in') ||
      langLower.includes('en_in') ||
      langLower.includes('hi-in') ||
      langLower.includes('hi_in') ||
      nameLower.includes('india') ||
      nameLower.includes('hindi') ||
      nameLower.includes('हिन्दी');
    const isKnownMale = KNOWN_MALE_NAMES.some((m) => nameLower.includes(m));
    const isFemaleName =
      INDIAN_FEMALE_VOICE_NAMES.some((n) => nameLower.includes(n)) ||
      GENERAL_FEMALE_VOICE_NAMES.some((f) => nameLower.includes(f));

    const cleanName = v.name.replace(/Microsoft |Google |Online \(Natural\) - /g, '').trim();

    if (isIndianLang && !isKnownMale) {
      indianVoices.push({ voice: v, label: `🇮🇳 ${cleanName} (${v.lang})` });
    } else if (isFemaleName && !isKnownMale) {
      femaleVoices.push({ voice: v, label: `🎙️ ${cleanName} (Female)` });
    } else {
      otherVoices.push({ voice: v, label: `${cleanName} (${v.lang})` });
    }
  });

  return { indianVoices, femaleVoices, otherVoices };
}

/**
 * Selects the highest quality natural female Indian voice available on the system.
 */
export function pickBestFemaleIndianVoice(voices: SpeechSynthesisVoice[]): {
  voice: SpeechSynthesisVoice | null;
  label: string;
} {
  if (!voices || voices.length === 0) {
    return { voice: null, label: 'Default Browser Voice' };
  }

  // 1. Priority 1: Indian English voice with a verified female name
  const indianFemale = voices.find((v) => {
    const nameLower = v.name.toLowerCase();
    const langLower = (v.lang || '').toLowerCase();
    const isIndian =
      langLower.includes('en-in') ||
      langLower.includes('en_in') ||
      nameLower.includes('india');
    const isFemaleName = INDIAN_FEMALE_VOICE_NAMES.some((n) => nameLower.includes(n));
    const isMale = KNOWN_MALE_NAMES.some((m) => nameLower.includes(m));
    return isIndian && isFemaleName && !isMale;
  });

  if (indianFemale) {
    return {
      voice: indianFemale,
      label: `Ananya (${indianFemale.name.replace(/Microsoft |Google /g, '')})`
    };
  }

  // 2. Priority 2: Any en-IN or hi-IN voice that is NOT explicitly male
  const anyNonMaleIndian = voices.find((v) => {
    const nameLower = v.name.toLowerCase();
    const langLower = (v.lang || '').toLowerCase();
    const isIndian =
      langLower.includes('en-in') ||
      langLower.includes('en_in') ||
      langLower.includes('hi-in') ||
      langLower.includes('hi_in') ||
      nameLower.includes('india') ||
      nameLower.includes('hindi') ||
      nameLower.includes('हिन्दी');
    const isMale = KNOWN_MALE_NAMES.some((m) => nameLower.includes(m));
    return isIndian && !isMale;
  });

  if (anyNonMaleIndian) {
    return {
      voice: anyNonMaleIndian,
      label: `Ananya (${anyNonMaleIndian.name.replace(/Microsoft |Google /g, '')})`
    };
  }

  // 3. Priority 3: High-quality natural English female voice (e.g. Jenny, Aria, Samantha, Zira)
  const naturalFemale = voices.find((v) => {
    const nameLower = v.name.toLowerCase();
    const isFemaleName = GENERAL_FEMALE_VOICE_NAMES.some((f) => nameLower.includes(f));
    const isMale = KNOWN_MALE_NAMES.some((m) => nameLower.includes(m));
    return isFemaleName && !isMale;
  });

  if (naturalFemale) {
    return {
      voice: naturalFemale,
      label: `Ananya (${naturalFemale.name.replace(/Microsoft |Google /g, '')})`
    };
  }

  // 4. Fallback: Any voice that is not explicitly male
  const nonMale = voices.find((v) => {
    const nameLower = v.name.toLowerCase();
    return !KNOWN_MALE_NAMES.some((m) => nameLower.includes(m));
  });

  return {
    voice: nonMale || voices[0] || null,
    label: nonMale ? `Ananya (${nonMale.name})` : 'System Default Voice'
  };
}

/**
 * Speaks the given text using speech synthesis with female tuning.
 * Implements robust Chromium audio resilience against garbage collection and silent pause.
 */
export function speakWithAnanyaVoice(
  text: string,
  options?: {
    voice?: SpeechSynthesisVoice | null;
    voiceName?: string;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[Vayanai Speech] Speech synthesis not supported in this browser.');
    options?.onError?.(new Error('Speech synthesis not supported in this browser.'));
    return null;
  }

  // Cancel any existing pending timers
  if (speechDispatchTimer) {
    clearTimeout(speechDispatchTimer);
    speechDispatchTimer = null;
  }

  // Resume synthesis if paused
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (e) {
    // ignore
  }

  // Cancel active speech cleanly
  try {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {
    // ignore
  }

  const cleanText = text
    .replace(/[#*`_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) {
    options?.onEnd?.();
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  activeUtterance = utterance; // Retain module ref to prevent V8 GC

  // Conversational female cadence & warmth
  utterance.rate = options?.rate ?? 0.94;
  utterance.pitch = options?.pitch ?? 1.14;

  // Resolve voice afresh dynamically from window.speechSynthesis
  const currentVoices = window.speechSynthesis.getVoices();
  let matchedVoice: SpeechSynthesisVoice | null = null;

  if (options?.voiceName) {
    matchedVoice = currentVoices.find((v) => v.name === options.voiceName) || null;
  }
  if (!matchedVoice && options?.voice) {
    matchedVoice = currentVoices.find((v) => v.name === options.voice?.name) || options.voice;
  }
  if (!matchedVoice) {
    const best = pickBestFemaleIndianVoice(currentVoices);
    matchedVoice = best.voice;
  }

  if (matchedVoice) {
    utterance.voice = matchedVoice;
    if (matchedVoice.lang) {
      utterance.lang = matchedVoice.lang;
    }
  }

  utterance.onstart = () => {
    options?.onStart?.();
  };

  utterance.onend = () => {
    activeUtterance = null;
    options?.onEnd?.();
  };

  utterance.onerror = (err) => {
    console.warn('[Vayanai Speech] Utterance error:', err);
    activeUtterance = null;
    options?.onError?.(err);
  };

  // Chromium workaround: dispatch asynchronously after cancel() and ensure audio queue is unpaused
  speechDispatchTimer = setTimeout(() => {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
      // Secondary resume check for Chrome on Windows
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (err) {
      console.warn('[Vayanai Speech] Error during window.speechSynthesis.speak:', err);
      activeUtterance = null;
      options?.onError?.(err);
    }
  }, 45);

  return utterance;
}

/**
 * Stops any active speech.
 */
export function stopSpeech(): void {
  if (speechDispatchTimer) {
    clearTimeout(speechDispatchTimer);
    speechDispatchTimer = null;
  }
  activeUtterance = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      // ignore
    }
  }
}
