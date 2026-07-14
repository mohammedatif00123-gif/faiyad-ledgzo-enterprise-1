import React, { useEffect, useState } from 'react';
import { Download, Copy, Check, FileCode2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useDecryptedMedia } from '../../hooks/useDecryptedMedia';

export function MessageCode({ attachment, message }) {
  const { fileUrl, error, isLoading } = useDecryptedMedia(attachment, message);
  const [codeContent, setCodeContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (fileUrl) {
      fetch(fileUrl)
        .then(res => res.text())
        .then(text => setCodeContent(text))
        .catch(err => setFetchError('Failed to read code file.'));
    }
  }, [fileUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (error || fetchError) {
    return (
      <div className="w-full bg-red-900/20 text-red-500 rounded-lg p-3 flex items-center gap-2 border border-red-500/50 mt-2 max-w-lg">
        <FileCode2 className="w-5 h-5" />
        <span className="text-sm">🔒 Decryption Failed</span>
      </div>
    );
  }

  if (isLoading || !fileUrl || (!codeContent && !fetchError)) {
    return (
      <div className="w-full h-32 bg-slate-800 animate-pulse rounded-lg flex items-center justify-center mt-2 max-w-lg border border-white/10">
        <span className="text-slate-500 text-sm flex items-center gap-2">
          <FileCode2 className="w-5 h-5" /> Decrypting...
        </span>
      </div>
    );
  }

  const language = attachment.fileName?.split('.').pop() || 'javascript';

  return (
    <div className="w-full max-w-2xl mt-2 rounded-lg overflow-hidden border border-white/10 bg-[#1e1e1e] shadow-lg">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/5">
        <div className="flex items-center gap-2 text-slate-300">
          <FileCode2 className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium">{attachment.fileName}</span>
          <span className="text-xs text-slate-500">
            {(attachment.fileSize / 1024).toFixed(1)} KB
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"
            title="Copy Code"
          >
            {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <a 
            href={fileUrl} 
            download={attachment.fileName || 'code.txt'}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"
            title="Download Original"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Code Content */}
      <div className="max-h-[400px] overflow-auto custom-scrollbar text-[13px]">
        <SyntaxHighlighter 
          language={language}
          style={vscDarkPlus}
          showLineNumbers={true}
          customStyle={{ margin: 0, background: 'transparent', padding: '1rem' }}
          wrapLines={true}
          lineNumberStyle={{ minWidth: '3em', paddingRight: '1em', color: '#6e7681', textAlign: 'right' }}
        >
          {codeContent}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
