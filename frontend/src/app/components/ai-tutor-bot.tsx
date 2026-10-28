'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

type Message = {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  links?: Array<{ href: string; label: string }>;
  isTicket?: boolean;
  ticketId?: string;
  timestamp: string;
};

const CHAT_STORAGE_KEY = 'shadowtation.chatbot_messages';

const QUICK_PROMPTS_VI = [
  'Luyện Shadowing thế nào hiệu quả?',
  'Cách luyện nghe Dictation cho người mới?',
  'Tìm bài học cơ bản A1 - A2',
  'Cách lưu từ vào Sổ từ vựng?',
  'Gói học Premium có quyền lợi gì?',
  'Liên hệ hỗ trợ kỹ thuật hoặc chuyên gia?',
];

const QUICK_PROMPTS_EN = [
  'How to practice Shadowing effectively?',
  'Dictation tips for beginners?',
  'Find A1 - A2 beginner lessons',
  'How to save words to Vocabulary Notebook?',
  'What benefits does Premium offer?',
  'Contact technical support or tutors?',
];

const KNOWLEDGE_BASE_VI: Array<{
  keywords: string[];
  reply: string;
  links?: Array<{ href: string; label: string }>;
}> = [
  {
    keywords: ['shadowing', 'luyện nói', 'phát âm', 'nhại', 'nói'],
    reply:
      'Để luyện Shadowing đạt hiệu quả cao nhất, bạn hãy áp dụng quy trình 4 bước chuẩn ngôn ngữ học:\n1. **Nghe mẫu 1-2 lần** để nắm bắt ngữ điệu, nhịp điệu và chỗ ngắt nghỉ.\n2. **Nói nhẩm thầm (Mumbling)** đuổi theo giọng bản xứ để cơ miệng làm quen.\n3. **Nói to rõ ràng (Loud Shadowing)** và chú ý phát âm rõ âm đuôi (ending sounds: /s/, /t/, /d/, /ed/).\n4. **Bấm micro ghi âm và gửi AI chấm điểm** để xem chi tiết từng từ chuẩn (xanh) hay chưa chuẩn (đỏ).',
    links: [
      { href: '/practice/dictation?mode=shadowing', label: '🎙️ Mở bài Luyện nói ngay' },
      { href: '/practice/shadowing/results', label: '📊 Xem kết quả phát âm' },
    ],
  },
  {
    keywords: ['dictation', 'luyện nghe', 'chép chính tả', 'nghe'],
    reply:
      'Phương pháp Dictation (nghe chép chính tả) giúp cải thiện phản xạ nhận diện âm thanh vượt bậc:\n- Hãy nghe trọn vẹn cả câu trước khi gõ.\n- Nếu câu khó, bạn có thể bấm nghe lại hoặc sử dụng tính năng **Điền từ còn thiếu** thay vì chép toàn bộ câu.\n- Những từ gõ sai sẽ tự động được đưa vào **Danh sách từ vựng ôn tập** để bạn rèn luyện lại sau.',
    links: [
      { href: '/practice/dictation?mode=dictation', label: '🎧 Mở bài Luyện nghe ngay' },
      { href: '/practice/dictation/results', label: '📈 Xem kết quả Luyện nghe' },
    ],
  },
  {
    keywords: ['bài học', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'tìm bài', 'trình độ', 'cơ bản', 'nâng cao'],
    reply:
      'Bạn có thể dễ dàng tìm bài học phù hợp với trình độ của mình:\n- **A1–A2 (Cơ bản)**: Câu ngắn, phát âm rõ ràng, phù hợp cho người mới bắt đầu.\n- **B1–B2 (Trung cấp)**: Tốc độ tự nhiên, hội thoại công việc, tin tức ngắn.\n- **C1–C2 (Nâng cao)**: Tốc độ bản ngữ nhanh, nhiều từ vựng học thuật, podcast và phóng sự chuyên sâu.\n\nHãy vào thư viện bài học và sử dụng bộ lọc "Mọi trình độ" ở đầu trang để lọc nhanh nhé!',
    links: [{ href: '/practice/dictation', label: '📚 Vào thư viện bài học' }],
  },
  {
    keywords: ['sổ từ', 'từ vựng', 'lưu từ', 'loại từ', 'từ điển', 'ôn tập', 'vocab'],
    reply:
      'Shadowtation hỗ trợ bạn ghi nhớ từ vựng qua 2 chức năng thông minh:\n1. **Sổ từ vựng cá nhân**: Lưu mọi từ bạn muốn học kèm Loại từ (n, v, adj, adv...), nghĩa tiếng Việt, câu ví dụ ngữ cảnh và nút phát âm chuẩn 🔊.\n2. **Danh sách từ vựng ôn tập**: Tự động gom lại các từ bạn gõ sai hoặc phát âm chưa chuẩn trong quá trình luyện tập để bạn ôn lại chuyên sâu.',
    links: [
      { href: '/vocabulary', label: '📖 Mở Sổ từ vựng cá nhân' },
      { href: '/practice/vocabulary-review', label: '📝 Mở Danh sách từ ôn tập' },
    ],
  },
  {
    keywords: ['premium', 'vip', 'gói học', 'nâng cấp', 'giá', 'phí', 'học phí', 'quyền lợi'],
    reply:
      'Gói học **Shadowtation Premium** mở khóa toàn bộ sức mạnh học tập:\n⭐ **Chấm điểm phát âm AI không giới hạn** thời gian thực (Accuracy, Fluency, Intonation).\n🎬 **Tự nhập video YouTube & Podcast riêng** không giới hạn số lượng.\n🧠 **Sổ từ vựng Spaced Repetition** thông minh không giới hạn từ lưu trữ.\n⚡ **Tùy chỉnh tốc độ 0.5x – 1.5x** giữ nguyên cao độ giọng nói.\n🛡️ **100% không quảng cáo** & hỗ trợ kỹ thuật ưu tiên 24/7.',
    links: [{ href: '/subscription', label: '⭐ Xem chi tiết gói Premium' }],
  },
  {
    keywords: ['liên hệ', 'kỹ thuật', 'lỗi', 'hỗ trợ', 'hotline', 'email', 'chuyên gia', 'giảng viên', 'khiếu nại', 'thanh toán'],
    reply:
      'Đội ngũ chăm sóc học viên Shadowtation luôn sẵn sàng đồng hành cùng bạn:\n- 📧 **Email hỗ trợ**: support@shadowtation.edu.vn\n- ☎️ **Hotline 24/7**: 1900 8888 (Miễn cước học viên)\n- 💬 **Hỗ trợ học thuật**: Giảng viên ngôn ngữ trực tuyến giải đáp thắc mắc phát âm hàng ngày.\n\nNếu bạn gặp sự cố kỹ thuật hoặc thanh toán, hãy nhắn chi tiết để mình tạo phiếu hỗ trợ gửi chuyên viên kỹ thuật xử lý ngay nhé!',
  },
];

