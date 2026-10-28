'use client';

import { useEffect, useRef, useState } from 'react';
import { FastForward, Pause, Play, Rewind, RotateCcw, Volume2, VolumeX } from 'lucide-react';

type PlayerStateEvent = { data: number; target: YouTubePlayer };
type YouTubePlayer = {
  cueVideoById(options: { videoId: string; startSeconds: number; endSeconds: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  getAvailablePlaybackRates(): number[];
  setPlaybackRate(rate: number): void;
  destroy(): void;
};
type YouTubeApi = {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; CUED: number };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}


function initYouTubePreconnect() {
  if (typeof document === 'undefined') return;
  if (!document.querySelector('link[rel="dns-prefetch"][href="//www.youtube.com"]')) {
    const dns1 = document.createElement('link');
    dns1.rel = 'dns-prefetch';
    dns1.href = '//www.youtube.com';
    document.head.appendChild(dns1);

    const dns2 = document.createElement('link');
    dns2.rel = 'dns-prefetch';
    dns2.href = '//s.ytimg.com';
    document.head.appendChild(dns2);

    const pre1 = document.createElement('link');
    pre1.rel = 'preconnect';
    pre1.href = 'https://www.youtube.com';
    document.head.appendChild(pre1);
  }
}

let youTubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  initYouTubePreconnect();
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youTubeApiPromise) return youTubeApiPromise;

  youTubeApiPromise = new Promise<void>((resolve, reject) => {
    const checkReady = () => {
      if (window.YT?.Player) {
        resolve();
        return true;
      }
      return false;
    };

    if (checkReady()) return;

    if ((window as any).YT && typeof (window as any).YT.ready === 'function') {
      (window as any).YT.ready(() => {
        if (checkReady()) return;
      });
    }

    const scriptUrl = 'https://www.youtube.com/iframe_api';
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      let tries = 0;
      const interval = setInterval(() => {
        tries++;
        if (checkReady() || tries > 20) clearInterval(interval);
      }, 50);
    };

    if (existingScript) {
      let tries = 0;
      const pollExisting = setInterval(() => {
        tries++;
        if (checkReady() || tries > 40) {
          clearInterval(pollExisting);
          if (!window.YT?.Player && tries > 40) {
            youTubeApiPromise = null;
            reject(new Error('Không tải được trình phát YouTube.'));
          }
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onerror = () => {
      youTubeApiPromise = null;
      reject(new Error('Không tải được trình phát YouTube. Hãy kiểm tra kết nối rồi thử lại.'));
    };
    document.head.appendChild(script);
  });

  return youTubeApiPromise;
}

function getYouTubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0];
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
      return url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1] || '';
    }
  } catch {
    return '';
  }
  return '';
}

