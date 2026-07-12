import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Reply, Forward, Copy, Pin, Trash2, Info, Star, SmilePlus } from 'lucide-react';

export function MessageActions({ isOwn, onReply, onForward, onCopy, onPin, onStar, onDeleteForMe, onDeleteForEveryone }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="p-0.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none bg-white/50 dark:bg-black/20 backdrop-blur-sm">
          <ChevronDown className="w-5 h-5" />
        </button>
      </DropdownMenu.Trigger>
      
      <DropdownMenu.Portal>
        <DropdownMenu.Content 
          className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl min-w-[180px] p-1 z-50 animate-in fade-in zoom-in-95 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={5}
          align="end"
        >
          <DropdownMenu.Item onClick={onReply} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-lg cursor-pointer outline-none">
            <Reply className="w-4 h-4" /> Reply
          </DropdownMenu.Item>
          
          <DropdownMenu.Item onClick={onForward} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-lg cursor-pointer outline-none">
            <Forward className="w-4 h-4" /> Forward
          </DropdownMenu.Item>

          <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-lg cursor-pointer outline-none">
            <SmilePlus className="w-4 h-4" /> React
          </DropdownMenu.Item>
          
          <DropdownMenu.Item onClick={onCopy} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-lg cursor-pointer outline-none">
            <Copy className="w-4 h-4" /> Copy
          </DropdownMenu.Item>
          
          <DropdownMenu.Item onClick={onPin} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-lg cursor-pointer outline-none">
            <Pin className="w-4 h-4" /> Pin Message
          </DropdownMenu.Item>

          <DropdownMenu.Item onClick={onStar} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-lg cursor-pointer outline-none">
            <Star className="w-4 h-4" /> Star Message
          </DropdownMenu.Item>

          <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-lg cursor-pointer outline-none">
            <Info className="w-4 h-4" /> Message Info
          </DropdownMenu.Item>
          
          <DropdownMenu.Separator className="h-[1px] bg-slate-700 my-1" />
          
          <DropdownMenu.Item onClick={onDeleteForMe} className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg cursor-pointer outline-none">
            <Trash2 className="w-4 h-4" /> Delete for Me
          </DropdownMenu.Item>
          
          {isOwn && (
            <DropdownMenu.Item onClick={onDeleteForEveryone} className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg cursor-pointer outline-none">
              <Trash2 className="w-4 h-4" /> Delete for Everyone
            </DropdownMenu.Item>
          )}
          
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
