// ============================================================
// vocab-api client — typed against the OpenAPI spec served at
// GET /docs (scratchpad copy: openapi.json).
//
// Conventions from the spec:
//   - Auth: `Authorization: Bearer <API_KEY>` on every /api route
//   - Envelope: { code, message, data, pagination? }; data null on error
//   - Errors carry errorCode + optional errors[{line, message}]
//   - Base URL + key are user-configurable (localStorage), default
//     local dev: http://localhost:8787 / dev-key
// ============================================================

// ---------- Config (localStorage) ----------

const BASE_KEY = 'vocabapi:base';
const APIKEY_KEY = 'vocabapi:key';

// Dev: base rỗng = same-origin, Vite proxy chuyển /api → localhost:8787
// (tránh CORS). Bản build: gọi thẳng API prod — server cần bật CORS.
// API key KHÔNG nhúng vào code (bundle công khai) — nhập qua panel API, lưu localStorage.
export const DEFAULT_API_BASE = import.meta.env.DEV
  ? ''
  : 'https://vocab-api.nguyentanhung2003.workers.dev';
export const DEFAULT_API_KEY = 'dev-key';

export function getApiBase(): string {
  if (typeof window === 'undefined') return DEFAULT_API_BASE;
  return window.localStorage.getItem(BASE_KEY) || DEFAULT_API_BASE;
}

export function getApiKey(): string {
  if (typeof window === 'undefined') return DEFAULT_API_KEY;
  return window.localStorage.getItem(APIKEY_KEY) || DEFAULT_API_KEY;
}

export function setApiConfig(base: string, key: string) {
  const trimmedBase = base.trim().replace(/\/+$/, '');
  if (trimmedBase && trimmedBase !== DEFAULT_API_BASE) window.localStorage.setItem(BASE_KEY, trimmedBase);
  else window.localStorage.removeItem(BASE_KEY);
  if (key.trim() && key.trim() !== DEFAULT_API_KEY) window.localStorage.setItem(APIKEY_KEY, key.trim());
  else window.localStorage.removeItem(APIKEY_KEY);
}

// ---------- Types (mirror components/schemas) ----------

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Example {
  id: number;
  sentence: string;
}

export interface Sense {
  id: number;
  partOfSpeech: string | null;
  definition: string;
  examples: Example[];
}

export interface ReviewCard {
  id: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
  due: string;
  suspended: boolean;
  reps: number;
  lapses: number;
  lastReview: string | null;
}

export interface Word {
  id: number;
  headword: string;
  pronunciation: string | null;
  notes: string | null;
  favorite: boolean;
  difficult: boolean;
  createdAt: string;
  updatedAt: string;
  senses: Sense[];
  tags: string[];
  card?: ReviewCard | null;
}

export interface QuestionOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

export interface ClozeAnswer {
  blank: number;
  accepted: string[];
}

/** Đối thoại gợi ý: lượt `hidden` phải che đi ban đầu để người học tự trả lời. */
export interface DialogueTurn {
  speaker: string;
  text: string;
  hidden: boolean;
}

export type QuestionType = 'mcq' | 'cloze' | 'dialogue';

export interface Question {
  id: number;
  type: QuestionType;
  /** With cloze the prompt contains {{1}}, {{2}}… placeholders. Với dialogue: tiêu đề/bối cảnh. */
  prompt: string;
  /** Chỉ với dialogue — không chấm đúng/sai, người học tự đánh giá. */
  turns?: DialogueTurn[] | null;
  clozeAnswers?: ClozeAnswer[] | null;
  explanation?: string | null;
  sourceWord?: { id: number; headword: string; pronunciation: string | null } | null;
  /** Đề gốc đã tạo ra câu hỏi này (câu hỏi là thực thể độc lập trong ngân hàng). */
  sourceExercise?: { id: number; title: string; slug: string | null } | null;
  options?: QuestionOption[];
}

export type ExerciseSource = 'manual' | 'imported' | 'generated' | 'composed';

export interface ExerciseListItem {
  id: number;
  slug: string | null;
  title: string;
  source: ExerciseSource;
  favorite: boolean;
  difficult: boolean;
  tags: string[];
  questionCount: number;
}

