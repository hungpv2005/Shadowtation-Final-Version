export type Feature = {
  id: string;
  title: string;
  enTitle?: string;
  description: string;
  enDescription?: string;
  category: string;
  enCategory?: string;
  icon: string;
  href: string;
  available: boolean;
};

export const features: Feature[] = [
  {
    id: 'uc-01',
    title: 'Đăng nhập & tài khoản',
    enTitle: 'Sign in & Account',
    description: 'Truy cập hồ sơ học tập và quản lý thông tin cá nhân.',
    enDescription: 'Access your learning profile and manage personal information.',
    category: 'Tài khoản',
    enCategory: 'Account',
    icon: '◎',
    href: '/login',
    available: true,
  },
  {
    id: 'uc-02',
    title: 'Luyện nghe Dictation',
    enTitle: 'Listening (Dictation)',
    description: 'Nghe từng câu, chép lại và xem lỗi sai ngay khi nhập.',
    enDescription: 'Listen sentence by sentence, transcribe, and see mistakes live.',
    category: 'Luyện nghe',
    enCategory: 'Listening',
    icon: '♫',
    href: '/practice/dictation?mode=dictation',
    available: true,
  },
  {
    id: 'uc-03',
    title: 'Gợi ý khi luyện tập',
    enTitle: 'Practice Hints & Help',
    description: 'Nghe chậm, mở gợi ý theo cấp độ hoặc xem transcript.',
    enDescription: 'Slow audio down, unlock progressive hints, or view full transcript.',
    category: 'Luyện nghe',
    enCategory: 'Listening',
    icon: '✦',
    href: '/practice/dictation?feature=hints',
    available: true,
  },
  {
    id: 'uc-04',
    title: 'Luyện nói Shadowing',
    enTitle: 'Speaking (Shadowing)',
    description: 'Nghe câu mẫu, ghi âm giọng nói và luyện nhại theo từng câu.',
    enDescription: 'Listen to native speakers, record your voice, and shadow sentence by sentence.',
    category: 'Luyện nói',
    enCategory: 'Speaking',
    icon: '◉',
    href: '/practice/dictation?mode=shadowing',
    available: true,
  },
  {
    id: 'uc-05',
    title: 'Kết quả phát âm AI',
    enTitle: 'AI Pronunciation Results',
    description: 'Xem lịch sử chấm và nhận diện những từ cần luyện thêm.',
    enDescription: 'Review grading history and identify words needing more practice.',
    category: 'Luyện nói',
    enCategory: 'Speaking',
    icon: '✧',
    href: '/practice/shadowing/results',
    available: true,
  },
  {
    id: 'uc-06',
    title: 'Tiến độ học tập',
    enTitle: 'Learning Progress',
    description: 'Theo dõi thời lượng luyện tập, chuỗi ngày học và hành trình của bạn.',
    enDescription: 'Track study duration, daily streak, and your overall learning journey.',
    category: 'Cá nhân hóa',
    enCategory: 'Personal',
    icon: '▥',
    href: '/dashboard',
    available: true,
  },
  {
    id: 'uc-07',
    title: 'Sổ từ vựng cá nhân',
    enTitle: 'Personal Vocabulary Notebook',
    description: 'Ghi chép và lưu trữ các từ vựng bạn muốn học, dễ dàng tra cứu và ôn tập riêng.',
    enDescription: 'Record and store vocabulary you want to learn, easy to search and review.',
    category: 'Cá nhân hóa',
    enCategory: 'Personal',
    icon: '📖',
    href: '/vocabulary',
    available: true,
  },
  {
    id: 'uc-10',
    title: 'Gói học Premium',
    enTitle: 'Premium Membership',
    description: 'Khám phá quyền lợi và các gói học nâng cao.',
    enDescription: 'Explore VIP benefits, pricing plans, and unlimited AI speech assessments.',
    category: 'Tài khoản',
    enCategory: 'Account',
    icon: '♕',
    href: '/subscription',
    available: true,
  },
];
