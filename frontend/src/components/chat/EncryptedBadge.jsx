import React from 'react';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';

export function EncryptedBadge({ className = '' }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center text-green-500/80 ${className}`}>
            <Lock className="w-3 h-3 ml-1" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>End-to-End Encrypted</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
