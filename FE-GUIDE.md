# FE Guide — vocab-api

Tài liệu bàn giao cho frontend. Tài liệu tương tác đầy đủ (mô tả từng trường, bấm thử trực tiếp): mở **`{BASE_URL}/docs`** (Scalar) — nhập Bearer token ở nút Auth. Spec máy đọc: `{BASE_URL}/openapi.json` (import được vào Postman/Insomnia).

## Quy ước chung

- **Auth**: mọi request `/api/*` cần header `Authorization: Bearer <API_KEY>`.
- **Envelope**: mọi response là `{ code, message, data, pagination? }` — `code` trùng HTTP status; `data = null` khi lỗi, kèm `errorCode` (máy xử lý) và `errors[]` (lỗi validate/parse có số dòng).
- **Không id chay**: khóa ngoại luôn kèm object cơ bản (`sourceWord`, `item`...). Không có trường thừa/nội bộ.

## Collections — nhóm/lộ trình (màn hình chính)

Từ vựng và bài tập được gom vào **collection** lồng nhau, đúng cấu trúc màn hình lộ trình: **tag nhóm lớn → lộ trình → bộ từ con → từ vựng**. Một từ nằm được trong nhiều collection (chỉ là liên kết, không nhân bản).

### Dựng màn hình lộ trình — `GET /api/collections/tree?tag=thpt&depth=3`

```jsonc
data: [{
  "id": 1, "slug": "thpt-2026", "title": "THPT 2026",
  "difficulty": 2,              // ĐỘ KHÓ 2/5
  "tags": ["thpt"],
  "childCount": 3,              // "3 bộ từ"
  "wordCount": 0,               // gắn TRỰC TIẾP vào node này
  "totalWordCount": 40,         // tính cả các nhánh con — dùng cho thẻ tổng quan
  "totalExerciseCount": 5,
  "children": [ { ...cùng shape... } ]
}]
```

Lấy danh sách nhóm lớn để chia section: `GET /api/tags?type=collection`. Mỗi tag có `label` (tên hiển thị giữ dấu, vd "Sách IELTS") và `name` (slug để truyền vào `?tag=`).

Nếu cả cha lẫn con cùng mang tag, endpoint chỉ trả node **ngoài cùng** — không bị lặp cây.

### Lọc theo collection = **phạm vi**, không phải điều kiện OR

Đây là điểm khác biệt quan trọng so với trước: chọn collection sẽ **thu hẹp phạm vi trước** (mặc định gồm cả collection con), rồi các điều kiện cũ mới OR *bên trong* phạm vi đó.

```jsonc
{ "filter": {
    "collectionIds": [1],       // PHẠM VI (AND) — gồm cả nhánh con
    "includeSubcollections": true,   // mặc định true; false = chỉ đúng collection đó
    "tags": ["idioms"], "favorite": true   // các điều kiện này OR với nhau, BÊN TRONG phạm vi
}}
```

Trên các endpoint list dùng query: `?collection=<id hoặc slug>&includeSub=true|false` — có ở `/api/words`, `/api/exercises`, `/api/questions`.

### Quản lý collection

| | |
|---|---|
| `GET /api/collections` | List phẳng: `q`, `tag`, `parent`, `rootOnly`, phân trang |
| `POST /api/collections` | `{slug, title, parentId?, difficulty?, tags?}` |
| `PATCH/DELETE /api/collections/:id` | Sửa / **xóa cả nhánh con** (từ vựng bên trong KHÔNG bị xóa, chỉ gỡ liên kết) |
| `POST /api/collections/:id/move` | `{parentId, position?}` — kéo thả; đưa vào chính nhánh con của nó → **409** |
| `POST\|DELETE /api/collections/:id/words` · `/exercises` | `{wordIds}` / `{exerciseIds}` — thêm/gỡ thành viên |

### Tag giờ có `type`

Mỗi tag thuộc đúng một loại: `word` | `exercise` | `question` | `collection`. **Cùng tên ở hai type là hai tag độc lập** — nên màn lọc từ vựng gọi `GET /api/tags?type=word` sẽ không còn lẫn tag của bài tập.

Response tag: `{id, name, label, type, usageCount}`. `name` là slug không dấu (`sach-ielts`) dùng để lọc/URL; `label` là tên hiển thị (`Sách IELTS`). Khi tạo tag cứ gửi tên có dấu, backend tự tách hai phần.

## Luồng học tập chính — phần FE cần dựng UI

### 1. Màn hình lọc trước khi học

Mọi chế độ luyện tập nhận cùng một `filter`:

