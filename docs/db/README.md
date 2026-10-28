# Cơ sở dữ liệu - các điều chỉnh so với SRS mục 3.3.2

`schema.sql` và các entity trong `backend-api/src/database/entities/` bám theo SRS, kèm các điều chỉnh sau.
Mỗi điều chỉnh cần được cập nhật lại vào SRS ở Giai đoạn 0.

| # | Chỗ điều chỉnh | Lý do |
|---|---|---|
| 1 | `lessons.level`: VARCHAR(10) -> VARCHAR(20) | 'INTERMEDIATE' dài 12 ký tự, không vừa VARCHAR(10) |
| 2 | `lessons.audio_url`, `user_attempts.audio_url`: VARCHAR(255) -> VARCHAR(500) | URL S3/CDN thường dài hơn 255 ký tự |
| 3 | `scores.fluency_score`, `scores.completeness_score`: bỏ NOT NULL | Bài Dictation không có hai chỉ số này |
| 4 | Thêm `users.is_active` | UC-01 (hậu điều kiện) và UC-09 (khóa/mở khóa tài khoản) cần cột này |
| 5 | Thêm `user_attempts.used_transcript_hint` | UC-02 (A5) ghi nhận việc bật Toggle Transcript |
| 6 | Thêm `review_lists.wrong_count`, `priority_score`, UNIQUE (user_id, weak_word) | Cần để tính Priority Score và upsert (INSERT ... ON CONFLICT) |
| 7 | Thêm UNIQUE (user_id, study_date) cho `streak_logs` | Ghi streak nhiều lần trong ngày không bị trùng dòng |
| 8 | Thêm bảng `system_configs` | NFR-SL-04: ngưỡng và giới hạn chỉnh qua Admin Panel |
| 9 | Thêm bảng `refresh_tokens` | UC-01: cần lưu (bản băm của) refresh token để thu hồi |
| 10 | `lesson_sentences.words_json` dùng dạng `[{word, start, end}]` | Mục 3.3.3.1 cần mốc thời gian từng từ cho karaoke; mục 3.3.2.5 lại mô tả từ loại và nghĩa. Hai mô tả mâu thuẫn, chọn dạng mốc thời gian |
| 11 | Chỉ mục (index) cho các truy vấn thường dùng | Hiệu năng (NFR-PF-05) |
| 12 | Thêm bảng `password_reset_tokens` | UC-01 (A2): lưu (bản băm của) token đặt lại mật khẩu có thời hạn để khôi phục |
| 13 | `streak_logs.daily_points` | Cộng 1 điểm mỗi lượt hoàn thành trong ngày; streak vẫn chỉ tăng một lần/ngày |
| 14 | `review_lists.source_type`, `accuracy_score`, `error_type`, `last_attempt_id`, `correct_streak` | Giữ nguồn, điểm/lỗi gần nhất và tiến độ hai lần trả lời đúng liên tiếp cho UC-07 |

Chưa làm (bổ sung bằng migration mới khi tới giai đoạn cần): `audit_logs` (UC-09).

`schema.sql` có thêm các ràng buộc CHECK (role, status, type...) mà TypeORM không tự theo dõi.
Kiểm tra giá trị hợp lệ ở tầng ứng dụng (DTO + class-validator) vẫn là bắt buộc.
