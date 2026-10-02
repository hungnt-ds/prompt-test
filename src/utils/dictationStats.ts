import type { DictationSegment, LessonProgress, SegmentEvaluation, SegmentStats } from '@/types/dictation';
import { PASS_THRESHOLD } from '@/utils/dictationDiff';

// ============================================================
// Ghi nhận kết quả nghe-chép. Mỗi lần mở bài là một "lượt";
// câu bị tính là SAI nếu ở lượt gần nhất, lần kiểm tra đầu tiên
// dưới ngưỡng đạt, hoặc đã phải xem đáp án. Lượt sau làm đúng
// ngay lần đầu thì câu đó hết bị tính sai.
// ============================================================

/** Giữ bấy nhiêu "từ hay sai" mỗi bài — khớp giới hạn của server */
export const WRONG_WORDS_MAX = 50;

const EMPTY_STATS: SegmentStats = { best: 0, attempts: 0, firstScore: null, roundScore: null, revealed: false };

export function emptyProgress(): LessonProgress {
  return { segments: {}, wrongWords: {}, timing: {}, updatedAt: 0 };
}

/** Từ hiển thị → khóa thống kê: chữ thường, bỏ dấu câu hai đầu ("Elephants." → "elephants"). */
function wordKey(word: string): string {
  return word
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .slice(0, 40);
}

export function trimWrongWords(words: Record<string, number>, max = WRONG_WORDS_MAX): Record<string, number> {
  return Object.fromEntries(
    Object.entries(words)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, max)
  );
}

/**
 * Một lần bấm "Kiểm tra".
 * @param firstInRound lần kiểm tra đầu tiên của câu này trong lượt học hiện tại
 * @param revealedInRound đã xem đáp án trong lượt này (gõ lại theo đáp án thì không tính điểm)
 */
export function applyCheck(
  p: LessonProgress,
  segmentId: string,
  ev: SegmentEvaluation,
  firstInRound: boolean,
  revealedInRound: boolean
): LessonProgress {
  const s = p.segments[segmentId] ?? EMPTY_STATS;
  const next: SegmentStats = { ...s, attempts: s.attempts + 1 };
  let wrongWords = p.wrongWords;
  if (!revealedInRound) {
    next.best = Math.max(s.best, ev.accuracy);
    if (s.firstScore === null) next.firstScore = ev.accuracy;
    if (firstInRound) {
      next.roundScore = ev.accuracy;
      next.revealed = false;
      wrongWords = { ...wrongWords };
      for (const d of ev.diff) {
        if ((d.status === 'incorrect' || d.status === 'missing') && d.expected) {
          const k = wordKey(d.expected);
          if (k) wrongWords[k] = (wrongWords[k] ?? 0) + 1;
        }
      }
      wrongWords = trimWrongWords(wrongWords);
    }
  }
  return { ...p, segments: { ...p.segments, [segmentId]: next }, wrongWords, updatedAt: Date.now() };
}

/** Bấm "Xem đáp án": lượt này câu đó tính là sai. */
export function applyReveal(p: LessonProgress, segmentId: string): LessonProgress {
  const s = p.segments[segmentId] ?? EMPTY_STATS;
  const next = { ...s, revealed: true, roundScore: s.roundScore === null ? 0 : s.roundScore };
  return { ...p, segments: { ...p.segments, [segmentId]: next }, updatedAt: Date.now() };
}

export function applyTiming(p: LessonProgress, seg: DictationSegment): LessonProgress {
  return { ...p, timing: { ...p.timing, [seg.id]: { start: seg.start, end: seg.end } }, updatedAt: Date.now() };
}

/** "Xóa điểm" — vẫn giữ mốc thời gian đã chỉnh. updatedAt mới để thiết bị khác cũng xóa theo. */
export function clearScores(p: LessonProgress): LessonProgress {
  return { ...p, segments: {}, wrongWords: {}, updatedAt: Date.now() };
}

export type SegmentStatus = 'new' | 'correct' | 'wrong';

export function segmentStatus(s: SegmentStats | undefined): SegmentStatus {
  if (!s || s.roundScore === null) return 'new';
  return s.revealed || s.roundScore < PASS_THRESHOLD ? 'wrong' : 'correct';
}

export interface LessonSummary {
  total: number;
  /** Số câu đã làm (có điểm) */
  attempted: number;
  /** Đúng ngay lần đầu ở lượt gần nhất, không xem đáp án */
  correct: number;
  /** Câu cần ôn: sai lần đầu hoặc đã xem đáp án */
  wrong: number;
  /** Điểm trung bình lần đầu (xem đáp án = 0), trên các câu đã làm */
  avgScore: number | null;
  totalAttempts: number;
  /** Từ hay sai nhất, nhiều lần trước */
  topWrongWords: { word: string; count: number }[];
}

export function summarizeLesson(
  segments: DictationSegment[],
  progress: LessonProgress | undefined,
  topWords = 12
): LessonSummary {
  let attempted = 0;
  let correct = 0;
  let wrong = 0;
  let scoreSum = 0;
  let totalAttempts = 0;
  for (const seg of segments) {
    const s = progress?.segments[seg.id];
    if (!s) continue;
    totalAttempts += s.attempts;
    const status = segmentStatus(s);
    if (status === 'new') continue;
    attempted++;
    scoreSum += s.revealed ? 0 : (s.roundScore ?? 0);
    if (status === 'correct') correct++;
    else wrong++;
  }
  return {
    total: segments.length,
    attempted,
    correct,
    wrong,
    avgScore: attempted ? Math.round(scoreSum / attempted) : null,
    totalAttempts,
    topWrongWords: Object.entries(trimWrongWords(progress?.wrongWords ?? {}, topWords)).map(([word, count]) => ({
      word,
      count,
    })),
  };
}
