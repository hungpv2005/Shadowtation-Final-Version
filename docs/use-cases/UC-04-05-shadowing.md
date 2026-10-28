# UC-04 / UC-05 — Shadowing và chấm phát âm AI

## Luồng học

1. Trang chủ mở chung thư viện bài Dictation với `mode=shadowing`; người học vẫn dùng được bộ lọc, bài audio/video/podcast và chức năng thêm nguồn riêng.
2. Chọn bài sẽ mở chính trang luyện tập đó ở chế độ Shadowing. Hai nút Dictation và Shadowing + AI giữ nguyên bài và câu hiện tại khi chuyển chế độ.
3. Trình phát dùng timestamp của câu và từ để làm nổi bật lời thoại karaoke. Transcript có thể ẩn/hiện độc lập với kết quả.
4. Người học cấp quyền microphone, ghi âm một câu bằng MediaRecorder, nghe lại bản ghi trên trình duyệt rồi gửi. Tệp tối đa 5 MB.
5. API tạo attempt `SHADOWING` ở trạng thái `PENDING` và trả `202 Accepted`. Giao diện hỏi trạng thái mỗi 2 giây, rồi hiển thị điểm tổng, Accuracy, Fluency, Completeness và điểm màu từng từ.
6. Từ có điểm dưới 80 được đưa vào Review List. Từ bị bỏ sót hoặc dưới 50 điểm màu đỏ; 50–79 màu vàng; từ đạt ít nhất 80 màu xanh.
7. Chọn “Thử lại câu” đánh dấu attempt cũ đã bỏ và cho phép ghi âm lượt mới.

## API

- `POST /api/v1/practice/shadowing/submit` — yêu cầu JWT; multipart gồm `sentence_id` và `audio_file`.
- `GET /api/v1/practice/shadowing/status/:attemptId` — chỉ chủ sở hữu attempt được xem trạng thái và điểm.
- `POST /api/v1/practice/shadowing/:attemptId/discard` — đánh dấu attempt đã bỏ khi người học luyện lại.

## Lưu trữ và xử lý

- Tệp được tải lên S3/MinIO khi cấu hình `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY` và `S3_SECRET_KEY`; nếu chưa cấu hình, môi trường phát triển lưu tệp trong `backend-api/uploads/shadowing`.
- Hàng đợi hiện dùng các bản ghi `user_attempts` trạng thái `PENDING` làm hàng đợi bền vững trong PostgreSQL. API process xử lý nền tối đa hai lượt cùng lúc, tự phục hồi `PENDING`/`PROCESSING` sau khi khởi động lại, chuẩn hóa bằng FFmpeg và gọi Azure Speech.
- Timeout AI là 8 giây mỗi lần gọi; hệ thống thử lại tối đa ba lần với thời gian chờ 2, 4 và 8 giây. Kết quả được lưu trong `scores.words_score_detail`; trọng số điểm tổng có thể cấu hình ở `system_configs` bằng `shadowing.score_weights` và ngưỡng màu bằng `shadowing.score_thresholds`.
- Luồng này chưa dùng Redis/BullMQ hoặc provider AI dự phòng; hàng đợi PostgreSQL giữ được attempt khi API khởi động lại nhưng worker vẫn chạy trong Core API process.