export interface Exercise {
  id: number;
  slug: string | null;
  title: string;
  description: string | null;
  source: ExerciseSource;
  favorite: boolean;
  difficult: boolean;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
  tags: string[];
  card?: ReviewCard | null;
}

/** Mỗi tag thuộc đúng một loại — cùng tên ở hai type là hai tag độc lập. */
export type TagType = 'word' | 'exercise' | 'question' | 'collection';

export interface Tag {
  id: number;
  /** Slug không dấu, dùng để lọc và đặt URL (vd "sach-ielts") */
  name: string;
  /** Tên hiển thị giữ nguyên dấu (vd "Sách IELTS") */
  label: string;
  type: TagType;
  usageCount: number;
}

/** Collection = "thư mục"/lộ trình, lồng nhau được. */
export interface Collection {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  /** Độ khó 1-5 */
  difficulty: number | null;
  parent: { id: number; slug: string; title: string } | null;
  tags: string[];
  /** Từ gắn TRỰC TIẾP vào collection này */
  wordCount: number;
  exerciseCount: number;
  childCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionTreeNode extends Collection {
  /** Tính cả các nhánh con */
  totalWordCount: number;
  totalExerciseCount: number;
  children: CollectionTreeNode[];
}

/** Per-file result of POST /api/import (multipart). */
export interface ImportFileResult {
  name: string;
  type: 'vocab' | 'exercise' | null;
  ok: boolean;
  created: number;
  updated: number;
  items: { action: string; headword?: string; slug?: string; title?: string }[];
  errors: { line: number; message: string }[];
}

export interface MultiImportResult {
  files: ImportFileResult[];
}

/** Valid part-of-speech values per the MD spec. */
export const POS_VALUES = [
  'noun', 'verb', 'adj', 'adv', 'prep', 'conj', 'pron', 'interj', 'det',
  'phrase', 'idiom', 'phrasal-verb',
] as const;

// ---------- Envelope / fetch ----------

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
  pagination?: Pagination;
  errorCode?: string;
  errors?: { line: number; message: string }[];
}

export class ApiError extends Error {
  code: number;
  errorCode?: string;
  errors?: { line: number; message: string }[];
  constructor(code: number, message: string, errorCode?: string, errors?: { line: number; message: string }[]) {
    super(message);
    this.code = code;
    this.errorCode = errorCode;
    this.errors = errors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  let res: Response;
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(0, `Không kết nối được API tại ${getApiBase()} — kiểm tra server và cài đặt API.`);
  }

  let body: Envelope<T>;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(res.status, `API trả về dữ liệu không phải JSON (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    const msg =
      res.status === 401
        ? 'Sai API key — kiểm tra cài đặt API (Authorization: Bearer <API_KEY>).'
        : body.message || `Lỗi API (HTTP ${res.status}).`;
    throw new ApiError(res.status, msg, body.errorCode, body.errors);
  }
  return body;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ---------- Words ----------

export interface WordListQuery {
  q?: string;
  tag?: string;
  pos?: string;
  favorite?: boolean;
  difficult?: boolean;
  /** Phạm vi: id hoặc slug của collection */
  collection?: string | number;
  /** Mặc định true — gồm cả collection con */
  includeSub?: boolean;
  page?: number;
  limit?: number;
}

export async function listWords(query: WordListQuery = {}): Promise<{ words: Word[]; pagination: Pagination }> {
  const env = await request<Word[]>(`/api/words${qs({ ...query })}`);
  return { words: env.data, pagination: env.pagination! };
}

export async function getWord(id: number): Promise<Word> {
  return (await request<Word>(`/api/words/${id}`)).data;
}

export async function patchWord(id: number, patch: Partial<Pick<Word, 'favorite' | 'difficult' | 'notes'>>): Promise<Word> {
  return (
    await request<Word>(`/api/words/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  ).data;
}

// ---------- Exercises ----------

export interface ExerciseListQuery {
  q?: string;
  tag?: string;
  source?: ExerciseSource;
  favorite?: boolean;
  difficult?: boolean;
  collection?: string | number;
  includeSub?: boolean;
  page?: number;
  limit?: number;
}

