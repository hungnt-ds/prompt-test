import type { DialogueTurn } from '@/services/vocabApi';

/** Trạng thái làm một câu đối thoại — dùng chung giữa trang làm bài và runner. */
export interface DialogueState {
  /** Câu trả lời người học tự nhập, theo chỉ số lượt */
  drafts: Record<number, string>;
  /** Các lượt ẩn đã bấm xem gợi ý */
  revealed: number[];
  /** Lượt ẩn đang làm; >= turns.length nghĩa là đã xong hội thoại */
  cursor: number;
}

/** Chỉ số lượt ẩn đầu tiên từ `from` trở đi (turns.length nếu không còn). */
export function nextHiddenIndex(turns: DialogueTurn[], from: number): number {
  for (let i = from; i < turns.length; i++) if (turns[i].hidden) return i;
  return turns.length;
}

export function initialDialogueState(turns: DialogueTurn[]): DialogueState {
  return { drafts: {}, revealed: [], cursor: nextHiddenIndex(turns, 0) };
}

export function isDialogueDone(turns: DialogueTurn[], state: DialogueState): boolean {
  return state.cursor >= turns.length;
}
