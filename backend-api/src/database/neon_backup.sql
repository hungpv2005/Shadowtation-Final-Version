--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (f37ae9a)
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.user_attempts DROP CONSTRAINT IF EXISTS user_attempts_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_attempts DROP CONSTRAINT IF EXISTS user_attempts_sentence_id_fkey;
ALTER TABLE IF EXISTS ONLY public.streak_logs DROP CONSTRAINT IF EXISTS streak_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.scores DROP CONSTRAINT IF EXISTS scores_attempt_id_fkey;
ALTER TABLE IF EXISTS ONLY public.review_lists DROP CONSTRAINT IF EXISTS review_lists_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_plan_id_fkey;
ALTER TABLE IF EXISTS ONLY public.password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lesson_sentences DROP CONSTRAINT IF EXISTS lesson_sentences_lesson_id_fkey;
ALTER TABLE IF EXISTS ONLY public.review_lists DROP CONSTRAINT IF EXISTS fk_review_lists_last_attempt;
ALTER TABLE IF EXISTS ONLY public.lessons DROP CONSTRAINT IF EXISTS fk_lessons_created_by_user;
DROP INDEX IF EXISTS public.idx_user_attempts_user_created;
DROP INDEX IF EXISTS public.idx_user_attempts_status;
DROP INDEX IF EXISTS public.idx_user_attempts_pending_shadowing;
DROP INDEX IF EXISTS public.idx_review_lists_user_priority;
DROP INDEX IF EXISTS public.idx_refresh_tokens_user;
DROP INDEX IF EXISTS public.idx_refresh_tokens_hash;
DROP INDEX IF EXISTS public.idx_payment_transactions_user;
DROP INDEX IF EXISTS public.idx_payment_transactions_status;
DROP INDEX IF EXISTS public.idx_password_reset_tokens_user;
DROP INDEX IF EXISTS public.idx_password_reset_tokens_hash;
DROP INDEX IF EXISTS public.idx_lessons_status_level;
DROP INDEX IF EXISTS public.idx_lessons_created_by_user;
DROP INDEX IF EXISTS public.idx_lesson_sentences_order;
DROP INDEX IF EXISTS public.idx_lesson_sentences_lesson;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.user_attempts DROP CONSTRAINT IF EXISTS user_attempts_pkey;
ALTER TABLE IF EXISTS ONLY public.streak_logs DROP CONSTRAINT IF EXISTS uq_streak_logs_user_date;
ALTER TABLE IF EXISTS ONLY public.review_lists DROP CONSTRAINT IF EXISTS uq_review_lists_user_word;
ALTER TABLE IF EXISTS ONLY public.system_configs DROP CONSTRAINT IF EXISTS system_configs_pkey;
ALTER TABLE IF EXISTS ONLY public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_pkey;
ALTER TABLE IF EXISTS ONLY public.streak_logs DROP CONSTRAINT IF EXISTS streak_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.scores DROP CONSTRAINT IF EXISTS scores_pkey;
ALTER TABLE IF EXISTS ONLY public.review_lists DROP CONSTRAINT IF EXISTS review_lists_pkey;
ALTER TABLE IF EXISTS ONLY public.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_transaction_ref_key;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.lessons DROP CONSTRAINT IF EXISTS lessons_pkey;
ALTER TABLE IF EXISTS ONLY public.lesson_sentences DROP CONSTRAINT IF EXISTS lesson_sentences_pkey;
ALTER TABLE IF EXISTS ONLY public.migrations DROP CONSTRAINT IF EXISTS "PK_8c82d7f526340ab734260ea46be";
ALTER TABLE IF EXISTS public.migrations ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_attempts;
DROP TABLE IF EXISTS public.system_configs;
DROP TABLE IF EXISTS public.subscription_plans;
DROP TABLE IF EXISTS public.streak_logs;
DROP TABLE IF EXISTS public.scores;
DROP TABLE IF EXISTS public.review_lists;
DROP TABLE IF EXISTS public.refresh_tokens;
DROP TABLE IF EXISTS public.payment_transactions;
DROP TABLE IF EXISTS public.password_reset_tokens;
DROP SEQUENCE IF EXISTS public.migrations_id_seq;
DROP TABLE IF EXISTS public.migrations;
DROP TABLE IF EXISTS public.lessons;
DROP TABLE IF EXISTS public.lesson_sentences;
DROP EXTENSION IF EXISTS pgcrypto;
--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: lesson_sentences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_sentences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    start_time real NOT NULL,
    end_time real NOT NULL,
    text_content text NOT NULL,
    words_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    order_index integer NOT NULL,
    CONSTRAINT lesson_sentences_check CHECK ((end_time > start_time))
);


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    level character varying(20) NOT NULL,
    audio_url character varying(500) NOT NULL,
    is_premium_only boolean DEFAULT false NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    media_type character varying(20) DEFAULT 'AUDIO'::character varying NOT NULL,
    source_name character varying(150),
    source_url character varying(500),
    duration_seconds integer,
    created_by_user_id uuid,
    CONSTRAINT chk_lessons_media_type CHECK (((media_type)::text = ANY ((ARRAY['AUDIO'::character varying, 'VIDEO'::character varying, 'PODCAST'::character varying])::text[]))),
    CONSTRAINT lessons_level_check CHECK (((level)::text = ANY ((ARRAY['BEGINNER'::character varying, 'INTERMEDIATE'::character varying, 'ADVANCED'::character varying])::text[]))),
    CONSTRAINT lessons_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PUBLISHED'::character varying, 'ARCHIVED'::character varying])::text[])))
);


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    provider character varying(20) NOT NULL,
    transaction_ref character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_transactions_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'SUCCESS'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying, 'EXPIRED'::character varying])::text[])))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    revoked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: review_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    weak_word character varying(100) NOT NULL,
    wrong_count integer DEFAULT 1 NOT NULL,
    priority_score real DEFAULT 0 NOT NULL,
    added_at timestamp without time zone DEFAULT now() NOT NULL,
    source_type character varying(20) DEFAULT 'LEGACY'::character varying NOT NULL,
    accuracy_score integer,
    error_type character varying(30),
    last_attempt_id uuid,
    correct_streak integer DEFAULT 0 NOT NULL
);


--
-- Name: scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scores (
    attempt_id uuid NOT NULL,
    overall_score integer NOT NULL,
    accuracy_score integer NOT NULL,
    fluency_score integer,
    completeness_score integer,
    words_score_detail jsonb DEFAULT '[]'::jsonb NOT NULL,
    assessment_source character varying(20) DEFAULT 'LEGACY'::character varying NOT NULL,
    CONSTRAINT scores_accuracy_score_check CHECK (((accuracy_score >= 0) AND (accuracy_score <= 100))),
    CONSTRAINT scores_completeness_score_check CHECK (((completeness_score >= 0) AND (completeness_score <= 100))),
    CONSTRAINT scores_fluency_score_check CHECK (((fluency_score >= 0) AND (fluency_score <= 100))),
    CONSTRAINT scores_overall_score_check CHECK (((overall_score >= 0) AND (overall_score <= 100)))
);


--
-- Name: streak_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.streak_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    study_date date DEFAULT CURRENT_DATE NOT NULL,
    daily_points integer DEFAULT 0 NOT NULL
);


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    price numeric(12,2) DEFAULT 0.00 NOT NULL,
    duration_days integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT subscription_plans_duration_days_check CHECK ((duration_days > 0))
);


