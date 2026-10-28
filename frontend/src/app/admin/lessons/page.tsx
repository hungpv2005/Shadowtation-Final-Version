'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit3,
  X,
  Crown,
  Headphones,
  RefreshCw,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UploadCloud,
  FileText,
  Check,
  ArrowRight,
} from 'lucide-react';

type LessonLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
type LessonMediaType = 'AUDIO' | 'VIDEO' | 'PODCAST';
type LessonStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

interface LessonItem {
  id: string;
  title: string;
  level: LessonLevel;
  audioUrl: string;
  mediaType: LessonMediaType;
  sourceName?: string | null;
  sourceUrl?: string | null;
  durationSeconds?: number | null;
  isPremiumOnly: boolean;
  status: LessonStatus;
  sentenceCount: number;
  createdAt: string;
}

interface SentenceItem {
  id?: string;
  orderIndex: number;
  startTime: number;
  endTime: number;
  textContent: string;
}

export default function AdminLessonsPage() {
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPremium, setFilterPremium] = useState('ALL');

  // Modal Lesson
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    level: 'BEGINNER' as LessonLevel,
    audioUrl: '',
    mediaType: 'AUDIO' as LessonMediaType,
    sourceName: 'Shadowtation Library',
    sourceUrl: '',
    durationSeconds: 120,
    isPremiumOnly: false,
    status: 'PUBLISHED' as LessonStatus,
  });

  // Modal Sentences
  const [sentenceModalOpen, setSentenceModalOpen] = useState(false);
  const [currentLessonForSentences, setCurrentLessonForSentences] = useState<LessonItem | null>(null);
  const [sentences, setSentences] = useState<SentenceItem[]>([]);
  const [savingSentences, setSavingSentences] = useState(false);

  // AI Auto-Transcription States
  const [transcribingId, setTranscribingId] = useState<string | null>(null);

  // AI in Create/Edit Modal
  const [aiPreviewLoading, setAiPreviewLoading] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState<{
    durationSeconds: number;
    sentenceCount: number;
    sentences: SentenceItem[];
  } | null>(null);
  const [aiPreviewError, setAiPreviewError] = useState<string | null>(null);

  // AI in Sentence Editor Modal
  const [aiSentenceModalOpen, setAiSentenceModalOpen] = useState(false);
  const [aiSourceMode, setAiSourceMode] = useState<'URL' | 'FILE' | 'VTT'>('URL');
  const [aiCustomUrl, setAiCustomUrl] = useState('');
  const [aiSelectedFile, setAiSelectedFile] = useState<File | null>(null);
  const [aiVttText, setAiVttText] = useState('');
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiExtractedResult, setAiExtractedResult] = useState<{
    durationSeconds: number;
    sentenceCount: number;
    sentences: SentenceItem[];
  } | null>(null);
  const [aiSentenceError, setAiSentenceError] = useState<string | null>(null);

  useEffect(() => {
    loadLessons();
  }, [filterLevel, filterStatus, filterPremium]);

  const loadLessons = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterLevel !== 'ALL') params.append('level', filterLevel);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterPremium === 'PREMIUM') params.append('isPremiumOnly', 'true');
      if (filterPremium === 'FREE') params.append('isPremiumOnly', 'false');
      if (searchQuery.trim()) params.append('q', searchQuery.trim());

      const data = await apiFetch<LessonItem[]>(`/admin/lessons?${params.toString()}`);
      setLessons(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách bài học.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateLesson = () => {
    setEditingLessonId(null);
    setLessonForm({
      title: '',
      level: 'BEGINNER',
      audioUrl: '',
      mediaType: 'AUDIO',
      sourceName: 'Shadowtation Library',
      sourceUrl: '',
      durationSeconds: 60,
      isPremiumOnly: false,
      status: 'PUBLISHED',
    });
    setAiPreviewData(null);
    setAiPreviewError(null);
    setLessonModalOpen(true);
  };

  const handleOpenEditLesson = (lesson: LessonItem) => {
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title,
      level: lesson.level,
      audioUrl: lesson.audioUrl,
      mediaType: lesson.mediaType,
      sourceName: lesson.sourceName || '',
      sourceUrl: lesson.sourceUrl || '',
      durationSeconds: lesson.durationSeconds || 60,
      isPremiumOnly: lesson.isPremiumOnly,
      status: lesson.status,
    });
    setAiPreviewData(null);
    setAiPreviewError(null);
    setLessonModalOpen(true);
  };

  const handlePreviewAutoTranscribe = async () => {
    if (!lessonForm.audioUrl.trim()) {
      alert('Vui lòng nhập đường dẫn Audio / Video URL trước khi chạy trích xuất AI.');
      return;
    }
    setAiPreviewLoading(true);
    setAiPreviewError(null);
    try {
      const data = await apiFetch<any>('/admin/lessons/auto-transcribe-preview', {
        method: 'POST',
        body: JSON.stringify({ mediaUrl: lessonForm.audioUrl.trim() }),
      });
      setAiPreviewData(data);
      if (data.durationSeconds) {
        setLessonForm((prev) => ({
          ...prev,
          durationSeconds: data.durationSeconds,
        }));
      }
    } catch (err: any) {
      setAiPreviewError(err.message || 'Lỗi khi trích xuất phụ đề AI từ nguồn URL.');
    } finally {
      setAiPreviewLoading(false);
    }
  };

  const handleQuickAutoTranscribe = async (lesson: LessonItem) => {
    if (
      !confirm(
        `Bạn có muốn AI tự động trích xuất phụ đề & timestamp cho bài học "${lesson.title}"?\n\n` +
        `• Nguồn: ${lesson.audioUrl}\n` +
        `• Lưu ý: Danh sách câu thoại hiện tại sẽ được đồng bộ theo kết quả AI.`
      )
    ) {
      return;
    }

    setTranscribingId(lesson.id);
    try {
      const res = await apiFetch<any>(`/admin/lessons/${lesson.id}/auto-transcribe`, {
        method: 'POST',
        body: JSON.stringify({ mediaUrl: lesson.audioUrl }),
      });
      alert(`Đã trích xuất thành công ${res.sentences?.length ?? 0} câu thoại bằng AI!`);
      loadLessons();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi chạy AI Auto-Transcription.');
    } finally {
      setTranscribingId(null);
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLessonId) {
        await apiFetch(`/admin/lessons/${editingLessonId}`, {
          method: 'PUT',
          body: JSON.stringify(lessonForm),
        });
      } else {
        const payload: any = { ...lessonForm };
        if (aiPreviewData?.sentences?.length) {
          payload.sentences = aiPreviewData.sentences;
        }
        await apiFetch('/admin/lessons', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setLessonModalOpen(false);
      setAiPreviewData(null);
      loadLessons();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu bài học.');
    }
  };

  const handleDeleteLesson = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bài học "${title}" và toàn bộ câu thoại liên quan?`)) return;
    try {
      await apiFetch(`/admin/lessons/${id}`, { method: 'DELETE' });
      loadLessons();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa bài học.');
    }
  };

  const handleOpenSentenceEditor = async (lesson: LessonItem) => {
    setCurrentLessonForSentences(lesson);
    setSentenceModalOpen(true);
    setLoading(true);
    try {
      const data = await apiFetch<any>(`/admin/lessons/${lesson.id}`);
      if (Array.isArray(data.sentences)) {
        setSentences(data.sentences.sort((a: any, b: any) => a.orderIndex - b.orderIndex));
      } else {
        setSentences([]);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải chi tiết câu thoại.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSentence = () => {
    const last = sentences[sentences.length - 1];
    const nextStart = last ? last.endTime : 0;
    setSentences([
      ...sentences,
      {
        orderIndex: sentences.length,
        startTime: nextStart,
        endTime: nextStart + 3,
        textContent: '',
      },
    ]);
  };

  const handleRemoveSentence = (index: number) => {
    const next = sentences.filter((_, i) => i !== index).map((s, i) => ({ ...s, orderIndex: i }));
    setSentences(next);
  };

  const handleOpenAiSentenceModal = () => {
    if (!currentLessonForSentences) return;
    setAiCustomUrl(currentLessonForSentences.audioUrl);
    setAiSelectedFile(null);
    setAiVttText('');
    setAiSourceMode('URL');
    setAiExtractedResult(null);
    setAiSentenceError(null);
    setAiSentenceModalOpen(true);
  };

  const handleRunAiExtraction = async () => {
    setAiExtracting(true);
    setAiSentenceError(null);
    try {
      let data: any;

      if (aiSourceMode === 'FILE') {
        if (!aiSelectedFile) throw new Error('Vui lòng chọn tệp âm thanh (.mp3, .wav, .m4a).');
        const formData = new FormData();
        formData.append('file', aiSelectedFile);
        data = await apiFetch<any>('/admin/lessons/auto-transcribe-audio-file', {
          method: 'POST',
          body: formData,
        });
      } else if (aiSourceMode === 'URL') {
        if (!aiCustomUrl.trim()) throw new Error('Vui lòng nhập đường dẫn Audio / Video URL.');
        data = await apiFetch<any>('/admin/lessons/auto-transcribe-preview', {
          method: 'POST',
          body: JSON.stringify({ mediaUrl: aiCustomUrl.trim() }),
        });
      } else {
        if (!aiVttText.trim()) throw new Error('Vui lòng dán hoặc tải nội dung phụ đề WebVTT.');
        data = await apiFetch<any>('/admin/lessons/auto-transcribe-preview', {
          method: 'POST',
          body: JSON.stringify({ captionsVtt: aiVttText.trim() }),
        });
      }

      setAiExtractedResult(data);
    } catch (err: any) {
      setAiSentenceError(err.message || 'Lỗi khi trích xuất phụ đề AI.');
    } finally {
      setAiExtracting(false);
    }
  };

  const handleApplyAiSentencesToEditor = () => {
    if (!aiExtractedResult?.sentences) return;
    setSentences(aiExtractedResult.sentences);
    setAiSentenceModalOpen(false);
  };

  const handleSaveAiSentencesDirectly = async () => {
    if (!currentLessonForSentences) return;
    if (!confirm('Bạn có chắc chắn muốn lưu trực tiếp danh sách câu AI này vào CSDL của bài học không?')) return;
    setAiExtracting(true);
    try {
      if (aiSourceMode === 'FILE') {
        if (!aiSelectedFile) throw new Error('Vui lòng chọn tệp âm thanh.');
        const formData = new FormData();
        formData.append('file', aiSelectedFile);
        await apiFetch(`/admin/lessons/${currentLessonForSentences.id}/auto-transcribe-audio-file`, {
          method: 'POST',
          body: formData,
        });
      } else if (aiSourceMode === 'URL') {
        await apiFetch(`/admin/lessons/${currentLessonForSentences.id}/auto-transcribe`, {
          method: 'POST',
          body: JSON.stringify({ mediaUrl: aiCustomUrl.trim() }),
        });
      } else {
        await apiFetch(`/admin/lessons/${currentLessonForSentences.id}/auto-transcribe`, {
          method: 'POST',
          body: JSON.stringify({ captionsVtt: aiVttText.trim() }),
        });
      }
      alert('Đã cập nhật câu thoại bài học thành công từ AI Auto-Transcription!');
      setAiSentenceModalOpen(false);
      setSentenceModalOpen(false);
      loadLessons();
    } catch (err: any) {
      setAiSentenceError(err.message || 'Lỗi khi lưu câu thoại vào CSDL.');
    } finally {
      setAiExtracting(false);
    }
  };

  const handleSaveSentences = async () => {
    if (!currentLessonForSentences) return;
    setSavingSentences(true);
    try {
      await apiFetch(`/admin/lessons/${currentLessonForSentences.id}/sentences/bulk`, {
        method: 'PUT',
        body: JSON.stringify(sentences),
      });
      setSentenceModalOpen(false);
      loadLessons();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu danh sách câu thoại.');
    } finally {
      setSavingSentences(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Quản lý Kho Bài học</h1>
          <p className="mt-1 text-xs text-slate-500">
            Thêm mới, cấu hình nội dung và biên tập transcript timing cho bài nghe Dictation & Shadowing.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateLesson}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm bài học mới</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề bài học…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadLessons()}
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-600"
            />
          </div>

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-700 outline-none"
          >
            <option value="ALL">Mọi cấp độ</option>
            <option value="BEGINNER">Beginner (A1-A2)</option>
            <option value="INTERMEDIATE">Intermediate (B1-B2)</option>
            <option value="ADVANCED">Advanced (C1)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-700 outline-none"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="PUBLISHED">Published (Công khai)</option>
            <option value="DRAFT">Draft (Bản nháp)</option>
            <option value="ARCHIVED">Archived (Lưu trữ)</option>
          </select>

          <select
            value={filterPremium}
            onChange={(e) => setFilterPremium(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-700 outline-none"
          >
            <option value="ALL">Mọi quyền xem</option>
            <option value="FREE">Miễn phí</option>
            <option value="PREMIUM">Chỉ Premium</option>
          </select>

          <button
            type="button"
            onClick={loadLessons}
            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Lọc
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase text-slate-500">
                <th className="px-5 py-3.5">Tiêu đề bài học</th>
                <th className="px-4 py-3.5">Cấp độ</th>
                <th className="px-4 py-3.5">Media</th>
                <th className="px-4 py-3.5">Số câu</th>
                <th className="px-4 py-3.5">Quyền truy cập</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {lessons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {loading ? 'Đang tải dữ liệu bài học…' : 'Chưa có bài học nào phù hợp.'}
                  </td>
                </tr>
              ) : (
                lessons.map((lesson) => (
                  <tr key={lesson.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{lesson.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {lesson.sourceName || 'Chưa gắn nguồn'} • {lesson.durationSeconds ? `${lesson.durationSeconds}s` : 'Chưa rõ'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          lesson.level === 'BEGINNER'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lesson.level === 'INTERMEDIATE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {lesson.level}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                      {lesson.mediaType}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">
                      {lesson.sentenceCount ?? 0} câu
                    </td>
                    <td className="px-4 py-3.5">
                      {lesson.isPremiumOnly ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          <Crown className="h-2.5 w-2.5" /> Premium
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Free
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          lesson.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : lesson.status === 'DRAFT'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {lesson.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={transcribingId === lesson.id}
                          onClick={() => handleQuickAutoTranscribe(lesson)}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                          title="Tự động trích xuất transcript & timestamp bằng AI"
                        >
                          {transcribingId === lesson.id ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin text-purple-600" />
                              <span>AI đang chạy…</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 text-purple-600" />
                              <span>AI Auto-Transcription</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenSentenceEditor(lesson)}
                          className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                          title="Biên tập câu thoại và mốc thời gian"
                        >
                          Biên tập câu ({lesson.sentenceCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditLesson(lesson)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Lesson Create/Edit */}
      {lessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingLessonId ? 'Chỉnh sửa thông tin bài học' : 'Tạo bài học mới'}
              </h3>
              <button
                type="button"
                onClick={() => setLessonModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700">Tiêu đề bài học</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Daily English Conversation 01"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase text-slate-700">Cấp độ (Level)</label>
                  <select
                    value={lessonForm.level}
                    onChange={(e) => setLessonForm({ ...lessonForm, level: e.target.value as LessonLevel })}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none"
                  >
                    <option value="BEGINNER">BEGINNER (Cơ bản)</option>
                    <option value="INTERMEDIATE">INTERMEDIATE (Trung cấp)</option>
                    <option value="ADVANCED">ADVANCED (Nâng cao)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700">Loại Media</label>
                  <select
                    value={lessonForm.mediaType}
                    onChange={(e) => setLessonForm({ ...lessonForm, mediaType: e.target.value as LessonMediaType })}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none"
                  >
                    <option value="AUDIO">AUDIO (File âm thanh)</option>
                    <option value="VIDEO">VIDEO (YouTube / MP4)</option>
                    <option value="PODCAST">PODCAST</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block font-bold uppercase text-slate-700">Đường dẫn Audio / Video URL</label>
                  <button
                    type="button"
                    disabled={aiPreviewLoading || !lessonForm.audioUrl.trim()}
                    onClick={handlePreviewAutoTranscribe}
                    className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                    title="Tự động trích xuất phụ đề AI từ YouTube hoặc tệp âm thanh"
                  >
                    {aiPreviewLoading ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin text-purple-600" />
                        <span>AI đang phân tích…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 text-purple-600" />
                        <span>AI Auto-Transcription</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="https://www.youtube.com/watch?v=... hoặc /audio/sample.mp3"
                  value={lessonForm.audioUrl}
                  onChange={(e) => {
                    setLessonForm({ ...lessonForm, audioUrl: e.target.value });
                    setAiPreviewData(null);
                    setAiPreviewError(null);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-mono text-slate-900 outline-none focus:border-indigo-600"
                />
                {aiPreviewData && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      AI đã trích xuất thành công <strong>{aiPreviewData.sentenceCount} câu</strong> (thời lượng: <strong>{aiPreviewData.durationSeconds}s</strong>).
                      {editingLessonId ? ' Nhấn "Lưu bài học" để cập nhật.' : ' Danh sách câu sẽ tự động được lưu kèm khi tạo bài.'}
                    </span>
                  </div>
                )}
                {aiPreviewError && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{aiPreviewError}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase text-slate-700">Tên nguồn học liệu</label>
                  <input
                    type="text"
                    placeholder="BBC Learning English, TED, v.v."
                    value={lessonForm.sourceName}
                    onChange={(e) => setLessonForm({ ...lessonForm, sourceName: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700">Thời lượng ước tính (giây)</label>
                  <input
                    type="number"
                    min={0}
                    value={lessonForm.durationSeconds}
                    onChange={(e) => setLessonForm({ ...lessonForm, durationSeconds: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-bold uppercase text-slate-700">Trạng thái</label>
                  <select
                    value={lessonForm.status}
                    onChange={(e) => setLessonForm({ ...lessonForm, status: e.target.value as LessonStatus })}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none"
                  >
                    <option value="PUBLISHED">PUBLISHED (Mở cho học viên)</option>
                    <option value="DRAFT">DRAFT (Bản nháp ẩn)</option>
                    <option value="ARCHIVED">ARCHIVED (Lưu trữ)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={lessonForm.isPremiumOnly}
                      onChange={(e) => setLessonForm({ ...lessonForm, isPremiumOnly: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">Khóa bài này chỉ cho Premium</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setLessonModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700"
                >
                  Lưu bài học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sentence Editor */}
      {sentenceModalOpen && currentLessonForSentences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Biên tập câu thoại: {currentLessonForSentences.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Chỉnh sửa nội dung câu, mốc bắt đầu (giây) và kết thúc (giây) cho bài nghe.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAiSentenceModal}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 shadow-sm"
                  title="Chạy AI Auto-Transcription để trích xuất hoặc dán WebVTT"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  <span>AI Auto-Transcription</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSentenceModalOpen(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {sentences.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <p>Bài học này chưa có câu thoại nào.</p>
                  <button
                    type="button"
                    onClick={handleAddSentence}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    <Plus className="h-4 w-4" /> Thêm câu thoại đầu tiên
                  </button>
                </div>
              ) : (
                sentences.map((sentence, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700">
                      {idx + 1}
                    </span>

                    <div className="grid flex-1 gap-3 md:grid-cols-12">
                      <div className="md:col-span-8">
                        <label className="text-[10px] font-bold uppercase text-slate-400">
                          Nội dung câu (English text)
                        </label>
                        <input
                          type="text"
                          required
                          value={sentence.textContent}
                          onChange={(e) => {
                            const next = [...sentences];
                            next[idx].textContent = e.target.value;
                            setSentences(next);
                          }}
                          placeholder="Ví dụ: Welcome to today's English lesson."
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400">
                          Bắt đầu (s)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={sentence.startTime}
                          onChange={(e) => {
                            const next = [...sentences];
                            next[idx].startTime = parseFloat(e.target.value) || 0;
                            setSentences(next);
                          }}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400">
                          Kết thúc (s)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={sentence.endTime}
                          onChange={(e) => {
                            const next = [...sentences];
                            next[idx].endTime = parseFloat(e.target.value) || 0;
                            setSentences(next);
                          }}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSentence(idx)}
                      className="mt-5 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Xóa câu này"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleAddSentence}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm câu tiếp theo</span>
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSentenceModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={savingSentences}
                  onClick={handleSaveSentences}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingSentences ? 'Đang lưu…' : 'Lưu toàn bộ câu thoại'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal AI Auto-Transcription */}
      {aiSentenceModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-purple-100 text-purple-700">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">AI Auto-Transcription</h3>
                  <p className="text-[11px] text-slate-500">
                    Trích xuất phụ đề tiếng Anh & mốc thời gian tự động từ YouTube hoặc tệp WebVTT
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiSentenceModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-100 pb-3 text-xs">
              <button
                type="button"
                onClick={() => setAiSourceMode('URL')}
                className={`rounded-xl px-3.5 py-1.5 font-bold transition-all ${
                  aiSourceMode === 'URL'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Từ URL Video / Audio
              </button>
              <button
                type="button"
                onClick={() => setAiSourceMode('FILE')}
                className={`rounded-xl px-3.5 py-1.5 font-bold transition-all ${
                  aiSourceMode === 'FILE'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tải tệp âm thanh (.mp3, .wav)
              </button>
              <button
                type="button"
                onClick={() => setAiSourceMode('VTT')}
                className={`rounded-xl px-3.5 py-1.5 font-bold transition-all ${
                  aiSourceMode === 'VTT'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Nhập phụ đề WebVTT (.vtt)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs">
              {aiSourceMode === 'URL' && (
                <div>
                  <label className="block font-bold uppercase text-slate-700">Đường dẫn Media</label>
                  <input
                    type="text"
                    value={aiCustomUrl}
                    onChange={(e) => setAiCustomUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... hoặc /audio/sample.mp3"
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-mono text-slate-900 outline-none focus:border-purple-600"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Hỗ trợ URL YouTube, file âm thanh cục bộ (/audio/...) hoặc URL MP3/WAV trực tiếp.
                  </p>
                </div>
              )}

              {aiSourceMode === 'FILE' && (
                <div className="space-y-2">
                  <label className="block font-bold uppercase text-slate-700">Chọn tệp âm thanh (.mp3, .wav, .m4a)</label>
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.ogg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setAiSelectedFile(file);
                    }}
                    className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-purple-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-purple-700 hover:file:bg-purple-100"
                  />
                  {aiSelectedFile && (
                    <p className="font-mono text-purple-700">
                      Tệp đã chọn: <strong>{aiSelectedFile.name}</strong> ({(aiSelectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Hệ thống sẽ gửi file âm thanh đến OpenAI Whisper AI để nhận diện lời nói và tách câu tự động.
                  </p>
                </div>
              )}

              {aiSourceMode === 'VTT' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold uppercase text-slate-700">Tải tệp WebVTT (.vtt)</label>
                    <input
                      type="file"
                      accept=".vtt,text/vtt"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const text = await file.text();
                          setAiVttText(text);
                        }
                      }}
                      className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-purple-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-purple-700 hover:file:bg-purple-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-slate-700">Hoặc dán nội dung WEBVTT</label>
                    <textarea
                      rows={5}
                      value={aiVttText}
                      onChange={(e) => setAiVttText(e.target.value)}
                      placeholder={'WEBVTT\n\n00:00:01.000 --> 00:00:04.500\nHello, welcome to English shadowing class.'}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-mono text-slate-900 outline-none focus:border-purple-600"
                    />
                  </div>
                </div>
              )}

              {aiSentenceError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{aiSentenceError}</span>
                </div>
              )}

              {aiExtractedResult && (
                <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900">
                      ✓ Đã phân tích thành công {aiExtractedResult.sentenceCount} câu
                    </span>
                    <span className="font-mono text-purple-700">
                      Thời lượng: {aiExtractedResult.durationSeconds}s
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-purple-100 bg-white p-2.5 space-y-1.5 font-mono text-[11px] text-slate-700">
                    {aiExtractedResult.sentences.slice(0, 10).map((s, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-purple-600">[{s.startTime}s - {s.endTime}s]</span>
                        <span className="text-slate-800">{s.textContent}</span>
                      </div>
                    ))}
                    {aiExtractedResult.sentences.length > 10 && (
                      <p className="pt-1 text-center text-[10px] text-slate-400 font-sans">
                        ... và còn {aiExtractedResult.sentences.length - 10} câu nữa ...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <button
                type="button"
                disabled={aiExtracting}
                onClick={handleRunAiExtraction}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
              >
                {aiExtracting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang phân tích AI…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Bắt đầu trích xuất AI</span>
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAiSentenceModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Đóng
                </button>
                {aiExtractedResult && (
                  <>
                    <button
                      type="button"
                      disabled={aiExtracting}
                      onClick={handleApplyAiSentencesToEditor}
                      className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 font-bold text-indigo-700 hover:bg-indigo-100"
                    >
                      Áp dụng vào biên tập
                    </button>
                    <button
                      type="button"
                      disabled={aiExtracting}
                      onClick={handleSaveAiSentencesDirectly}
                      className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Lưu trực tiếp vào CSDL
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
