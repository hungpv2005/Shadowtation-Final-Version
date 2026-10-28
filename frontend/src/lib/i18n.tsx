'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'vi' | 'en';

export function FlagVN({ className = 'w-5 h-3.5 rounded-[2px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={`inline-block shrink-0 shadow-sm overflow-hidden align-middle ${className}`} aria-hidden="true">
      <rect width="30" height="20" fill="#da251d" />
      <polygon
        points="15,4 16.5,8.8 21.5,8.8 17.5,11.8 19,16.5 15,13.5 11,16.5 12.5,11.8 8.5,8.8 13.5,8.8"
        fill="#ffff00"
      />
    </svg>
  );
}

export function FlagUK({ className = 'w-5 h-3.5 rounded-[2px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" className={`inline-block shrink-0 shadow-sm overflow-hidden align-middle ${className}`} aria-hidden="true">
      <clipPath id="uk-clip-s">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id="uk-clip-t">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath="url(#uk-clip-s)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-clip-t)" stroke="#c8102e" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
      </g>
    </svg>
  );
}

export const DICTIONARY: Record<Language, Record<string, string>> = {
  vi: {
    // Nav
    'nav.home': 'Trang chủ',
    'nav.progress': 'Tiến độ học tập',
    'nav.dictation': 'Luyện nghe',
    'nav.shadowing': 'Luyện nói',
    'nav.ai_results': 'Kết quả AI',
    'nav.notebook': 'Sổ từ vựng',
    'nav.login': 'Đăng nhập',
    'nav.account': 'Tài khoản',
    'nav.student': 'Học viên',
    'nav.learning_features': 'Chức năng học tập',
    'nav.manage_premium': 'Quản lý gói Premium',
    'nav.upgrade_premium': '⭐ Nâng cấp Premium',
    'nav.profile_settings': 'Thông tin cá nhân & Cài đặt',
    'nav.logout': 'Đăng xuất',
    'nav.notifications': 'Thông báo',
    'nav.mark_all_read': 'Đã đọc tất cả',
    'nav.streak_notif_title': '🎯 Duy trì chuỗi Streak',
    'nav.streak_notif_desc': 'Hôm nay bạn chưa luyện câu nào. Luyện 1 bài ngay để giữ chuỗi ngày học!',
    'nav.vocab_notif_title': '📚 Từ vựng cần củng cố',
    'nav.vocab_notif_desc': 'Bạn có những từ phát âm cần ôn tập lại trong tuần này.',
    'nav.vip_notif_title': '⭐ Quyền lợi VIP Premium',
    'nav.vip_active': 'Gói Premium đang hoạt động. Khám phá toàn bộ bài học VIP!',
    'nav.vip_upgrade_prompt': 'Nâng cấp Premium để AI chấm phát âm không giới hạn.',
    'theme.to_light': 'Chuyển sang nền sáng (Light mode)',
    'theme.to_dark': 'Chuyển sang nền tối (Dark mode)',

    // Home
    'home.eyebrow': 'Học một chút mỗi ngày',
    'home.hero_title': 'Nghe rõ hơn. Nói tự tin hơn.',
    'home.hero_desc': 'Luyện nghe tiếng Anh theo từng câu, nhận phản hồi dễ hiểu và theo dõi tiến bộ trong một không gian học tập gọn gàng.',
    'home.cta_dictation': 'Luyện nghe',
    'home.cta_shadowing': 'Luyện nói',
    'home.cta_features': 'Khám phá chức năng',
    'home.roadmap_title': 'Lộ trình bắt đầu',
    'home.step1_title': 'Chọn chế độ luyện tập',
    'home.step1_desc': 'Chọn Luyện nghe hoặc Luyện nói từ danh sách bài học.',
    'home.step2_title': 'Chọn bài học',
    'home.step2_desc': 'Lọc bài theo trình độ hoặc loại nội dung.',
    'home.step3_title': 'Xem phản hồi và ôn từ khó',
    'home.step3_desc': 'Đối chiếu phát âm từng từ, xem điểm AI và luyện lại khi cần.',
    'home.workspace_eyebrow': 'Không gian học tập',
    'home.workspace_title': 'Chọn điều bạn muốn luyện hôm nay',
    'home.workspace_desc': 'Bắt đầu với một hoạt động đơn giản. Bạn có thể quay lại các mục tiêu khác bất cứ lúc nào.',
    'home.open_feature': 'Mở chức năng',
    'home.bottom_title': 'Chọn chế độ luyện tập',
    'home.bottom_desc': 'Luyện nghe (Dictation) và Luyện nói (Shadowing) đều dùng chung danh sách bài học.',

    // Shadowing Practice & Nav
    'shadowing.eyebrow': 'LUYỆN NÓI · UC-04',
    'shadowing.title': 'Ghi âm và luyện nói nhại',
    'shadowing.intro': 'Nghe câu mẫu, ghi âm câu trả lời và nhận điểm ngay sau khi AI chấm xong.',
    'shadowing.recording_live': 'Đang ghi âm',
    'shadowing.recording_saved': 'Bản ghi mới nhất đã lưu',
    'shadowing.recording_turn': 'Lượt nói của bạn',
    'shadowing.recording_live_desc': 'Đang thu âm từ micro của bạn',
    'shadowing.recording_saved_desc': 'Bản ghi được tự lưu trên thiết bị; ghi âm mới sẽ thay thế bản cũ của câu này.',
    'shadowing.recording_turn_desc': 'Bật micro rồi nói nhại theo câu mẫu',
    'shadowing.mic_hint': 'Nói rõ ràng vào micro. Bạn có thể dừng ghi âm bất cứ lúc nào.',
    'shadowing.start_record': 'Bắt đầu ghi âm',
    'shadowing.record_again': 'Ghi âm lại',
    'shadowing.stop_record': 'Dừng ghi âm',
    'shadowing.play_record': 'Nghe lại bản ghi',
    'shadowing.submit_ai': 'Gửi chấm điểm AI',
    'shadowing.resubmit_ai': 'Gửi lại chấm điểm AI',
    'shadowing.submitting': 'Đang gửi…',
    'shadowing.file_limit': 'WebM, WAV hoặc MP3 · tối đa 5 MB',
    'shadowing.shortcuts': 'Phím tắt',
    'shadowing.shortcut_record': 'ghi âm lại',
    'shadowing.shortcut_stop': 'dừng ghi âm',
    'shadowing.shortcut_play': 'nghe bản mới nhất',
    'shadowing.shortcut_submit': 'gửi chấm điểm AI',
    'shadowing.shortcut_arrows': 'mũi tên ← / → đổi câu trước / sau',
    'shadowing.prev_sentence': '← Câu trước',
    'shadowing.next_sentence': 'Câu tiếp →',
    'shadowing.sentence_of': 'Câu',
    'shadowing.finish_lesson': 'Hoàn thành bài Luyện nói',
    'shadowing.remaining_note': 'câu chưa được chấm. Ghi âm và gửi chấm AI từng câu để mở nút hoàn thành.',
    'shadowing.processing_submitted': 'Đã gửi bản ghi',
    'shadowing.processing_analyzing': 'AI đang phân tích phát âm',
    'shadowing.processing_desc': 'Kết quả sẽ tự cập nhật sau khi chấm xong.',
    'shadowing.results_eyebrow': 'KẾT QUẢ LUYỆN TẬP',
    'shadowing.your_pronunciation': 'Phát âm của bạn',
    'shadowing.accuracy': 'Độ chính xác',
    'shadowing.fluency': 'Độ trôi chảy',
    'shadowing.completeness': 'Mức độ đầy đủ',
    'shadowing.word_breakdown': 'Phân tích từng từ',
    'shadowing.good': 'Tốt',
    'shadowing.needs_practice': 'Cần luyện',
    'shadowing.attention': 'Chú ý',
    'shadowing.review_note': 'Các từ cần luyện thêm đã được thêm vào danh sách ôn tập của bạn.',

    // Dictation & Practice Page
    'dictation.tab_dictation': 'Luyện nghe (Dictation)',
    'dictation.tab_shadowing': 'Luyện nói (Shadowing)',
    'dictation.back_home': '← Quay lại trang chủ',
    'dictation.back_library': '← Danh sách bài',
    'dictation.exit_lesson': 'Thoát bài',
    'dictation.view_history_dictation': 'Xem lịch sử kết quả chấm Luyện nghe',
    'dictation.view_history_shadowing': 'Xem lịch sử kết quả chấm Luyện nói',
    'dictation.progress': 'Tiến độ',
    'dictation.sentences_count': 'câu',
    'dictation.saved_total': 'Điểm tổng đã lưu',
    'dictation.sentence': 'CÂU',
    'dictation.heading_shadowing': 'Nghe và nói nhại theo câu mẫu',
    'dictation.heading_dictation': 'Nghe và nhập nội dung',
    'dictation.mode_full': 'Chép cả câu',
    'dictation.mode_blanks': 'Điền từ khuyết',
    'dictation.hint': 'Gợi ý',
    'dictation.show_transcript': 'Hiện transcript',
    'dictation.hide_transcript': 'Ẩn transcript',
    'dictation.retry_sentence': 'Thử lại câu',
    'dictation.hint_warning': 'Dùng gợi ý sẽ giảm điểm câu.',
    'dictation.your_answer': 'Câu trả lời của bạn',
    'dictation.placeholder_type': 'Nhập những gì bạn nghe được…',
    'dictation.live_feedback': 'Đối chiếu trực tiếp · cập nhật ngay khi bạn nhập',
    'dictation.current_accuracy': 'Độ chính xác hiện tại:',
    'dictation.confirmed_sentence': 'Đã xác nhận câu',
    'dictation.confirm_btn': 'Xác nhận câu',
    'dictation.prev_btn': '← Câu trước',
    'dictation.next_btn': 'Câu tiếp →',
    'dictation.finish_btn': 'Hoàn thành bài',
    'dictation.finish_lesson_listening': 'Hoàn thành bài Luyện nghe',
    'dictation.remaining_note': 'câu chưa được xác nhận. Nhập và xác nhận từng câu để mở nút hoàn thành.',
    'dictation.saving': 'Đang lưu…',
    'dictation.filter_all_levels': 'Mọi trình độ',
    'dictation.filter_all_media': 'Mọi loại bài',
    'dictation.filter_favorites': 'Đã lưu yêu thích',
    'dictation.filter_recent': 'Gần đây',
    'dictation.filter_vocab_review': 'Từ vựng cần ôn',
    'dictation.filter_custom': 'Tự thêm bài',
    'dictation.search_placeholder': 'Tìm kiếm bài học theo tiêu đề hoặc nội dung...',
    'dictation.completed_title': 'Hoàn thành bài luyện tập',
    'dictation.redo_start': '1. Làm lại từ đầu',
    'dictation.pick_another': '2. Chọn bài luyện khác',
    'dictation.continue_edit': '3. Tiếp tục làm và chỉnh sửa tiến trình',

    // AI Chatbot
    'bot.launcher_text': 'Cần trợ giúp học tập? Nhắn ShadowBot 24/7!',
    'bot.title': 'ShadowBot AI',
    'bot.subtitle': 'Hỗ trợ học tập, phương pháp & giải đáp',
    'bot.badge': 'Trợ lý 24/7',
    'bot.clear_all': 'Xóa tất cả lịch sử',
    'bot.clear_confirm': 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện với AI Bot không?',
    'bot.delete_msg': 'Xóa tin nhắn này',
    'bot.reset_success': 'Đã xóa toàn bộ lịch sử trò chuyện.',
    'bot.typing': 'ShadowBot đang trả lời...',
    'bot.placeholder': 'Nhắn tin cho ShadowBot...',
    'bot.send': 'Gửi tin nhắn',
    'bot.disclaimer': 'AI Chatbot 24/7 · Giải quyết thắc mắc học tập cơ bản đến vừa phải',

    // Dashboard
    'dashboard.title': 'Tiến độ học tập',
    'dashboard.desc': 'Theo dõi chi tiết thời gian học, độ chính xác và chuỗi rèn luyện tiếng Anh của bạn.',
    'dashboard.period_7d': '7 ngày',
    'dashboard.period_30d': '30 ngày',
    'dashboard.period_all': 'Tất cả',
    'dashboard.study_time': 'Thời lượng học',
    'dashboard.accuracy': 'Độ chính xác',
    'dashboard.attempts': 'Lượt luyện tập',
    'dashboard.streak': 'Chuỗi ngày liên tiếp',
    'dashboard.points': 'Điểm tích lũy',
    'dashboard.words_review': 'Từ cần ôn tập',
    'dashboard.chart_title': 'Biểu đồ độ chính xác theo lượt luyện tập',
    'dashboard.streak_title': 'Lịch sử duy trì chuỗi học',
    'dashboard.streak_hint': 'Luyện ít nhất 1 câu mỗi ngày để giữ ngọn lửa học tập!',

    // Notebook
    'notebook.title': 'Sổ từ vựng cá nhân',
    'notebook.desc': 'Ghi chép và lưu trữ các từ vựng bạn muốn học, dễ dàng tra cứu và ôn tập riêng.',
    'notebook.add_word': 'Thêm từ vựng mới',
    'notebook.search_placeholder': 'Tìm từ vựng hoặc nghĩa...',

    // Subscription
    'sub.title': 'Gói học Shadowtation Premium',
    'sub.desc': 'Mở khóa toàn bộ tính năng nâng cao, AI chấm phát âm không giới hạn và kho bài học độc quyền.',
  },

  en: {
    // Nav
    'nav.home': 'Home',
    'nav.progress': 'Progress',
    'nav.dictation': 'Dictation',
    'nav.shadowing': 'Shadowing',
    'nav.ai_results': 'AI Results',
    'nav.notebook': 'Vocabulary',
    'nav.login': 'Sign in',
    'nav.account': 'Account',
    'nav.student': 'Student',
    'nav.learning_features': 'Learning Features',
    'nav.manage_premium': 'Manage Premium',
    'nav.upgrade_premium': '⭐ Upgrade to Premium',
    'nav.profile_settings': 'Profile & Settings',
    'nav.logout': 'Sign out',
    'nav.notifications': 'Notifications',
    'nav.mark_all_read': 'Mark all as read',
    'nav.streak_notif_title': '🎯 Maintain your Streak',
    'nav.streak_notif_desc': "You haven't practiced any sentences today. Practice 1 lesson now to keep your streak!",
    'nav.vocab_notif_title': '📚 Vocabulary to review',
    'nav.vocab_notif_desc': 'You have pronunciation words that need practice this week.',
    'nav.vip_notif_title': '⭐ VIP Premium Benefits',
    'nav.vip_active': 'Premium membership active. Enjoy all VIP lessons!',
    'nav.vip_upgrade_prompt': 'Upgrade to Premium for unlimited AI pronunciation assessments.',
    'theme.to_light': 'Switch to Light mode',
    'theme.to_dark': 'Switch to Dark mode',

    // Home
    'home.eyebrow': 'A little practice every day',
    'home.hero_title': 'Hear clearer. Speak more confidently.',
    'home.hero_desc': 'Practice English sentence by sentence, get intuitive feedback, and track your progress in a streamlined learning space.',
    'home.cta_dictation': 'Practice Listening',
    'home.cta_shadowing': 'Practice Speaking',
    'home.cta_features': 'Explore features',
    'home.roadmap_title': 'Getting Started Roadmap',
    'home.step1_title': 'Choose practice mode',
    'home.step1_desc': 'Select Dictation (listening) or Shadowing (speaking) from the lesson catalog.',
    'home.step2_title': 'Pick a lesson',
    'home.step2_desc': 'Filter lessons by CEFR level or media format.',
    'home.step3_title': 'Review feedback & difficult words',
    'home.step3_desc': 'Check word-by-word pronunciation, review AI scores, and retry when needed.',
    'home.workspace_eyebrow': 'Learning Workspace',
    'home.workspace_title': 'Choose what you want to practice today',
    'home.workspace_desc': 'Start with a simple activity. You can return to other goals at any time.',
    'home.open_feature': 'Open feature',
    'home.bottom_title': 'Choose your practice mode',
    'home.bottom_desc': 'Both Dictation (Listening) and Shadowing (Speaking) share the same lesson library.',

    // Shadowing Practice & Nav
    'shadowing.eyebrow': 'SPEAKING PRACTICE · UC-04',
    'shadowing.title': 'Record and practice shadowing',
    'shadowing.intro': 'Listen to the model sentence, record your attempt, and receive instant AI assessment.',
    'shadowing.recording_live': 'Recording in progress',
    'shadowing.recording_saved': 'Latest recording saved',
    'shadowing.recording_turn': 'Your turn to speak',
    'shadowing.recording_live_desc': 'Recording audio from your microphone',
    'shadowing.recording_saved_desc': 'Saved locally; a new recording will replace the previous attempt for this sentence.',
    'shadowing.recording_turn_desc': 'Turn on your microphone and repeat after the native speaker',
    'shadowing.mic_hint': 'Speak clearly into your microphone. You can stop recording at any time.',
    'shadowing.start_record': 'Start recording',
    'shadowing.record_again': 'Record again',
    'shadowing.stop_record': 'Stop recording',
    'shadowing.play_record': 'Play recording',
    'shadowing.submit_ai': 'Submit for AI Assessment',
    'shadowing.resubmit_ai': 'Resubmit for AI Assessment',
    'shadowing.submitting': 'Submitting…',
    'shadowing.file_limit': 'WebM, WAV or MP3 · max 5 MB',
    'shadowing.shortcuts': 'Shortcuts',
    'shadowing.shortcut_record': 'record again',
    'shadowing.shortcut_stop': 'stop recording',
    'shadowing.shortcut_play': 'play latest',
    'shadowing.shortcut_submit': 'submit to AI',
    'shadowing.shortcut_arrows': 'arrow keys ← / → prev / next sentence',
    'shadowing.prev_sentence': '← Previous sentence',
    'shadowing.next_sentence': 'Next sentence →',
    'shadowing.sentence_of': 'Sentence',
    'shadowing.finish_lesson': 'Complete Speaking Lesson',
    'shadowing.remaining_note': 'sentences unassessed. Record and submit each sentence to unlock completion.',
    'shadowing.processing_submitted': 'Recording submitted',
    'shadowing.processing_analyzing': 'AI is analyzing your pronunciation',
    'shadowing.processing_desc': 'Results will update automatically when processing is finished.',
    'shadowing.results_eyebrow': 'PRACTICE RESULTS',
    'shadowing.your_pronunciation': 'Your Pronunciation',
    'shadowing.accuracy': 'Accuracy',
    'shadowing.fluency': 'Fluency',
    'shadowing.completeness': 'Completeness',
    'shadowing.word_breakdown': 'Word Breakdown',
    'shadowing.good': 'Good',
    'shadowing.needs_practice': 'Needs practice',
    'shadowing.attention': 'Pay attention',
    'shadowing.review_note': 'Words needing practice have been added to your vocabulary review list.',

    // Dictation & Practice Page
    'dictation.tab_dictation': 'Listening (Dictation)',
    'dictation.tab_shadowing': 'Speaking (Shadowing)',
    'dictation.back_home': '← Back to Home',
    'dictation.back_library': '← Lesson catalog',
    'dictation.exit_lesson': 'Exit lesson',
    'dictation.view_history_dictation': 'View Dictation score history',
    'dictation.view_history_shadowing': 'View Shadowing score history',
    'dictation.progress': 'Progress',
    'dictation.sentences_count': 'sentences',
    'dictation.saved_total': 'Saved overall score',
    'dictation.sentence': 'SENTENCE',
    'dictation.heading_shadowing': 'Listen and repeat after the model',
    'dictation.heading_dictation': 'Listen and type what you hear',
    'dictation.mode_full': 'Full sentence',
    'dictation.mode_blanks': 'Fill in blanks',
    'dictation.hint': 'Hint',
    'dictation.show_transcript': 'Show transcript',
    'dictation.hide_transcript': 'Hide transcript',
    'dictation.retry_sentence': 'Retry sentence',
    'dictation.hint_warning': 'Using hints reduces your sentence score.',
    'dictation.your_answer': 'Your answer',
    'dictation.placeholder_type': 'Type what you hear…',
    'dictation.live_feedback': 'Live comparison · updates as you type',
    'dictation.current_accuracy': 'Current accuracy:',
    'dictation.confirmed_sentence': 'Sentence confirmed',
    'dictation.confirm_btn': 'Confirm answer',
    'dictation.prev_btn': '← Prev sentence',
    'dictation.next_btn': 'Next sentence →',
    'dictation.finish_btn': 'Finish lesson',
    'dictation.finish_lesson_listening': 'Complete Listening Lesson',
    'dictation.remaining_note': 'sentences unconfirmed. Enter and confirm each sentence to unlock completion.',
    'dictation.saving': 'Saving…',
    'dictation.filter_all_levels': 'All levels',
    'dictation.filter_all_media': 'All media types',
    'dictation.filter_favorites': 'Favorites',
    'dictation.filter_recent': 'Recent',
    'dictation.filter_vocab_review': 'Words to review',
    'dictation.filter_custom': 'Import custom lesson',
    'dictation.search_placeholder': 'Search lessons by title or content...',
    'dictation.completed_title': 'Lesson completed',
    'dictation.redo_start': '1. Redo from start',
    'dictation.pick_another': '2. Choose another lesson',
    'dictation.continue_edit': '3. Continue and modify progress',

    // AI Chatbot
    'bot.launcher_text': 'Need study help? Chat with ShadowBot 24/7!',
    'bot.title': 'ShadowBot AI',
    'bot.subtitle': '24/7 AI Learning Assistant',
    'bot.badge': '24/7 Assistant',
    'bot.clear_all': 'Clear all chat history',
    'bot.clear_confirm': 'Are you sure you want to delete all chat history with ShadowBot?',
    'bot.delete_msg': 'Delete this message',
    'bot.reset_success': 'All chat history has been cleared.',
    'bot.typing': 'ShadowBot is answering...',
    'bot.placeholder': 'Message ShadowBot...',
    'bot.send': 'Send message',
    'bot.disclaimer': '24/7 AI Chatbot · Resolves learning questions from basic to intermediate',

    // Dashboard
    'dashboard.title': 'Learning Progress',
    'dashboard.desc': 'Track your practice time, accuracy rate, and English learning streak in detail.',
    'dashboard.period_7d': '7 days',
    'dashboard.period_30d': '30 days',
    'dashboard.period_all': 'All time',
    'dashboard.study_time': 'Study time',
    'dashboard.accuracy': 'Overall accuracy',
    'dashboard.attempts': 'Total attempts',
    'dashboard.streak': 'Day streak',
    'dashboard.points': 'Earned points',
    'dashboard.words_review': 'Words to review',
    'dashboard.chart_title': 'Accuracy rate by practice session',
    'dashboard.streak_title': 'Daily streak tracking',
    'dashboard.streak_hint': 'Practice at least 1 sentence each day to keep your streak alive!',

    // Notebook
    'notebook.title': 'Personal Vocabulary Notebook',
    'notebook.desc': 'Save new vocabulary with parts of speech, context, and accurate pronunciation.',
    'notebook.add_word': 'Add new vocabulary',
    'notebook.search_placeholder': 'Search word or meaning...',

    // Subscription
    'sub.title': 'Shadowtation Premium Membership',
    'sub.desc': 'Unlock all advanced features, unlimited AI speech grading, and exclusive study content.',
  },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, defaultVi?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'vi',
  setLang: () => {},
  t: (key: string, defaultVi?: string) => defaultVi ?? key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('vi');

  useEffect(() => {
    const saved = localStorage.getItem('shadowtation_lang') as Language | null;
    if (saved === 'en' || saved === 'vi') {
      setLangState(saved);
      document.documentElement.lang = saved;
    }

    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<Language>;
      if (customEvent.detail === 'en' || customEvent.detail === 'vi') {
        setLangState(customEvent.detail);
        document.documentElement.lang = customEvent.detail;
      }
    };

    window.addEventListener('shadowtation:lang-change', handleLangChange);
    return () => window.removeEventListener('shadowtation:lang-change', handleLangChange);
  }, []);

  const setLang = (nextLang: Language) => {
    setLangState(nextLang);
    localStorage.setItem('shadowtation_lang', nextLang);
    document.documentElement.lang = nextLang;
    window.dispatchEvent(new CustomEvent('shadowtation:lang-change', { detail: nextLang }));
  };

  const t = (key: string, defaultVi?: string): string => {
    const translated = DICTIONARY[lang]?.[key];
    if (translated) return translated;
    if (lang === 'vi' && defaultVi) return defaultVi;
    if (DICTIONARY.en[key]) return DICTIONARY.en[key];
    return defaultVi ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