--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configs (
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: user_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sentence_id uuid NOT NULL,
    audio_url character varying(500),
    text_input text,
    type character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    used_transcript_hint boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    error_code character varying(40),
    is_discarded boolean DEFAULT false NOT NULL,
    CONSTRAINT user_attempts_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PROCESSING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying])::text[]))),
    CONSTRAINT user_attempts_type_check CHECK (((type)::text = ANY ((ARRAY['DICTATION'::character varying, 'SHADOWING'::character varying])::text[])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(150) NOT NULL,
    avatar_url character varying(255),
    role character varying(20) DEFAULT 'STUDENT'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    streak_count integer DEFAULT 0 NOT NULL,
    premium_expired_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['STUDENT'::character varying, 'PREMIUM_STUDENT'::character varying, 'ADMIN'::character varying])::text[])))
);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Data for Name: lesson_sentences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lesson_sentences (id, lesson_id, start_time, end_time, text_content, words_json, order_index) FROM stdin;
87e20bea-cd43-4667-9fdc-630cbb2426f4	3ecdce8a-425b-4196-b672-244e12d5b90b	0	2.306	Good morning, how are you today?	[{"end": 0.38, "word": "Good", "start": 0}, {"end": 0.77, "word": "morning", "start": 0.38}, {"end": 1.15, "word": "how", "start": 0.77}, {"end": 1.54, "word": "are", "start": 1.15}, {"end": 1.92, "word": "you", "start": 1.54}, {"end": 2.31, "word": "today", "start": 1.92}]	1
bf27e452-7ab1-4345-bfdf-f6d501a7b1e9	3ecdce8a-425b-4196-b672-244e12d5b90b	2.556	5.227	I am fine, thank you. And you?	[{"end": 2.94, "word": "I", "start": 2.56}, {"end": 3.32, "word": "am", "start": 2.94}, {"end": 3.7, "word": "fine", "start": 3.32}, {"end": 4.08, "word": "thank", "start": 3.7}, {"end": 4.46, "word": "you", "start": 4.08}, {"end": 4.85, "word": "And", "start": 4.46}, {"end": 5.23, "word": "you", "start": 4.85}]	2
0b51e6a2-97d6-455d-bb7c-579d1dd7c21e	3ecdce8a-425b-4196-b672-244e12d5b90b	5.477	8.113	I am doing great, thanks for asking.	[{"end": 5.85, "word": "I", "start": 5.48}, {"end": 6.23, "word": "am", "start": 5.85}, {"end": 6.61, "word": "doing", "start": 6.23}, {"end": 6.98, "word": "great", "start": 6.61}, {"end": 7.36, "word": "thanks", "start": 6.98}, {"end": 7.74, "word": "for", "start": 7.36}, {"end": 8.11, "word": "asking", "start": 7.74}]	3
462b5aeb-d820-46aa-a613-d19c5bfdbd4f	3f2cfd1f-75d3-486d-b622-b5209a1acb90	0	2.993	Can I have a cup of coffee, please?	[{"end": 0.37, "word": "Can", "start": 0}, {"end": 0.75, "word": "I", "start": 0.37}, {"end": 1.12, "word": "have", "start": 0.75}, {"end": 1.5, "word": "a", "start": 1.12}, {"end": 1.87, "word": "cup", "start": 1.5}, {"end": 2.24, "word": "of", "start": 1.87}, {"end": 2.62, "word": "coffee", "start": 2.24}, {"end": 2.99, "word": "please", "start": 2.62}]	1
7841ab91-a7b6-4f86-ac1a-35a011ae47d9	3f2cfd1f-75d3-486d-b622-b5209a1acb90	3.243	5.633	Sure, would you like milk or sugar?	[{"end": 3.58, "word": "Sure", "start": 3.24}, {"end": 3.93, "word": "would", "start": 3.58}, {"end": 4.27, "word": "you", "start": 3.93}, {"end": 4.61, "word": "like", "start": 4.27}, {"end": 4.95, "word": "milk", "start": 4.61}, {"end": 5.29, "word": "or", "start": 4.95}, {"end": 5.63, "word": "sugar", "start": 5.29}]	2
556675da-f305-4e2b-b9c1-5b205c42be85	3f2cfd1f-75d3-486d-b622-b5209a1acb90	5.883	8.056	Just a little milk, thank you.	[{"end": 6.25, "word": "Just", "start": 5.88}, {"end": 6.61, "word": "a", "start": 6.25}, {"end": 6.97, "word": "little", "start": 6.61}, {"end": 7.33, "word": "milk", "start": 6.97}, {"end": 7.69, "word": "thank", "start": 7.33}, {"end": 8.06, "word": "you", "start": 7.69}]	3
f4b2cfab-2197-4b5c-8b9e-571b10d35c59	8ea9527f-779b-4728-8dc6-366f2671d47e	0	2.66	Technology is changing the way we live and work.	[{"end": 0.3, "word": "Technology", "start": 0}, {"end": 0.59, "word": "is", "start": 0.3}, {"end": 0.89, "word": "changing", "start": 0.59}, {"end": 1.18, "word": "the", "start": 0.89}, {"end": 1.48, "word": "way", "start": 1.18}, {"end": 1.77, "word": "we", "start": 1.48}, {"end": 2.07, "word": "live", "start": 1.77}, {"end": 2.36, "word": "and", "start": 2.07}, {"end": 2.66, "word": "work", "start": 2.36}]	1
0066b305-aa84-4a36-9857-1569390cd9fd	8ea9527f-779b-4728-8dc6-366f2671d47e	2.91	6.052	Many people now study English with online tools.	[{"end": 3.3, "word": "Many", "start": 2.91}, {"end": 3.7, "word": "people", "start": 3.3}, {"end": 4.09, "word": "now", "start": 3.7}, {"end": 4.48, "word": "study", "start": 4.09}, {"end": 4.87, "word": "English", "start": 4.48}, {"end": 5.27, "word": "with", "start": 4.87}, {"end": 5.66, "word": "online", "start": 5.27}, {"end": 6.05, "word": "tools", "start": 5.66}]	2
13da0420-6218-4b33-8393-e41ae4da6cdd	8ea9527f-779b-4728-8dc6-366f2671d47e	6.302	9.216	Practice every day and you will improve quickly.	[{"end": 6.67, "word": "Practice", "start": 6.3}, {"end": 7.03, "word": "every", "start": 6.67}, {"end": 7.39, "word": "day", "start": 7.03}, {"end": 7.76, "word": "and", "start": 7.39}, {"end": 8.12, "word": "you", "start": 7.76}, {"end": 8.49, "word": "will", "start": 8.12}, {"end": 8.85, "word": "improve", "start": 8.49}, {"end": 9.22, "word": "quickly", "start": 8.85}]	3
\.


