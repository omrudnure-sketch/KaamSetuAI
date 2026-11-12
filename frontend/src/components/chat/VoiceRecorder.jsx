import React, { useState, useEffect, useRef } from 'react';
import { Mic, Trash2, Send, AlertCircle } from 'lucide-react';

export const VoiceRecorder = ({ onSendAudio, onCancel }) => {
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const durationRef = useRef(0);

  useEffect(() => {
    startRecording();

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setMicError('');
      audioChunksRef.current = [];
      durationRef.current = 0;
      setRecordingSeconds(0);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError('Audio recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Select supported mime type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200); // 200ms slices
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          durationRef.current = prev + 1;
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setMicError('Microphone permission was denied. Please allow microphone access to record voice notes.');
    }
  };

  const handleCancel = () => {
    cleanup();
    onCancel();
  };

  const handleFinishAndSend = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      onCancel();
      return;
    }

    const duration = durationRef.current;

    mediaRecorderRef.current.onstop = () => {
      const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      if (audioBlob.size > 0 && duration >= 1) {
        onSendAudio(audioBlob, duration);
      } else {
        onCancel();
      }
      cleanup();
    };

    try {
      mediaRecorderRef.current.stop();
    } catch (_err) {
      onCancel();
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (micError) {
    return (
      <div className="flex items-center justify-between w-full p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{micError}</span>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="px-2.5 py-1 text-xs font-semibold bg-rose-100 hover:bg-rose-200 dark:bg-rose-900 dark:hover:bg-rose-800 rounded-lg ml-2"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full bg-slate-900/90 dark:bg-slate-950/95 border border-slate-700/80 rounded-2xl p-2 px-3 shadow-lg text-white animate-in fade-in duration-200">
      {/* Delete / Cancel button */}
      <button
        type="button"
        onClick={handleCancel}
        className="p-2 text-rose-400 hover:text-rose-300 hover:bg-white/10 rounded-full transition-colors active:scale-95"
        title="Discard recording"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      {/* Recording status & pulsing dot */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-rose-500 rounded-full animate-ping" />
          <span className="text-xs font-bold tracking-wide text-rose-400 uppercase">Rec</span>
        </div>

        {/* Audio Waveform animation bars */}
        <div className="flex items-center gap-1 h-5 px-2">
          {[12, 20, 16, 24, 18, 14, 22, 16, 20, 12].map((height, i) => (
            <div
              key={i}
              style={{ height: `${height}px` }}
              className="w-1 bg-emerald-400 rounded-full animate-pulse"
            />
          ))}
        </div>

        {/* Live Timer */}
        <span className="font-mono text-sm font-bold text-white min-w-[40px]">
          {formatSeconds(recordingSeconds)}
        </span>
      </div>

      {/* Send Voice Note button */}
      <button
        type="button"
        onClick={handleFinishAndSend}
        disabled={recordingSeconds < 1}
        className="p-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white rounded-full transition-transform shadow-md"
        title="Send voice note"
      >
        <Send className="w-4 h-4 fill-current ml-0.5" />
      </button>
    </div>
  );
};

export default VoiceRecorder;

