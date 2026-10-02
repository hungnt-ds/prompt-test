import type { DictationLesson, DictationSegment, LessonProgress, SegmentStats } from '@/types/dictation';

// ============================================================
// Tạo bài nghe-chép từ link YouTube + phụ đề.
//
// Phụ đề do người dùng dán / tải file .srt .vtt: trình duyệt bị CORS
// chặn, còn server (Cloudflare Workers) thì bị YouTube chặn vì là IP
// datacenter. Ở đây lấy video id, tiêu đề (qua noembed, có CORS) và
// lưu bài + tiến độ vào localStorage — bản trên máy; đồng bộ với
// vocab-api nằm ở dictationSync.ts.
// ============================================================

const LS = {
  lessons: 'dictation:lessons',
  progress: 'dictation:progress',
  /** Bản cũ lưu mốc thời gian riêng — giờ nằm trong LessonProgress.timing */
  legacyTiming: 'dictation:timing',
  /** Bài đã xóa trên máy nhưng chưa xóa được trên server (mất mạng) */
  pendingDeletes: 'dictation:pendingDeletes',
} as const;

const ID_RE = /^[\w-]{11}$/;

/** Lấy video id từ mọi dạng link YouTube (watch, youtu.be, shorts, embed, live) hoặc id trần. */
export function extractVideoId(input: string): string | null {
  const raw = input.trim();
  if (ID_RE.test(raw)) return raw;
  let url: URL;
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v');
    if (!id) {
      const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
      id = m?.[1] ?? null;
    }
  }
  return id && ID_RE.test(id) ? id : null;
}

/** Tiêu đề video qua noembed.com (hỗ trợ CORS). Trả null nếu lỗi — không chặn việc tạo bài. */
export async function fetchVideoTitle(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; error?: string };
    return data.error ? null : (data.title ?? null);
  } catch {
    return null;
  }
}

export function readSubtitleFile(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('File phụ đề quá lớn (tối đa 5MB).'));
  return file.text();
}

export interface CreateLessonInput {
  url: string;
  /** Đoạn đã parse (và gộp câu nếu muốn) từ phụ đề người dùng đưa vào */
  segments: DictationSegment[];
  title?: string;
}

export async function createLesson(input: CreateLessonInput): Promise<DictationLesson> {
  const videoId = extractVideoId(input.url);
  if (!videoId) throw new Error('Link YouTube không hợp lệ.');
  const { segments } = input;
  if (segments.length === 0) throw new Error('Bài chưa có câu nào.');
  const title = input.title?.trim() || (await fetchVideoTitle(videoId)) || `Video ${videoId}`;
  return {
    // id do client sinh: tạo offline được, server giữ nguyên id này
    id: `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    title,
    videoId,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    duration: Math.ceil(segments[segments.length - 1].end),
    segments,
  };
}

// ---------- Lưu trữ ----------

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Hết quota / private mode: bỏ qua, bài vẫn dùng được trong phiên này
  }
}

function isValidLesson(l: unknown): l is DictationLesson {
  const x = l as DictationLesson;
  return !!x && typeof x.id === 'string' && typeof x.videoId === 'string' && Array.isArray(x.segments);
}

export function loadCustomLessons(): DictationLesson[] {
  const list = readJSON<unknown[]>(LS.lessons, []);
  return Array.isArray(list) ? list.filter(isValidLesson) : [];
}

export function saveCustomLessons(lessons: DictationLesson[]) {
  writeJSON(LS.lessons, lessons);
}

/** Tiến độ: lessonId (custom-… / sample-…) → tiến độ của bài. */
export type DictationProgress = Record<string, LessonProgress>;

type LegacySegment = SegmentStats & { wrongWords?: Record<string, number> };

function isStats(v: unknown): v is LegacySegment {
  return !!v && typeof v === 'object' && typeof (v as SegmentStats).best === 'number';
}

/**
 * Đọc tiến độ, tự chuyển từ các định dạng cũ:
 *  - v1: lessonId → segmentId → điểm cao nhất (number)
 *  - v2: lessonId → segmentId → SegmentStats kèm wrongWords từng câu
 *  - mốc thời gian lưu riêng ở key `dictation:timing`
 */
export function loadProgress(): DictationProgress {
  const raw = readJSON<Record<string, unknown>>(LS.progress, {});
  const legacyTiming = readJSON<Record<string, LessonProgress['timing']>>(LS.legacyTiming, {});
  const out: DictationProgress = {};
  for (const [lessonId, value] of Object.entries(raw ?? {})) {
    if (!value || typeof value !== 'object') continue;
    const v = value as Partial<LessonProgress> & Record<string, unknown>;
    if (v.segments && typeof v.segments === 'object' && typeof v.updatedAt === 'number') {
      out[lessonId] = { segments: v.segments, wrongWords: v.wrongWords ?? {}, timing: v.timing ?? {}, updatedAt: v.updatedAt };
      continue;
    }
    const p: LessonProgress = { segments: {}, wrongWords: {}, timing: legacyTiming[lessonId] ?? {}, updatedAt: 1 };
    for (const [segId, st] of Object.entries(v)) {
      if (typeof st === 'number') {
        p.segments[segId] = { best: st, attempts: 1, firstScore: st, roundScore: st, revealed: false };
      } else if (isStats(st)) {
        const { best, attempts, firstScore, roundScore, revealed } = st;
        p.segments[segId] = { best, attempts, firstScore, roundScore, revealed };
        for (const [w, n] of Object.entries(st.wrongWords ?? {})) p.wrongWords[w] = (p.wrongWords[w] ?? 0) + n;
      }
    }
    out[lessonId] = p;
  }
  // Mốc thời gian của bài chưa từng có điểm
  for (const [lessonId, timing] of Object.entries(legacyTiming)) {
    if (!out[lessonId]) out[lessonId] = { segments: {}, wrongWords: {}, timing, updatedAt: 1 };
  }
  return out;
}

export function saveProgress(progress: DictationProgress) {
  writeJSON(LS.progress, progress);
  try {
    window.localStorage.removeItem(LS.legacyTiming);
  } catch {
    // ignore
  }
}

export function loadPendingDeletes(): string[] {
  const list = readJSON<unknown>(LS.pendingDeletes, []);
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
}

export function savePendingDeletes(ids: string[]) {
  writeJSON(LS.pendingDeletes, ids);
}

/** Dời đầu/cuối một đoạn, giữ tối thiểu 0.3s. */
export function shiftSegment(seg: DictationSegment, deltaStart: number, deltaEnd: number): DictationSegment {
  const start = Math.max(0, +(seg.start + deltaStart).toFixed(1));
  const end = Math.max(start + 0.3, +(seg.end + deltaEnd).toFixed(1));
  return { ...seg, start, end };
}