--
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lessons (id, title, level, audio_url, is_premium_only, status, created_at, media_type, source_name, source_url, duration_seconds, created_by_user_id) FROM stdin;
3ecdce8a-425b-4196-b672-244e12d5b90b	Daily Conversation 01	BEGINNER	/audio/daily-conversation-01.mp3	f	PUBLISHED	2026-10-13 09:15:28.843799	AUDIO	Shadowtation sample	/audio/daily-conversation-01.mp3	9	\N
3f2cfd1f-75d3-486d-b622-b5209a1acb90	At the Coffee Shop	BEGINNER	/audio/at-the-coffee-shop.mp3	f	PUBLISHED	2026-10-13 09:15:29.604881	AUDIO	Shadowtation sample	/audio/at-the-coffee-shop.mp3	9	\N
8ea9527f-779b-4728-8dc6-366f2671d47e	Technology and Daily Life	INTERMEDIATE	/audio/technology-and-daily-life.mp3	t	PUBLISHED	2026-10-13 09:15:30.353897	AUDIO	Shadowtation sample	/audio/technology-and-daily-life.mp3	10	\N
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
1	261013000100	AddLessonMediaMetadata20261013000100
2	261013000200	AddPrivateDictationLessons20261013000200
3	261013000300	AddLessonSentenceOrderIndex20261013000300
4	261016000100	AddPasswordResetTokens20261016000100
5	261016000100	CreateRefreshTokens20261016000100
6	261020000100	AddShadowingAttemptMetadata20261020000100
7	261022000100	AddAssessmentSource20261022000100
8	261023000100	AddUc0607ProgressAndReviewData20261023000100
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_transactions (id, user_id, plan_id, amount, provider, transaction_ref, status, created_at) FROM stdin;
55524931-1ad2-45a0-8636-5b10daf7ecb4	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	57b5ec12-38ab-4fb6-960c-687deed37da6	199000.00	VNPAY	TXT_1792238972679_2795	SUCCESS	2026-10-17 12:09:33.611839
e65d1bde-7c13-45ce-a69d-d2aaad64d3a3	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	6a3d92ed-bfa4-4c0a-b6c1-94b648be4241	1990000.00	VNPAY	TXT_1792239045287_6968	SUCCESS	2026-10-17 12:10:46.219548
c0e39145-8fc5-40ae-ad4f-47964403bfa5	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	57b5ec12-38ab-4fb6-960c-687deed37da6	199000.00	VNPAY	TXT_1792240468487_3309	CANCELLED	2026-10-17 12:34:29.41257
1b0470c9-6c84-458d-aec8-9677b705e194	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	57b5ec12-38ab-4fb6-960c-687deed37da6	199000.00	VNPAY	TXT_1792252397264_2767	PENDING	2026-10-17 15:53:18.18588
3fa6761e-7368-4da1-8ace-6e06b2b01585	246d21cd-65e4-4047-a876-4e02645b3fdf	71d2c4bc-790a-4434-a781-08dbae230708	499000.00	MOCK_SANDBOX	TXT_1792946041443_6867	CANCELLED	2026-10-25 16:34:02.533878
4e9052cd-b93e-49a2-8ede-1d191940d54a	246d21cd-65e4-4047-a876-4e02645b3fdf	71d2c4bc-790a-4434-a781-08dbae230708	499000.00	MOCK_SANDBOX	TXT_1792946041815_1706	SUCCESS	2026-10-25 16:34:02.905507
bc2f8b90-8fcb-4fdf-9f6a-1e9acc266a0c	246d21cd-65e4-4047-a876-4e02645b3fdf	71d2c4bc-790a-4434-a781-08dbae230708	499000.00	MOCK_SANDBOX	TXT_1792948532641_6040	CANCELLED	2026-10-25 17:15:33.71897
a19ce9dd-24cd-4ab1-9105-11a8a9dd7943	246d21cd-65e4-4047-a876-4e02645b3fdf	71d2c4bc-790a-4434-a781-08dbae230708	499000.00	MOCK_SANDBOX	TXT_1792948533008_3782	SUCCESS	2026-10-25 17:15:34.086578
6b487511-ef86-4df1-9678-ab1ca7679c3e	246d21cd-65e4-4047-a876-4e02645b3fdf	71d2c4bc-790a-4434-a781-08dbae230708	499000.00	VNPAY	TXT_1792949665816_5895	PENDING	2026-10-25 17:34:26.888868
a630c1cd-d41a-4588-8c0c-f6d6776288eb	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	71d2c4bc-790a-4434-a781-08dbae230708	499000.00	VNPAY	TXT_1792947452286_3185	CANCELLED	2026-10-25 16:57:33.360937
9ce6cc16-cd97-4671-a5b0-bf95c266bdbc	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	71d2c4bc-790a-4434-a781-08dbae230708	499000.00	VNPAY	TXT_1792949724508_6741	SUCCESS	2026-10-25 17:35:25.578339
7f1dab16-f7cc-4346-aae4-d2904c5eb94f	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	71d2c4bc-790a-4434-a781-08dbae230708	499000.00	VNPAY	TXT_1792950222518_2842	SUCCESS	2026-10-25 17:43:43.590935
a06f85a9-cbd6-4651-b57b-d49179fed8d3	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	6a3d92ed-bfa4-4c0a-b6c1-94b648be4241	1990000.00	VNPAY	TXT_1792953558845_7850	SUCCESS	2026-10-25 18:39:19.909906
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, created_at) FROM stdin;
9e09b575-6acf-4d29-972e-d32777822b0f	246d21cd-65e4-4047-a876-4e02645b3fdf	c807d5de93e3a97019df0b5109f76c48cfe27d0648f1f889df8844c6fe21e585	2026-10-20 17:03:19.893	\N	2026-10-13 10:03:20.327844
a9c86441-ffa1-4194-a4a8-d7f10dc87e64	326c385f-57ea-4e5b-9588-6c6464f0a6aa	525577c260cf1b8e446807242e952c02dcac7ec6dc48ccfeaecdac587808f7eb	2026-10-20 17:03:28.848	2026-10-13 17:03:29.162	2026-10-13 10:03:29.274778
c91f20e6-0534-4e95-b507-5cee70abea73	326c385f-57ea-4e5b-9588-6c6464f0a6aa	30ea5fd61f5e773f57409e38fcd8ea62cb315a793e1e7e1dff0a36bfb0359884	2026-10-20 17:03:29.448	\N	2026-10-13 10:03:29.874761
9c0a5e85-6672-40c5-b2c7-5ab3cbe2e1f5	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	3534c18278da4c5461bc48c20cb8b2e564e87e264253b395cff4b3e0f97b3d00	2026-10-21 09:08:56.413	\N	2026-10-14 02:08:57.034135
6a570bd1-8d71-40eb-9979-66d43abe671d	bf6e4f73-86c1-4516-a57a-851a7efac9a6	8b0f0a8d7a87e2d65f145203b3ac18b4f759377a969d41632f7f8ba7b57734f3	2026-10-21 09:09:15.961	\N	2026-10-14 02:09:16.584031
bd649b7c-9b35-4db6-881f-2df2e7c3eead	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	4b6211ef3ace58ab8cb753e9797328e58fc95103457173e3cdcf12ef5b5c6243	2026-10-21 09:09:38.624	2026-10-15 17:41:10.816	2026-10-14 02:09:39.241158
32b3c73f-199b-44e8-9f1e-922db6f8eb76	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	b126515ac5741520440ef052f35af1fb89aa03c29bf80705a177e5fc1074488d	2026-10-22 17:41:11.148	\N	2026-10-15 10:41:12.044385
883d6c90-c9cf-4728-984e-5d5adc6654c1	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	b3b11301ba0093f1d944eb4f0c0dbf1da36406e105b5723b99043cf5f8dd1fd7	2026-10-22 17:41:12.351	2026-10-15 18:00:39.4	2026-10-15 10:41:13.245689
bfc082fa-9af8-4c01-a6c3-8f38f7807bc6	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	05377940b999e2af9d93698661b3a69c3b51088e4d7488fe48fb8a9e583ec032	2026-10-22 18:00:39.7	2026-10-16 16:28:08.192	2026-10-15 11:00:40.591259
84456f14-3493-4c18-852c-3ea6f11f9108	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	4451a67d84b07040331a1505c0a35353b8385f4749625a8c0d08268e6a8a7e2e	2026-10-23 16:28:08.523	2026-10-16 16:47:20.977	2026-10-16 09:28:08.525673
eaf74f3b-a0aa-4852-9cc0-c27697a582db	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	a204a284228a6378fb919f4f204abff095ac1562a8ddf0240463054fa4099b61	2026-10-23 16:47:21.308	\N	2026-10-16 09:47:21.304375
12bba6bb-e0ba-49e0-af64-dd8f7b70ae17	8219514c-a39c-4307-bcfd-bb5a4dcd833c	afc629a712286da8a392d919fd4473f2f7f9696038882affcef089038887fcbc	2026-10-23 16:58:18.81	\N	2026-10-16 09:58:18.807672
d4bb907c-33b9-4f89-9f0d-953c19b36365	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	89e28ebe281b3725de56578502ac8f8a50b6e23e6cbf86f42ea683034e65d1ee	2026-10-23 17:20:21.084	2026-10-16 21:21:20.331	2026-10-16 10:20:21.075078
010b85e9-acfa-45a7-b903-2d91cc35ea63	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	100ea5fffacc4de0162a5e2a7622c01e7f7042b266cfcc3cbd35eb019abcb4d9	2026-10-23 21:21:20.651	\N	2026-10-16 14:21:21.163035
54503f11-86c9-4b72-a2e9-46c1a4f295bc	8219514c-a39c-4307-bcfd-bb5a4dcd833c	dd2d513c02e8673084cdaa1b6ec0c01dd2f340b1e0ba9dd0d7974cea120474a8	2026-10-23 21:24:22.636	\N	2026-10-16 14:24:23.150174
570b7b33-6612-4711-90de-36d834152c5f	bf6e4f73-86c1-4516-a57a-851a7efac9a6	a0c0847674e87ee66ad82455267bfb57473dcb31d857f5231cd458d240ffa410	2026-10-23 21:25:42.077	2026-10-16 21:43:18.43	2026-10-16 14:25:42.587297
c98dca99-d839-4490-8728-8ef9cb5d3544	bf6e4f73-86c1-4516-a57a-851a7efac9a6	4781c0713e422fc064ec890d1d88e1aab5f5f17013ac1695613d08b88177cdfa	2026-10-23 21:43:18.739	\N	2026-10-16 14:43:19.243183
c6deb798-f582-4d19-8b76-75a8cda0163a	bf6e4f73-86c1-4516-a57a-851a7efac9a6	2a9d2ac2b194c53d70a2b9db0b7a7b83426e88b2cc7b04879abdaf03fbb13db5	2026-10-23 21:46:13.659	\N	2026-10-16 14:46:14.169639
b0b41daf-e96e-443d-bd93-b59b43ea32f2	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	37d2d49024d25b4f8f33b5e40ccbd7e2e5d23656f6292e6c7495553db9dc4de9	2026-10-23 22:17:12.113	\N	2026-10-16 15:17:12.616514
c8c7f1a7-d643-45cf-a902-35635bb75220	bf6e4f73-86c1-4516-a57a-851a7efac9a6	115e914c40810f309712e966e9fbd6025d885c413764d16ddc3d9c32b3e6881c	2026-10-23 23:36:36.392	\N	2026-10-16 16:36:36.36567
257d6e9a-9449-47d3-851b-f1b1c2d98bf9	246d21cd-65e4-4047-a876-4e02645b3fdf	a0df3e1e50d4f8ab772483047fdfd7cdabd7c5ba2d10e0c964103066d12b79ab	2026-10-23 23:36:37.669	\N	2026-10-16 16:36:37.641034
4a2b67d9-6299-42c1-abe8-4df16b69a2b5	bf6e4f73-86c1-4516-a57a-851a7efac9a6	6b3256f464cb6a9be3bc76c10d2d784199e8f76bffb59ecde581f8e1728a668a	2026-10-24 00:05:13.839	\N	2026-10-16 17:05:13.810008
c4c6eb86-5126-47f5-9810-a9b9ee1a5e46	246d21cd-65e4-4047-a876-4e02645b3fdf	f3806c788099141c619373d0442ead5258d9be36faaacf5904e899e2dcb01a69	2026-10-24 00:05:16.034	\N	2026-10-16 17:05:16.000863
890979c9-8dbc-473d-9ff5-7d1f57bfefa1	8219514c-a39c-4307-bcfd-bb5a4dcd833c	679e6eb9556fe1f2746969881c3556f2e04e3517e33a7bef58695662271fd7ac	2026-10-23 22:17:18.208	2026-10-17 01:05:12.722	2026-10-16 15:17:18.708631
cbb6d319-c71b-498a-9336-e7ab209253f6	8219514c-a39c-4307-bcfd-bb5a4dcd833c	f3ef18572bad9e8b4f0c8fc7e676d74aa0b6c2a0846cf746adb52d9d363e1b99	2026-10-24 01:05:13.047	\N	2026-10-16 18:05:13.675657
730108b5-2e67-4818-8f8d-e77d33354815	bf6e4f73-86c1-4516-a57a-851a7efac9a6	06a7fb53af77a095a11b0eed25c564fe5731ccecd0c535ecf623a3ddf45328a3	2026-10-24 01:05:17.579	2026-10-17 16:28:11.064	2026-10-16 18:05:18.207664
fd1e93bf-6792-4507-a03e-b0547e305e4f	bf6e4f73-86c1-4516-a57a-851a7efac9a6	5392dd356bf48d109a16cf88d98fbf8d0d930147bbed62d988bbf6925584ea9d	2026-10-24 16:28:11.389	\N	2026-10-17 09:28:11.847953
948bc587-7272-402c-814f-77270a0c0cd6	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	9670855e6399d9b7519105c5d2f0f71a2624fbbf4ebfb39a297a1bcf2719c9ec	2026-10-24 16:28:39.2	\N	2026-10-17 09:28:39.654252
865f9b9a-f96a-4f23-8773-b9b2e375502b	bf6e4f73-86c1-4516-a57a-851a7efac9a6	880a475df17c7e97fc9ae7ffe208a10a4505b45548767a15e4b00c580de35d57	2026-10-24 16:32:20.134	2026-10-17 19:08:52.541	2026-10-17 09:32:20.58988
cca4f21c-c889-4ad1-8196-a5417eb7f7ea	bf6e4f73-86c1-4516-a57a-851a7efac9a6	1598464a0da25c731d56710073afac35b80d977f5806ebde0a946ab9848f0f1b	2026-10-24 19:08:52.88	\N	2026-10-17 12:08:53.812125
1f5fc055-7a3e-4f0a-ab82-363e46317800	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	59f1255d255778a5314e3d41f94ec20e94b6e314a5ea5b01d6c73849c3a16ec3	2026-10-24 19:09:07.123	\N	2026-10-17 12:09:08.057306
a8d7ad77-6edc-4a2d-bc31-9e7996c0ffb8	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	75610549791d70723e696b236c9fb3083f7dc9bde51098c0bb1770825d9408ee	2026-10-24 19:10:57.368	2026-10-17 19:27:32.286	2026-10-17 12:10:58.298024
42801003-67af-4a90-9048-80b77af85a31	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	2907802efe9739eda1a64e056bcff50568def5c70885746f5309860e5f1d38b6	2026-10-24 19:27:32.585	\N	2026-10-17 12:27:33.512328
901f9c43-cb83-479c-a413-d5dcb479cd52	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	8294e0255d6e04e1af55982e933efd01bd3d52605cd653edbf2576100c963dfb	2026-10-24 19:34:13.897	2026-10-17 22:49:01.326	2026-10-17 12:34:14.82299
003e99f0-2b6a-48cb-a862-2fd7c7ed6e1f	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	6ccdc4fbc5ef4655e53a170019491af47b1b0f2bb96e1a21b4aca170a9f1184b	2026-10-24 22:49:01.623	\N	2026-10-17 15:49:02.544791
06a34a79-7fdc-4e98-8d34-4c8ab71f8513	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	f1402ec370e25bdf407dc3c7642a419466814985d15f794b23b1e43576b257aa	2026-10-24 22:53:01.622	2026-10-17 23:18:59.288	2026-10-17 15:53:02.54171
06584a5f-0865-4954-8517-7fe20112ed14	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	21763ebb3a2a108e4d15359a0299583b56eb5ee87eb12a27481e18dd2ee97c55	2026-10-24 23:18:59.558	\N	2026-10-17 16:19:00.475624
8a422552-6b9b-4351-95fa-565d52abbcf5	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	0f523c46fd48fdc47ff2b200c69e781730190a8ad259e05d8d4c16aeea14ef56	2026-10-24 23:39:23.295	\N	2026-10-17 16:39:24.208476
52db70ad-c62f-4c69-98ff-ade860743b09	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	bbb46a16664be370b7dd90f209df229bee4f02cdb7a0bf70f59c0ba7f47a6d8f	2026-10-25 16:49:45.206	\N	2026-10-18 09:49:45.998186
4be1d43c-7891-42dd-9cf4-2e272a231776	bf6e4f73-86c1-4516-a57a-851a7efac9a6	ef975f5982e7fa9174310b2fb16e54aa3ba8939e04a8df4204a2cd98028dd783	2026-10-25 16:50:36.415	\N	2026-10-18 09:50:37.203801
c7473131-cf98-4d64-bf18-12769cadbefe	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	41d713ca6a8eecbbf5e7a8a7b37dacb0ff1937331ba4f56fe0aef1014b7e031a	2026-10-25 17:48:34.32	2026-10-23 17:42:10.643	2026-10-18 10:48:35.10425
f0e62954-799f-4d84-9200-23e8f2d231a3	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	2a6c36b0578d40f7b6c6788e7bc95e1f16ae29fe4402d65de566f66b88e984f5	2026-10-26 14:19:52.45	\N	2026-10-19 07:19:52.489134
fffeb0ff-e5bf-41c5-9598-7a74290ad39f	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	4723c4b10869d1a22727f94f89b8a492b18d5677f6e4d807c28fe4657838a735	2026-10-30 17:42:10.971	2026-10-23 18:01:05.593	2026-10-23 10:42:10.820966
8e7d3945-9474-47d7-acdc-57d5f2231722	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	3d7c7469e1ccead8938fe2cbcd8e9a58377aaa7e758bdc10cd2fb75c13292e93	2026-10-30 18:01:05.854	\N	2026-10-23 11:01:05.69888
20e6ba83-c448-4362-9f37-06356b3613d3	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	820d2809eef11c73e8ee2366ee0a5576c24e2ffdf82f615fd236b0fcbc9a11fc	2026-10-30 18:01:11.188	\N	2026-10-23 11:01:11.031657
a80eda17-8fa9-4bfe-a16c-b857aeb54122	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	f9a81bb200d791ef066343b6c0113152b386ce8f8b747379bbbaf53d3ad1415a	2026-10-31 00:10:01.911	2026-10-24 08:18:42.491	2026-10-23 17:10:02.619527
64eff59c-3673-4f4f-8a8c-1dea9dbc952c	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	4f1ed48c84f550bd78da2a33f2fe6c51993f8c18f7de09f31e9a92177552db4f	2026-10-31 08:18:42.765	2026-10-24 08:19:10.15	2026-10-24 01:18:43.289836
083210d0-6e13-44be-b2ac-d228ddfa95b6	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	3ccd12dd18fb3dc8b5402c33db5b6dde1ba8289253ff6113ac137d84569c013d	2026-10-31 08:20:02.052	2026-10-24 08:33:26.071	2026-10-24 01:20:02.573892
c6072528-90ca-49d2-b029-59f13e2dc9d8	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	0be49a33a8495c8062daf76c40b76bea878f4c2511cc81be1b2f0c6d263e439e	2026-10-31 08:34:46.904	2026-10-24 08:37:10.491	2026-10-24 01:34:47.424626
82b0a923-4b75-4c74-b191-9a592b0604b9	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	277da571c0dbe0ed7e87ffa853e6a62f3955b3c5d5da560515b2deb94cd291fd	2026-11-01 08:57:40.781	\N	2026-10-25 01:57:41.270103
32507f8f-6fd1-4547-aa6c-c5b4a939112e	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	4218fbd103dc0690d2d060b57dd61f65d590ea32d05b4bbd881c2c887bb56571	2026-11-01 09:32:36.381	2026-10-25 09:32:52.198	2026-10-25 02:32:36.862204
04c1b4e8-3337-4219-bb05-67ae750e2d95	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	b911bdd2bb9a1a87d50eab5f5cb168a3ab9ab7123b0dd8d17168dfcab1a464b1	2026-11-01 09:32:52.333	2026-10-25 09:32:55.494	2026-10-25 02:32:52.811461
32bb8135-642b-448d-9cfc-6dd48cd58eb6	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	1ff06315729b0a33307fe61d9142208fbea61bb8d061cce2de4ae9c5b27895e7	2026-11-01 09:33:01.692	\N	2026-10-25 02:33:02.167143
abad8227-96f4-41f8-af0c-0569e57ded75	bf6e4f73-86c1-4516-a57a-851a7efac9a6	d46407dbc1726bac5dfbcb475062bc72c2d98aca39f44b8d4067d2c5e315f7b4	2026-11-01 10:12:22.525	\N	2026-10-25 03:12:22.99535
e5947338-149f-43c6-a953-036e033388cf	bf6e4f73-86c1-4516-a57a-851a7efac9a6	0c8a296bb470d46d65ba81352a8375e8811d5cc5d99ff124fb09542da6fe907b	2026-11-01 13:18:04.879	\N	2026-10-25 06:18:06.079703
eb8073b3-b056-4c82-9fab-e49ab40a94a4	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	3112a52e5ab2d5cc50cb2b61284aa0f41818cca6cf11ab9bc5b7d3132977532b	2026-11-01 13:18:43.609	2026-10-25 14:34:41.259	2026-10-25 06:18:44.807803
03bbfa73-5c5c-42fd-8a55-9b8043cd0dc4	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	063c8be0a9185b7d9f6b805fb1f85fdb52fbbc47e2e1d26ee063d3e9a9c352f8	2026-11-01 14:34:41.553	2026-10-25 15:11:28.184	2026-10-25 07:34:42.737215
7b28ca20-3a06-4522-9632-82f6788eabcd	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	dc4c0e31dc5a8ca7caa7ed433ddda8b5eb4d2d4689d9570c62e0e14776628040	2026-11-01 15:11:28.457	2026-10-25 22:50:27.316	2026-10-25 08:11:29.636541
3f284bef-1f69-4eb2-98a1-7ccce77237f7	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	eea3fec02a0ac058996e6d1c84a125559f21bc50d522774cafe7320077d80b79	2026-11-01 22:50:27.653	\N	2026-10-25 15:50:28.7469
db201f6d-1f46-4ac7-af3e-471884dc62cd	246d21cd-65e4-4047-a876-4e02645b3fdf	fc1262f93ed279491e9ddac0358d228735deef1a3e13d19daa2d3595f4af842b	2026-11-01 23:34:01.014	\N	2026-10-25 16:34:02.108108
b64c4391-bcf2-43cb-abef-2411244d3d00	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	38cfe5f12616dd0a495e8963534ee55eaddf594c6c9d95fe8ad332feb905ed34	2026-11-01 23:23:24.204	2026-10-25 23:57:27.185	2026-10-25 16:23:25.290509
a15b2949-cbd6-4e41-b4f0-a236b5c9110b	246d21cd-65e4-4047-a876-4e02645b3fdf	d0bb1b9aa985118cab230041c35341db1fb7dcbc7d249aaa8811bff2676a5883	2026-11-02 00:15:32.144	\N	2026-10-25 17:15:33.225685
05153cd4-967c-4def-b9be-8c40914e02d4	246d21cd-65e4-4047-a876-4e02645b3fdf	c3b8ddca9f3d9102d5af774141dc1365365157b2eb41c1e0624f117006855638	2026-11-02 00:34:25.407	\N	2026-10-25 17:34:26.480065
77b98ed3-f354-4c63-9b33-fd0112542577	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	2884934855bd67734c7d5403543c9f2748174a57dc8af3de17913b37f7da46f2	2026-11-01 23:57:27.422	2026-10-26 00:35:19.719	2026-10-25 16:57:28.497224
39d6179f-7c0e-45b0-9260-87531ae2576d	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	f8ff6c80117a20e3bd615a32f7983485cda0eae9be4692f1c635de9be1dfd71c	2026-11-02 00:35:19.952	2026-10-26 01:15:52.191	2026-10-25 17:35:21.021159
cddd60d3-76c2-4e17-b985-6b3b7b814b11	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	e87ac972cb693b10dbe906c9c2abdeef6e905eb8392962884634505bd41f76b0	2026-11-02 01:15:52.453	\N	2026-10-25 18:15:53.517401
74a2ee16-e297-4d8f-8905-d004394603e2	246d21cd-65e4-4047-a876-4e02645b3fdf	1fc62eb46e8df427323658d90d302a414b19f5efecfc4ee5578e7952e309464f	2026-11-02 01:25:42.767	\N	2026-10-25 18:25:43.839104
4cc602d6-4167-4233-9afb-786708b8dbfe	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	0cc30179f962c6c72f8d8fca50209bb7881864579a931bfda00b3a234bbb838d	2026-11-02 01:27:40.648	2026-10-26 01:44:04.417	2026-10-25 18:27:41.711647
5048eaa0-4c81-4dd2-abe2-a8e20884b7a4	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	89b131f0234728833cfe91e49fa09461980857bc9cb4aa19c7a38c6734ccb819	2026-11-02 01:44:04.664	2026-10-26 01:59:05.31	2026-10-25 18:44:05.721493
b2b93d57-cde6-41ff-a774-0099c47ce2a5	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	2cd402da5e220b94491b7c9bede9a6a6da7ce4a4fdfafece84039d0e26fcd34b	2026-11-02 01:59:05.566	\N	2026-10-25 18:59:06.638957
1489ff0a-0fbd-4c96-9d9b-35b5939d1a0b	bf6e4f73-86c1-4516-a57a-851a7efac9a6	cd2770c6a828459b4501b01df42e83c4c4bc57f962af6bee8bb23eeed613c2d3	2026-11-02 12:05:41.09	2026-10-26 12:23:23.469	2026-10-26 05:05:42.366268
7a1dd2a3-96c2-4507-95ff-5984a08991f8	bf6e4f73-86c1-4516-a57a-851a7efac9a6	976f76c441236d6b83d258371085e909eb704a00ebcac9f0a4341ec1924e7619	2026-11-02 12:23:23.739	\N	2026-10-26 05:23:25.010726
4c877a0a-9116-4b7e-9356-ddfb4ed2f34a	bf6e4f73-86c1-4516-a57a-851a7efac9a6	6632cb659c8278fa6d385864b03debbde683c18842d4da71bb753bb3618888ee	2026-11-02 12:58:45.507	2026-10-26 13:21:32.638	2026-10-26 05:58:46.764992
cdfe1331-d8c6-4022-ab44-6eae66fef2c0	bf6e4f73-86c1-4516-a57a-851a7efac9a6	8ff4913d7c78e6c891d6689894ff6b24ed4e99838cf3fbdcc86f73ca37f4d0a5	2026-11-02 13:21:32.925	2026-10-26 13:21:37.437	2026-10-26 06:21:34.177899
ccc8af46-17b8-4575-b014-877c6a7f8881	bf6e4f73-86c1-4516-a57a-851a7efac9a6	27b930b1972257333bafc54c11b45ecac93cde5ae2c70d3ed779577c136292e0	2026-11-02 13:21:39.031	\N	2026-10-26 06:21:40.281881
0b8b3af5-ff96-41c7-b820-16677cbe4365	bf6e4f73-86c1-4516-a57a-851a7efac9a6	7469afb7c2c81855c1af14b92c84df61965f4f69fca29c27b6fcc41393d7a83c	2026-11-02 13:22:11.857	\N	2026-10-26 06:22:13.110527
8f78be4d-1ceb-402d-93b2-f8e55d3c05a0	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	b06a6facfb68886c40c15e174c1f6f847617912158c798115a2717bf155a5c09	2026-11-02 13:24:08.879	2026-10-26 13:44:46.443	2026-10-26 06:24:10.132567
64833ff7-dab1-4f75-8c83-ee1ca2ef52d4	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	31fdc057188e3dafec9e1e82f021b736164442d2bd5a01352df13f7e7ed2f4bc	2026-11-02 13:44:46.715	2026-10-26 15:43:19.306	2026-10-26 06:44:47.961953
1340ac15-0635-4f36-b3aa-d4f9ba3fdf96	246d21cd-65e4-4047-a876-4e02645b3fdf	06fd05f4774bd8d920a5ed5c47f710770d566cc3a00eac4cc1de14093572dfcd	2026-11-02 16:06:06.847	\N	2026-10-26 09:06:08.073599
d946c36f-aa96-47f0-8eb6-568cc1a5b9f2	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	b8e703af20b217acd012dbfafcd4d8052d5c898950b80262757b27886a128372	2026-11-02 15:43:19.574	2026-10-26 16:18:55.569	2026-10-26 08:43:20.800966
b859681c-4e95-4621-b153-87fc13e522c1	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	bb0571307f7793852ca9a4a684afae0d122be056d934d48bb3f57b9a8eb4f452	2026-11-02 16:18:55.828	\N	2026-10-26 09:18:57.049525
6343d95a-ef94-4559-ad55-a217fd6cb3ae	bf6e4f73-86c1-4516-a57a-851a7efac9a6	de9a00a29c58af938ba85c46e18a51af6e1d7ee8f7d5c4fcff3b95cb6292b86b	2026-11-02 17:42:35.399	\N	2026-10-26 10:42:36.608136
bcb35736-afd4-429c-bb58-d40bf01bc29f	bf6e4f73-86c1-4516-a57a-851a7efac9a6	065acb7665cf838ce2854de4a5f6b7c5fa734f30c12a902216e461a800d630f4	2026-11-02 17:14:33.532	2026-10-26 17:43:58.739	2026-10-26 10:14:34.746965
2b0f8eec-b362-41da-a5bd-6edeead4040b	bf6e4f73-86c1-4516-a57a-851a7efac9a6	170383aa5f41edaecfd9d22b6ed88f7896e1adb628e8e878bdf25ea567f48bf6	2026-11-02 17:51:36.66	\N	2026-10-26 10:51:37.866105
cb723cbc-df99-4363-8ca0-6c5a66d1d7e1	bf6e4f73-86c1-4516-a57a-851a7efac9a6	867a4c8be51bfa7f2924195977fc7e7b5c69469d73606219c355d263198f874b	2026-11-02 17:53:32.761	\N	2026-10-26 10:53:33.962228
c2f053dd-06c0-4d2b-89a5-e632930666ed	bf6e4f73-86c1-4516-a57a-851a7efac9a6	4eddfb3488ec775d48592b05976920786c8a6da23c6ceb98477f37f602835d54	2026-11-02 17:55:08.056	\N	2026-10-26 10:55:09.25631
eb0eda42-f3f9-4ce7-8ca4-c8a840c11936	bf6e4f73-86c1-4516-a57a-851a7efac9a6	c1467ca37b12f0ee4f22d97da7ae557920462e88a95834faa6a9324a55e91232	2026-11-02 17:43:58.993	2026-10-26 18:21:11.87	2026-10-26 10:44:00.194588
e214b98c-8fe9-4889-9f37-4bb9b1e5aa81	bf6e4f73-86c1-4516-a57a-851a7efac9a6	6c4f2a2decf252fc4a45c9098829f16c387ebfa951b348cabe8929da167358e8	2026-11-02 18:21:12.136	2026-10-26 18:21:25.907	2026-10-26 11:21:13.331564
95258a88-73b1-489c-82ba-b1aff1f17d95	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	40415981787911a237716e8f6158478b945a2ca67a0bd25418b1669dd8d20827	2026-11-02 18:21:27.311	2026-10-26 19:20:40.086	2026-10-26 11:21:28.506455
f20971cd-d94b-4ae7-b1dd-1793e1597a65	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	ec6cd3d8bbf73e1fbc3257b347412026e0e43fa2383fa32893eee0812ab6e671	2026-11-02 19:20:40.378	2026-10-26 19:50:45.443	2026-10-26 12:20:41.564884
4eafddea-fc93-4300-af77-8649917795cd	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	c8e11ea02d461886e344138b249c5518e46163e9cf14e17d6684aa0ba3561ac8	2026-11-02 19:50:45.706	2026-10-26 23:07:31.132	2026-10-26 12:50:46.885852
939e36e8-3e4e-432c-ad32-2ac2d0e76f46	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	3a10b3a4914ee54d0230c43a55a2a12778835ffb0b6ea4b89a6118705160bf43	2026-11-02 23:07:31.386	\N	2026-10-26 16:07:32.949815
2ba802c2-6889-4ef6-b1b6-f52c94bf0d62	246d21cd-65e4-4047-a876-4e02645b3fdf	634c7d8eadbf626c62fc8c28be7f92c4f1e881d67390945d2fc4f52091114824	2026-11-03 00:45:22.561	\N	2026-10-26 17:45:24.131104
\.


