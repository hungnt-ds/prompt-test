import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface SpeechSettings {
  /** All voices installed on the device (empty until the browser loads them). */
  voices: SpeechSynthesisVoice[];
  /** `voiceURI` of the chosen voice, or null to auto-pick by language. */
  voiceURI: string | null;
  setVoiceURI: (v: string | null) => void;
  rate: number;
  setRate: (n: number) => void;
  pitch: number;
  setPitch: (n: number) => void;
  reset: () => void;
  supported: boolean;
}

export const DEFAULT_RATE = 0.85;
export const DEFAULT_PITCH = 1;

const LS = {
  voice: 'speech:voiceURI',
  rate: 'speech:rate',
  pitch: 'speech:pitch',
} as const;

const Ctx = createContext<SpeechSettings | null>(null);

function readNumber(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function SpeechSettingsProvider({ children }: { children: ReactNode }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURIState] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(LS.voice)
  );
  const [rate, setRateState] = useState<number>(() => readNumber(LS.rate, DEFAULT_RATE));
  const [pitch, setPitchState] = useState<number>(() => readNumber(LS.pitch, DEFAULT_PITCH));

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [supported]);

  const value = useMemo<SpeechSettings>(() => {
    const setVoiceURI = (v: string | null) => {
      setVoiceURIState(v);
      if (v) window.localStorage.setItem(LS.voice, v);
      else window.localStorage.removeItem(LS.voice);
    };
    const setRate = (n: number) => {
      setRateState(n);
      window.localStorage.setItem(LS.rate, String(n));
    };
    const setPitch = (n: number) => {
      setPitchState(n);
      window.localStorage.setItem(LS.pitch, String(n));
    };
    const reset = () => {
      setVoiceURI(null);
      setRate(DEFAULT_RATE);
      setPitch(DEFAULT_PITCH);
    };
    return { voices, voiceURI, setVoiceURI, rate, setRate, pitch, setPitch, reset, supported };
  }, [voices, voiceURI, rate, pitch, supported]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpeechSettings(): SpeechSettings {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSpeechSettings must be used within a SpeechSettingsProvider');
  return ctx;
}
