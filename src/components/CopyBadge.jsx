import React, { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';
import clsx from 'clsx';

/**
 * CopyBadge — a small tag/badge that copies text to clipboard on click.
 * 
 * @param {string} text - The text to display and copy
 * @param {string} [label] - Optional label shown before the text (e.g. "NS:")
 * @param {'blue'|'slate'|'purple'} [variant='blue'] - Color scheme
 * @param {'sm'|'md'} [size='sm'] - Size variant
 */
const CopyBadge = ({ text, label, variant = 'blue', size = 'sm', className }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    }, [text]);

    if (!text || text === '-') return <span className="text-slate-400">-</span>;

    const variants = {
        blue: {
            base: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 hover:border-blue-200',
            copied: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
        slate: {
            base: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:border-slate-300',
            copied: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
        purple: {
            base: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 hover:border-purple-200',
            copied: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
    };

    const v = variants[variant] || variants.blue;
    const isSmall = size === 'sm';

    return (
        <button
            type="button"
            onClick={handleCopy}
            title={copied ? 'Copied!' : `Click to copy: ${text}`}
            className={clsx(
                'inline-flex items-center gap-1 font-mono border rounded transition-all duration-200 cursor-pointer select-none group print:border-0 print:bg-transparent print:p-0',
                copied ? v.copied : v.base,
                isSmall ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
                'active:scale-95',
                className
            )}
        >
            {label && (
                <span className={clsx(
                    'font-sans font-semibold',
                    isSmall ? 'text-[9px]' : 'text-[10px]',
                    copied ? 'text-emerald-500' : 'opacity-60'
                )}>
                    {label}
                </span>
            )}
            <span className="font-bold">{text}</span>
            {copied ? (
                <Check className={clsx('flex-shrink-0 print:hidden', isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
            ) : (
                <Copy className={clsx('flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity print:hidden', isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
            )}
        </button>
    );
};

export default CopyBadge;