--
-- Data for Name: review_lists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.review_lists (id, user_id, weak_word, wrong_count, priority_score, added_at, source_type, accuracy_score, error_type, last_attempt_id, correct_streak) FROM stdin;
\.


--
-- Data for Name: scores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scores (attempt_id, overall_score, accuracy_score, fluency_score, completeness_score, words_score_detail, assessment_source) FROM stdin;
64ce06c8-aed3-4251-8f64-2803fa6e8fd4	95	95	94	100	[{"word": "Technology", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "is", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "changing", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "the", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "way", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "we", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "live", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "and", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "work.", "color": "GREEN", "error_type": "None", "accuracy_score": 100}]	MOCK
241f1419-6fad-44f7-91df-c429417149bf	95	95	94	100	[{"word": "Good", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "morning,", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "how", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "are", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "you", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "today?", "color": "GREEN", "error_type": "None", "accuracy_score": 100}]	MOCK
43d43be9-4f0d-402b-9fce-c4f74ff14796	95	95	94	100	[{"word": "Can", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "I", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "have", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "a", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "cup", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "of", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "coffee,", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "please?", "color": "GREEN", "error_type": "None", "accuracy_score": 100}]	MOCK
5b7bbd04-86ce-4441-8ba4-0604a7a70927	95	95	94	100	[{"word": "Can", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "I", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "have", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "a", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "cup", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "of", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "coffee,", "color": "GREEN", "error_type": "None", "accuracy_score": 100}, {"word": "please?", "color": "GREEN", "error_type": "None", "accuracy_score": 100}]	MOCK
\.