const KNOWLEDGE_BASE_EN: Array<{
  keywords: string[];
  reply: string;
  links?: Array<{ href: string; label: string }>;
}> = [
  {
    keywords: ['shadowing', 'speaking', 'pronunciation', 'accent', 'repeat', 'loud'],
    reply:
      'To practice Shadowing effectively, follow this 4-step linguistics framework:\n1. **Listen to the model 1–2 times** to capture rhythm, intonation, and pauses.\n2. **Mumble quietly (Mumbling)** along with the native speaker so your facial muscles adapt.\n3. **Speak out loud (Loud Shadowing)** paying special attention to ending sounds (/s/, /t/, /d/, /ed/).\n4. **Record with your mic and submit to AI** to see detailed word-by-word accuracy.',
    links: [
      { href: '/practice/dictation?mode=shadowing', label: '🎙️ Open Speaking Practice' },
      { href: '/practice/shadowing/results', label: '📊 View Speech Results' },
    ],
  },
  {
    keywords: ['dictation', 'listening', 'transcribe', 'hear', 'spelling'],
    reply:
      'Dictation (listening and typing) dramatically trains auditory recognition:\n- Listen to the full sentence before typing.\n- If a sentence is tough, replay or switch to **Fill in Blanks** mode.\n- Misspelled words are automatically added to your **Vocabulary Review List** for targeted review later.',
    links: [
      { href: '/practice/dictation?mode=dictation', label: '🎧 Open Listening Practice' },
      { href: '/practice/dictation/results', label: '📈 View Dictation Results' },
    ],
  },
  {
    keywords: ['lesson', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'level', 'beginner', 'advanced'],
    reply:
      'You can easily find lessons matching your proficiency level:\n- **A1–A2 (Beginner)**: Short sentences, clear pronunciation, ideal for starters.\n- **B1–B2 (Intermediate)**: Natural speech speed, workplace dialogues, short news.\n- **C1–C2 (Advanced)**: Native speech rate, academic vocabulary, podcasts, and deep documentaries.\n\nUse the "All levels" filter in the lesson catalog at any time!',
    links: [{ href: '/practice/dictation', label: '📚 Go to Lesson Catalog' }],
  },
  {
    keywords: ['notebook', 'vocabulary', 'words', 'save', 'review', 'dictionary'],
    reply:
      'Shadowtation offers 2 powerful vocabulary tools:\n1. **Personal Vocabulary Notebook**: Store any word with Part of Speech (n, v, adj, adv...), definitions, context examples, and native audio pronunciation 🔊.\n2. **Review Vocabulary List**: Automatically gathers words you missed in listening or mispronounced in shadowing for spaced repetition.',
    links: [
      { href: '/vocabulary', label: '📖 Open Vocabulary Notebook' },
      { href: '/practice/vocabulary-review', label: '📝 Open Review List' },
    ],
  },
  {
    keywords: ['premium', 'vip', 'upgrade', 'price', 'pricing', 'benefits', 'subscription'],
    reply:
      '**Shadowtation Premium** unlocks your full learning potential:\n⭐ **Unlimited AI pronunciation grading** in real time (Accuracy, Fluency, Completeness).\n🎬 **Unlimited custom YouTube & Podcast imports**.\n🧠 **Spaced Repetition Notebook** with unlimited storage.\n⚡ **Pitch-preserving 0.5x – 1.5x speed adjustment**.\n🛡️ **100% ad-free** & 24/7 priority support.',
    links: [{ href: '/subscription', label: '⭐ View Premium Plans' }],
  },
  {
    keywords: ['contact', 'support', 'help', 'bug', 'error', 'issue', 'hotline', 'email', 'tutor'],
    reply:
      'Our student success team is always here for you:\n- 📧 **Support Email**: support@shadowtation.edu.vn\n- ☎️ **24/7 Hotline**: 1900 8888 (Toll-free for students)\n- 💬 **Academic Support**: Certified ESL tutors answer pronunciation inquiries daily.\n\nIf you encounter a technical or billing issue, describe it here and I will generate a priority support ticket immediately!',
  },
];

