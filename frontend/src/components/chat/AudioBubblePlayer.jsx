import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { getSocketBaseUrl } from '../../services/api.js';

export const AudioBubblePlayer = ({ audioUrl, duration = 0, isOutgoing = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef(null);

  // Normalize media URL: handles direct relative /uploads/..., full URL, or blob
  const resolvedUrl = React.useMemo(() => {
    if (!audioUrl) return '';
    if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://') || audioUrl.startsWith('blob:')) {
      return audioUrl;
    }
    // If relative path like /uploads/..., can use relative via Vite proxy or append backend root
    const cleanPath = audioUrl.startsWith('/') ? audioUrl : `/${audioUrl}`;
    const base = getSocketBaseUrl();
    return `${base}${cleanPath}`;
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(Math.round(audio.duration));
      } else if (duration > 0) {
        setAudioDuration(duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onPlay = () => {
      setIsPlaying(true);
    };

    const onError = () => {
      setIsPlaying(false);
      console.warn('Audio element error encountered for URL:', resolvedUrl);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('error', onError);
    };
  }, [resolvedUrl, duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused && isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // If at end or ended, restart
      if (audio.ended || (audioDuration > 0 && currentTime >= audioDuration)) {
        audio.currentTime = 0;
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn('Playback initiation failed:', err);
            // Fallback attempt: try re-loading source
            try {
              audio.load();
              audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            } catch (_e) {
              setIsPlaying(false);
            }
          });
      }
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = Math.max(0, Math.min((clickX / width) * audioDuration, audioDuration));
    try {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    } catch (_e) {}
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const effectiveDuration = audioDuration || duration || 0;
  const progressPercent = effectiveDuration > 0 ? Math.min((currentTime / effectiveDuration) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[220px] max-w-[290px] select-none">
      <audio
        ref={audioRef}
        src={resolvedUrl}
        preload="auto"
        playsInline
      />

      {/* Mic icon avatar badge */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
          isOutgoing
            ? 'bg-emerald-700/60 text-white'
            : 'bg-primary/10 text-primary dark:bg-sky-500/20 dark:text-sky-300'
        }`}
      >
        <Mic className="w-5 h-5" />
      </div>

      {/* Play / Pause button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm ${
          isOutgoing
            ? 'bg-white text-emerald-700 hover:bg-slate-100'
            : 'bg-primary text-white hover:bg-primary-dark dark:bg-sky-500'
        }`}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Waveform / Scrubber Bar & Timestamps */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div
          onClick={handleSeek}
          className="relative h-6 flex items-center cursor-pointer group"
          role="slider"
          aria-valuenow={currentTime}
          aria-valuemin="0"
          aria-valuemax={effectiveDuration}
        >
          {/* Waveform Bars Simulation */}
          <div className="w-full flex items-center justify-between gap-[2px] h-4">
            {[40, 65, 85, 45, 95, 70, 35, 80, 60, 90, 50, 75, 40, 85, 60, 100, 70, 45, 80, 55].map(
              (heightPercent, idx) => {
                const barPosition = (idx / 20) * 100;
                const isPlayed = barPosition <= progressPercent;
                return (
                  <div
                    key={idx}
                    style={{ height: `${heightPercent}%` }}
                    className={`w-1 rounded-full transition-colors ${
                      isPlayed
                        ? isOutgoing
                          ? 'bg-white'
                          : 'bg-primary dark:bg-sky-400'
                        : isOutgoing
                        ? 'bg-white/40'
                        : 'bg-slate-300 dark:bg-white/20'
                    }`}
                  />
                );
              }
            )}
          </div>
        </div>

        {/* Duration / Current Time */}
        <div className="flex items-center justify-between text-[11px] font-medium leading-none -mt-1 opacity-90">
          <span>{isPlaying ? formatTime(currentTime) : formatTime(effectiveDuration)}</span>
          <span className="text-[10px] tracking-tight">{isOutgoing ? 'Voice Note' : 'Audio Note'}</span>
        </div>
      </div>
    </div>
  );
};

export default AudioBubblePlayer;
