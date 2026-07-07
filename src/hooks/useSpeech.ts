import { useCallback, useState } from 'react';
import { useSpeechSettings } from './useSpeechSettings';

/**
 * Thin wrapper around the Web Speech API (SpeechSynthesis) for pronouncing
 * English words/sounds using the voices installed on the user's device.
 * No network or audio assets required — works offline.
 *
 * The chosen voice / rate / pitch come from {@link useSpeechSettings}, so the
 * user's preferences are shared across every page and persist between visits.
 */
export function useSpeech(preferredLang = 'en-GB') {
  const { voices, voiceURI, rate, pitch, supported } = useSpeechSettings();
  const [speaking, setSpeaking] = useState<string | null>(null);

  /** Chosen voice, or the best English fallback when set to auto. */
  const resolveVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (voiceURI) {
      const chosen = voices.find(v => v.voiceURI === voiceURI);
      if (chosen) return chosen;
    }
    return (
      voices.find(v => v.lang === preferredLang) ||
      voices.find(v => v.lang.startsWith('en-GB')) ||
      voices.find(v => v.lang.startsWith('en-US')) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0] ||
      null
    );
  }, [voices, voiceURI, preferredLang]);

  /** Speak `text`. `key` lets the UI highlight which item is currently playing. */
  const speak = useCallback(
    (text: string, key?: string) => {
      if (!supported || !text) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = resolveVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = preferredLang;
      }
      utterance.rate = rate;
      utterance.pitch = pitch;

      const id = key ?? text;
      utterance.onstart = () => setSpeaking(id);
      utterance.onend = () => setSpeaking(prev => (prev === id ? null : prev));
      utterance.onerror = () => setSpeaking(prev => (prev === id ? null : prev));

      window.speechSynthesis.speak(utterance);
    },
    [supported, resolveVoice, rate, pitch, preferredLang]
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(null);
  }, [supported]);

  return { speak, cancel, speaking, supported };
}