function getWelcomeMessage(lang: 'vi' | 'en'): Message {
  if (lang === 'en') {
    return {
      id: 'welcome-en',
      sender: 'bot',
      text: 'Hello! I am **ShadowBot** – your 24/7 AI learning assistant 🤖.\n\nI can help you with Dictation & Shadowing practice techniques, finding lessons by level, managing your Vocabulary Notebook, or answering questions about your account. What do you need help with today?',
      timestamp: 'Just now',
    };
  }
  return {
    id: 'welcome-vi',
    sender: 'bot',
    text: 'Xin chào! Mình là **ShadowBot** – Trợ lý học tập AI của bạn 24/7 🤖.\n\nMình có thể hỗ trợ bạn phương pháp luyện nghe/nói, tìm bài học theo cấp độ, cách sử dụng Sổ từ vựng, hoặc giải đáp các thắc mắc về tài khoản. Bạn cần mình giúp gì hôm nay?',
    timestamp: 'Vừa xong',
  };
}

export function AiTutorBot() {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage('vi')]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Hydrate messages from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setIsHydrated(true);
          return;
        }
      }
    } catch {
      // Fallback to default welcome message
    }
    setMessages([getWelcomeMessage(lang)]);
    setIsHydrated(true);
  }, []);

  // 2. Persist messages to localStorage whenever they change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Storage full or unavailable
    }
  }, [messages, isHydrated]);

  // 3. Scroll to bottom on open or new message
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages, isTyping]);

  const showNotification = (text: string) => {
    setFeedbackToast(text);
    setTimeout(() => {
      setFeedbackToast((current) => (current === text ? null : current));
    }, 2800);
  };

  // Delete a single message by ID
  const handleDeleteMessage = (id: string) => {
    setMessages((prev) => {
      const next = prev.filter((m) => m.id !== id);
      if (next.length === 0) {
        return [getWelcomeMessage(lang)];
      }
      return next;
    });
    showNotification(lang === 'en' ? 'Message deleted' : 'Đã xóa tin nhắn');
  };

  // Delete all chat history
  const handleClearAllHistory = () => {
    const welcome = [getWelcomeMessage(lang)];
    setMessages(welcome);
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(welcome));
    } catch {}
    setShowClearConfirm(false);
    showNotification(t('bot.reset_success'));
  };

  const handleSend = (textToSend?: string) => {
    const query = (textToSend ?? inputText).trim();
    if (!query) return;

    const timeStr = new Date().toLocaleTimeString(lang === 'en' ? 'en-US' : 'vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    const isEn = lang === 'en';
    const kb = isEn ? KNOWLEDGE_BASE_EN : KNOWLEDGE_BASE_VI;

    setTimeout(() => {
      const lower = query.toLowerCase();

      // Find best match in knowledge base
      const matched = kb.find((item) => item.keywords.some((kw) => lower.includes(kw)));

      let botResponse: Message;

      // Complex / deep issues check
      const isComplexIssue =
        lower.includes('hoàn tiền') ||
        lower.includes('refund') ||
        lower.includes('khiếu nại') ||
        lower.includes('complaint') ||
        lower.includes('sự cố ngân hàng') ||
        lower.includes('billing') ||
        lower.includes('đổi tài khoản') ||
        (lower.includes('lỗi') && (lower.includes('code') || lower.includes('server') || lower.includes('api'))) ||
        (lower.includes('bug') && (lower.includes('code') || lower.includes('server') || lower.includes('api')));

      if (isComplexIssue) {
        const ticketId = `TICK-${Math.floor(100000 + Math.random() * 900000)}`;
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: isEn
            ? `Thank you for reaching out. This issue falls under **Advanced Technical & Account Support**.\n\nI have automatically generated a priority support ticket:\n- **Ticket ID**: \`${ticketId}\`\n- **Status**: Forwarded to Technical & Academic Specialists.\n\nOur team will review this in detail and follow up via email within **2–4 business hours**!`
            : `Cảm ơn bạn đã phản hồi. Vấn đề này thuộc phạm vi **Hỗ trợ Chuyên sâu & Kỹ thuật**.\n\nMình đã tự động ghi nhận và tạo phiếu hỗ trợ ưu tiên:\n- **Mã Ticket**: \`${ticketId}\`\n- **Trạng thái**: Đã chuyển tiếp đến đội ngũ Chuyên môn & Kỹ thuật.\n\nĐội ngũ chuyên viên sẽ kiểm tra chi tiết và phản hồi bạn qua email hoặc liên hệ trong vòng **2–4 giờ làm việc**. Bạn hoàn toàn yên tâm nhé!`,
          isTicket: true,
          ticketId,
          timestamp: new Date().toLocaleTimeString(isEn ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (matched) {
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: matched.reply,
          links: matched.links,
          timestamp: new Date().toLocaleTimeString(isEn ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
      } else {
        // Fallback message
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: isEn
            ? `Thank you for your question about: "${query}".\n\nI've recorded your question. To help you best, you can check common topics below, or provide more details so I can create a specialist ticket for you!`
            : `Cảm ơn câu hỏi của bạn về: "${query}".\n\nMình đã ghi nhận câu hỏi. Để hỗ trợ tốt nhất, bạn có thể tham khảo nhanh các chủ đề thông dụng bên dưới, hoặc nếu cần hỗ trợ kỹ thuật chuyên sâu, hãy gửi thêm thông tin chi tiết để mình tạo ticket cho chuyên viên nhé!`,
          links: [
            { href: '/practice/dictation', label: isEn ? '📚 Explore Lessons' : '📚 Khám phá bài học' },
            { href: '/vocabulary', label: isEn ? '📖 Vocabulary Notebook' : '📖 Sổ từ vựng cá nhân' },
            { href: '/subscription', label: isEn ? '⭐ Premium Plans' : '⭐ Gói học Premium' },
          ],
          timestamp: new Date().toLocaleTimeString(isEn ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
      }

      setIsTyping(false);
      setMessages((prev) => [...prev, botResponse]);
      if (!isOpen) setHasUnread(true);
    }, 700);
  };

  const quickPrompts = lang === 'en' ? QUICK_PROMPTS_EN : QUICK_PROMPTS_VI;

  return (
    <>
      {/* Floating Launcher Button ở góc dưới bên phải */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-2 rounded-2xl border-2 border-blue-300 dark:border-blue-700 bg-white/95 dark:bg-slate-800/95 px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-md animate-bounce">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>{t('bot.launcher_text')}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={t('bot.launcher_text')}
          className="group relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white shadow-2xl shadow-blue-600/40 transition-all duration-300 hover:scale-105 hover:shadow-blue-600/60 active:scale-95 border-2 border-white/80"
        >
          {isOpen ? (
            <span className="text-2xl font-black">✕</span>
          ) : (
            <div className="relative flex items-center justify-center">
              <span className="text-3xl">🤖</span>
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 border-2 border-white">
                <span className="h-2 w-2 rounded-full bg-emerald-700" />
              </span>
              {hasUnread && (
                <span className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white">
                  1
                </span>
              )}
            </div>
          )}
        </button>
      </div>

      {/* Cửa sổ Chatbot khi mở ra */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 flex h-[600px] w-[410px] max-h-[calc(100vh-120px)] max-w-[calc(100vw-32px)] flex-col rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transition-all duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur-sm border border-white/30 shadow-inner">
                🤖
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-indigo-700 bg-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-extrabold leading-tight">{t('bot.title')}</h3>
                  <span className="rounded-full bg-emerald-400/30 border border-emerald-300 px-2 py-0.2 text-[10px] font-black uppercase text-emerald-100">
                    {t('bot.badge')}
                  </span>
                </div>
                <p className="text-xs text-blue-100 opacity-90">{t('bot.subtitle')}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Nút Xóa tất cả lịch sử trò chuyện */}
              <button
                type="button"
                onClick={() => setShowClearConfirm((prev) => !prev)}
                title={t('bot.clear_all')}
                className="rounded-xl p-2 text-white/80 hover:bg-white/20 hover:text-white transition flex items-center justify-center"
                aria-label={t('bot.clear_all')}
              >
                <span className="text-base" role="img" aria-label="Clear history">🗑️</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title={lang === 'en' ? 'Close chat' : 'Đóng chat'}
                className="rounded-xl p-2 text-white/80 hover:bg-white/20 hover:text-white transition font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Hộp xác nhận xóa toàn bộ lịch sử (Clear all history dialog) */}
          {showClearConfirm && (
            <div className="border-b border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/80 p-3 animate-in fade-in slide-in-from-top-1 text-slate-900 dark:text-slate-100">
              <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
                {t('bot.clear_confirm')}
              </p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-semibold hover:bg-slate-100"
                >
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
                >
                  {lang === 'en' ? 'Delete all' : 'Xóa tất cả'}
                </button>
              </div>
            </div>
          )}

          {/* Quick Prompt Chips */}
          <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(prompt)}
                className="inline-block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-700 transition shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Message List with Individual Delete Buttons */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`group relative flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none font-medium'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                  }`}
                >
                  {/* Delete button for individual message */}
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(msg.id)}
                    title={t('bot.delete_msg')}
                    aria-label={t('bot.delete_msg')}
                    className={`absolute -top-2 ${
                      msg.sender === 'user' ? '-left-2' : '-right-2'
                    } flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] opacity-0 transition group-hover:opacity-100 hover:bg-rose-500 hover:text-white shadow`}
                  >
                    ✕
                  </button>

                  <div className="whitespace-pre-line">
                    {msg.text.split('\n').map((line, idx) => {
                      const parts = line.split(/(\*\*[^*]+\*\*)/g);
                      return (
                        <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>
                          {parts.map((part, pIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                            }
                            if (part.startsWith('`') && part.endsWith('`')) {
                              return (
                                <code
                                  key={pIdx}
                                  className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                                >
                                  {part.slice(1, -1)}
                                </code>
                              );
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                  </div>

                  {/* Links attached in bot message */}
                  {msg.links && msg.links.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
                      {msg.links.map((link, lIdx) => (
                        <Link
                          key={lIdx}
                          href={link.href}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition"
                        >
                          {link.label} ↗
                        </Link>
                      ))}
                    </div>
                  )}

                  {msg.isTicket && (
                    <div className="mt-2.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 text-xs text-amber-900 dark:text-amber-200 font-bold">
                      🛡️ {lang === 'en' ? 'Support ticket logged automatically.' : 'Phiếu tiếp nhận chuyên sâu đã được lưu tự động.'}
                    </div>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 px-1 text-[10px] text-slate-400">
                  <span>{msg.timestamp}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="opacity-0 group-hover:opacity-80 hover:opacity-100 text-rose-500 font-medium hover:underline"
                  >
                    {lang === 'en' ? 'Delete' : 'Xóa'}
                  </button>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 w-fit shadow-sm">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-slate-400 ml-1.5 font-medium">{t('bot.typing')}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Feedback Toast */}
          {feedbackToast && (
            <div className="bg-slate-800 text-white px-4 py-1.5 text-center text-xs font-bold animate-in fade-in">
              {feedbackToast}
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
          >
            <div className="flex items-center gap-2 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('bot.placeholder')}
                className="flex-1 bg-transparent py-1.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow hover:bg-blue-700 disabled:opacity-40 transition shrink-0"
                aria-label={t('bot.send')}
              >
                ➤
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-400">
              {t('bot.disclaimer')}
            </p>
          </form>
        </div>
      )}
    </>
  );
}
