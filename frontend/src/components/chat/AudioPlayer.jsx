import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX } from 'lucide-react';
import { useDecryptedMedia } from '../../hooks/useDecryptedMedia';

export default function AudioPlayer({ attachment, message }) {
  const { fileUrl, isLoading, error } = useDecryptedMedia(attachment, message);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
    };

    const setAudioTime = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [fileUrl]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const seekTo = (e.target.value / 100) * duration;
    audioRef.current.currentTime = seekTo;
    setProgress(e.target.value);
  };

  const toggleSpeed = () => {
    const newRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(newRate);
    audioRef.current.playbackRate = newRate;
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-900/20 text-red-500 rounded-lg max-w-[250px] border border-red-500/50">
        <span className="text-xs font-semibold">🔒 Decryption Failed</span>
      </div>
    );
  }

  if (isLoading || !fileUrl) {
    return <div className="h-10 w-40 bg-slate-700 animate-pulse rounded-full"></div>;
  }

  return (
    <div className="flex items-center gap-3 bg-secondary/30 p-2 rounded-full border max-w-[250px] overflow-hidden group">
      <audio 
        ref={audioRef}
        src={fileUrl} preload="metadata" />
      
      <button 
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-full shrink-0 hover:bg-primary/90 transition-colors"
      >
        {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4" fill="currentColor" />}
      </button>

      <div className="flex flex-col flex-1 gap-1">
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={progress || 0} 
          onChange={handleSeek}
          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button 
          onClick={toggleSpeed}
          className="px-1.5 py-0.5 text-[10px] font-bold bg-muted rounded hover:bg-muted/80 text-foreground"
        >
          {playbackRate}x
        </button>
        <a 
          href={fileUrl} 
          download={attachment.fileName || 'audio.webm'} 
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          title="Download Audio"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
