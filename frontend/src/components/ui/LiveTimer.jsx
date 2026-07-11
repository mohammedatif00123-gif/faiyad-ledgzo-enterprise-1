import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip';

export function LiveTimer({ startTime, isRunning }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setElapsed(Math.floor((new Date() - new Date(startTime)) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [startTime, isRunning]);

  if (!isRunning || !startTime) return null;

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium cursor-help">
            <Clock className="w-4 h-4 animate-pulse" />
            Active Session
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-lg font-mono">
          {formattedTime}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