--
-- Data for Name: streak_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.streak_logs (id, user_id, study_date, daily_points) FROM stdin;
438190c7-436f-49f2-bc39-0fbf892b4796	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	2026-10-25	2
509fe630-b951-421b-b050-b44b3f946022	246d21cd-65e4-4047-a876-4e02645b3fdf	2026-10-26	2
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscription_plans (id, name, price, duration_days, is_active) FROM stdin;
57b5ec12-38ab-4fb6-960c-687deed37da6	Premium 1 ThÃ¡ng	199000.00	30	t
6a3d92ed-bfa4-4c0a-b6c1-94b648be4241	Premium 1 NÄƒm	1990000.00	365	t
71d2c4bc-790a-4434-a781-08dbae230708	Premium 3 ThÃ¡ng	499000.00	90	t
\.


--
-- Data for Name: system_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_configs (key, value, description, updated_at) FROM stdin;
pronunciation.green_min	80	Äiá»ƒm tá»« tá»‘i thiá»ƒu Ä‘á»ƒ hiá»‡n mÃ u Xanh	2026-10-13 09:15:31.178349
pronunciation.yellow_min	60	Äiá»ƒm tá»« tá»‘i thiá»ƒu Ä‘á»ƒ hiá»‡n mÃ u VÃ ng (dÆ°á»›i má»©c nÃ y lÃ  Äá»)	2026-10-13 09:15:31.570853
review.add_threshold	60	Tá»« cÃ³ Ä‘iá»ƒm dÆ°á»›i ngÆ°á»¡ng nÃ y tá»± Ä‘á»™ng vÃ o Review List	2026-10-13 09:15:31.856843
ai.timeout_seconds	30	Timeout khi gá»i dá»‹ch vá»¥ AI	2026-10-13 09:15:32.151678
free.shadowing_daily_limit	5	Sá»‘ lÆ°á»£t cháº¥m AI Shadowing má»—i ngÃ y cá»§a tÃ i khoáº£n Free	2026-10-13 09:15:32.439834
free.review_list_limit	10	Sá»‘ má»¥c Review List tá»‘i Ä‘a cá»§a tÃ i khoáº£n Free	2026-10-13 09:15:32.729692
dictation.hint_penalties	[0, 5, 10, 20]	Má»©c trá»« Ä‘iá»ƒm theo sá»‘ gá»£i Ã½ Dictation Ä‘Ã£ dÃ¹ng	2026-10-15 10:21:33.560291
\.


