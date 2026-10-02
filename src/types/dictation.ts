export interface DictationSegment {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;  // English text
  translation?: string; // Optional Vietnamese translation
}

export interface DictationLesson {
  id: string;
  title: string;
  videoId: string;
  sourceUrl: string;
  duration?: number;
  segments: DictationSegment[];
  /** Lần cuối khớp với server (ms). Không có = chưa lên server (tạo lúc offline / chưa nhập API). */
  syncedAt?: number;
}

export interface WordDiff {
  word: string;
  status: 'correct' | 'incorrect' | 'missing' | 'extra';
  expected?: string;
}

/** Thống kê một câu, lưu lại giữa các lần học. */
export interface SegmentStats {
  best: number; // điểm cao nhất từng đạt (0-100)
  attempts: number; // tổng số lần bấm kiểm tra
  firstScore: number | null; // điểm lần kiểm tra đầu tiên từ trước tới nay
  /** Điểm lần kiểm tra ĐẦU của lượt học gần nhất (mỗi lần mở bài là một lượt) — dùng để xác định câu sai */
  roundScore: number | null;
  revealed: boolean; // lượt gần nhất có bấm "Xem đáp án"
}

/** Tiến độ một bài — đúng shape của vocab-api /api/dictation/progress. */
export interface LessonProgress {
  segments: Record<string, SegmentStats>;
  /** Từ hay nghe sai: từ đúng (chữ thường) → số lần sai (chỉ tính lần kiểm tra đầu mỗi lượt) */
  wrongWords: Record<string, number>;
  /** Mốc thời gian chỉnh tay (phụ đề lệch tiếng): segmentId → {start, end} */
  timing: Record<string, { start: number; end: number }>;
  /** Lần sửa cuối (ms) — bản mới hơn thắng khi đồng bộ */
  updatedAt: number;
}

export interface SegmentEvaluation {
  accuracy: number; // 0 - 100%
  totalExpectedWords: number;
  correctWords: number;
  diff: WordDiff[];
  isPassed: boolean; // >= 80% or 100%
}
