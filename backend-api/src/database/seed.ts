import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import dataSource from './data-source';
import {
  Lesson,
  LessonSentence,
  SubscriptionPlan,
  SystemConfig,
  User,
  UserRole,
  WordTiming,
} from './entities';

/** Chia đều thời lượng câu cho từng từ (dữ liệu mẫu; Auto-Transcription thật sẽ thay thế ở GĐ4). */
function buildWords(text: string, start: number, end: number): WordTiming[] {
  const words = text.split(/\s+/).filter(Boolean);
  const step = (end - start) / words.length;
  return words.map((w, i) => ({
    word: w.replace(/[.,!?]/g, ''),
    start: Number((start + i * step).toFixed(2)),
    end: Number((start + (i + 1) * step).toFixed(2)),
  }));
}

const DEV_USERS: { email: string; fullName: string; role: UserRole; password: string; premiumDays?: number }[] = [
  {
    email: 'admin@shadowtation.local',
    fullName: 'Admin',
    role: UserRole.ADMIN,
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456',
  },
  { email: 'student@shadowtation.local', fullName: 'Học viên Free', role: UserRole.STUDENT, password: 'Student@123456' },
  {
    email: 'premium@shadowtation.local',
    fullName: 'Học viên Premium',
    role: UserRole.PREMIUM_STUDENT,
    password: 'Premium@123456',
    premiumDays: 30,
  },
];

const PLANS = [
  { name: 'Premium 1 Tháng', price: '199000', durationDays: 30 },
  { name: 'Premium 3 Tháng', price: '499000', durationDays: 90 },
  { name: 'Premium 1 Năm', price: '1490000', durationDays: 365 },
];

const LESSONS = [
  {
    title: 'Daily Conversation 01',
    level: 'BEGINNER' as const,
    audioUrl: '/audio/daily-conversation-01.mp3',
    isPremiumOnly: false,
    sentences: [
      { start: 0.0, end: 2.306, text: 'Good morning, how are you today?' },
      { start: 2.556, end: 5.227, text: 'I am fine, thank you. And you?' },
      { start: 5.477, end: 8.113, text: 'I am doing great, thanks for asking.' },
    ],
  },
  {
    title: 'At the Coffee Shop',
    level: 'BEGINNER' as const,
    audioUrl: '/audio/at-the-coffee-shop.mp3',
    isPremiumOnly: false,
    sentences: [
      { start: 0.0, end: 2.993, text: 'Can I have a cup of coffee, please?' },
      { start: 3.243, end: 5.633, text: 'Sure, would you like milk or sugar?' },
      { start: 5.883, end: 8.056, text: 'Just a little milk, thank you.' },
    ],
  },
  {
    title: 'Technology and Daily Life',
    level: 'INTERMEDIATE' as const,
    audioUrl: '/audio/technology-and-daily-life.mp3',
    isPremiumOnly: true,
    sentences: [
      { start: 0.0, end: 2.660, text: 'Technology is changing the way we live and work.' },
      { start: 2.910, end: 6.052, text: 'Many people now study English with online tools.' },
      { start: 6.302, end: 9.216, text: 'Practice every day and you will improve quickly.' },
    ],
  },
];