--
-- Data for Name: user_attempts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_attempts (id, user_id, sentence_id, audio_url, text_input, type, status, used_transcript_hint, created_at, error_code, is_discarded) FROM stdin;
64ce06c8-aed3-4251-8f64-2803fa6e8fd4	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	f4b2cfab-2197-4b5c-8b9e-571b10d35c59	shadowing/6819dcfa-b9d4-4159-96e5-50b915213423.webm	\N	SHADOWING	COMPLETED	f	2026-10-25 18:44:58.235285	\N	f
241f1419-6fad-44f7-91df-c429417149bf	9596eaff-3c3a-4cd7-90a3-db9a16d2c031	87e20bea-cd43-4667-9fdc-630cbb2426f4	shadowing/281e8874-0ef3-43f1-9ace-cad08631e4a8.webm	\N	SHADOWING	COMPLETED	f	2026-10-25 18:49:05.166541	\N	f
43d43be9-4f0d-402b-9fce-c4f74ff14796	246d21cd-65e4-4047-a876-4e02645b3fdf	462b5aeb-d820-46aa-a613-d19c5bfdbd4f	shadowing/e4689fc4-157a-4f66-9bd6-475f1633e23e.webm	\N	SHADOWING	COMPLETED	f	2026-10-26 09:16:06.531839	\N	f
5b7bbd04-86ce-4441-8ba4-0604a7a70927	246d21cd-65e4-4047-a876-4e02645b3fdf	462b5aeb-d820-46aa-a613-d19c5bfdbd4f	shadowing/4a052474-ded1-40d2-b8ce-45e6137c7bd4.webm	\N	SHADOWING	COMPLETED	f	2026-10-26 09:16:18.154443	\N	f
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, full_name, avatar_url, role, is_active, streak_count, premium_expired_at, created_at, updated_at) FROM stdin;
bf6e4f73-86c1-4516-a57a-851a7efac9a6	admin@shadowtation.local	$2b$10$KcEc0INuAm6BxCbuB9vS6OvbykpbqDh5G.42iksDhQbhp3Y0Rdq/e	Admin	\N	ADMIN	t	0	\N	2026-10-13 09:15:27.398651	2026-10-13 09:15:27.398651
8219514c-a39c-4307-bcfd-bb5a4dcd833c	premium@shadowtation.local	$2b$10$a7ajysUw.N6E5/hY7rj7dejOD5L9UFlwFA7hqI8p6LBeog.q.Xqhe	Há»c viÃªn Premium	\N	PREMIUM_STUDENT	t	0	2026-11-12 16:15:27.682	2026-10-13 09:15:28.129267	2026-10-13 09:15:28.129267
326c385f-57ea-4e5b-9588-6c6464f0a6aa	testuser1@shadowtation.local	$2b$10$0n2Aljq6sThr2E6tOcDf0Ok/ntvLoZ6TEF7JjP58owUExJr676uwm	Nguy?n Th? Nghi?m	\N	STUDENT	t	0	\N	2026-10-13 10:03:29.104018	2026-10-13 10:03:29.104018
246d21cd-65e4-4047-a876-4e02645b3fdf	student@shadowtation.local	$2b$10$VujQUY4MxiQrata7V5fWJe9E1xgLIpqgJEL37X4HsOqfl/DhMIX8u	Há»c viÃªn Free	\N	PREMIUM_STUDENT	t	1	2027-04-23 23:34:02.338	2026-10-13 09:15:27.770558	2026-10-26 09:16:06.834796
9596eaff-3c3a-4cd7-90a3-db9a16d2c031	hungvanam2005@gmail.com	$2b$10$8RiRzqmjp5wdxkb2uz6OBu4cW2PmGYz7mMXlCUsAxEfSKo54Nq0ZG	Pháº¡m VÄƒn HÃ¹ng	https://lh3.googleusercontent.com/a/ACg8ocKi5QmXictit_SMF-Czrh7Lsm34J3d4j8qMJS9fbYBBZWyPLA=s96-c	STUDENT	t	1	\N	2026-10-14 02:08:56.770989	2026-10-26 11:21:53.221336
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 8, true);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: lesson_sentences lesson_sentences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_sentences
    ADD CONSTRAINT lesson_sentences_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_transaction_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_transaction_ref_key UNIQUE (transaction_ref);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: review_lists review_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_lists
    ADD CONSTRAINT review_lists_pkey PRIMARY KEY (id);


