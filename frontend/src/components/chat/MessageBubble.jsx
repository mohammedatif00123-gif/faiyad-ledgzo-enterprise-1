import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css'; 
import { Avatar } from '../ui/Avatar';
import { ReactionBar } from './ReactionBar';
import { Reply, Check, CheckCheck, Forward, Phone, Calendar } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';

// Lazy loaded rich components
const AudioPlayer = React.lazy(() => import('./AudioPlayer'));
const ImageViewer = React.lazy(() => import('./ImageViewer'));
const DocumentCard = React.lazy(() => import('./DocumentCard'));
const VideoPlayer = React.lazy(() => import('./VideoPlayer'));

export const MessageBubble = React.memo(({ message, isOwn, onContextMenu }) => {
  const { user } = useSelector(state => state.auth);

  if (!message) return null;

  if (message.isDeleted) {
    return (
      <div className={`flex w-full mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="px-4 py-2 bg-muted text-muted-foreground italic rounded-2xl text-sm border border-dashed">
          This message was deleted
        </div>
      </div>
    );
  }

  // Hide if deleted for me
  if (message.deletedForMe?.includes(user.id)) return null;

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(e.clientX, e.clientY, message);
    }
  };

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;
    
    // Voice Message
    if (message.messageType === 'voice') {
      const att = message.attachments[0];
      return (
        <React.Suspense fallback={<div className="h-10 w-40 bg-muted animate-pulse rounded-full"></div>}>
          <AudioPlayer src={import.meta.env.VITE_API_URL + att.fileUrl} />
        </React.Suspense>
      );
    }

    // Standard Attachments
    return (
      <div className="flex flex-wrap gap-2 mb-2">
        {message.attachments.map((att, idx) => {
          const url = import.meta.env.VITE_API_URL + att.fileUrl;
          if (att.fileType === 'image') {
            return (
              <div key={att._id} className="max-w-[250px] overflow-hidden rounded-md bg-black/10">
                <React.Suspense fallback={<div className="w-[200px] h-[150px] bg-muted animate-pulse"></div>}>
                  <ImageViewer 
                    src={url} 
                    alt={att.fileName} 
                    images={message.attachments.filter(a => a.fileType === 'image').map(a => import.meta.env.VITE_API_URL + a.fileUrl)} 
                    initialIndex={message.attachments.filter(a => a.fileType === 'image').findIndex(a => a._id === att._id)}
                  />
                </React.Suspense>
              </div>
            );
          }
          if (att.fileType === 'video') {
            return (
              <div key={att._id} className="max-w-[300px]">
                <React.Suspense fallback={<div className="w-[300px] h-[200px] bg-muted animate-pulse rounded"></div>}>
                  <VideoPlayer src={url} />
                </React.Suspense>
              </div>
            );
          }
          // Document
          return (
            <React.Suspense key={att._id} fallback={<div className="w-[250px] h-16 bg-muted animate-pulse rounded-md"></div>}>
              <DocumentCard 
                fileUrl={url} 
                fileName={att.fileName} 
                fileSize={att.fileSize} 
                fileType={att.fileType} 
              />
            </React.Suspense>
          );
        })}
      </div>
    );
  };

  const renderSpecialMessageType = () => {
    if (message.messageType === 'call') {
      return (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-primary/20">
          <div className="p-2 bg-primary/10 text-primary rounded-full">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Call Started</p>
            <p className="text-xs text-muted-foreground">Click to join the ongoing call</p>
          </div>
        </div>
      );
    }
    if (message.messageType === 'meeting') {
      return (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-blue-500/20">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Meeting Scheduled</p>
            <p className="text-xs text-muted-foreground">{message.content}</p>
          </div>
        </div>
      );
    }
    if (message.messageType === 'system') {
      return (
        <div className="px-4 py-2 bg-muted text-muted-foreground italic rounded-2xl text-xs text-center border-dashed my-4 mx-auto w-fit">
          {message.content}
        </div>
      );
    }
    return null;
  };

  // If system message, render completely differently
  if (message.messageType === 'system') {
    return (
      <div className="flex w-full justify-center">
        {renderSpecialMessageType()}
      </div>
    );
  }

  return (
    <div
      className={`flex w-full mb-4 group ${isOwn ? 'justify-end' : 'justify-start'}`}
      onContextMenu={handleContextMenu}
    >
      <div className={`flex max-w-[90%] md:max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 relative`}>
        {!isOwn && (
          <Avatar
            src={message.sender?.avatar}
            fallback={message.sender?.firstName?.[0] || 'U'}
            className="w-8 h-8 shrink-0 mb-1 shadow-sm"
          />
        )}

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isOwn && <span className="text-xs text-muted-foreground mb-1 ml-1 font-medium">{message.sender?.firstName} {message.sender?.lastName}</span>}

          {message.parentMessage && (
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1 opacity-75 truncate max-w-[200px] md:max-w-[300px] cursor-pointer hover:underline border-l-2 border-primary pl-2 ml-1">
              <Reply className="w-3 h-3" />
              <span className="truncate font-medium">{message.parentMessage.sender?.firstName}:</span>
              <span className="truncate">{message.parentMessage.content || 'Attachment'}</span>
            </div>
          )}

          {message.isForwarded && (
            <div className="text-[10px] text-muted-foreground italic mb-0.5 flex items-center gap-1">
              <Forward className="w-3 h-3" /> Forwarded
            </div>
          )}

          <div className={`px-4 py-3 rounded-2xl shadow-sm ${isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'} relative`}>
            
            {['call', 'meeting'].includes(message.messageType) && renderSpecialMessageType()}

            {renderAttachments()}

            {message.content && !['call', 'meeting'].includes(message.messageType) && (
              <div className="text-[15px] leading-relaxed prose prose-sm dark:prose-invert max-w-none break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            {message.isEdited && (
              <span className="text-[10px] opacity-70 ml-2 italic">(edited)</span>
            )}
          </div>

          <ReactionBar reactions={message.reactions} currentUserId={user.id} onReact={() => { }} />

          <div className="flex items-center gap-1 mt-1 mx-1">
            <span className="text-[10px] text-muted-foreground font-medium">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isOwn && (
              <span className="text-muted-foreground">
                {message.status === 'read' ? <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> : <Check className="w-3.5 h-3.5" />}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
