"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Track } from "@/lib/types";
import { mediaUrl } from "@/lib/utils";

interface MusicContextValue {
  tracks: Track[];
  queue: Track[];
  current: Track | null;
  playing: boolean;
  progress: number;
  duration: number;
  volume: number;
  loading: boolean;
  ensureTracks: () => Promise<Track[]>;
  hydrateTracks: (tracks: Track[]) => void;
  playQueue: (tracks: Track[], startId?: string) => void;
  playTrack: (id: string, queue?: Track[]) => void;
  toggle: () => Promise<void>;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  isCurrent: (id: string) => boolean;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [loading, setLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const tracksRef = useRef<Track[]>([]);
  const loadingRef = useRef(false);

  const current = queue[currentIndex] ?? null;

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  const hydrateTracks = useCallback((incoming: Track[]) => {
    if (!incoming.length) return;
    setTracks((existing) => (existing.length ? existing : incoming));
    setQueue((existing) => (existing.length ? existing : incoming));
  }, []);

  const ensureTracks = useCallback(async (): Promise<Track[]> => {
    if (tracksRef.current.length) return tracksRef.current;
    if (loadingRef.current) return [];
    loadingRef.current = true;
    setLoading(true);
    try {
      const response = await fetch("/api/tracks", { cache: "no-store" });
      if (!response.ok) return [];
      const data = (await response.json()) as { tracks?: Track[] };
      const incoming = data.tracks ?? [];
      if (incoming.length) {
        setTracks(incoming);
        tracksRef.current = incoming;
        setQueue((existing) => (existing.length ? existing : incoming));
      }
      return incoming;
    } catch {
      return [];
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const playQueue = useCallback((list: Track[], startId?: string) => {
    if (!list.length) return;
    const index = startId ? Math.max(0, list.findIndex((item) => item.id === startId)) : 0;
    setQueue(list);
    setCurrentIndex(index);
    setPlaying(true);
  }, []);

  const playTrack = useCallback(
    (id: string, list?: Track[]) => {
      const source = list?.length ? list : queue.length ? queue : tracks;
      if (!source.length) return;
      const index = source.findIndex((item) => item.id === id);
      if (index === -1) return;
      if (current?.id === id) {
        setPlaying((value) => !value);
        return;
      }
      setQueue(source);
      setCurrentIndex(index);
      setPlaying(true);
    },
    [queue, tracks, current?.id],
  );

  const toggle = useCallback(async () => {
    let source = queue.length ? queue : tracks;
    if (!source.length) source = await ensureTracks();
    if (!source.length) return;
    if (!current) {
      setQueue(source);
      setCurrentIndex(0);
      setPlaying(true);
      return;
    }
    setPlaying((value) => !value);
  }, [queue, tracks, current, ensureTracks]);

  const step = useCallback(
    (delta: number) => {
      const source = queue.length ? queue : tracks;
      if (!source.length) {
        void ensureTracks().then((list) => {
          if (!list.length) return;
          setQueue(list);
          setCurrentIndex(0);
          setPlaying(true);
        });
        return;
      }

      if (!queue.length) {
        setQueue(source);
        setCurrentIndex(delta > 0 ? 0 : source.length - 1);
        setPlaying(true);
        return;
      }

      setCurrentIndex((index) => (index + delta + source.length) % source.length);
    },
    [queue, tracks, ensureTracks],
  );

  const next = useCallback(() => step(1), [step]);

  const prev = useCallback(() => step(-1), [step]);

  const seek = useCallback((seconds: number) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
    setProgress(seconds);
  }, []);

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    setProgress(0);
    setDuration(current?.duration ?? 0);
  }, [current?.id, current?.r2_key]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, current?.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const value = useMemo<MusicContextValue>(
    () => ({
      tracks,
      queue,
      current,
      playing,
      progress,
      duration,
      volume,
      loading,
      ensureTracks,
      hydrateTracks,
      playQueue,
      playTrack,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      isCurrent: (id: string) => current?.id === id,
    }),
    [
      tracks,
      queue,
      current,
      playing,
      progress,
      duration,
      volume,
      loading,
      ensureTracks,
      hydrateTracks,
      playQueue,
      playTrack,
      toggle,
      next,
      prev,
      seek,
      setVolume,
    ],
  );

  return (
    <MusicContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        src={current ? mediaUrl(current.r2_key) : undefined}
        preload="metadata"
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value)) setDuration(value);
        }}
        onEnded={() => {
          if (queue.length > 1) next();
          else setPlaying(false);
        }}
      />
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) throw new Error("useMusic must be used inside MusicProvider");
  return context;
}