--
-- Name: scores scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_pkey PRIMARY KEY (attempt_id);


--
-- Name: streak_logs streak_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streak_logs
    ADD CONSTRAINT streak_logs_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (key);


--
-- Name: review_lists uq_review_lists_user_word; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_lists
    ADD CONSTRAINT uq_review_lists_user_word UNIQUE (user_id, weak_word);


--
-- Name: streak_logs uq_streak_logs_user_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streak_logs
    ADD CONSTRAINT uq_streak_logs_user_date UNIQUE (user_id, study_date);


--
-- Name: user_attempts user_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_attempts
    ADD CONSTRAINT user_attempts_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_lesson_sentences_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_sentences_lesson ON public.lesson_sentences USING btree (lesson_id, start_time);


--
-- Name: idx_lesson_sentences_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_lesson_sentences_order ON public.lesson_sentences USING btree (lesson_id, order_index);


--
-- Name: idx_lessons_created_by_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_created_by_user ON public.lessons USING btree (created_by_user_id);


--
-- Name: idx_lessons_status_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_status_level ON public.lessons USING btree (status, level);


--
-- Name: idx_password_reset_tokens_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_hash ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: idx_password_reset_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_payment_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_status ON public.payment_transactions USING btree (status, created_at);


--
-- Name: idx_payment_transactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_user ON public.payment_transactions USING btree (user_id);


