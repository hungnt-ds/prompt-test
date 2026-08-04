import type { QuestionInput } from '@/services/vocabApi';

// ============================================================
// Khuôn mẫu + kiểm tra hợp lệ cho câu hỏi đang soạn.
// Ràng buộc bám đúng API để người soạn thấy lỗi ngay khi gõ,
// không phải bấm Lưu rồi mới nhận 422.
// ============================================================

export function emptyQuestion(type: QuestionInput['type']): QuestionInput {
  if (type === 'mcq') {
    return {
      type: 'mcq',
      prompt: '',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ],
      explanation: '',
    };
  }
  if (type === 'cloze') {
    return { type: 'cloze', prompt: '', clozeAnswers: [], explanation: '' };
  }
  return {
    type: 'dialogue',
    prompt: '',
    turns: [
      { speaker: 'A', text: '', hidden: false },
      { speaker: 'B', text: '', hidden: true },
    ],
    explanation: '',
  };
}

/** Các số blank xuất hiện trong prompt cloze, theo thứ tự tăng dần. */
export function blanksInPrompt(prompt: string): number[] {
  const found = new Set<number>();
  for (const m of prompt.matchAll(/\{\{(\d+)\}\}/g)) found.add(Number(m[1]));
  return [...found].sort((a, b) => a - b);
}

/** Lỗi chặn lưu, hiển thị ngay trên thẻ câu hỏi. */
export function validateQuestion(q: QuestionInput): string[] {
  const errs: string[] = [];
  if (!q.prompt.trim()) {
    errs.push(q.type === 'dialogue' ? 'Chưa có bối cảnh hội thoại.' : 'Chưa có nội dung câu hỏi.');
  }
  if (q.type === 'mcq') {
    if (q.options.length < 2) errs.push('Cần ít nhất 2 lựa chọn.');
    if (q.options.length > 8) errs.push('Tối đa 8 lựa chọn.');
    if (q.options.some(o => !o.text.trim())) errs.push('Có lựa chọn còn để trống.');
    const correct = q.options.filter(o => o.isCorrect).length;
    if (correct !== 1) errs.push('Phải chọn đúng 1 đáp án đúng.');
  }
  if (q.type === 'cloze') {
    const blanks = blanksInPrompt(q.prompt);
    if (blanks.length === 0) errs.push('Chưa có chỗ trống nào — bấm “Chèn chỗ trống”.');
    for (const b of blanks) {
      const spec = q.clozeAnswers.find(c => c.blank === b);
      if (!spec || spec.accepted.length === 0 || spec.accepted.every(a => !a.trim()))
        errs.push(`Chỗ trống {{${b}}} chưa có đáp án.`);
    }
  }
  if (q.type === 'dialogue') {
    if (q.turns.length < 2) errs.push('Cần ít nhất 2 lượt.');
    if (q.turns.some(t => !t.text.trim())) errs.push('Có lượt còn để trống nội dung.');
    if (q.turns.some(t => !t.speaker.trim())) errs.push('Có lượt chưa ghi tên người nói.');
    const speakers = new Set(q.turns.map(t => t.speaker.trim()).filter(Boolean));
    if (speakers.size < 2) errs.push('Cần 2-3 người nói khác nhau.');
    if (speakers.size > 3) errs.push('Tối đa 3 người nói.');
    if (!q.turns.some(t => t.hidden)) errs.push('Cần ít nhất 1 lượt ẩn (lượt người học phải tự nói).');
  }
  return errs;
}
