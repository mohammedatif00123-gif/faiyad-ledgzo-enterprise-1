import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css'; 
import { Avatar } from '../ui/Avatar';
import { ReactionBar } from './ReactionBar';
import { Reply, Forward, Phone, Calendar, CheckSquare, Square } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { MessageTicks } from './MessageTicks';
import { MessageActions } from './MessageActions';
import { EmojiPicker } from './EmojiPicker';
import { formatMessageTime } from '../../utils/messageUtils';
import { MessageImage } from './MessageImage';
import { EncryptedBadge } from './EncryptedBadge';

// Lazy loaded rich components
const AudioPlayer = React.lazy(() => import('./AudioPlayer'));
const DocumentCard = React.lazy(() => import('./DocumentCard'));
const VideoPlayer = React.lazy(() => import('./VideoPlayer'));
const { MessageCode } = React.lazy(() => import('./MessageCode').then(m => ({ default: m.MessageCode })));

export const MessageBubble = React.memo(({ 
  message, 
  isOwn, 
  onReply, 
  onForward, 
  onDeleteForMe, 
  onDeleteForEveryone, 
  onReact, 
  onPin,
  isSelectingMode,
  isSelected,
  onToggleSelect,
  searchQuery
}) => {
  const { user } = useSelector(state => state.auth);
  const [isHovered, setIsHovered] = useState(false);

  if (!message) return null;

  if (message.isDeleted) {
    return (
      <div className={`flex w-full mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="px-3 py-1.5 dark:bg-[#202c33] bg-white text-slate-500 italic rounded-lg text-sm shadow-sm flex items-center gap-2">
          🚫 This message was deleted
          <span className="text-[10px] ml-2">{formatMessageTime(message.createdAt)}</span>
        </div>
      </div>
    );
  }

  if (message.deletedForMe?.includes(user.id)) return null;

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;
    
    if (message.messageType === 'voice' || message.isVoice) {
      const att = message.attachments[0];
      if (typeof att === 'string') return <div className="h-10 w-40 bg-slate-700 animate-pulse rounded-full"></div>;
      return (
        <React.Suspense fallback={<div className="h-10 w-40 bg-slate-700 animate-pulse rounded-full"></div>}>
          <AudioPlayer attachment={att} message={message} />
        </React.Suspense>
      );
    }

    return (
      <div className="flex flex-wrap gap-1 mb-1">
        {message.attachments.map((att) => {
          if (typeof att === 'string') {
             return <div key={att} className="w-[250px] h-16 bg-slate-700 animate-pulse rounded-lg"></div>;
          }
          if (att.fileType === 'image') return <MessageImage key={att._id} attachment={att} message={message} />;
          if (att.fileType === 'code') {
            return (
              <React.Suspense key={att._id} fallback={<div className="w-[500px] h-32 bg-slate-700 animate-pulse rounded-lg mt-2"></div>}>
                <MessageCode attachment={att} message={message} />
              </React.Suspense>
            );
          }
          if (att.fileType === 'video') {
            return (
              <div key={att._id} className="max-w-[300px]">
                <React.Suspense fallback={<div className="w-[300px] h-[200px] bg-slate-700 animate-pulse rounded-lg"></div>}>
                  <VideoPlayer attachment={att} message={message} />
                </React.Suspense>
              </div>
            );
          }
          return (
            <React.Suspense key={att._id} fallback={<div className="w-[250px] h-16 bg-slate-700 animate-pulse rounded-lg"></div>}>
              <DocumentCard attachment={att} message={message} />
            </React.Suspense>
          );
        })}
      </div>
    );
  };

  const renderSpecialMessageType = () => {
    if (message.messageType === 'call') {
      return (
        <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg border border-primary/20 mb-1">
          <div className="p-2 bg-primary/20 text-primary rounded-full">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">Call Started</p>
          </div>
        </div>
      );
    }
    if (message.messageType === 'meeting') {
      return (
        <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg border border-blue-500/20 mb-1">
          <div className="p-2 bg-blue-500/20 text-blue-500 rounded-full">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">Meeting Scheduled</p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (message.messageType === 'system') {
    return (
      <div className="flex w-full justify-center my-4">
        <div className="px-4 py-1.5 dark:bg-slate-800 bg-slate-200 text-slate-500 dark:text-slate-400 rounded-lg text-xs font-medium shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  // Handle highlighted search query
  const renderContent = () => {
    if (!message.content) return null;
    let content = message.content;
    
    // Very basic highlight implementation
    if (searchQuery && content.toLowerCase().includes(searchQuery.toLowerCase())) {
      const parts = content.split(new RegExp(`(${searchQuery})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === searchQuery.toLowerCase() ? 
        <mark key={i} className="bg-yellow-400 text-black px-0.5 rounded">{part}</mark> : 
        part
      );
    }

    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div 
      className={`flex w-full mb-1 transition-all ${isSelectingMode ? 'cursor-pointer hover:bg-primary/5 pl-2 rounded-lg' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => isSelectingMode && onToggleSelect(message._id)}
    >
      {isSelectingMode && (
        <div className="flex items-center justify-center w-10 shrink-0">
          {isSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground" />}
        </div>
      )}

      <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex max-w-[70%] md:max-w-[65%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 group relative`}>
          


          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} relative`}>
            {!isOwn && (
               <span className="text-xs text-primary mb-1 ml-3 font-semibold">{message.sender?.firstName} {message.sender?.lastName}</span>
            )}

            {/* Chat Bubble */}
            <div 
              className={`relative px-3 py-2 shadow-[var(--ent-shadow)] min-w-[80px] ${
                isOwn 
                  ? 'bg-[var(--own-bg)] text-[var(--own-text)]' 
                  : 'bg-[var(--other-bg)] text-[var(--other-text)]'
              }`}
              style={{
                borderRadius: isOwn ? 'var(--own-border-radius)' : 'var(--other-border-radius)'
              }}
            >
              
              {/* Hover Actions inside bubble */}
              {!isSelectingMode && (
                <div className={`absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end z-20 w-16 h-8 bg-gradient-to-l ${isOwn ? 'from-[var(--own-bg)]' : 'from-[var(--other-bg)]'} to-transparent rounded-tr-lg pr-1`}>
                  <div className="flex items-center gap-0.5 pt-1">
                    <EmojiPicker onEmojiSelect={(emoji) => onReact && onReact(message._id, emoji)} isOwn={isOwn} />
                    <MessageActions 
                      isOwn={isOwn}
                      onReply={() => onReply && onReply(message)}
                      onForward={() => onForward && onForward(message)}
                      onCopy={() => navigator.clipboard.writeText(message.content)}
                      onPin={() => onPin && onPin(message)}
                      onStar={() => onStar && onStar(message)}
                      onDeleteForMe={() => onDeleteForMe && onDeleteForMe(message._id)}
                      onDeleteForEveryone={() => onDeleteForEveryone && onDeleteForEveryone(message._id)}
                    />
                  </div>
                </div>
              )}
              
              {message.isForwarded && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic mb-1 flex items-center gap-1">
                  <Forward className="w-3 h-3" /> Forwarded
                </div>
              )}

              {message.parentMessage && (
                <div 
                  className="bg-black/5 dark:bg-black/20 rounded p-2 mb-1 text-sm border-l-4 border-primary cursor-pointer hover:bg-black/10 dark:hover:bg-black/30 transition-colors"
                >
                  <div className="font-semibold text-primary text-xs mb-0.5">
                    {message.parentMessage.sender?.firstName}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 truncate max-w-[200px] text-xs">
                    {message.parentMessage.content || (message.parentMessage.attachments?.length > 0 ? 'Photo/Media' : 'Voice Message')}
                  </div>
                </div>
              )}

              {['call', 'meeting'].includes(message.messageType) && renderSpecialMessageType()}
              {renderAttachments()}

              <div className="flex items-end gap-3 justify-between">
                {message.content && !['call', 'meeting'].includes(message.messageType) && (
                  <div className="text-[14.5px] leading-snug prose prose-sm dark:prose-invert max-w-none break-words py-0.5">
                    {renderContent()}
                  </div>
                )}
                
                {/* WhatsApp style time and ticks inside the bubble */}
                <div className="flex items-center gap-1 mt-1 ml-3 shrink-0 self-end opacity-70">
                  {message.isEncrypted && <EncryptedBadge />}
                  {message.isEdited && <span className="text-[10px] italic mr-1">edited</span>}
                  <span className="text-[10px] font-medium whitespace-nowrap">
                    {formatMessageTime(message.createdAt)}
                  </span>
                  {isOwn && <MessageTicks status={message.status} />}
                </div>
              </div>
            </div>

            <div className="mt-0.5">
              <ReactionBar reactions={message.reactions} currentUserId={user.id} onReact={(emoji) => onReact && onReact(message._id, emoji)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
