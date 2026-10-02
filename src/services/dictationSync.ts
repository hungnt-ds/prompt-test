import type { DictationLesson, LessonProgress } from '@/types/dictation';
import {
  ApiError,
  deleteDictationLesson,
  listDictationLessons,
  listDictationProgress,
  putDictationLesson,
  putDictationProgress,
  type DictationLessonDto,
  type DictationProgressDto,
} from '@/services/vocabApi';
import type { DictationProgress } from '@/services/youtubeTranscript';

// ============================================================
// Đồng bộ bài nghe-chép + tiến độ giữa localStorage và vocab-api.
//
// localStorage luôn là nơi app đọc/ghi trước (dùng được khi offline);
// server là bản chung giữa các thiết bị:
//  - Bài: server là chuẩn. Bài trên máy có `syncedAt` mà server không
//    còn → đã bị xóa ở thiết bị khác → bỏ. Chưa có `syncedAt` → bài mới
//    tạo trên máy → đẩy lên.
//  - Tiến độ: mỗi bài một bản, bản có updatedAt mới hơn thắng.
//  - Xóa bài lúc mất mạng: nhớ id vào pendingDeletes, lần sau xóa tiếp.
// ============================================================

export interface SyncState {
  lessons: DictationLesson[];
  progress: DictationProgress;
  pendingDeletes: string[];
}

const isCustom = (key: string) => key.startsWith('custom-');

export function lessonFromDto(dto: DictationLessonDto, syncedAt: number): DictationLesson {
  const segments = dto.segments ?? [];
  return {
    id: dto.id,
    title: dto.title,
    videoId: dto.videoId,
    sourceUrl: `https://www.youtube.com/watch?v=${dto.videoId}`,
    duration: segments.length ? Math.ceil(segments[segments.length - 1].end) : undefined,
    segments,
    syncedAt,
  };
}

export function progressFromDto(dto: DictationProgressDto): LessonProgress {
  return {
    segments: dto.segments,
    wrongWords: dto.wrongWords,
    timing: dto.timing,
    updatedAt: Date.parse(dto.updatedAt),
  };
}

/** Đẩy một bài lên server. Trả về bài kèm syncedAt mới. */
export async function pushLesson(lesson: DictationLesson): Promise<DictationLesson> {
  await putDictationLesson(lesson.id, {
    videoId: lesson.videoId,
    title: lesson.title,
    segments: lesson.segments.map(({ start, end, text, translation }) => ({ start, end, text, translation })),
  });
  return { ...lesson, syncedAt: Date.now() };
}

/**
 * Đẩy tiến độ một bài. Trả về bản cần giữ trên máy:
 * bản vừa gửi, hoặc bản mới hơn đang có trên server, hoặc null nếu bài đã bị xóa trên server.
 */
export async function pushProgress(lessonKey: string, p: LessonProgress): Promise<LessonProgress | null> {
  try {
    const res = await putDictationProgress(lessonKey, {
      segments: p.segments,
      wrongWords: p.wrongWords,
      timing: p.timing,
      updatedAt: new Date(p.updatedAt || Date.now()).toISOString(),
    });
    return res.applied ? p : progressFromDto(res.progress);
  } catch (e) {
    if (e instanceof ApiError && e.errorCode === 'lesson_not_found') return null;
    throw e;
  }
}

/** Xóa bài trên server; 404 (đã xóa rồi) coi như xong. */
export async function removeLesson(id: string): Promise<void> {
  try {
    await deleteDictationLesson(id);
  } catch (e) {
    if (e instanceof ApiError && e.code === 404) return;
    throw e;
  }
}

/** Đồng bộ toàn bộ (gọi khi mở trang). Ném lỗi nếu không gọi được API — app vẫn chạy bằng dữ liệu trên máy. */
export async function syncAll(local: SyncState): Promise<SyncState> {
  // 1. Xóa nốt các bài đã xóa lúc offline
  for (const id of local.pendingDeletes) await removeLesson(id);

  // 2. Bài
  const now = Date.now();
  const serverLessons = await listDictationLessons(true);
  const serverIds = new Set(serverLessons.map(l => l.id));
  const uploaded: DictationLesson[] = [];
  for (const l of local.lessons) {
    if (serverIds.has(l.id)) continue;
    if (l.syncedAt) continue; // đã từng lên server mà giờ không còn → bị xóa ở thiết bị khác
    uploaded.push(await pushLesson(l));
  }
  // Server trả mới tạo trước; bài vừa đẩy lên là mới nhất
  const lessons = [...uploaded, ...serverLessons.map(dto => lessonFromDto(dto, now))];
  const lessonIds = new Set(lessons.map(l => l.id));

  // 3. Tiến độ — bản mới hơn thắng
  const serverProgress = new Map((await listDictationProgress()).map(d => [d.lessonKey, progressFromDto(d)]));
  const progress: DictationProgress = {};
  const keys = new Set([...Object.keys(local.progress), ...serverProgress.keys()]);
  for (const key of keys) {
    if (isCustom(key) && !lessonIds.has(key)) continue; // tiến độ của bài đã xóa
    const mine = local.progress[key];
    const theirs = serverProgress.get(key);
    if (theirs && (!mine || theirs.updatedAt >= mine.updatedAt)) {
      progress[key] = theirs;
    } else if (mine) {
      const kept = await pushProgress(key, mine);
      if (kept) progress[key] = kept;
    }
  }

  return { lessons, progress, pendingDeletes: [] };
}

/** Lỗi đồng bộ → câu ngắn cho thanh trạng thái. */
export function describeSyncError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 0) return 'Không kết nối được server — đang lưu trên máy';
    if (e.code === 401) return 'Sai API key — đang lưu trên máy';
    return `Lỗi đồng bộ: ${e.message}`;
  }
  return `Lỗi đồng bộ: ${(e as Error).message}`;
}
