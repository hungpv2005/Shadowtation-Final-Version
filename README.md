# Shadowtation — Website học tiếng Anh bằng Dictation & Shadowing

> **Đồ án chuyên ngành** — Trường Công nghệ thông tin, Đại học Phenikaa.  
> **Học phần:** Đồ án chuyên ngành-1-1-26 (N03).  
> **Giảng viên hướng dẫn:** ThS. Nguyễn Thị Dinh.  
> **Nhóm sinh viên thực hiện:**  
> - Phạm Văn Hùng (MSV : 23011943)
> - Nguyễn Mạnh Cường (MSV : 23010064)

---

## 📌 Giới thiệu dự án

**Shadowtation** là nền tảng học và luyện tập Nghe – Nói tiếng Anh hiện đại kết hợp hai phương pháp cốt lõi:

* **Dictation (Nghe chép chính tả):** Học viên nghe từng câu audio/video mẫu, gõ lại nội dung. Hệ thống so khớp thời gian thực dựa trên thuật toán WER (Word Error Rate) và khoảng cách Levenshtein, hỗ trợ gợi ý từ (Hint) và phân tích từ sai.
* **Shadowing (Nói nhại & Chấm điểm phát âm AI):** Học viên nghe câu mẫu và ghi âm nhại lại. AI (OpenAI Whisper / Microsoft Azure Speech SDK) chấm điểm phát âm chi tiết từng từ (Độ chính xác - Accuracy, Độ trôi chảy - Fluency, Độ hoàn thiện - Completeness), tô màu trực quan (Xanh / Vàng / Đỏ).
* **Cá nhân hóa việc học:** Hệ thống theo dõi chuỗi ngày học (**Streak**), biểu đồ tiến độ học tập (**Dashboard**), và tự động đưa các từ phát âm kém / viết sai vào danh sách ôn tập cá nhân (**Review List**) theo mức độ ưu tiên.
* **Gói thành viên & Thanh toán:** Hỗ trợ nâng cấp gói Premium tự động thông qua cổng thanh toán **VNPAY Sandbox** và **Stripe**.
* **Quản trị hệ thống (Admin):** Cung cấp công cụ quản trị bài học, tự động trích xuất nội dung từ YouTube Transcript, quản lý người dùng và cấu hình tham số vận hành.

---

## 🛠️ Ngăn xếp công nghệ (Tech Stack)

Dự án được xây dựng theo kiến trúc **Modular Monolith** sử dụng 100% **TypeScript**:

| Tầng / Thành phần | Công nghệ sử dụng | Thư mục mã nguồn |
|---|---|---|
| **Giao diện (Frontend)** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Zustand, wavesurfer.js, Lucide Icons | `frontend/` |
| **Máy chủ (Backend API)** | NestJS 10, TypeORM, Passport.js, JWT, BullMQ, Fluent-ffmpeg, Swagger UI | `backend-api/` |
| **Công nghệ AI & Audio** | OpenAI Whisper API, Azure Speech SDK, YouTube Transcript API | `backend-api/src/speech/` |
| **Cơ sở dữ liệu & Cache** | PostgreSQL 15 (JSONB, pgcrypto), Redis 7 (alpine) | Docker Compose (`5432`, `6379`) |
| **Lưu trữ file âm thanh** | MinIO S3 / AWS S3 (hỗ trợ lưu cục bộ `backend-api/uploads/shadowing`) | — |
| **Cổng thanh toán** | VNPAY (sandbox), Stripe | `backend-api/src/payment/` |

---

## 📂 Cấu trúc thư mục