// Ngưỡng và giới hạn vận hành, chỉnh được qua Admin Panel (NFR-SL-04)
const CONFIGS: { key: string; value: unknown; description: string }[] = [
  { key: 'dictation.hint_penalties', value: [0, 5, 10, 20], description: 'Mức trừ điểm theo số gợi ý Dictation đã dùng' },
  { key: 'pronunciation.green_min', value: 80, description: 'Điểm từ tối thiểu để hiện màu Xanh' },
  { key: 'pronunciation.yellow_min', value: 60, description: 'Điểm từ tối thiểu để hiện màu Vàng (dưới mức này là Đỏ)' },
  { key: 'review.add_threshold', value: 60, description: 'Từ có điểm dưới ngưỡng này tự động vào Review List' },
  { key: 'ai.timeout_seconds', value: 30, description: 'Timeout khi gọi dịch vụ AI' },
  { key: 'free.shadowing_daily_limit', value: 5, description: 'Số lượt chấm AI Shadowing mỗi ngày của tài khoản Free' },
  { key: 'free.review_list_limit', value: 10, description: 'Số mục Review List tối đa của tài khoản Free' },
];

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Không chạy seed dữ liệu mẫu ở môi trường production.');
  }
  await dataSource.initialize();

  const users = dataSource.getRepository(User);
  const plans = dataSource.getRepository(SubscriptionPlan);
  const lessons = dataSource.getRepository(Lesson);
  const sentences = dataSource.getRepository(LessonSentence);
  const configs = dataSource.getRepository(SystemConfig);

  for (const u of DEV_USERS) {
    if (await users.findOneBy({ email: u.email })) continue;
    await users.save(
      users.create({
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        passwordHash: await bcrypt.hash(u.password, 10),
        premiumExpiredAt: u.premiumDays ? new Date(Date.now() + u.premiumDays * 24 * 3600 * 1000) : null,
      }),
    );
    console.log(`+ user ${u.email}`);
  }

  for (const p of PLANS) {
    if (await plans.findOneBy({ name: p.name })) continue;
    await plans.save(plans.create(p));
    console.log(`+ plan ${p.name}`);
  }

  for (const l of LESSONS) {
    const existing = await lessons.findOneBy({ title: l.title });
    if (existing) {
      if (existing.createdByUserId === null) {
        await lessons.save({
          ...existing,
          level: l.level,
          audioUrl: l.audioUrl,
          status: 'PUBLISHED',
          mediaType: 'AUDIO',
          sourceName: 'Shadowtation sample',
          sourceUrl: l.audioUrl,
          durationSeconds: Math.ceil(l.sentences[l.sentences.length - 1]?.end ?? 0),
          isPremiumOnly: l.isPremiumOnly,
        });
        const existingSentences = await sentences.find({
          where: { lessonId: existing.id },
          order: { orderIndex: 'ASC' },
        });
        for (const [index, item] of l.sentences.entries()) {
          const sentence = existingSentences.find((row) => row.orderIndex === index + 1);
          const values = {
            lessonId: existing.id,
            orderIndex: index + 1,
            startTime: item.start,
            endTime: item.end,
            textContent: item.text,
            wordsJson: buildWords(item.text, item.start, item.end),
          };
          await sentences.save(sentence ? { ...sentence, ...values } : sentences.create(values));
        }
      }
      continue;
    }
    const lesson = await lessons.save(
      lessons.create({
        title: l.title,
        level: l.level,
        audioUrl: l.audioUrl,
        mediaType: 'AUDIO',
        sourceName: 'Shadowtation sample',
        sourceUrl: l.audioUrl,
        durationSeconds: Math.ceil(l.sentences[l.sentences.length - 1]?.end ?? 0),
        createdByUserId: null,
        isPremiumOnly: l.isPremiumOnly,
        status: 'PUBLISHED',
      }),
    );
    for (const [index, s] of l.sentences.entries()) {
      await sentences.save(
        sentences.create({
          lessonId: lesson.id,
          orderIndex: index + 1,
          startTime: s.start,
          endTime: s.end,
          textContent: s.text,
          wordsJson: buildWords(s.text, s.start, s.end),
        }),
      );
    }
    console.log(`+ lesson ${l.title} (${l.sentences.length} câu)`);
  }

  const batchPath = path.join(__dirname, 'seed_lessons.json');
  if (fs.existsSync(batchPath)) {
    const batchLessons = JSON.parse(fs.readFileSync(batchPath, 'utf8')) as Array<{
      title: string; sourceName?: string; mediaUrl: string; mediaType: 'AUDIO' | 'VIDEO' | 'PODCAST';
      level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'; duration?: number;
      sentences: Array<{ orderIndex: number; startTime: number; endTime: number; text: string }>;
    }>;
    for (const item of batchLessons) {
      if (!item.title || !item.mediaUrl || !Array.isArray(item.sentences) || !item.sentences.length) continue;
      const existingBatchLesson = await lessons.findOneBy({ sourceUrl: item.mediaUrl });
      if (existingBatchLesson || await lessons.findOneBy({ title: item.title })) continue;
      const lesson = await lessons.save(lessons.create({
        title: item.title.slice(0, 255),
        level: item.level ?? 'BEGINNER',
        audioUrl: item.mediaUrl,
        mediaType: item.mediaType,
        sourceName: (item.sourceName?.trim() || new URL(item.mediaUrl).hostname).slice(0, 150),
        sourceUrl: item.mediaUrl,
        durationSeconds: Number.isFinite(item.duration) ? Math.ceil(item.duration!) : null,
        createdByUserId: null,
        isPremiumOnly: false,
        status: 'PUBLISHED',
      }));
      await sentences.save(item.sentences.map((sentence, index) => {
        const orderIndex = Number.isInteger(sentence.orderIndex) && sentence.orderIndex > 0 ? sentence.orderIndex : index + 1;
        return sentences.create({
          lessonId: lesson.id,
          orderIndex,
          startTime: sentence.startTime,
          endTime: sentence.endTime,
          textContent: sentence.text,
          wordsJson: buildWords(sentence.text, sentence.startTime, sentence.endTime),
        });
      }));
      console.log(`+ preset lesson ${lesson.title} (${item.sentences.length} câu)`);
    }
  }

  for (const c of CONFIGS) {
    if (await configs.findOneBy({ key: c.key })) continue;
    await configs.save(configs.create({ key: c.key, value: c.value, description: c.description }));
    console.log(`+ config ${c.key}`);
  }

  await dataSource.destroy();
  console.log('Seed hoàn tất.');
}

seed().catch(async (err) => {
  console.error(err);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
