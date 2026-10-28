import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fetchYouTubeSentences, isYouTubeHost, parseWebVtt, type PreparedSentence } from '../practice/dictation/dictation-captions';

type MediaType = 'AUDIO' | 'VIDEO' | 'PODCAST';
type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
type ManifestItem = {
  title?: string;
  sourceName?: string;
  mediaUrl: string;
  mediaType: MediaType;
  level?: Level;
  captionsFile?: string;
  useYouTubeCaptions?: boolean;
  /** Matching YouTube episode used only for timestamped captions when the playable source is an MP3. */
  captionsYouTubeUrl?: string;
  minimumSentenceCount?: number;
  minimumDurationSeconds?: number;
};

async function generateBatch() {
  const manifestArg = process.argv[2];
  if (!manifestArg) throw new Error('Usage: npm run seed:batch -- <manifest.json>');

  const manifestPath = path.resolve(process.cwd(), manifestArg);
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as ManifestItem[];
  if (!Array.isArray(manifest) || !manifest.length || manifest.length > 100) {
    throw new Error('Manifest must contain between 1 and 100 lessons.');
  }

  const lessons: Array<{
    title: string;
    sourceName: string;
    mediaUrl: string;
    mediaType: MediaType;
    level: Level;
    duration: number;
    sentences: PreparedSentence[];
  }> = [];
  for (const [index, item] of manifest.entries()) {
    if (!item || typeof item.mediaUrl !== 'string' || !['AUDIO', 'VIDEO', 'PODCAST'].includes(item.mediaType)) {
      throw new Error(`Lesson ${index + 1}: invalid mediaUrl or mediaType.`);
    }
    const mediaUrl = item.mediaUrl.trim();
    const parsedUrl = new URL(mediaUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
      throw new Error(`Lesson ${index + 1}: mediaUrl must be a valid HTTP(S) URL.`);
    }
    if (item.mediaType === 'VIDEO' && !isYouTubeHost(parsedUrl.hostname)) {
      throw new Error(`Lesson ${index + 1}: VIDEO sources must be YouTube URLs.`);
    }
    if (item.mediaType !== 'VIDEO' && !/\.mp3(?:$|\?)/i.test(parsedUrl.pathname + parsedUrl.search)) {
      throw new Error(`Lesson ${index + 1}: AUDIO and PODCAST presets must use a direct MP3 URL.`);
    }
    if (item.level && !['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(item.level)) {
      throw new Error(`Lesson ${index + 1}: invalid level.`);
    }
    if (item.captionsYouTubeUrl) {
      let captionsUrl: URL;
      try { captionsUrl = new URL(item.captionsYouTubeUrl); } catch { throw new Error(`Lesson ${index + 1}: captionsYouTubeUrl is invalid.`); }
      if (!['http:', 'https:'].includes(captionsUrl.protocol) || !isYouTubeHost(captionsUrl.hostname)) {
        throw new Error(`Lesson ${index + 1}: captionsYouTubeUrl must be a YouTube URL.`);
      }
    }
    if (item.minimumSentenceCount !== undefined && (!Number.isInteger(item.minimumSentenceCount) || item.minimumSentenceCount < 1)) {
      throw new Error(`Lesson ${index + 1}: minimumSentenceCount must be a positive integer.`);
    }
    if (item.minimumDurationSeconds !== undefined && (!Number.isFinite(item.minimumDurationSeconds) || item.minimumDurationSeconds < 1)) {
      throw new Error(`Lesson ${index + 1}: minimumDurationSeconds must be positive.`);
    }

    let sentences;
    if (item.captionsFile) {
      const captionsPath = path.resolve(path.dirname(manifestPath), item.captionsFile);
      const stats = await fs.stat(captionsPath);
      if (stats.size > 1_000_000) throw new Error(`Lesson ${index + 1}: VTT file exceeds 1 MB.`);
      sentences = parseWebVtt(await fs.readFile(captionsPath, 'utf8'));
    } else if (item.captionsYouTubeUrl) {
      sentences = await fetchYouTubeSentences(item.captionsYouTubeUrl);
    } else if (item.useYouTubeCaptions && item.mediaType === 'VIDEO') {
      sentences = await fetchYouTubeSentences(mediaUrl);
    } else {
      throw new Error(`Lesson ${index + 1}: provide captionsFile or a matching YouTube transcript source.`);
    }
    if (sentences.length > 1_000) throw new Error(`Lesson ${index + 1}: transcript exceeds 1,000 sentences.`);
    const duration = Math.ceil(Math.max(...sentences.map((sentence) => sentence.endTime)));
    if (sentences.length < (item.minimumSentenceCount ?? 1)) {
      throw new Error(`Lesson ${index + 1}: transcript has ${sentences.length} sentences; expected at least ${item.minimumSentenceCount}.`);
    }
    if (duration < (item.minimumDurationSeconds ?? 1)) {
      throw new Error(`Lesson ${index + 1}: transcript covers ${duration}s; expected at least ${item.minimumDurationSeconds}s.`);
    }

    lessons.push({
      title: (item.title?.trim() || parsedUrl.hostname).slice(0, 255),
      sourceName: (item.sourceName?.trim() || parsedUrl.hostname).slice(0, 150),
      mediaUrl,
      mediaType: item.mediaType,
      level: item.level ?? 'BEGINNER',
      duration,
      sentences,
    });
    console.log(`Prepared ${index + 1}/${manifest.length}: ${lessons[lessons.length - 1].title}`);
  }

  const outputPath = path.join(__dirname, 'seed_lessons.json');
  await fs.writeFile(outputPath, `${JSON.stringify(lessons, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${lessons.length} lessons to ${outputPath}`);
}

generateBatch().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
