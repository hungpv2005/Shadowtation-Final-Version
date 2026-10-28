import { BadRequestException } from '@nestjs/common';
import { YoutubeTranscript } from 'youtube-transcript';

export type CaptionCue = { start: number; end: number; text: string };
export type PreparedSentence = { orderIndex: number; startTime: number; endTime: number; text: string };

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const VTT_TIMESTAMP = /^(?:(\d{2,}):)?(\d{2}):(\d{2})[.,](\d{3})$/;
const VTT_CUE = /^((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})\s+-->\s+((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})(?:\s+.*)?$/;
const SENTENCE_END = /[.!?]["'”’)]*$/;

export function isYouTubeHost(host: string): boolean {
  return YOUTUBE_HOSTS.has(host.toLowerCase());
}

function parseVttTime(value: string): number | null {
  const match = VTT_TIMESTAMP.exec(value.replace(',', '.'));
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);
  if (minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function decodeCaptionEntities(value: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code: string) => {
    if (code[0] !== '#') return named[code.toLowerCase()] ?? entity;
    const point = code[1]?.toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
    return Number.isFinite(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  });
}

function groupCaptionCues(cues: CaptionCue[]): PreparedSentence[] {
  const sentences: PreparedSentence[] = [];
  let fragments: string[] = [];
  let sentenceStart = 0;
  let sentenceEnd = 0;

  const flush = () => {
    const text = fragments.join(' ').replace(/\s+/g, ' ').trim();
    if (text) sentences.push({ orderIndex: sentences.length + 1, startTime: Number(sentenceStart.toFixed(3)), endTime: Number(sentenceEnd.toFixed(3)), text });
    fragments = [];
  };

  for (const cue of cues) {
    if (fragments.length && cue.start - sentenceEnd > 1.8) flush();
    if (!fragments.length) sentenceStart = cue.start;
    fragments.push(cue.text);
    sentenceEnd = cue.end;
    const combined = fragments.join(' ');
    if (SENTENCE_END.test(combined) || combined.length >= 500) flush();
  }
  if (fragments.length) flush();
  return sentences;
}

export function parseWebVtt(value: string): PreparedSentence[] {
  const lines = value.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const cues: CaptionCue[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = VTT_CUE.exec(lines[index].trim());
    if (!match) continue;
    const start = parseVttTime(match[1]);
    const end = parseVttTime(match[2]);
    index += 1;
    const textLines: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      textLines.push(lines[index].trim());
      index += 1;
    }
    if (start === null || end === null || start < 0 || end <= start || end > 86_400) continue;
    const text = decodeCaptionEntities(textLines.join(' ').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    if (text) cues.push({ start, end, text });
    if (cues.length > 5_000) throw new BadRequestException('Phụ đề WebVTT vượt quá 5.000 đoạn thời gian.');
  }
  if (!cues.length) throw new BadRequestException('Không tìm thấy phụ đề có timestamp. Hãy cung cấp file WebVTT hợp lệ.');
  const sentences = groupCaptionCues(cues);
  if (!sentences.length) throw new BadRequestException('Không tìm thấy câu tiếng Anh trong phụ đề.');
  return sentences;
}

export function extractYouTubeVideoId(mediaUrl: string): string {
  const url = new URL(mediaUrl);
  const host = url.hostname.toLowerCase();
  let videoId = '';
  if (host === 'youtu.be') videoId = url.pathname.split('/').filter(Boolean)[0] ?? '';
  else if (YOUTUBE_HOSTS.has(host)) videoId = url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|v)\/([^/?]+)/)?.[1] ?? '';
  if (!YOUTUBE_HOSTS.has(host) || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new BadRequestException('Không tìm thấy mã video YouTube hợp lệ trong URL.');
  }
  return videoId;
}

export async function fetchYouTubeSentences(mediaUrl: string): Promise<PreparedSentence[]> {
  const videoId = extractYouTubeVideoId(mediaUrl);
  try {
    const transcriptFetch = (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(20_000) });
    let transcriptItems;
    let lastError: unknown;
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en', fetch: transcriptFetch });
    } catch (error) {
      lastError = error;
      // BBC and other publishers often label English captions with a locale (for example en-GB).
      const availableLanguages = error instanceof Error
        ? error.message.match(/\b(?:en(?:-[A-Za-z0-9]+)?)(?=\s|,|$)/g) ?? []
        : [];
      const candidates = [...new Set([...availableLanguages, 'en-GB', 'en-US', 'en-AU', 'en-CA', 'en-IN'])]
        .filter((language) => language.toLowerCase() !== 'en');
      for (const language of candidates) {
        try {
          transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: language, fetch: transcriptFetch });
          if (transcriptItems.length) break;
        } catch (languageError) {
          lastError = languageError;
        }
      }
    }
    if (!transcriptItems?.length) throw lastError ?? new Error('No English caption cues.');
    // The package returns milliseconds for srv3 caption XML, but seconds for its legacy XML fallback.
    const sortedDurations = transcriptItems.map((item) => item.duration).sort((a, b) => a - b);
    const medianDuration = sortedDurations[Math.floor(sortedDurations.length / 2)] ?? 0;
    const timeScale = medianDuration >= 60 ? 1000 : 1;
    const cues = transcriptItems.flatMap((item) => {
      const start = item.offset / timeScale;
      const end = (item.offset + item.duration) / timeScale;
      const text = decodeCaptionEntities(item.text.replace(/<[^>]*>/g, '').replace(/\n/g, ' ')).replace(/\s+/g, ' ').trim();
      return Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start && end <= 86_400 && text
        ? [{ start, end, text }]
        : [];
    });
    if (!cues.length) throw new Error('No English caption cues.');
    const sentences = groupCaptionCues(cues);
    if (!sentences.length) throw new Error('No transcript sentences.');
    return sentences;
  } catch {
    throw new BadRequestException('Không thể lấy phụ đề tiếng Anh từ video này. Hãy kiểm tra phụ đề công khai hoặc tắt tự lấy phụ đề để tải WebVTT.');
  }
}