```text
Shadowtation/
├── docs/                        # Tài liệu SRS, lược đồ CSDL, use-case specifications
│   ├── db/                      # schema.sql và tài liệu lược đồ cơ sở dữ liệu
│   └── use-cases/               # Đặc tả chi tiết các Use Case (UC-01 -> UC-10)
├── frontend/                    # Ứng dụng Next.js 14
│   ├── public/                  # Static assets, audio demo
│   └── src/
│       ├── app/                 # Next.js App Router (admin, practice, dashboard, auth...)
│       ├── components/          # Reusable UI components
│       └── store/               # Zustand global state stores
├── backend-api/                 # Core API & Xử lý Speech (NestJS)
│   ├── src/
│   │   ├── auth/                # Đăng ký, đăng nhập, JWT, OAuth, đổi mật khẩu
│   │   ├── database/            # Entities, migrations, seed data
│   │   ├── health/              # Healthcheck endpoint
│   │   ├── learning/            # Dashboard học tập, Streak, Review List
│   │   ├── lesson/              # Quản lý bài học, trích xuất YouTube Transcript
│   │   ├── payment/             # Tích hợp VNPAY, Stripe
│   │   ├── practice/            # Logic làm bài Dictation & Shadowing
│   │   ├── speech/              # Chấm điểm phát âm bằng AI (Whisper / Azure)
│   │   ├── subscription/        # Gói cước và quản lý hạn dùng học viên
│   │   └── system-config/       # Cấu hình ngưỡng điểm và giới hạn vận hành
│   ├── nest-cli.json
│   └── tsconfig.json
├── .env.example                 # Mẫu biến môi trường cho Backend
├── docker-compose.yml           # Thiết lập Docker cho PostgreSQL 15 & Redis 7
└── README.md
```

---

## 💻 Yêu cầu môi trường

Trước khi cài đặt, hãy đảm bảo máy tính đã cài sẵn:

* **Node.js:** Phiên bản `>= 20.x LTS` (Khuyên dùng Node 20 hoặc 22)
* **npm:** Phiên bản `>= 10.x`
* **Docker & Docker Compose:** Để chạy PostgreSQL và Redis
* **FFmpeg:** Đã có trong biến môi trường `PATH` (phục vụ xử lý định dạng audio khi luyện Shadowing)
* **Git**

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy từng bước

### Bước 1: Khởi động cơ sở dữ liệu (PostgreSQL & Redis)

Tại thư mục gốc của dự án, khởi chạy các container Docker:
```bash
docker compose up -d
```
*Lệnh này sẽ khởi động PostgreSQL (cổng 5432) và Redis (cổng 6379).*

### Bước 2: Thiết lập file môi trường (.env)

1. **Tạo file môi trường cho Backend (ở thư mục gốc):**
   ```bash
   # Windows PowerShell:
   Copy-Item .env.example .env

   # Linux / macOS:
   cp .env.example .env
   ```
   *File `.env` mặc định đã có cấu hình kết nối chuẩn với PostgreSQL và Redis của Docker. Bạn có thể bổ sung `OPENAI_API_KEY` nếu muốn kiểm tra chấm phát âm thực tế.*

2. **Tạo file môi trường cho Frontend:**
   ```bash
   # Windows PowerShell:
   Copy-Item frontend\.env.example frontend\.env.local

   # Linux / macOS:
   cp frontend/.env.example frontend/.env.local
   ```

### Bước 3: Cài đặt thư viện dependencies

1. **Cài đặt cho Backend:**
   ```bash
   cd backend-api
   npm install
   ```

2. **Cài đặt cho Frontend:**
   ```bash
   cd ../frontend
   npm install
   cd ..
   ```

### Bước 4: Khởi tạo Database & Dữ liệu mẫu (Seed Data)

Nếu cơ sở dữ liệu của bạn là mới hoàn toàn, chạy các lệnh sau trong thư mục `backend-api`:

```bash
cd backend-api

# Chạy migration tạo các bảng:
npm run migration:run

# Nạp dữ liệu mẫu (Tài khoản mẫu, gói cước, bài học mẫu):
npm run seed
```

### Bước 5: Khởi động ứng dụng

