import React from 'react';
import { Mic, Square, Trash2, Send, Play, Pause } from 'lucide-react';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function VoiceRecorder({ 
  isRecording, 
  recordingTime, 
  audioUrl, 
  onStart, 
  onStop, 
  onCancel, 
  onSend 
}) {
  
  if (audioUrl) {
    // Preview Mode
    return (
      <div className="flex items-center gap-3 bg-slate-800 rounded-full py-2 px-4 shadow-inner flex-1 mx-2 animate-in fade-in slide-in-from-right-4">
        <button onClick={onCancel} className="text-slate-400 hover:text-red-400 transition-colors">
          <Trash2 className="w-5 h-5" />
        </button>
        
        <audio src={audioUrl} controls className="h-8 w-full max-w-[200px] outline-none" />
        
        <button 
          onClick={onSend}
          className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors ml-auto"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </div>
    );
  }

  if (isRecording) {
    // Recording Mode
    return (
      <div className="flex items-center gap-4 bg-slate-800 rounded-full py-2 px-4 shadow-inner flex-1 mx-2 animate-in fade-in slide-in-from-right-4">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
        <span className="text-slate-200 font-mono text-sm">{formatTime(recordingTime)}</span>
        
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={onCancel} className="text-slate-400 hover:text-red-400 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
          <button 
            onClick={onStop}
            className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <Square className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // Initial State (just the mic button)
  return (
    <button
      type="button"
      onClick={onStart}
      className="p-3 text-slate-400 hover:text-primary transition-colors rounded-full hover:bg-slate-800 focus:outline-none"
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}