```jsonc
{
  "filter": {
    "collectionIds": [1],            // PHẠM VI (AND) — xem mục Collections ở trên
    "tags": ["ielts", "unit-3"],     // thuộc 1 trong các tag này
    "pos": ["phrasal-verb", "idiom"],// HOẶC là 1 trong các loại từ này
    "favorite": true,                 // HOẶC đã đánh dấu yêu thích
    "difficult": true,                // HOẶC đã đánh dấu khó
    "wordIds": [1, 5]                 // HOẶC chọn đích danh
  }
}
// {} hoặc bỏ trống = toàn bộ kho từ
```

Nguồn dữ liệu cho UI lọc: `GET /api/tags?type=word` (tag + số lượng), `GET /api/collections/tree` (chọn lộ trình), loại từ là tập cố định: `noun, verb, adj, adv, prep, conj, pron, interj, det, phrase, idiom, phrasal-verb`.

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

## Dạng bài "đối thoại gợi ý" (`type: "dialogue"`)

Một hội thoại 2–3 bên. Các lượt hiện theo đúng thứ tự, nhưng lượt `hidden: true` **phải che đi ban đầu** — đó là gợi ý. Người học đọc câu hỏi, **tự trả lời theo ý mình** (nói hoặc gõ), rồi mới bấm "Xem gợi ý" để đối chiếu. **Không có đáp án đúng/sai** — không chấm tự động.

```jsonc
{
  "id": 12, "type": "dialogue",
  "prompt": "Đặt bàn nhà hàng",          // tiêu đề/bối cảnh
  "turns": [
    { "speaker": "Nhân viên", "text": "Good evening! Do you have a reservation?", "hidden": false },
    { "speaker": "Khách",     "text": "Yes, under the name Hung, for two people.", "hidden": true },
    { "speaker": "Nhân viên", "text": "Would you like still or sparkling water?", "hidden": false },
    { "speaker": "Khách",     "text": "Still water, please.", "hidden": true }
  ],
  "explanation": "\"Under the name ...\" dùng khi xác nhận đặt chỗ."
}
```

Gợi ý dựng UI: hiển thị như khung chat, mỗi `speaker` một bên/màu; lượt ẩn là ô mờ có nút "Xem gợi ý" (kèm ô để người học tự nhập câu trả lời của mình trước). Hết hội thoại thì hiện `explanation`.

Ghi nhận kết quả: vì không chấm được tự động, người học **tự đánh giá** — dùng flow Review của đề (`POST /api/review/{cardId}/answer` với rating 1–4), giống như lật thẻ.

Lấy danh sách: `GET /api/questions?type=dialogue`. Trộn đề chỉ gồm dialogue: `POST /api/exercises/compose` với `from: { types: ["dialogue"] }`.

## Ngân hàng câu hỏi & trộn đề

Câu hỏi là **thực thể độc lập** (ngân hàng), đề chỉ là danh sách tham chiếu — một câu có thể nằm trong nhiều đề, **không nhân bản dữ liệu**. Sửa câu ở đâu thì mọi đề chứa nó cùng cập nhật.

### Duyệt ngân hàng — `GET /api/questions`

Query: `type=mcq|cloze|dialogue`, `q` (tìm trong prompt), `exerciseId` (chỉ câu đang trong đề đó), `tag` (tag gắn trực tiếp vào câu), `collection` (câu thuộc đề nằm trong collection này, gồm cả nhánh con), `page`, `limit`. Mỗi câu kèm `usedIn: [{id, title, slug}]` — các đề đang chứa nó — dùng cho UI tick chọn câu khi trộn đề.

### Trộn đề — `POST /api/exercises/compose`

Tạo đề mới (`source: "composed"`) bằng cách **liên kết** câu có sẵn. Đề gốc giữ nguyên; `sourceExercise: {id, title, slug}` trên mỗi câu cho biết đề gốc đã tạo ra nó.

```jsonc
POST /api/exercises/compose
{
  "title": "Ôn tổng hợp tuần 3",       // optional, mặc định "Mixed — <ngày>"
  "tags": ["tong-hop"],                 // tag cho đề mới
  "from": {                             // các điều kiện dưới OR với nhau
    "questionIds": [3, 7],              // chọn câu đích danh (id lấy từ GET /api/questions)
    "questionTags": ["idioms"],         // HOẶC câu mang tag này (tag gắn trực tiếp vào câu)
    "exerciseIds": [1, 2],              // HOẶC toàn bộ câu của các đề này
    "tags": ["phrasal-verbs"],          // HOẶC câu của đề thuộc tag này
    "collectionIds": [4],               // HOẶC câu của các đề nằm trong collection này (gồm nhánh con)
    "types": ["mcq"]                    // lọc loại câu — bỏ = mcq + cloze + dialogue
  },                                    // from: {} = cả ngân hàng câu hỏi
  "count": 20,                          // số câu tối đa (chọn ngẫu nhiên)
  "order": "by-type"                    // "shuffle" (mặc định) | "by-type" (mcq → cloze → dialogue) | "source" (gom theo đề gốc)
}
→ 201, data = Exercise đầy đủ (có thẻ FSRS riêng, ôn được như đề thường)
```

