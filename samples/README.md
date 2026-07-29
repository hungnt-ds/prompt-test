# Mẫu file Markdown cho vocab-api (gửi FE)

Hai loại file, phân biệt bằng `type` trong frontmatter. Spec đầy đủ: README gốc của repo hoặc trang `/docs` của API.

| File | Loại | Nội dung minh họa |
|---|---|---|
| `vocab-sample.md` | `type: vocab` | 5 từ: nhiều nghĩa, ví dụ theo từng nghĩa, phát âm, Note nhiều dòng, Marks (favorite/difficult), Tags riêng từng từ |
| `exercise-sample.md` | `type: exercise` | 2 câu mcq + 2 câu cloze (nhiều chỗ trống, nhiều đáp án `\|`), Explanation, slug để re-import upsert |

## Cách FE upload

**Nhiều file một lần** (khuyên dùng — tự nhận diện loại từng file):

```js
const form = new FormData();
for (const file of selectedFiles) form.append("files", file); // input <input type="file" multiple accept=".md">
const res = await fetch(`${API}/api/import?mode=upsert`, {
  method: "POST",
  headers: { Authorization: `Bearer ${API_KEY}` },
  body: form,
});
// data.files[i] = { name, type: "vocab"|"exercise"|null, ok, created, updated, items, errors }
// file lỗi parse: ok=false + errors[{line, message}] — hiển thị cho người dùng sửa; các file khác vẫn được nạp
```

**Một file dạng raw text**: `POST /api/words/import` hoặc `POST /api/exercises/import`, body là chuỗi markdown, lỗi parse trả 422.

Lưu ý cho FE:
- Response luôn theo envelope `{code, message, data, pagination?}`.
- `mode=upsert` (mặc định): trùng headword/slug thì cập nhật nội dung nhưng **giữ tiến độ ôn tập (FSRS)**; `mode=create`: trùng thì đánh dấu `action: "conflict"`, không ghi đè.
- Import xong, item mới xuất hiện ngay trong `GET /api/review/due` (thẻ ôn trạng thái `new`).