--
-- Name: idx_refresh_tokens_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_hash ON public.refresh_tokens USING btree (token_hash);


--
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_review_lists_user_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_lists_user_priority ON public.review_lists USING btree (user_id, priority_score DESC);


--
-- Name: idx_user_attempts_pending_shadowing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_attempts_pending_shadowing ON public.user_attempts USING btree (status, created_at) WHERE (((type)::text = 'SHADOWING'::text) AND (is_discarded = false));


--
-- Name: idx_user_attempts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_attempts_status ON public.user_attempts USING btree (status);


--
-- Name: idx_user_attempts_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_attempts_user_created ON public.user_attempts USING btree (user_id, created_at DESC);


--
-- Name: lessons fk_lessons_created_by_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT fk_lessons_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: review_lists fk_review_lists_last_attempt; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_lists
    ADD CONSTRAINT fk_review_lists_last_attempt FOREIGN KEY (last_attempt_id) REFERENCES public.user_attempts(id) ON DELETE SET NULL;


--
-- Name: lesson_sentences lesson_sentences_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_sentences
    ADD CONSTRAINT lesson_sentences_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE RESTRICT;


--
-- Name: payment_transactions payment_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: review_lists review_lists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_lists
    ADD CONSTRAINT review_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scores scores_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.user_attempts(id) ON DELETE CASCADE;


--
-- Name: streak_logs streak_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streak_logs
    ADD CONSTRAINT streak_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_attempts user_attempts_sentence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_attempts
    ADD CONSTRAINT user_attempts_sentence_id_fkey FOREIGN KEY (sentence_id) REFERENCES public.lesson_sentences(id) ON DELETE CASCADE;


--
-- Name: user_attempts user_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_attempts
    ADD CONSTRAINT user_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict XGUzER0KLKa9tkCiS7hQ3dbdI85NvBkzBlkVb6csPS3yggchfBQnV1GigXaalJe

