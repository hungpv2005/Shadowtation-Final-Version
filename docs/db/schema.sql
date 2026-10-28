-- Shadowtation - lược đồ CSDL tham chiếu (PostgreSQL 13+; gen_random_uuid() có sẵn).
-- Nguồn: SRS mục 3.3.2, kèm các điều chỉnh ghi ở docs/db/README.md.
-- Dùng khi cần dựng nhanh DB bằng tay:  psql -U postgres -d shadowtation -f docs/db/schema.sql
-- Quy trình chính thức của dự án là migration TypeORM (xem hướng dẫn GĐ2).

BEGIN;

CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              VARCHAR(150) NOT NULL UNIQUE,
  password_hash      VARCHAR(255) NOT NULL,
  full_name          VARCHAR(150) NOT NULL,
  avatar_url         VARCHAR(255),
  role               VARCHAR(20)  NOT NULL DEFAULT 'STUDENT'
                     CHECK (role IN ('STUDENT','PREMIUM_STUDENT','ADMIN')),
  is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
  streak_count       INTEGER      NOT NULL DEFAULT 0,
  premium_expired_at TIMESTAMP,
  created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE subscription_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100)   NOT NULL,
  price         NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
  duration_days INTEGER        NOT NULL CHECK (duration_days > 0),
  is_active     BOOLEAN        NOT NULL DEFAULT TRUE
);

CREATE TABLE payment_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  plan_id         UUID          NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  amount          NUMERIC(12,2) NOT NULL,
  provider        VARCHAR(20)   NOT NULL,
  transaction_ref VARCHAR(100)  NOT NULL UNIQUE,
  status          VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','SUCCESS','FAILED','CANCELLED','EXPIRED')),
  created_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payment_transactions_user   ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status, created_at);

CREATE TABLE lessons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255) NOT NULL,
  level           VARCHAR(20)  NOT NULL
                  CHECK (level IN ('BEGINNER','INTERMEDIATE','ADVANCED')),
  audio_url       VARCHAR(500) NOT NULL,
  media_type      VARCHAR(20)  NOT NULL DEFAULT 'AUDIO'
                  CHECK (media_type IN ('AUDIO','VIDEO','PODCAST')),
  source_name     VARCHAR(150),
  source_url      VARCHAR(500),
  duration_seconds INTEGER,
  created_by_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_premium_only BOOLEAN      NOT NULL DEFAULT FALSE,
  status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                  CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lessons_status_level ON lessons(status, level);
CREATE INDEX idx_lessons_created_by_user ON lessons(created_by_user_id);

CREATE TABLE lesson_sentences (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id    UUID  NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  order_index  INTEGER NOT NULL,
  start_time   REAL  NOT NULL,
  end_time     REAL  NOT NULL CHECK (end_time > start_time),
  text_content TEXT  NOT NULL,
  words_json   JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX idx_lesson_sentences_lesson ON lesson_sentences(lesson_id, start_time);
CREATE UNIQUE INDEX idx_lesson_sentences_order ON lesson_sentences(lesson_id, order_index);

CREATE TABLE user_attempts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sentence_id           UUID         NOT NULL REFERENCES lesson_sentences(id) ON DELETE CASCADE,
  audio_url             VARCHAR(500),
  text_input            TEXT,
  type                  VARCHAR(20)  NOT NULL CHECK (type IN ('DICTATION','SHADOWING')),
  status                VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
  error_code            VARCHAR(40),
  is_discarded           BOOLEAN      NOT NULL DEFAULT FALSE,
  used_transcript_hint  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_attempts_user_created ON user_attempts(user_id, created_at DESC);
CREATE INDEX idx_user_attempts_status       ON user_attempts(status);
CREATE INDEX idx_user_attempts_pending_shadowing ON user_attempts(status, created_at) WHERE type = 'SHADOWING' AND is_discarded = FALSE;

CREATE TABLE scores (
  attempt_id         UUID PRIMARY KEY REFERENCES user_attempts(id) ON DELETE CASCADE,
  overall_score      INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  assessment_source  VARCHAR(20) NOT NULL DEFAULT 'LEGACY',
  accuracy_score     INTEGER NOT NULL CHECK (accuracy_score BETWEEN 0 AND 100),
  fluency_score      INTEGER CHECK (fluency_score BETWEEN 0 AND 100),
  completeness_score INTEGER CHECK (completeness_score BETWEEN 0 AND 100),
  words_score_detail JSONB   NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE streak_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_points INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_streak_logs_user_date UNIQUE (user_id, study_date)
);

CREATE TABLE review_lists (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weak_word      VARCHAR(100) NOT NULL,
  wrong_count    INTEGER      NOT NULL DEFAULT 1,
  priority_score REAL         NOT NULL DEFAULT 0,
  source_type    VARCHAR(20)  NOT NULL DEFAULT 'LEGACY',
  accuracy_score INTEGER,
  error_type     VARCHAR(30),
  last_attempt_id UUID REFERENCES user_attempts(id) ON DELETE SET NULL,
  correct_streak INTEGER NOT NULL DEFAULT 0,
  added_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_review_lists_user_word UNIQUE (user_id, weak_word)
);
CREATE INDEX idx_review_lists_user_priority ON review_lists(user_id, priority_score DESC);

CREATE TABLE system_configs (
  key         VARCHAR(100) PRIMARY KEY,
  value       JSONB     NOT NULL,
  description TEXT,
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP    NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

CREATE TABLE password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP    NOT NULL,
  used_at    TIMESTAMP,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);

COMMIT;