function formatTime(value: number) {
  const seconds = Math.max(0, Math.floor(value || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function audioErrorMessage(audio: HTMLAudioElement) {
  if (!audio.currentSrc) return 'Bài học chưa có đường dẫn audio. Chọn bài khác hoặc báo quản trị viên.';
  if (audio.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) return 'Không đọc được tệp audio. Đường dẫn có thể sai hoặc định dạng không được trình duyệt hỗ trợ.';
  if (audio.error?.code === MediaError.MEDIA_ERR_NETWORK) return 'Không tải được audio. Kiểm tra kết nối hoặc quyền CORS của nơi lưu tệp.';
  return 'Audio không tải được. Kiểm tra kết nối và đường dẫn rồi thử lại.';
}

export function MediaDictationPlayer({
  mediaType,
  mediaUrl,
  title,
  startTime,
  endTime,
  onSeekToTime,
  onTimeUpdate,
  disableArrowSeek = false,
}: {
  mediaType: 'AUDIO' | 'VIDEO' | 'PODCAST';
  mediaUrl?: string | null;
  title: string;
  startTime: number;
  endTime: number;
  onSeekToTime?: (time: number) => number;
  onTimeUpdate?: (time: number) => void;
  disableArrowSeek?: boolean;
}) {
  const isVideo = mediaType === 'VIDEO';
  const videoId = isVideo ? getYouTubeId(mediaUrl ?? '') : '';
  const source = typeof mediaUrl === 'string' ? mediaUrl.trim() : '';
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [availableRates, setAvailableRates] = useState<number[]>([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  const [mediaError, setMediaError] = useState('');
  const [retryVersion, setRetryVersion] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerMountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const pollRef = useRef<number | null>(null);
  const rangeRef = useRef({ startTime, endTime });
  const rateRef = useRef(playbackRate);
  const playingRef = useRef(false);
  const audioSeekRef = useRef<number | null>(null);
  const audioActionsRef = useRef<{ skip: (offset: number) => void; toggleMute: () => void }>({ skip: () => {}, toggleMute: () => {} });
  const onTimeUpdateRef = useRef(onTimeUpdate);

  onTimeUpdateRef.current = onTimeUpdate;
  rangeRef.current = { startTime, endTime };
  rateRef.current = playbackRate;

  useEffect(() => {
    setMediaError('');
    const audio = audioRef.current;
    const requestedAudioTime = audioSeekRef.current;
    if (!isVideo && audio && requestedAudioTime !== null) {
      audioSeekRef.current = null;
      try { audio.currentTime = requestedAudioTime; } catch { /* Metadata may still be loading. */ }
      setCurrentTime(requestedAudioTime);
      return;
    }
    setCurrentTime(startTime);
    onTimeUpdateRef.current?.(startTime);
    setIsPlaying(false);
    playingRef.current = false;
    if (audio) {
      audio.pause();
      try { audio.currentTime = startTime; } catch { /* Metadata may not have loaded yet. */ }
    }
    if (isVideo && playerReady && playerRef.current && videoId) {
      try {
        playerRef.current.cueVideoById({ videoId, startSeconds: startTime, endSeconds: endTime });
      } catch { /* Player may be buffering or re-initializing */ }
    }
  }, [startTime, endTime, isVideo, playerReady, videoId]);

  useEffect(() => {
    if (!isVideo) return;
    let cancelled = false;
    setPlayerReady(false);
    void loadYouTubeApi().then(() => {
      const mount = playerMountRef.current;
      const api = window.YT;
      if (cancelled || !mount || !api?.Player || !videoId) return;

      playerRef.current = new api.Player(mount, {
        width: '100%',
        height: '100%',
        videoId,
        playerVars: {
          enablejsapi: 1,
          controls: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: (event: { target: YouTubePlayer }) => {
            if (cancelled) return;
            setPlayerReady(true);
            try {
              setDuration(event.target.getDuration() || 0);
              const supported = event.target.getAvailablePlaybackRates();
              if (supported?.length) setAvailableRates(supported);
              event.target.cueVideoById({
                videoId,
                startSeconds: rangeRef.current.startTime,
                endSeconds: rangeRef.current.endTime,
              });
            } catch { setAvailableRates([1]); }
            pollRef.current = window.setInterval(() => {
              const player = playerRef.current;
              if (!player) return;
              try {
                const time = player.getCurrentTime();
                setCurrentTime(time);
                onTimeUpdateRef.current?.(time);
                setDuration(player.getDuration() || 0);
                if (playingRef.current && time >= rangeRef.current.endTime) {
                  player.pauseVideo();
                  player.seekTo(rangeRef.current.endTime, false);
                  setCurrentTime(rangeRef.current.endTime);
                  setIsPlaying(false);
                  playingRef.current = false;
                }
              } catch { /* The IFrame API can briefly be unavailable while it buffers. */ }
            }, 200);
          },
          onStateChange: (event: PlayerStateEvent) => {
            const playing = event.data === 1;
            setIsPlaying(playing);
            playingRef.current = playing;
            if (event.data === 5) {
              try { event.target.setPlaybackRate(rateRef.current); } catch { /* The rate becomes available after cuing. */ }
            }
          },
          onPlaybackRateChange: (event: PlayerStateEvent) => {
            if (typeof event.data === 'number') setPlaybackRate(event.data);
          },
          onError: (event: PlayerStateEvent) => {
            const message = event.data === 101 || event.data === 150
              ? 'Chủ sở hữu video không cho phép phát video này trên website.'
              : 'YouTube không phát được video này. Kiểm tra URL hoặc thử tải lại trình phát.';
            setMediaError(message);
            setIsPlaying(false);
            playingRef.current = false;
          },
        },
      });
    }).catch((error: Error) => {
      if (!cancelled) setMediaError(error.message);
    });

    return () => {
      cancelled = true;
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
      pollRef.current = null;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [isVideo, videoId, retryVersion]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && !isVideo) {
      audio.playbackRate = playbackRate;
      audio.muted = isMuted;
    }
  }, [playbackRate, isMuted, isVideo]);

  useEffect(() => {
    if (isVideo || disableArrowSeek) return;
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.repeat) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && key !== 'm') return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'ArrowLeft') audioActionsRef.current.skip(-5);
      else if (event.key === 'ArrowRight') audioActionsRef.current.skip(5);
      else audioActionsRef.current.toggleMute();
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [isVideo, disableArrowSeek]);

  function updateAudioState(audio: HTMLAudioElement) {
    if (!audio) return;
    setCurrentTime(audio.currentTime || startTime);
    onTimeUpdateRef.current?.(audio.currentTime || startTime);
    if (audioSeekRef.current !== null && Math.abs(audio.currentTime - audioSeekRef.current) < 0.25) return;
    if (audio.currentTime >= endTime) {
      audio.pause();
      try { audio.currentTime = endTime; } catch { /* Keep the displayed end time if seeking is unavailable. */ }
      setCurrentTime(endTime);
      setIsPlaying(false);
    }
  }

  async function playAudio() {
    const audio = audioRef.current;
    if (!audio || !source || mediaError) return;
    if (audio.currentTime < startTime || audio.currentTime >= endTime) {
      try { audio.currentTime = startTime; } catch { /* play() reports the actual media error below. */ }
    }
    audio.playbackRate = playbackRate;
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
      setMediaError(audioErrorMessage(audio));
    }
  }

  function togglePlayback() {
    if (mediaError) return;
    if (isVideo) {
      const player = playerRef.current;
      if (!playerReady || !player) return;
      if (isPlaying) player.pauseVideo();
      else {
        let time = startTime;
        try { time = player.getCurrentTime(); } catch { /* Start at the sentence timestamp. */ }
        if (time < startTime || time >= endTime) player.seekTo(startTime, true);
        player.setPlaybackRate(playbackRate);
        player.playVideo();
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else void playAudio();
  }

  function replay() {
    if (isVideo && playerRef.current) {
      playerRef.current.seekTo(startTime, true);
      playerRef.current.setPlaybackRate(playbackRate);
      playerRef.current.playVideo();
      return;
    }
    const audio = audioRef.current;
    if (!audio || !source) return;
    try { audio.currentTime = startTime; } catch { /* Metadata may still be loading. */ }
    setCurrentTime(startTime);
    void playAudio();
  }

  function seek(value: number, commit = false) {
    const bounded = Math.min(endTime, Math.max(startTime, value));
    setCurrentTime(bounded);
    onTimeUpdateRef.current?.(bounded);
    if (isVideo) playerRef.current?.seekTo(bounded, commit);
    else if (audioRef.current) {
      try { audioRef.current.currentTime = bounded; } catch { /* Wait for the media metadata. */ }
    }
  }

  function skipAudio(offset: number) {
    const audio = audioRef.current;
    if (!audio || !source || mediaError || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const requestedTime = Math.min(audio.duration, Math.max(0, audio.currentTime + offset));
    const synchronizedTime = onSeekToTime?.(requestedTime) ?? Math.min(endTime - 0.01, Math.max(startTime, requestedTime));
    const targetTime = Math.min(audio.duration, synchronizedTime);
    if (targetTime < startTime || targetTime >= endTime) audioSeekRef.current = targetTime;
    try {
      audio.currentTime = targetTime;
      setCurrentTime(targetTime);
    } catch {
      audioSeekRef.current = null;
      setMediaError('Chưa tua được nguồn này. Hãy chờ audio tải xong rồi thử lại.');
    }
  }

  function toggleMute() {
    if (!source || mediaError) return;
    const nextMuted = !isMuted;
    const audio = audioRef.current;
    if (audio) audio.muted = nextMuted;
    setIsMuted(nextMuted);
  }

  audioActionsRef.current = { skip: skipAudio, toggleMute };

  function chooseRate(rate: number) {
    setPlaybackRate(rate);
    rateRef.current = rate;
    if (isVideo) {
      try { playerRef.current?.setPlaybackRate(rate); } catch { /* The player applies the rate once the sentence is cued. */ }
    } else if (audioRef.current) audioRef.current.playbackRate = rate;
  }

  function retryMedia() {
    setMediaError('');
    setIsPlaying(false);
    playingRef.current = false;
    if (isVideo) {
      playerRef.current?.destroy();
      playerRef.current = null;
      setPlayerReady(false);
      setRetryVersion((version) => version + 1);
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
      try { audioRef.current.currentTime = startTime; } catch { /* Set again once metadata is available. */ }
    } else setMediaError('Bài học chưa có đường dẫn audio. Chọn bài khác hoặc báo quản trị viên.');
  }

  const playerCanPlay = isVideo ? playerReady && Boolean(playerRef.current) : Boolean(source);

  return (
    <section className="media-dictation-player" aria-label="Trình phát câu mẫu">
      {isVideo ? (
        <div className="media-player-video"><div key={retryVersion} ref={playerMountRef} />{!videoId && <p role="alert">URL YouTube của bài học không hợp lệ.</p>}</div>
      ) : <audio
        ref={audioRef}
        src={source || undefined}
        preload="metadata"
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0);
          try { event.currentTarget.currentTime = startTime; } catch { /* The audio is not seekable yet. */ }
        }}
        onCanPlay={() => setMediaError('')}
        onTimeUpdate={(event) => updateAudioState(event.currentTarget)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(endTime); }}
        onError={(event) => { setMediaError(audioErrorMessage(event.currentTarget)); setIsPlaying(false); }}
      />}

      <div className="media-player-controls">
        <div className="media-player-summary">
          <div><span>{isVideo ? 'VIDEO YOUTUBE' : mediaType === 'PODCAST' ? 'PODCAST' : 'AUDIO'}</span><strong>{title}</strong></div>
          <span className="media-sentence-time">Câu này · {formatTime(startTime)}–{formatTime(endTime)}</span>
        </div>

        {mediaError && <div className="media-player-error" role="alert"><span>{mediaError}</span><button type="button" onClick={retryMedia}><RotateCcw size={15} /> Thử tải lại</button></div>}

        <div className="media-player-timeline">
          <button type="button" className="media-play-button" onClick={togglePlayback} disabled={!playerCanPlay || Boolean(mediaError)} aria-label={isPlaying ? `Tạm dừng ${isVideo ? 'video' : 'audio'}` : `Phát ${isVideo ? 'video' : 'audio'}`}>
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            <span>{isPlaying ? 'Tạm dừng' : 'Phát câu'}</span>
          </button>
          <span className="media-time-current">{formatTime(currentTime)}</span>
          <input
            type="range"
            aria-label="Tua trong câu hiện tại"
            min={startTime}
            max={Math.max(endTime, startTime + 0.1)}
            step="0.1"
            value={Math.min(Math.max(currentTime, startTime), endTime)}
            disabled={!playerCanPlay || Boolean(mediaError)}
            onChange={(event) => seek(Number(event.target.value))}
            onPointerUp={() => seek(currentTime, true)}
            onKeyUp={() => seek(currentTime, true)}
          />
          <span className="media-time-end">{formatTime(endTime)}</span>
          <button type="button" className="media-replay-button" onClick={replay} disabled={!playerCanPlay || Boolean(mediaError)} aria-label="Nghe lại câu"><RotateCcw size={17} /></button>
        </div>

        {!isVideo && <div className="media-audio-actions" aria-label="Điều khiển tua và âm lượng">
          <button type="button" onClick={() => skipAudio(-5)} disabled={!playerCanPlay || !duration || Boolean(mediaError)} aria-keyshortcuts="ArrowLeft" title="Tua lùi 5 giây · ←"><Rewind size={16} /><span>Tua lùi 5 giây</span><kbd>←</kbd></button>
          <button type="button" onClick={toggleMute} disabled={!playerCanPlay || Boolean(mediaError)} aria-keyshortcuts="M" title={`${isMuted ? 'Bật' : 'Tắt'} tiếng · M`}>{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}<span>{isMuted ? 'Bật tiếng' : 'Tắt tiếng'}</span><kbd>M</kbd></button>
          <button type="button" onClick={() => skipAudio(5)} disabled={!playerCanPlay || !duration || Boolean(mediaError)} aria-keyshortcuts="ArrowRight" title="Tua tới 5 giây · →"><FastForward size={16} /><span>Tua tới 5 giây</span><kbd>→</kbd></button>
        </div>}

        <div className="media-player-footer"><span>{duration ? `Toàn bài ${formatTime(duration)}` : 'Phát theo timestamp của câu'}</span><div className="media-playback-rates" aria-label="Tốc độ phát">{availableRates.map((rate) => <button type="button" key={rate} onClick={() => chooseRate(rate)} className={playbackRate === rate ? 'active' : ''} aria-pressed={playbackRate === rate}>{rate}×</button>)}</div></div>
      </div>
    </section>
  );
}
