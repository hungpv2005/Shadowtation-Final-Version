# Thư viện nguồn Dictation

## Lưu trữ

`lessons.audio_url` là URL player nạp. `media_type` phân loại `AUDIO`, `VIDEO`, `PODCAST`; `source_name` và `source_url` lưu nguồn gốc để kiểm duyệt/ghi công. Mỗi bài phải có `lesson_sentences` với transcript đã duyệt và mốc `start_time` / `end_time`; backend chỉ trả bài `PUBLISHED`. Tệp audio nên đặt trên object storage/CDN có quyền sử dụng, không nhúng bản sao vào database.

Ba bài audio hội thoại mẫu dùng các tệp trong `frontend/public/audio/`, được Next.js phục vụ tại `/audio/`. Hãy giữ các MP3 này trong Git vì dữ liệu seed tham chiếu trực tiếp đến chúng.

## Thêm một bài

1. Chọn nội dung có giấy phép rõ ràng hoặc được chủ sở hữu cho phép. Ghi tên nguồn, URL gốc, license/credit và trình độ.
2. Đưa audio lên object storage/CDN hoặc dùng URL player nhúng được nhà cung cấp cho phép. Với YouTube, chỉ lưu video ID/URL và dùng YouTube embed player; không tải video, tách track audio hay cache nội dung.
3. Tạo `lessons` ở trạng thái `DRAFT`, gán `media_type`, `audio_url`, `source_name`, `source_url`, `level`.
4. Tạo từng câu trong `lesson_sentences`, kiểm tra transcript và timestamp khớp chính xác với media. `words_json` chứa timestamp từng từ; không tự chia đều timestamp khi cần chấm cấp từ.
5. Rà soát quyền sử dụng, âm thanh, transcript, timestamps và quyền Premium; sau đó mới đổi trạng thái sang `PUBLISHED`.

API hiện lọc thư viện bằng `GET /api/v1/practice/dictation/lessons?level=BEGINNER&mediaType=AUDIO&q=daily`. Khi học viên chọn một bài, frontend điều hướng tới `/practice/dictation?lesson=<id>`, tải các câu từ `/api/v1/lessons/:id/sentences`, phát đúng đoạn hiện tại và lưu bản nháp. Nộp bài gửi `sentenceId`, text, số gợi ý và trạng thái transcript; backend tự chấm lại WER, áp dụng mức trừ, lưu attempts/scores, cập nhật Review List và streak trong transaction.

## Nguồn catalog tham khảo

- LibriVox cung cấp catalog API có thể tìm theo title/author/genre và trả audiobook/track metadata. Có thể dùng để khám phá thêm nguồn audio; cần chọn riêng từng track tiếng Anh, xác nhận tình trạng public domain theo nơi triển khai, bổ sung transcript và căn timestamp trước khi đưa vào bài Dictation. Trang LibriVox lưu ý recording public domain tại Hoa Kỳ không đồng nghĩa tự động public domain ở mọi quốc gia.
- Nội dung phổ biến trên web/YouTube không tự động được phép tải lại hoặc biến thành bài có chấm điểm. Chỉ thêm khi có license/ủy quyền và transcript phù hợp.

Áp dụng schema bằng `npm run migration:run` trong `backend-api`; migration không tự chạy khi Core API khởi động. Nạp dữ liệu mẫu bằng `npm run seed`.
