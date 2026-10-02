import type { DictationSegment } from '@/types/dictation';

// ============================================================
// Parse phụ đề thành các đoạn nghe-chép.
// Hỗ trợ: SRT, WebVTT (kể cả auto-caption của YouTube có dòng lặp),
// và bản "Hiện bản chép lời" copy từ YouTube ("0:01 text" hoặc
// timestamp và text trên hai dòng riêng).
// ============================================================

export type SubtitleFormat = 'srt' | 'vtt' | 'youtube';

export interface ParsedSubtitles {
  format: SubtitleFormat;
  segments: DictationSegment[];
}

export interface Cue {
  start: number;
  end: number;
  text: string;
}

const ARROW_LINE = /^\s*((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})/;
/** "0:01", "12:34", "1:02:03" — đứng riêng hoặc đầu dòng. */
const YT_TIME = /^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\s+(.*))?$/;

/** "01:02:03,456" | "02:03.456" | "1:02:03" → giây. */
export function parseTimestamp(raw: string): number {
  const parts = raw.trim().replace(',', '.').split(':');
  let seconds = 0;
  for (const p of parts) seconds = seconds * 60 + Number(p);
  return Number.isFinite(seconds) ? seconds : NaN;
}

/** 75.4 → "1:15" (dùng hiển thị). */
export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/** Bỏ tag (<c>, <i>, <00:00:01.000>), entity, chú thích [Music] / (applause), dấu ">>" đổi người nói. */
export function cleanCueText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, m => ENTITIES[m] ?? m)
    .replace(/\[[^\]]*\]|\([^)]*\)|♪/g, ' ')
    .replace(/^\s*(>>|-)\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectFormat(raw: string): SubtitleFormat | null {
  if (/^WEBVTT/.test(raw.trimStart())) return 'vtt'; // trimStart() bỏ cả BOM
  if (/-->/.test(raw)) return /\d{2}:\d{2}:\d{2},\d{3}/.test(raw) ? 'srt' : 'vtt';
  if (raw.split(/\r?\n/).some(l => YT_TIME.test(l))) return 'youtube';
  return null;
}

/** SRT và VTT cùng cấu trúc block "time --> time" + các dòng text. */
function parseArrowCues(raw: string): Cue[] {
  const cues: Cue[] = [];
  const blocks = raw.replace(/\r/g, '').split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n');
    const timeIdx = lines.findIndex(l => ARROW_LINE.test(l));
    if (timeIdx < 0) continue;
    const m = lines[timeIdx].match(ARROW_LINE)!;
    const start = parseTimestamp(m[1]);
    const end = parseTimestamp(m[2]);
    const textLines = lines.slice(timeIdx + 1).filter(l => l.trim());
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    cues.push({ start, end, text: textLines.join('\n') });
  }
  return dedupeRollingCues(cues);
}

/**
 * Auto-caption của YouTube dạng "cuộn": mỗi cue lặp lại dòng cuối của cue trước,
 * và có cue chớp nhoáng (~10ms) chỉ chứa dòng cũ. Giữ lại phần text mới.
 */
function dedupeRollingCues(cues: Cue[]): Cue[] {
  const out: Cue[] = [];
  let prevLines: string[] = [];
  for (const cue of cues) {
    const lines = cue.text.split('\n').map(cleanCueText).filter(Boolean);
    const fresh = lines.filter(l => !prevLines.includes(l));
    if (lines.length) prevLines = lines;
    const text = fresh.join(' ').trim();
    if (!text || cue.end - cue.start < 0.05) continue;
    out.push({ start: cue.start, end: cue.end, text });
  }
  return out;
}

/** Bản chép lời copy từ YouTube: end của mỗi dòng = start của dòng kế. */
function parseYouTubeTranscript(raw: string): Cue[] {
  const cues: Cue[] = [];
  let current: { start: number; lines: string[] } | null = null;
  const flush = () => {
    if (current) {
      const text = cleanCueText(current.lines.join(' '));
      if (text) cues.push({ start: current.start, end: NaN, text });
    }
  };
  for (const line of raw.replace(/\r/g, '').split('\n')) {
    const m = line.match(YT_TIME);
    if (m) {
      flush();
      current = { start: parseTimestamp(m[1]), lines: m[2] ? [m[2]] : [] };
    } else if (current && line.trim()) {
      current.lines.push(line.trim());
    }
  }
  flush();
  for (let i = 0; i < cues.length; i++) {
    const next = cues[i + 1];
    // Không có mốc kết thúc → ước lượng ~0.6s/từ (+2s đệm); bị chặn bởi dòng kế,
    // để đoạn im lặng/nhạc dài giữa hai dòng không bị tính vào câu trước
    const estimated = cues[i].start + Math.max(3, cues[i].text.split(" ").length * 0.6 + 2);
    cues[i].end = next ? Math.min(next.start, estimated) : estimated;
  }
  return cues;
}

/**
 * Gộp các cue ngắn thành câu: nối cho tới khi gặp dấu kết câu (. ? !)
 * hoặc đoạn đã dài quá maxDuration giây. Phụ đề YouTube thường cắt
 * giữa câu, nghe-chép theo câu dễ hơn nhiều.
 */
export function mergeIntoSentences(segments: DictationSegment[], maxDuration = 10): DictationSegment[] {
  const out: DictationSegment[] = [];
  let buf: DictationSegment | null = null;
  for (const seg of segments) {
    let cur: DictationSegment;
    if (!buf) {
      cur = { ...seg };
    } else if (seg.end - buf.start > maxDuration) {
      out.push(buf);
      cur = { ...seg };
    } else {
      cur = { ...buf, end: seg.end, text: `${buf.text} ${seg.text}` };
    }
    if (/[.?!…]["')\]]?$/.test(cur.text)) {
      out.push(cur);
      buf = null;
    } else {
      buf = cur;
    }
  }
  if (buf) out.push(buf);
  return out.map((s, i) => ({ ...s, id: `seg-${i + 1}` }));
}

/** Parse phụ đề thô. Ném Error (thông báo tiếng Việt) nếu không đọc được. */
export function parseSubtitles(raw: string): ParsedSubtitles {
  const format = detectFormat(raw);
  if (!format) {
    throw new Error(
      'Không nhận ra định dạng phụ đề. Hỗ trợ file .srt, .vtt hoặc bản chép lời YouTube có mốc thời gian (vd "0:01 Hello").'
    );
  }
  const cues = format === 'youtube' ? parseYouTubeTranscript(raw) : parseArrowCues(raw);
  return { format, segments: cuesToSegments(cues) };
}

/**
 * Cue (có mốc thời gian) → đoạn nghe-chép: làm sạch text, bỏ cue rỗng/sai giờ, sắp theo thời gian.
 * Dùng chung cho phụ đề dán tay và phụ đề backend lấy từ YouTube.
 */
export function cuesToSegments(cues: Cue[]): DictationSegment[] {
  const segments = cues
    .map(c => ({ ...c, text: cleanCueText(c.text) }))
    .filter(c => c.text && Number.isFinite(c.start) && c.end > c.start)
    .sort((a, b) => a.start - b.start)
    .map((c, i) => ({ id: `seg-${i + 1}`, start: c.start, end: c.end, text: c.text }));
  if (segments.length === 0) throw new Error('Phụ đề không có câu nào có mốc thời gian hợp lệ.');
  return segments;
}
