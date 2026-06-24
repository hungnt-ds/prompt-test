export function preserveMultipleNewlines(text: string): string {
  // Thay thế các khoảng trắng liên tiếp (3 dấu \n trở lên) thành các đoạn văn <p>&nbsp;</p>
  // Để người dùng có thể nhấn Enter nhiều lần tạo khoảng trống lớn.
  return text.replace(/\n{3,}/g, (match) => {
    // Nếu có N dấu \n (N >= 3), ta chèn (N - 2) dòng chứa &nbsp;
    const emptyLinesCount = match.length - 2;
    return '\n\n' + '&nbsp;\n\n'.repeat(emptyLinesCount);
  });
}
