# Dictation content ingestion (Node.js)

Dictation content processing runs in the NestJS backend. YouTube video captions are fetched in English with the `youtube-transcript` package. Audio and podcast sources use WebVTT captions supplied by the user or maintained with the preset lesson manifest. The backend stores each lesson and its timestamped sentences in one database transaction; it does not download media files.

## Import a lesson from the website

1. Start PostgreSQL and apply the migrations from `backend-api` with `npm run migration:run`.
2. Start the NestJS API with `npm run start:dev`.
3. Sign in, open **Luyện nghe dictation**, choose a media type, and paste its HTTPS URL.
4. For YouTube, enable **Tự lấy phụ đề tiếng Anh từ YouTube**. For audio or podcast, upload or paste WebVTT captions with cue timestamps.
5. Submit to create a private lesson and open it immediately.

YouTube caption retrieval accepts English regional tracks such as `en-GB` as well as `en`. If a video has no usable English captions or YouTube blocks a request, turn off automatic captions and provide a WebVTT file instead.

Example WebVTT:

```vtt
WEBVTT

00:00:00.500 --> 00:00:03.200
Welcome to our English lesson.

00:00:03.500 --> 00:00:06.800
Today we are going to talk about daily habits.
```

The endpoint requires an authenticated account. It validates the source and transcript, then persists the lesson and sentence timestamps atomically. Imported lessons remain private to the importing account.

## Prepare preset lessons in a batch

The project includes `backend-api/src/database/preset_sources.json` with four BBC Learning English videos and two direct MP3 lessons (Audio and Podcast). Each is about six minutes and the curated manifest requires at least 20 transcript sentences before it can be imported. The audio and podcast entries point to the matching YouTube episode only as their caption source; playback still uses the MP3.

1. Review the curated manifest and confirm the source URLs and captions are still available.
2. From `backend-api`, run `npm run seed:presets`. This fetches the timestamped English captions, writes an ignored local `src/database/seed_lessons.json`, and adds the public lessons to the configured development database.
3. To add another item, use `useYouTubeCaptions: true` for a YouTube video; or provide `captionsFile` for a VTT you are allowed to use. For an MP3 paired with a matching YouTube upload of the same episode, set `captionsYouTubeUrl` to that upload. Set minimum sentence and duration checks for longer sources.

Generated transcript JSON is kept out of Git. The manifest contains only media URLs and source metadata, so the transcript is fetched again when `seed:presets` is run.

The manifest accepts up to 100 lessons per run. A WebVTT file must be no larger than 1 MB. Each resulting lesson is limited to 1,000 sentences. Batch seed skips a lesson when a public lesson already uses the same source URL or title.

## Source and playback notes

- `VIDEO` sources must be YouTube links and play through YouTube's embedded player.
- `AUDIO` and `PODCAST` use direct HTTP(S) media URLs playable by the browser; their library cards and player labels distinguish the two formats.
- WebVTT cues are grouped into sentences at punctuation, long pauses, and a text-size boundary. Word-level timings are interpolated within each sentence; they are not forced-alignment results.
- The backend only fetches captions from YouTube. It does not fetch user supplied audio URLs, which avoids server requests to private network addresses.
