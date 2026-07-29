# FE Guide — vocab-api

Tài liệu bàn giao cho frontend. Tài liệu tương tác đầy đủ (mô tả từng trường, bấm thử trực tiếp): mở **`{BASE_URL}/docs`** (Scalar) — nhập Bearer token ở nút Auth. Spec máy đọc: `{BASE_URL}/openapi.json` (import được vào Postman/Insomnia).

## Quy ước chung

- **Auth**: mọi request `/api/*` cần header `Authorization: Bearer <API_KEY>`.
- **Envelope**: mọi response là `{ code, message, data, pagination? }` — `code` trùng HTTP status; `data = null` khi lỗi, kèm `errorCode` (máy xử lý) và `errors[]` (lỗi validate/parse có số dòng).
- **Không id chay**: khóa ngoại luôn kèm object cơ bản (`sourceWord`, `item`...). Không có trường thừa/nội bộ.

## Luồng học tập chính (mới thêm — phần FE cần dựng UI)

### 1. Màn hình lọc trước khi học — bộ lọc OR

Mọi chế độ luyện tập nhận cùng một `filter` — từ được chọn nếu khớp **BẤT KỲ** điều kiện nào (phép OR):

```jsonc
{
  "filter": {
    "tags": ["ielts", "unit-3"],     // thuộc 1 trong các tag này
    "pos": ["phrasal-verb", "idiom"],// HOẶC là 1 trong các loại từ này
    "favorite": true,                 // HOẶC đã đánh dấu yêu thích
    "difficult": true,                // HOẶC đã đánh dấu khó
    "wordIds": [1, 5]                 // HOẶC chọn đích danh
  }
}
// {} hoặc bỏ trống = toàn bộ kho từ
```

Nguồn dữ liệu cho UI lọc: `GET /api/tags` (danh sách tag + số lượng), loại từ là tập cố định: `noun, verb, adj, adv, prep, conj, pron, interj, det, phrase, idiom, phrasal-verb`.

### 2. Lật thẻ học từ vựng

```
POST /api/practice/flashcards
{ "filter": {...}, "count": 20 }
→ data: { items: [Word đầy đủ — headword, pronunciation, senses[].examples, tags], total }
```

`items` đã xáo ngẫu nhiên. UI: mặt trước = `headword + pronunciation`, lật ra = nghĩa + ví dụ.

### 3. Quiz — `POST /api/practice/quiz` với `{kind, count, filter}`

| `kind` | Chế độ học | Đề bài từ | Chấm bằng |
|---|---|---|---|
| `word-to-meaning` | Từ → Nghĩa | `word.headword` | `options[].isCorrect` |
| `meaning-to-word` | Nghĩa → Từ | `meaning.definition` | `options[].isCorrect` |
| `context-choice` | Che từ trong câu ví dụ | `sentence` (chứa `{{1}}`) | `options[].isCorrect` |
| `listen-type` | Nghe và gõ lại | phát âm `word.headword` (xem dưới) | `accepted[]` |
| `type-word` | Nhìn nghĩa gõ từ EN | `meaning.definition` | `accepted[]` |
| `type-meaning` | Nhìn từ gõ nghĩa | `word.headword` | `accepted[]` (mọi định nghĩa — chấm lỏng) |
| `matching` | Nối từ với nghĩa | `pairs[]` + `meanings[]` (2 cột xáo riêng) | ghép đúng khi cùng `wordId` |
| `mixed` | Random trộn các dạng | mỗi câu 1 dạng, xem `questions[i].kind` | theo dạng |

Quy tắc chấm phía client:
- Dạng chọn: so với `options[].isCorrect` (ẩn khi hiển thị).
- Dạng gõ: `accepted.includes(input.trim().toLowerCase())`.
- `count` với `matching` = số cặp.

Phát âm (`listen-type` hoặc nút loa bất kỳ đâu): API không trả audio — dùng Web Speech API có sẵn của trình duyệt:

```js
const u = new SpeechSynthesisUtterance(word.headword);
u.lang = "en-US";
speechSynthesis.speak(u);
```

Lỗi 422 khi không đủ dữ liệu (dạng chọn cần ≥4 từ có nghĩa; `context-choice` cần ví dụ chứa headword; `matching` cần ≥2 từ) — hiển thị `message` cho người dùng.

### 4. Ghi kết quả vào lịch ôn FSRS — `POST /api/practice/answer`

Gọi **sau khi kết thúc buổi luyện** để kết quả được tính vào lịch lặp lại ngắt quãng (từ sẽ hẹn ôn lại đúng thời điểm):

```jsonc
POST /api/practice/answer
{ "results": [
  { "wordId": 1, "correct": true },              // đúng → rating 3 (Good)
  { "wordId": 2, "correct": false },             // sai  → rating 1 (Again)
  { "wordId": 3, "correct": true, "rating": 4 }  // override: người học tự đánh giá Easy
]}
→ data: {
  items: [{ wordId, ok, rating, item, card, nextDue }],
  summary: { answered, correct, incorrect, notFound }
}
```

