import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Download } from 'lucide-react';
import { useDecryptedMedia } from '../../hooks/useDecryptedMedia';

export default function VideoPlayer({ attachment, message }) {
  const { fileUrl, isLoading, error } = useDecryptedMedia(attachment, message);
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);

  const togglePlay = () => {
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(p);
  };

  const toggleFullscreen = () => {
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  if (error) {
    return (
      <div className="w-full h-48 bg-red-900/20 text-red-500 rounded-lg flex items-center justify-center border border-red-500/50">
        <span className="text-xs">🔒 Decryption Failed</span>
      </div>
    );
  }

  if (isLoading || !fileUrl) {
    return <div className="w-[300px] h-[200px] bg-slate-700 animate-pulse rounded-lg"></div>;
  }

  return (
    <div 
      className="relative rounded-lg overflow-hidden group max-w-sm"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={fileUrl}
        className="w-full h-auto max-h-[300px] object-contain"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onClick={togglePlay}
      />
      
      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
        
        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer">
          <div 
            className="h-full bg-primary transition-all" 
            style={{ width: `${progress}%` }} 
          />
        </div>

        <div className="flex justify-between items-center text-white">
          <button onClick={togglePlay} className="p-1 hover:text-primary transition-colors">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="p-1 hover:text-primary transition-colors">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <a 
              href={fileUrl} 
              download={attachment.fileName || 'video.mp4'}
              className="p-1 hover:text-primary transition-colors"
              title="Download Video"
            >
              <Download className="w-4 h-4" />
            </a>
            <button onClick={toggleFullscreen} className="p-1 hover:text-primary transition-colors">
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Play button overlay when paused initially */}
      {!isPlaying && progress === 0 && (
        <button 
          onClick={togglePlay} 
          className="absolute inset-0 m-auto w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center opacity-90 hover:scale-110 transition-transform"
        >
          <Play className="w-5 h-5 ml-1" fill="currentColor" />
        </button>
      )}
    </div>
  );
}
