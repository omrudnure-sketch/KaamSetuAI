import React, { useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { getSocketBaseUrl } from '../../services/api.js';

export const ImageLightboxModal = ({ imageUrl, caption, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  const resolvedUrl =
    imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('blob:')
      ? imageUrl
      : `${getSocketBaseUrl()}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="w-full flex items-center justify-between text-white max-w-4xl pt-2 pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs sm:text-sm font-medium text-slate-300 truncate max-w-[70%]">
          {caption || 'Image Attachment'}
        </span>
        <div className="flex items-center gap-3">
          <a
            href={resolvedUrl}
            download="attachment.jpg"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/10 rounded-full text-slate-200 hover:text-white transition-colors"
            title="Download image"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-200 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image View */}
      <div
        className="flex-1 flex items-center justify-center max-w-4xl max-h-[80vh] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={resolvedUrl}
          alt={caption || 'Chat photo attachment'}
          className="max-h-full max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
        />
      </div>

      {/* Caption footer if provided */}
      {caption && (
        <div
          className="w-full max-w-2xl text-center py-3 px-4 bg-black/40 rounded-xl text-white text-xs sm:text-sm mt-3"
          onClick={(e) => e.stopPropagation()}
        >
          {caption}
        </div>
      )}
    </div>
  );
};

export default ImageLightboxModal;

