import React from 'react';
import { FileText, FileSpreadsheet, FileIcon as FilePresentation, File, Download, FileArchive } from 'lucide-react';
import { useDecryptedMedia } from '../../hooks/useDecryptedMedia';

export default function DocumentCard({ attachment, message }) {
  const { fileUrl, isLoading, error } = useDecryptedMedia(attachment, message);
  const { fileName, fileSize } = attachment;
  
  const getIcon = () => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext)) return <FileText className="w-8 h-8 text-red-500" />;
    if (['doc', 'docx'].includes(ext)) return <FileText className="w-8 h-8 text-blue-500" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    if (['ppt', 'pptx'].includes(ext)) return <FilePresentation className="w-8 h-8 text-orange-500" />;
    if (['zip', 'rar', 'tar', 'gz'].includes(ext)) return <FileArchive className="w-8 h-8 text-yellow-600" />;
    return <File className="w-8 h-8 text-muted-foreground" />;
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (error) {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-900/20 text-red-500 rounded-lg max-w-sm border border-red-500/50">
        <span className="text-xs font-semibold">🔒 Decryption Failed</span>
      </div>
    );
  }

  if (isLoading || !fileUrl) {
    return <div className="w-[250px] h-16 bg-slate-700 animate-pulse rounded-lg"></div>;
  }

  return (
    <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border max-w-sm hover:bg-secondary/50 transition-colors group cursor-pointer">
      <div className="flex items-center gap-3 flex-1 overflow-hidden" onClick={() => window.open(fileUrl, '_blank')}>
        <div className="shrink-0">
          {getIcon()}
        </div>
        <div className="flex flex-col overflow-hidden flex-1">
          <span className="text-sm font-medium truncate text-foreground" title={fileName}>
            {fileName || 'Document'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatSize(fileSize)} • {fileName?.split('.').pop()?.toUpperCase() || 'FILE'}
          </span>
        </div>
      </div>
      <a 
        href={fileUrl}
        download={fileName || 'document'} 
        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Download File"
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  );
}
