import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

// ============================================================
// Bọc YouTube IFrame Player API: phát một đoạn [start, end] rồi
// tự dừng, đổi tốc độ, tua. Script API nạp một lần cho cả app.
// ============================================================

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  cueVideoById(videoId: string): void;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const STATE_PLAYING = 1;

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("Không tải được YouTube player (mất mạng hoặc bị chặn)."));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

const ERROR_MESSAGES: Record<number, string> = {
  2: "Video id không hợp lệ.",
  5: "Trình duyệt không phát được video này.",
  100: "Video không tồn tại hoặc đã bị xóa/để riêng tư.",
  101: "Chủ video không cho phép nhúng vào trang khác.",
  150: "Chủ video không cho phép nhúng vào trang khác.",
};

export interface YouTubePlayerHandle {
  /** Tua tới start, phát, tự dừng ở end. */
  playSegment(start: number, end: number): void;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  setPlaybackRate(rate: number): void;
  getCurrentTime(): number;
}

interface YouTubePlayerProps {
  videoId: string;
  playbackRate?: number;
  ref?: Ref<YouTubePlayerHandle>;
  onPlayingChange?: (playing: boolean) => void;
  /** Gọi khi phát hết một đoạn của playSegment. */
  onSegmentEnd?: () => void;
  onError?: (message: string) => void;
  className?: string;
}

export function YouTubePlayer({
  videoId,
  playbackRate = 1,
  ref,
  onPlayingChange,
  onSegmentEnd,
  onError,
  className,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const stopAtRef = useRef<number | null>(null);
  /** Lệnh gọi trước khi player sẵn sàng → chạy khi onReady. */
  const pendingRef = useRef<((p: YTPlayer) => void) | null>(null);
  const rateRef = useRef(playbackRate);
  const loadedIdRef = useRef(videoId);

  // Callback mới nhất, để không phải tạo lại player khi parent re-render
  const cbRef = useRef({ onPlayingChange, onSegmentEnd, onError });
  useEffect(() => {
    cbRef.current = { onPlayingChange, onSegmentEnd, onError };
  });

  // Tạo player một lần. YT thay thế element con bằng <iframe>, nên tạo
  // element đó thủ công để React không đụng vào.
  useEffect(() => {
    let cancelled = false;
    const host = document.createElement("div");
    containerRef.current?.appendChild(host);

    loadYouTubeApi()
      .then(YT => {
        if (cancelled) return;
        playerRef.current = new YT.Player(host, {
          videoId: loadedIdRef.current,
          width: "100%",
          height: "100%",
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3 },
          events: {
            onReady: () => {
              readyRef.current = true;
              const p = playerRef.current!;
              p.setPlaybackRate(rateRef.current);
              pendingRef.current?.(p);
              pendingRef.current = null;
            },
            onStateChange: e => cbRef.current.onPlayingChange?.(e.data === STATE_PLAYING),
            onError: e => cbRef.current.onError?.(ERROR_MESSAGES[e.data] ?? `Lỗi YouTube player (mã ${e.data}).`),
          },
        });
      })
      .catch((err: Error) => cbRef.current.onError?.(err.message));

    return () => {
      cancelled = true;
      readyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
      host.remove();
    };
  }, []);

  // Theo dõi thời gian để dừng đúng cuối đoạn
  useEffect(() => {
    const t = window.setInterval(() => {
      const p = playerRef.current;
      const stopAt = stopAtRef.current;
      if (!p || !readyRef.current || stopAt === null) return;
      if (p.getCurrentTime() >= stopAt) {
        stopAtRef.current = null;
        p.pauseVideo();
        cbRef.current.onSegmentEnd?.();
      }
    }, 50);
    return () => window.clearInterval(t);
  }, []);

  // Đổi video
  useEffect(() => {
    if (videoId === loadedIdRef.current) return;
    loadedIdRef.current = videoId;
    stopAtRef.current = null;
    if (readyRef.current) playerRef.current?.cueVideoById(videoId);
  }, [videoId]);

  useEffect(() => {
    rateRef.current = playbackRate;
    if (readyRef.current) playerRef.current?.setPlaybackRate(playbackRate);
  }, [playbackRate]);

  const run = (fn: (p: YTPlayer) => void) => {
    if (readyRef.current && playerRef.current) fn(playerRef.current);
    else pendingRef.current = fn;
  };

  useImperativeHandle(
    ref,
    () => ({
      playSegment(start, end) {
        run(p => {
          stopAtRef.current = end;
          p.seekTo(start, true);
          p.playVideo();
        });
      },
      play() {
        stopAtRef.current = null;
        run(p => p.playVideo());
      },
      pause() {
        stopAtRef.current = null;
        run(p => p.pauseVideo());
      },
      seek(seconds) {
        run(p => p.seekTo(seconds, true));
      },
      setPlaybackRate(rate) {
        rateRef.current = rate;
        run(p => p.setPlaybackRate(rate));
      },
      getCurrentTime() {
        return readyRef.current && playerRef.current ? playerRef.current.getCurrentTime() : 0;
      },
    }),
    []
  );

  return <div ref={containerRef} className={className} />;
}
