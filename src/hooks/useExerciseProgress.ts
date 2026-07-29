import { useCallback, useState } from 'react';

// ============================================================
// Per-user exercise progress, kept in localStorage:
//   - bookmarks: exercises flagged "làm lại sau"
//   - results:   last score per exercise
// ============================================================

export interface ExerciseResult {
  /** Số câu chấm đúng (trắc nghiệm + điền từ) */
  score: number;
  /** Tổng số câu được chấm tự động */
  gradedTotal: number;
  /** Số câu tự luận (không chấm) */
  essayCount: number;
  completedAt: string; // ISO date
}

const BOOKMARKS_KEY = 'exercise:bookmarks';
const RESULTS_KEY = 'exercise:results';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useExerciseProgress() {
  const [bookmarks, setBookmarks] = useState<string[]>(() => readJson(BOOKMARKS_KEY, []));
  const [results, setResults] = useState<Record<string, ExerciseResult>>(() => readJson(RESULTS_KEY, {}));

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id];
      window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const saveResult = useCallback((id: string, result: ExerciseResult) => {
    setResults(prev => {
      const next = { ...prev, [id]: result };
      window.localStorage.setItem(RESULTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { bookmarks, toggleBookmark, results, saveResult };
}
