'use client';

import { useMemo, useState } from 'react';
import { createExportFilename, ExportData } from '@/lib/export-share';

interface ExportShareControlsProps {
  id: string;
  title: string;
  data: ExportData;
  className?: string;
  compact?: boolean;
}

const buttonClass = (compact?: boolean) => (
  `inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gme-dark-300 bg-white dark:bg-gme-dark-100 text-gray-600 dark:text-gray-300 hover:border-gme-red/40 hover:text-gme-red dark:hover:text-gme-red transition-colors ${
    compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs font-medium'
  }`
);

export default function ExportShareControls({
  id,
  title,
  data,
  className = '',
  compact = false,
}: ExportShareControlsProps) {
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');

  const exportData = useMemo(() => ({
    title,
    anchorId: id,
    exportedAt: new Date().toISOString(),
    data,
  }), [data, id, title]);

  const getShareUrl = () => {
    if (typeof window === 'undefined') return `#${id}`;
    const url = new URL(window.location.href);
    url.hash = id;
    return url.toString();
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = createExportFilename(title);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const url = getShareUrl();
    const sharePayload = { title, text: title, url };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareState('copied');
        window.setTimeout(() => setShareState('idle'), 1600);
      } else {
        window.prompt('Copy share link', url);
      }
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareState('copied');
        window.setTimeout(() => setShareState('idle'), 1600);
      }
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <button type="button" onClick={handleExport} className={buttonClass(compact)} aria-label={`Export ${title}`}>
        Export
      </button>
      <button type="button" onClick={handleShare} className={buttonClass(compact)} aria-label={`Share ${title}`}>
        {shareState === 'copied' ? 'Copied' : 'Share'}
      </button>
    </div>
  );
}

