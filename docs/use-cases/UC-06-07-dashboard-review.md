# Thiết kế UC-06 và UC-07: Dashboard, Streak và Review List

## Phạm vi

- **UC-06:** Dashboard cá nhân hiển thị thời lượng audio đã luyện, số lượt hoàn thành, độ chính xác, biểu đồ theo khoảng 7 ngày/30 ngày/toàn bộ, trạng thái tài khoản và lịch Streak.
- **UC-07:** Sổ tay từ yếu tổng hợp từ kết quả Dictation và Shadowing. Người học luyện gợi nhớ từ trong câu đã làm; hai câu trả lời đúng liên tiếp sẽ gỡ mục đó khỏi danh sách.
- Mỗi lượt hoàn thành cộng 1 điểm nỗ lực trong ngày. Điểm được lưu tại `streak_logs.daily_points`; một ngày chỉ tạo một streak log và chỉ tăng chuỗi Streak một lần.

## Dữ liệu Review List

`review_lists` tiếp tục lưu một mục duy nhất theo `(user_id, weak_word)`. Mỗi lần gặp lại lỗi, hệ thống tăng `wrong_count`, tính lại `priority_score` và lưu nguồn, điểm/lỗi gần nhất cùng attempt tham chiếu. Dictation đưa từ thay thế/bỏ sót vào danh sách; Shadowing đưa từ có trạng thái màu Vàng/Đỏ vào danh sách. Từ xanh không được thêm.

Các trường mở rộng:

| Trường | Dùng cho |
|---|---|
| `source_type` | Nguồn lỗi gần nhất: `DICTATION`, `SHADOWING` hoặc `LEGACY` |
| `accuracy_score`, `error_type` | Kết quả gần nhất dùng để giải thích vì sao từ cần ôn |
| `last_attempt_id` | Tra lại câu và tên bài học làm ngữ cảnh gợi nhớ |
| `correct_streak` | Tiến độ đúng liên tiếp trong micro-lesson UC-07 |

## API

Tất cả route bên dưới yêu cầu JWT. `userId` luôn lấy từ principal:

| Method / route | Mục đích |
|---|---|
| `GET /api/v1/users/progress?period=7d\|30d\|all` | Tổng hợp chỉ số, biểu đồ và 5 mục ôn ưu tiên |
| `GET /api/v1/users/streak-logs?days=35` | Trả lịch ngày học và điểm nỗ lực từng ngày |
| `GET /api/v1/users/review-list` | Trả toàn bộ từ của học viên, gồm nguồn/điểm/lỗi/ngữ cảnh |
| `POST /api/v1/users/review-list/:id/answer` | Kiểm tra micro-lesson, cập nhật độ ưu tiên hoặc gỡ mục sau hai lần đúng liên tiếp |

Thời lượng học trên Dashboard được ước tính bằng tổng thời lượng các câu đã hoàn thành (`end_time - start_time`), không phải thời gian đồng hồ mà người học mở trang. Biểu đồ dùng ngày cho 7/30 ngày và tuần cho toàn bộ lịch sử; ngày/tuần không có lượt luyện được giữ làm khoảng trống.

## Điều hướng

- Đăng nhập thành công chuyển tới `/dashboard`.
- Thẻ UC-06 ở trang chủ mở `/dashboard`; URL cũ `/features/uc-06` chuyển hướng tới Dashboard.
- Thẻ UC-07, mục “Ôn từ” trên thanh điều hướng và đề xuất trên Dashboard mở `/features/uc-07`.
- Từ UC-07 có thể quay lại Dashboard hoặc mở thư viện bài Dictation/Shadowing.
