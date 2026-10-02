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
}

export interface WordDiff {
  word: string;
  status: 'correct' | 'incorrect' | 'missing' | 'extra';
  expected?: string;
}

export interface SegmentEvaluation {
  accuracy: number; // 0 - 100%
  totalExpectedWords: number;
  correctWords: number;
  diff: WordDiff[];
  isPassed: boolean; // >= 80% or 100%
}