export async function listExercises(
  query: ExerciseListQuery = {}
): Promise<{ exercises: ExerciseListItem[]; pagination: Pagination }> {
  const env = await request<ExerciseListItem[]>(`/api/exercises${qs({ ...query })}`);
  return { exercises: env.data, pagination: env.pagination! };
}

export async function getExercise(id: number): Promise<Exercise> {
  return (await request<Exercise>(`/api/exercises/${id}`)).data;
}

export async function patchExercise(
  id: number,
  patch: Partial<Pick<Exercise, 'favorite' | 'difficult'>>
): Promise<Exercise> {
  return (
    await request<Exercise>(`/api/exercises/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  ).data;
}

// ---------- Question bank & compose ----------

/** Câu hỏi trong ngân hàng — kèm danh sách đề đang chứa nó. */
export interface BankQuestion extends Question {
  usedIn: { id: number; title: string; slug: string | null }[];
}

export interface QuestionListQuery {
  type?: QuestionType;
  q?: string;
  exerciseId?: number;
  /** Tag gắn trực tiếp vào câu hỏi */
  tag?: string;
  /** Câu thuộc đề nằm trong collection này (gồm cả nhánh con) */
  collection?: string | number;
  page?: number;
  limit?: number;
}

export async function listQuestions(
  query: QuestionListQuery = {}
): Promise<{ questions: BankQuestion[]; pagination: Pagination }> {
  const env = await request<BankQuestion[]>(`/api/questions${qs({ ...query })}`);
  return { questions: env.data, pagination: env.pagination! };
}

/** Nguồn câu hỏi cho compose — OR cả 3 điều kiện; {} = cả ngân hàng. */
export interface ComposeFrom {
  questionIds?: number[];
  exerciseIds?: number[];
  tags?: string[];
  /** Lọc loại câu, áp sau khi gom nguồn */
  types?: ('mcq' | 'cloze')[];
}

export interface ComposeInput {
  title?: string;
  slug?: string;
  tags?: string[];
  from?: ComposeFrom;
  /** Số câu tối đa, chọn ngẫu nhiên (1-100, mặc định 20) */
  count?: number;
  order?: 'shuffle' | 'by-type' | 'source';
}

/** Trộn đề mới từ ngân hàng câu hỏi — đề gốc giữ nguyên, câu chỉ được liên kết. */
export async function composeExercise(input: ComposeInput): Promise<Exercise> {
  return (
    await request<Exercise>('/api/exercises/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  ).data;
}

// ---------- Tags ----------

export interface Tag {
  id: number;
  name: string;
}

export async function listTags(type?: TagType): Promise<Tag[]> {
  return (await request<Tag[]>(`/api/tags${qs({ type })}`)).data;
}

// ---------- Collections (thư mục / lộ trình) ----------

export interface CollectionTreeQuery {
  /** Chỉ lấy lộ trình mang tag này (tag type = collection) */
  tag?: string;
  /** id hoặc slug: chỉ lấy nhánh bắt đầu từ collection này */
  root?: string;
  /** Số cấp con tối đa (mặc định 3) */
  depth?: number;
}

export async function getCollectionTree(query: CollectionTreeQuery = {}): Promise<CollectionTreeNode[]> {
  return (await request<CollectionTreeNode[]>(`/api/collections/tree${qs({ ...query })}`)).data;
}

export interface CollectionListQuery {
  q?: string;
  tag?: string;
  /** id/slug của cha — chỉ lấy con trực tiếp */
  parent?: string;
  rootOnly?: boolean;
  page?: number;
  limit?: number;
}

export async function listCollections(
  query: CollectionListQuery = {}
): Promise<{ collections: Collection[]; pagination: Pagination }> {
  const env = await request<Collection[]>(`/api/collections${qs({ ...query })}`);
  return { collections: env.data, pagination: env.pagination! };
}

export async function getCollection(idOrSlug: string | number): Promise<Collection> {
  return (await request<Collection>(`/api/collections/${idOrSlug}`)).data;
}

/** Tên tag được server tự chuẩn hóa về lowercase-kebab. 409 nếu trùng. */
export async function createTag(name: string): Promise<Tag> {
  return (
    await request<Tag>('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  ).data;
}

export async function renameTag(id: number, name: string): Promise<Tag> {
  return (
    await request<Tag>(`/api/tags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  ).data;
}

/** Xóa tag chỉ gỡ liên kết — không xóa từ / bài tập. */
export async function deleteTag(id: number): Promise<void> {
  await request<{ deleted: boolean }>(`/api/tags/${id}`, { method: 'DELETE' });
}

/** Set lại toàn bộ tag của từ — tag chưa tồn tại được tự tạo. */
export async function setWordTags(id: number, tags: string[]): Promise<Word> {
  return (
    await request<Word>(`/api/words/${id}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    })
  ).data;
}

export async function setExerciseTags(id: number, tags: string[]): Promise<Exercise> {
  return (
    await request<Exercise>(`/api/exercises/${id}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    })
  ).data;
}