Mở **2 cửa sổ Terminal** riêng biệt để chạy đồng thời Backend và Frontend:

* **Terminal 1 — Chạy Backend API (Port 4000):**
  ```bash
  cd backend-api
  npm run start:dev
  ```
  *Server chạy tại:* `http://localhost:4000/api/v1`

* **Terminal 2 — Chạy Frontend Client (Port 3000):**
  ```bash
  cd frontend
  npm run dev
  ```
  *Ứng dụng web chạy tại:* `http://localhost:3000`

---

## 🔑 Tài khoản kiểm thử có sẵn

Hệ thống cung cấp sẵn các tài khoản thử nghiệm sau khi chạy `npm run seed`:

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn & Chức năng |
|---|---|---|---|
| **Admin** | `admin@shadowtation.local` | `Admin@123456` | Toàn quyền quản trị bài học, người dùng và tham số hệ thống |
| **Học viên Premium** | `premium@shadowtation.local` | `Premium@123456` | Mở khóa toàn bộ bài học, không giới hạn lượt chấm AI và Review List |
| **Học viên Miễn phí** | `student@shadowtation.local` | `Student@123456` | Trải nghiệm học Dictation và giới hạn lượt chấm Shadowing hằng ngày |

---

## 🔗 Liên kết & Điểm truy cập quan trọng

* 🌐 **Giao diện Website:** [http://localhost:3000](http://localhost:3000)
* 📖 **Tài liệu Swagger API (OpenAPI):** [http://localhost:4000/docs](http://localhost:4000/docs)
* 🩺 **API Health Check:** [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

---

## 📊 Danh sách tính năng theo Use Case (SRS)

| Mã Use Case | Tên chức năng | Trạng thái |
|---|---|:---:|
| **UC-01** | Xác thực & Phân quyền (Đăng ký, Đăng nhập, Quên mật khẩu, Refresh Token, Google OAuth) | ✅ Hoàn thành |
| **UC-02** | Luyện Dictation (Nghe chép chính tả, so khớp WER/Levenshtein, gợi ý từ, trừ điểm Hint) | ✅ Hoàn thành |
| **UC-03** | Xem kết quả Dictation & Phân tích chi tiết câu/từ | ✅ Hoàn thành |
| **UC-04** | Luyện Shadowing (Ghi âm câu theo nhịp, xử lý audio FFmpeg) | ✅ Hoàn thành |
| **UC-05** | Chấm điểm phát âm bằng AI (Độ chính xác, lưu loát, hoàn thiện, tô màu từ) | ✅ Hoàn thành |
| **UC-06** | Dashboard học tập cá nhân & Duy trì Streak điểm danh | ✅ Hoàn thành |
| **UC-07** | Review List & Luyện tập lại từ vựng yếu (Vocabulary Review) | ✅ Hoàn thành |
| **UC-08** | Quản trị bài học (Tạo bài thủ công, nhập tự động từ YouTube Transcript) | ✅ Hoàn thành |
| **UC-09** | Quản trị người dùng & Cấu hình ngưỡng hệ thống (Admin Panel) | ✅ Hoàn thành |
| **UC-10** | Đăng ký & Thanh toán gói học Premium (VNPAY Sandbox / Stripe) | ✅ Hoàn thành |

---

## 📜 Quy ước đóng góp & Làm việc với Git

* Nhánh chính: `main` (chỉ chứa mã nguồn ổn định).
* Nhánh tính năng: `feat/<tên-tính-năng>`, ví dụ `feat/shadowing-speech-ai`.
* Tiền tố commit chuẩn:
  * `feat:` Tính năng mới
  * `fix:` Sửa lỗi
  * `docs:` Cập nhật tài liệu
  * `chore:` Cập nhật cấu hình, dependencies
  * `test:` Thêm hoặc sửa test case
* **Bảo mật:** Tuyệt đối không commit các file bí mật (`.env`, `.env.local`, API keys, private credentials).
