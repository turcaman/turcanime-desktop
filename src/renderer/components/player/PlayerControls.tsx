import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Play,
  Pause,
  Loader2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAutoHide } from '../../hooks/useAutoHide';
import { SeekBar } from './SeekBar';
import { storage } from '../../utils/storage';
import { STORAGE_KEYS } from '../../../config/storageKeys';

interface PlayerControlsProps {
  playing: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  isFullscreen: boolean;
  volume: number;
  muted: boolean;
  animeTitle?: string;
  episodeNumber?: number;
  nextEpisodeCountdown: number | null;
  nextEpisodeNumber: number | null;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
  onToggleFullscreen: () => void;
  onCancelNextEpisode: () => void;
  onConfirmNextEpisode: () => void;
}

interface PlayerIconButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  size?: 'sm' | 'lg';
  title?: string;
  children: React.ReactNode;
}

function PlayerIconButton({ onClick, disabled, size = 'sm', title, children }: PlayerIconButtonProps) {
  const sizeClass =
    size === 'lg'
      ? 'w-14 h-14 bg-white/15 hover:bg-white/25 disabled:opacity-70'
      : 'w-10 h-10 bg-white/10 hover:bg-white/20 disabled:opacity-30';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title ?? undefined}
      className={`flex items-center justify-center rounded-full transition-colors cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${sizeClass}`}
    >
      {children}
    </button>
  );
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  playing,
  buffering,
  currentTime,
  duration,
  loading,
  hasPrev,
  hasNext,
  isFullscreen,
  volume,
  muted,
  animeTitle,
  episodeNumber,
  nextEpisodeCountdown,
  nextEpisodeNumber,
  onPlayPause,
  onSeek,
  onSeekBack,
  onSeekForward,
  onPrev,
  onNext,
  onBack,
  onToggleFullscreen,
  onCancelNextEpisode,
  onConfirmNextEpisode,
}) => {
  const [visible, setVisible] = useState(true);
  const showLoader = loading || buffering;
  const { restartTimer, clearTimer } = useAutoHide(visible, playing, 3000, () => { setVisible(false); });
  const fadeRef = useRef<HTMLDivElement>(null);

  // Short-lived on-screen feedback for volume/mute changes (M, arrows or the
  // bottom button). Auto-fades so it doesn't linger over the picture.
  const [volumePillVisible, setVolumePillVisible] = useState(false);
  const volumePillTimer = useRef<ReturnType<typeof setTimeout>>();
  const prevVolume = useRef(volume);
  const prevMuted = useRef(muted);

  useEffect(() => {
    if (prevMuted.current !== muted || prevVolume.current !== volume) {
      setVolumePillVisible(true);
      if (volumePillTimer.current) clearTimeout(volumePillTimer.current);
      volumePillTimer.current = setTimeout(() => setVolumePillVisible(false), 700);
    }
    prevVolume.current = volume;
    prevMuted.current = muted;
  }, [volume, muted]);

  useEffect(() => () => {
    if (volumePillTimer.current) clearTimeout(volumePillTimer.current);
    if (shortcutsHintTimer.current) clearTimeout(shortcutsHintTimer.current);
  }, []);

  // Teach the shortcuts once: at the first playback we surface a transient
  // pill listing the key ones and remember it so it never shows again.
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);
  const shortcutsHintTimer = useRef<ReturnType<typeof setTimeout>>();
  const shortcutsHintShownRef = useRef(false);

  useEffect(() => {
    if (!playing || shortcutsHintShownRef.current) return;
    shortcutsHintShownRef.current = true;
    storage
      .get<boolean>(STORAGE_KEYS.shortcutsHintSeen)
      .then((seen) => {
        if (seen) return;
        storage.set(STORAGE_KEYS.shortcutsHintSeen, true).catch((): void => undefined);
        setShowShortcutsHint(true);
        if (shortcutsHintTimer.current) clearTimeout(shortcutsHintTimer.current);
        shortcutsHintTimer.current = setTimeout(() => setShowShortcutsHint(false), 4000);
      })
      .catch((): void => undefined);
  }, [playing]);

  useEffect(() => {
    if (fadeRef.current) {
      fadeRef.current.style.transition = 'opacity 250ms ease';
      fadeRef.current.style.opacity = visible ? '1' : '0';
    }
  }, [visible]);

  useEffect(() => {
    document.documentElement.style.cursor =
      isFullscreen && !visible ? 'none' : '';
    return () => { document.documentElement.style.cursor = ''; };
  }, [isFullscreen, visible]);

  const handleMouseMove = useCallback(() => {
    if (!visible) setVisible(true);
    restartTimer();
  }, [visible, restartTimer]);

  const toggle = useCallback(() => {
    setVisible((v) => !v);
    clearTimer();
  }, [clearTimer]);

  const showCountdown = nextEpisodeCountdown !== null;

  // When the countdown overlay disappears (episode auto-changed or cancelled),
  // restart the auto-hide timer so controls fade without requiring mouse input.
  const prevShowCountdown = useRef(showCountdown);
  useEffect(() => {
    if (prevShowCountdown.current && !showCountdown && playing) {
      restartTimer();
    }
    prevShowCountdown.current = showCountdown;
  }, [showCountdown, playing, restartTimer]);

  return (
    <div
      className="absolute inset-0 z-40"
      onClick={toggle}
      onDoubleClick={onToggleFullscreen}
      onMouseMove={handleMouseMove}
    >
      {!showCountdown && (
      <div
        ref={fadeRef}
        className="absolute inset-0"
        style={{
          opacity: 1,
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/10" />

        <div className="absolute top-0 left-0 right-0 flex items-start px-4 pt-4 z-50 pointer-events-none">
          <button
            onClick={(e) => { e.stopPropagation(); onBack(); }}
            title="Volver (Retroceso)"
            aria-label="Volver (Retroceso)"
            className="pointer-events-auto p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <ChevronLeft className="w-6 h-6 text-white drop-shadow-lg" />
          </button>
          <div className="ml-3 flex-1 min-w-0 pointer-events-auto">
            {animeTitle && (
              <p className="text-white font-semibold text-sm truncate drop-shadow-lg">{animeTitle}</p>
            )}
            {episodeNumber != null && (
              <p className="text-neutral-200 text-xs drop-shadow-lg">Episodio {episodeNumber}</p>
            )}
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center justify-center gap-5" onDoubleClick={(e) => e.stopPropagation()}>
            <PlayerIconButton
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              disabled={!hasPrev || loading}
              title="Episodio anterior (P)"
            >
              <SkipBack className="w-4 h-4 text-white drop-shadow-sm" />
            </PlayerIconButton>

            <PlayerIconButton
              onClick={(e) => { e.stopPropagation(); onSeekBack(); }}
              disabled={loading}
              title="Retroceder 10 s (← / J)"
            >
              <RotateCcw className="w-4 h-4 text-white drop-shadow-sm" />
            </PlayerIconButton>

            <PlayerIconButton
              onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
              disabled={showLoader}
              size="lg"
              title={playing ? 'Pausar (Espacio / K)' : 'Reproducir (Espacio / K)'}
            >
              {showLoader ? (
                <Loader2 className="w-5 h-5 text-white drop-shadow-sm animate-spin" />
              ) : playing ? (
                <Pause className="w-5 h-5 text-white drop-shadow-sm ml-0.5" />
              ) : (
                <Play className="w-5 h-5 text-white drop-shadow-sm ml-0.5" />
              )}
            </PlayerIconButton>

            <PlayerIconButton
              onClick={(e) => { e.stopPropagation(); onSeekForward(); }}
              disabled={loading}
              title="Adelantar 10 s (→ / L)"
            >
              <RotateCw className="w-4 h-4 text-white drop-shadow-sm" />
            </PlayerIconButton>

            <PlayerIconButton
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              disabled={!hasNext || loading}
              title="Episodio siguiente (N)"
            >
              <SkipForward className="w-4 h-4 text-white drop-shadow-sm" />
            </PlayerIconButton>
          </div>
        </div>

        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 backdrop-blur-sm text-white text-xs drop-shadow-lg whitespace-nowrap transition-opacity duration-200"
            style={{ opacity: showShortcutsHint ? 1 : 0 }}
          >
            <span className="text-neutral-300">Atajos:</span>
            <span>Espacio/K pausa</span>
            <span className="text-neutral-600">·</span>
            <span>←/→ o J/L ±10 s</span>
            <span className="text-neutral-600">·</span>
            <span>M mute</span>
            <span className="text-neutral-600">·</span>
            <span>N/P episodio</span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <SeekBar
            currentTime={currentTime}
            duration={duration}
            loading={loading}
            onSeek={onSeek}
            onInteractStart={clearTimer}
            onInteractEnd={restartTimer}
          />
        </div>
      </div>
      )}

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm drop-shadow-lg transition-opacity duration-200"
          style={{ opacity: volumePillVisible ? 1 : 0 }}
        >
          {muted ? <VolumeX className="w-4 h-4 flex-shrink-0" /> : <Volume2 className="w-4 h-4 flex-shrink-0" />}
          <span>{muted ? 'Silenciado' : `${Math.round(volume * 100)}%`}</span>
        </div>
      </div>

      {showCountdown && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto animate-fade-in">
          <div className="w-full max-w-xs bg-neutral-900 rounded-xl border border-neutral-800/70 shadow-lg shadow-black/40 overflow-hidden animate-fade-in">
            <div className="px-5 pt-5 pb-4 flex flex-col items-center gap-4">
              <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-[0.14em]">
                Siguiente episodio
              </p>
              {nextEpisodeNumber != null && (
                <p className="text-neutral-200 text-base font-semibold">
                  Episodio {nextEpisodeNumber}
                </p>
              )}
              <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${((nextEpisodeCountdown ?? 0) / 10) * 100}%`, transition: 'width 1s linear' }}
                />
              </div>
            </div>
            <div className="flex border-t border-neutral-800/60">
              <button
                onClick={(e) => { e.stopPropagation(); onCancelNextEpisode(); }}
                className="flex-1 px-4 py-3 text-sm text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/60 transition-colors"
              >
                Cancelar
              </button>
              <div className="w-px bg-neutral-800/60" />
              <button
                onClick={(e) => { e.stopPropagation(); onConfirmNextEpisode(); }}
                className="flex-1 px-4 py-3 text-sm text-purple-400 hover:text-purple-300 hover:bg-neutral-800/60 transition-colors font-medium"
              >
                Saltar ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