// ---------- Practice (on-the-fly, không lưu DB) ----------

/** Bộ lọc OR: từ được chọn nếu khớp BẤT KỲ điều kiện nào. {} = toàn bộ kho từ. */
export interface WordFilter {
  /** PHẠM VI (AND) — thu hẹp trước, các điều kiện khác OR bên trong phạm vi này. */
  collectionIds?: number[];
  /** Mặc định true = gồm cả collection con. */
  includeSubcollections?: boolean;
  tags?: string[];
  pos?: string[];
  favorite?: true;
  difficult?: true;
  wordIds?: number[];
}

export type QuizKind =
  | 'word-to-meaning'
  | 'meaning-to-word'
  | 'context-choice'
  | 'listen-type'
  | 'type-word'
  | 'type-meaning'
  | 'matching'
  | 'mixed';

export interface PracticeWordRef {
  id: number;
  headword: string;
  pronunciation: string | null;
}

export interface PracticeQuestion {
  kind: Exclude<QuizKind, 'mixed'>;
  /** Không có với matching. Với listen-type: FE phát âm headword bằng TTS. */
  word?: PracticeWordRef;
  /** Chỉ meaning-to-word / type-word */
  meaning?: { definition: string; partOfSpeech: string | null };
  /** Chỉ context-choice: câu ví dụ với từ bị che thành {{1}} */
  sentence?: string;
  /** Dạng lựa chọn: 4 lựa chọn đã xáo, đúng 1 isCorrect (ẩn khi hiển thị) */
  options?: { text: string; isCorrect: boolean }[];
  /** Dạng gõ chữ: đáp án chấp nhận — so lowercase + trim */
  accepted?: string[];
  /** Chỉ matching: cột từ, đã xáo */
  pairs?: { wordId: number; headword: string }[];
  /** Chỉ matching: cột nghĩa, xáo riêng — ghép đúng khi wordId trùng */
  meanings?: { wordId: number; definition: string }[];
}

export async function practiceFlashcards(
  filter: WordFilter,
  count: number
): Promise<{ items: Word[]; total: number }> {
  return (
    await request<{ items: Word[]; total: number }>('/api/practice/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter, count }),
    })
  ).data;
}

export async function practiceQuiz(
  kind: QuizKind,
  count: number,
  filter: WordFilter
): Promise<{ kind: QuizKind; questions: PracticeQuestion[]; totalCandidates: number }> {
  return (
    await request<{ kind: QuizKind; questions: PracticeQuestion[]; totalCandidates: number }>(
      '/api/practice/quiz',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, count, filter }),
      }
    )
  ).data;
}

/** Kết quả một từ trong buổi luyện. rating override map mặc định (đúng→3 Good, sai→1 Again). */
export interface PracticeResult {
  wordId: number;
  correct: boolean;
  rating?: 1 | 2 | 3 | 4;
}

export interface ItemSummary {
  type: 'word' | 'exercise';
  id: number;
  headword?: string;
  pronunciation?: string | null;
  title?: string;
  slug?: string | null;
}

export interface PracticeAnswerResult {
  items: {
    wordId: number;
    ok: boolean;
    rating: number;
    item: ItemSummary | null;
    card: ReviewCard | null;
    nextDue: string | null;
    error?: string;
  }[];
  summary: { answered: number; correct: number; incorrect: number; notFound: number };
}