- `wordId` lấy từ `question.word.id` (hoặc `pairs[].wordId` với matching).
- Word chưa có thẻ FSRS sẽ được tạo tự động; `wordId` không tồn tại → item đó `ok: false`, không chặn các item khác.
- Cùng wordId nhiều lần trong 1 batch xử lý tuần tự (hợp lệ với quiz mixed).

### 5. Ôn tập chính thức theo lịch (đã có từ trước, liên quan trực tiếp)

- `GET /api/review/due?type=word|exercise|all&limit=20` — item đến hạn hôm nay, kèm nội dung đầy đủ để hiển thị.
- `POST /api/review/{card.id}/answer` với `{rating: 1|2|3|4}` — chấm một lượt ôn.
- Các trường của `card`: xem bảng trong `/docs` (chỉ cần `due`, `state`, `suspended`; FE không tự tính lịch).

## Nạp dữ liệu bằng file Markdown (mới thêm)

- `POST /api/import?mode=upsert|create` — multipart/form-data, field `files` lặp nhiều lần, tự nhận diện file vocab/exercise qua frontmatter `type`. Mỗi file độc lập: file lỗi parse trả `ok:false + errors[{line,message}]` (hiển thị cho người dùng sửa), file khác vẫn được nạp.
- Format file + code mẫu upload: xem `samples/README.md` (kèm 2 file mẫu chuẩn spec).
- `mode=upsert` (mặc định): trùng headword/slug thì cập nhật nội dung nhưng **giữ tiến độ ôn tập**.

## Ngân hàng câu hỏi & trộn đề

Câu hỏi là **thực thể độc lập** (ngân hàng), đề chỉ là danh sách tham chiếu — một câu có thể nằm trong nhiều đề, **không nhân bản dữ liệu**. Sửa câu ở đâu thì mọi đề chứa nó cùng cập nhật.

### Duyệt ngân hàng — `GET /api/questions`

Query: `type=mcq|cloze`, `q` (tìm trong prompt), `exerciseId` (chỉ câu đang trong đề đó), `page`, `limit`. Mỗi câu kèm `usedIn: [{id, title, slug}]` — các đề đang chứa nó — dùng cho UI tick chọn câu khi trộn đề.

### Trộn đề — `POST /api/exercises/compose`

Tạo đề mới (`source: "composed"`) bằng cách **liên kết** câu có sẵn. Đề gốc giữ nguyên; `sourceExercise: {id, title, slug}` trên mỗi câu cho biết đề gốc đã tạo ra nó.

```jsonc
POST /api/exercises/compose
{
  "title": "Ôn tổng hợp tuần 3",       // optional, mặc định "Mixed — <ngày>"
  "tags": ["tong-hop"],                 // tag cho đề mới
  "from": {
    "questionIds": [3, 7],              // chọn câu đích danh (id lấy từ GET /api/questions)
    "exerciseIds": [1, 2],              // HOẶC toàn bộ câu của các đề này
    "tags": ["phrasal-verbs"],          // HOẶC câu của đề thuộc tag này (OR cả 3 điều kiện)
    "types": ["mcq"]                    // lọc loại câu (trộn theo loại) — bỏ = cả mcq lẫn cloze
  },                                    // from: {} = cả ngân hàng câu hỏi
  "count": 20,                          // số câu tối đa (chọn ngẫu nhiên)
  "order": "by-type"                    // "shuffle" (mặc định) | "by-type" (mcq trước, cloze sau) | "source" (gom theo đề gốc)
}
→ 201, data = Exercise đầy đủ (có thẻ FSRS riêng, ôn được như đề thường)
```

Lỗi 422 khi nguồn không khớp đề/câu hỏi nào. Đề composed lọc được: `GET /api/exercises?source=composed`.

Lưu ý ngữ nghĩa xóa/sửa: xóa một đề chỉ xóa những câu **không còn nằm trong đề nào khác**; sửa đề bằng PATCH/re-import thay bộ câu của đề đó (câu cũ đang được đề khác dùng thì vẫn giữ).

## Phân biệt 2 loại "bài tập"

| | `/api/practice/quiz` | `/api/exercises` (+ `/generate`, `/import`) |
|---|---|---|
| Lưu DB | Không — dùng xong bỏ | Có — bài tập lâu dài, có thẻ FSRS riêng |
| Nguồn | Sinh tự động từ kho từ | Tự soạn (JSON/Markdown) hoặc generate |
| Ghi kết quả | `POST /api/practice/answer` (theo wordId) | Flow Review (`/api/review/.../answer` theo card của exercise) |
| Dùng khi | Luyện nhanh hàng ngày | Bộ đề cố định muốn làm lại nhiều lần |
