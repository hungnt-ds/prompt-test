import type { SegmentEvaluation, WordDiff } from '@/types/dictation';

// ============================================================
// So sánh câu người dùng gõ với câu gốc, theo từng từ.
// Không phân biệt hoa/thường, dấu câu, kiểu dấu nháy (’ vs ');
// "well-known" = "well known". Căn hai dãy từ bằng LCS, cặp
// "thiếu + thừa" liền nhau được gộp thành một từ "sai".
// ============================================================

export const PASS_THRESHOLD = 80;

/** Tách câu thành các từ hiển thị (giữ dấu câu để hiện lại cho đẹp). */
export function tokenize(text: string): string[] {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[-–—/]+/g, ' ')
    .split(/\s+/)
    .filter(w => normalizeWord(w) !== '');
}

/** Dạng so sánh của một từ: chữ thường, chỉ giữ chữ + số, bỏ dấu nháy. */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[‘’ʼ']/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

type Op = { kind: 'match'; exp: string; got: string } | { kind: 'del'; exp: string } | { kind: 'ins'; got: string };

function align(expected: string[], typed: string[]): Op[] {
  const a = expected.map(normalizeWord);
  const b = typed.map(normalizeWord);
  const n = a.length;
  const m = b.length;
  // dp[i][j] = LCS của a[i..] và b[j..]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      ops.push({ kind: 'match', exp: expected[i++], got: typed[j++] });
    } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) {
      ops.push({ kind: 'ins', got: typed[j++] });
    } else {
      ops.push({ kind: 'del', exp: expected[i++] });
    }
  }
  return ops;
}

/** Gộp các cụm del/ins nằm giữa hai từ đúng: cặp theo thứ tự thành "incorrect", dư ra là missing/extra. */
function toWordDiff(ops: Op[]): WordDiff[] {
  const out: WordDiff[] = [];
  let dels: string[] = [];
  let ins: string[] = [];
  const flush = () => {
    const pairs = Math.min(dels.length, ins.length);
    for (let k = 0; k < pairs; k++) out.push({ word: ins[k], status: 'incorrect', expected: dels[k] });
    for (let k = pairs; k < dels.length; k++) out.push({ word: dels[k], status: 'missing', expected: dels[k] });
    for (let k = pairs; k < ins.length; k++) out.push({ word: ins[k], status: 'extra' });
    dels = [];
    ins = [];
  };
  for (const op of ops) {
    if (op.kind === 'match') {
      flush();
      out.push({ word: op.exp, status: 'correct' });
    } else if (op.kind === 'del') {
      dels.push(op.exp);
    } else {
      ins.push(op.got);
    }
  }
  flush();
  return out;
}

export function evaluateSegment(expectedText: string, typedText: string): SegmentEvaluation {
  const expected = tokenize(expectedText);
  const diff = toWordDiff(align(expected, tokenize(typedText)));
  const correctWords = diff.filter(d => d.status === 'correct').length;
  const extra = diff.filter(d => d.status === 'extra').length;
  // Từ thừa cũng bị trừ điểm, để không "đoán bừa cho đủ chữ"
  const denom = expected.length + extra;
  const accuracy = denom === 0 ? 100 : Math.round((correctWords / denom) * 100);
  return {
    accuracy,
    totalExpectedWords: expected.length,
    correctWords,
    diff,
    isPassed: accuracy >= PASS_THRESHOLD,
  };
}

/**
 * Gợi ý: giữ nguyên những từ người dùng đã đúng, các từ còn lại
 * chỉ lộ chữ cái đầu ("I a_ h______ to be…"). level 2 lộ một nửa từ.
 */
export function buildHint(expectedText: string, typedText: string, level: 1 | 2 = 1): string {
  const typedSet = new Set(tokenize(typedText).map(normalizeWord));
  return tokenize(expectedText)
    .map(word => {
      if (typedSet.has(normalizeWord(word))) return word;
      let shown = 0;
      const keep = level === 1 ? 1 : Math.ceil(normalizeWord(word).length / 2);
      return word.replace(/[\p{L}\p{N}]/gu, ch => (shown++ < keep ? ch : '_'));
    })
    .join(' ');
}