/** Ghi kết quả buổi luyện vào lịch ôn FSRS — gọi sau khi kết thúc buổi. */
export async function practiceAnswer(results: PracticeResult[]): Promise<PracticeAnswerResult> {
  return (
    await request<PracticeAnswerResult>('/api/practice/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }),
    })
  ).data;
}

// ---------- Review (FSRS, ôn theo lịch) ----------

export type DueItemContent = (Word & { type: 'word' }) | (Exercise & { type: 'exercise' });

export interface DueResult {
  /** Sắp theo due tăng dần (đến hạn lâu nhất trước) */
  items: { card: ReviewCard; item: DueItemContent }[];
  counts: { new: number; learning: number; review: number; relearning: number };
  total: number;
}

export async function reviewDue(
  type: 'word' | 'exercise' | 'all' = 'all',
  limit = 20
): Promise<DueResult> {
  return (await request<DueResult>(`/api/review/due${qs({ type, limit })}`)).data;
}

export interface ReviewAnswerResult {
  card: ReviewCard;
  item: ItemSummary | null;
  nextDue: string;
}

/** Chấm một lượt ôn: 1 Again, 2 Hard, 3 Good, 4 Easy. Server tự tính lịch. */
export async function reviewAnswer(cardId: number, rating: 1 | 2 | 3 | 4): Promise<ReviewAnswerResult> {
  return (
    await request<ReviewAnswerResult>(`/api/review/${cardId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    })
  ).data;
}

// ---------- Import (multipart, auto-detect vocab/exercise) ----------

export async function importMarkdownFiles(
  files: File[],
  mode: 'upsert' | 'create' = 'upsert'
): Promise<MultiImportResult> {
  const form = new FormData();
  for (const file of files) form.append('files', file);
  // No Content-Type header: the browser sets the multipart boundary.
  return (await request<MultiImportResult>(`/api/import?mode=${mode}`, { method: 'POST', body: form })).data;
}

// ---------- Push notifications (nhắc ôn tập) ----------

export interface PushDevice {
  id: number;
  label: string | null;
  /** Endpoint đã che bớt — server không bao giờ trả nguyên vẹn. */
  endpointHint: string;
  createdAt: string;
  lastNotifiedAt: string | null;
}

export interface PushDeliveryReport {
  payload: Record<string, unknown>;
  devices: number;
  sent: number;
  failed: number;
  /** Thiết bị bị push service báo hết hiệu lực (404/410) và đã tự xóa khỏi DB. */
  removed: number;
}

export interface PushReminderRun {
  due: { words: number; exercises: number };
  devices: number;
  sent: number;
  failed: number;
  removed: number;
  /** Có mặt khi không gửi gì — lý do (không có item đến hạn / chưa có thiết bị). */
  skipped?: string;
}

/** Khóa công khai VAPID (base64url) để đăng ký PushManager. */
export async function getVapidPublicKey(): Promise<string> {
  return (await request<{ publicKey: string }>('/api/push/vapid-public-key')).data.publicKey;
}

/** Body dùng đúng shape PushSubscription.toJSON() + label tùy chọn. */
export async function subscribePush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  label?: string
): Promise<PushDevice> {
  return (
    await request<PushDevice>('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...subscription, label }),
    })
  ).data;
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await request<{ deleted: boolean }>('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
}

export async function listPushDevices(): Promise<PushDevice[]> {
  return (await request<PushDevice[]>('/api/push/devices')).data;
}

/** Gửi thông báo thử ngay lập tức tới mọi thiết bị đã đăng ký. */
export async function sendTestPush(): Promise<PushDeliveryReport> {
  return (await request<PushDeliveryReport>('/api/push/test', { method: 'POST' })).data;
}

/** Chạy tay đúng việc cron làm hằng ngày (8h/20h giờ VN). */
export async function runPushReminder(): Promise<PushReminderRun> {
  return (await request<PushReminderRun>('/api/push/run-reminder', { method: 'POST' })).data;
}

// ---------- Health ----------

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBase()}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