Lỗi 422 khi nguồn không khớp đề/câu hỏi nào. Đề composed lọc được: `GET /api/exercises?source=composed`.

Lưu ý ngữ nghĩa xóa/sửa: xóa một đề chỉ xóa những câu **không còn nằm trong đề nào khác**; sửa đề bằng PATCH/re-import thay bộ câu của đề đó (câu cũ đang được đề khác dùng thì vẫn giữ).

## Biết bao nhiêu từ cần ôn / sắp quên

Trong FSRS, **"đến hạn" chính là "sắp quên"** — thuật toán tính cho mỗi từ thời điểm mà xác suất còn nhớ tụt xuống ngưỡng. Không cần logic dự đoán riêng, cứ đọc số due:

- `GET /api/stats/overview` → `due: { now, today, tomorrow }` cho badge 🔴 và câu nhắc; kèm `cards` (số thẻ theo state) và `streak` (số ngày ôn liên tiếp).
- `GET /api/review/due?type=word&limit=20` → danh sách từ cụ thể, quá hạn lâu nhất lên đầu, kèm nội dung đầy đủ.
- `GET /api/stats/tags` → `dueCount` theo tag, cho UI kiểu "Unit 3: còn 4 từ cần ôn".

Muốn ôn dưới dạng bài tập thay vì lật thẻ: lấy `wordIds` từ `review/due` rồi gọi `POST /api/practice/quiz` với `filter: { wordIds: [...] }`, kết thúc buổi thì `POST /api/practice/answer` để kết quả tính vào lịch FSRS.

## Nhắc nhở qua thông báo điện thoại (PWA + Web Push)

Khi app đóng thì JavaScript không chạy, nên app **không thể tự hẹn giờ nhắc**. Cách duy nhất đáng tin cậy là Web Push: server đẩy thông báo, hệ điều hành đánh thức service worker để hiện lên. Server đã làm sẵn phần cron (8h sáng & 20h tối giờ VN, chỉ gửi khi thật sự có từ đến hạn) — FE cần 3 việc:

**1. Đăng ký service worker** có handler `push` + `notificationclick` — file mẫu: `samples/pwa/service-worker.js` (đặt ở gốc site).

**2. Nút "Bật nhắc nhở"** — phải gọi từ thao tác bấm của người dùng, trình duyệt chặn nếu gọi tự động:

```js
const { publicKey } = await api("/api/push/vapid-public-key");   // khóa VAPID của server
await Notification.requestPermission();
const sub = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: base64UrlToUint8Array(publicKey),
});
await api("/api/push/subscribe", { method: "POST",
  body: JSON.stringify({ ...sub.toJSON(), label: "iPhone của Hưng" }) });
```

Tắt: `subscription.unsubscribe()` rồi `POST /api/push/unsubscribe` với `{endpoint}`.

**3. Xử lý ràng buộc iOS** — iPhone chỉ cho bật thông báo khi app đã được "Chia sẻ → Thêm vào MH chính" và mở từ icon đó. Hiện hướng dẫn thay vì báo lỗi (hàm `needsInstallOnIos()` trong file mẫu). Android/Chrome không có ràng buộc này.

Code mẫu đầy đủ cả 3 việc: **`samples/pwa/push-client.js`** — copy vào dự án FE là chạy được.

Payload server gửi xuống service worker:

```jsonc
{ "title": "Den gio on tap roi!", "body": "Ban co 5 tu va 2 bai tap can on hom nay.",
  "url": "https://hungnt-ds.github.io", "count": 7, "tag": "vocab-reminder" }
```

`count` dùng cho `navigator.setAppBadge()` (số trên icon app), `tag` cố định nên thông báo mới thay thế cái cũ thay vì chồng chất.

Các endpoint hỗ trợ: `GET /api/push/devices` (danh sách máy đang bật, endpoint được che bớt), `POST /api/push/test` (gửi thử ngay để người dùng thấy nó hoạt động).

## Phân biệt 2 loại "bài tập"

| | `/api/practice/quiz` | `/api/exercises` (+ `/generate`, `/import`) |
|---|---|---|
| Lưu DB | Không — dùng xong bỏ | Có — bài tập lâu dài, có thẻ FSRS riêng |
| Nguồn | Sinh tự động từ kho từ | Tự soạn (JSON/Markdown) hoặc generate |
| Ghi kết quả | `POST /api/practice/answer` (theo wordId) | Flow Review (`/api/review/.../answer` theo card của exercise) |
| Dùng khi | Luyện nhanh hàng ngày | Bộ đề cố định muốn làm lại nhiều lần |
