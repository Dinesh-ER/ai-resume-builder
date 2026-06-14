import { useState, useEffect, useCallback, useRef } from 'react';
import { PAGE_SIZES, mmToPx } from '../utils/pageConstants';

/**
 * Custom hook that monitors the Quill editor content and calculates
 * pagination info, injecting visual page-break lines.
 *
 * @param {Object}  options
 * @param {Object}  options.quillRef       – ref to the ReactQuill component
 * @param {string}  options.pageSizeName   – key in PAGE_SIZES, e.g. 'A4'
 * @param {Object}  options.margins        – { top, right, bottom, left } in mm
 * @param {number}  options.zoom           – zoom percentage (50–200)
 * @returns {{ pageCount: number, contentHeight: number, printableHeightPx: number, wordCount: number, charCount: number }}
 */
export default function usePagination({ quillRef, pageSizeName, margins, zoom }) {
  const [pageCount, setPageCount] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const breakLinesRef = useRef([]);
  const observerRef = useRef(null);

  const pageSize = PAGE_SIZES[pageSizeName] || PAGE_SIZES.A4;

  // Printable area height in px (page height minus top + bottom margins)
  const printableHeightPx = mmToPx(pageSize.height - margins.top - margins.bottom);

  /**
   * Recalculate pages, inject page-break lines, and count words.
   */
  const recalculate = useCallback(() => {
    if (!quillRef?.current) return;

    const quill = quillRef.current.getEditor?.() ?? quillRef.current;
    const editor = quill?.root || document.querySelector('.ql-editor');
    if (!editor) return;

    // --- Content height ---
    const height = editor.scrollHeight;
    setContentHeight(height);

    // --- Page count ---
    const pages = Math.max(1, Math.ceil(height / printableHeightPx));
    setPageCount(pages);

    // --- Word / char count ---
    const text = editor.innerText || '';
    const trimmed = text.trim();
    setCharCount(trimmed.length);
    setWordCount(trimmed ? trimmed.split(/\s+/).length : 0);

    // --- Page-break indicators ---
    // Remove old ones
    breakLinesRef.current.forEach((el) => el.remove());
    breakLinesRef.current = [];

    // We need the editor to be position: relative so we can place absolute children
    if (getComputedStyle(editor).position === 'static') {
      editor.style.position = 'relative';
    }

    for (let i = 1; i < pages; i++) {
      const breakLine = document.createElement('div');
      breakLine.className = 'page-break-indicator';
      breakLine.setAttribute('data-page', i + 1);
      breakLine.style.cssText = `
        position: absolute;
        left: -${mmToPx(margins.left)}px;
        right: -${mmToPx(margins.right)}px;
        top: ${i * printableHeightPx}px;
        height: 0;
        border-top: 2px dashed rgba(124, 58, 237, 0.35);
        pointer-events: none;
        z-index: 5;
      `;

      // Page badge
      const badge = document.createElement('span');
      badge.className = 'page-break-badge';
      badge.textContent = `Page ${i + 1}`;
      badge.style.cssText = `
        position: absolute;
        right: 8px;
        top: -10px;
        font-size: 10px;
        font-weight: 600;
        color: rgba(124, 58, 237, 0.6);
        background: rgba(244, 243, 236, 0.95);
        padding: 1px 8px;
        border-radius: 4px;
        letter-spacing: 0.02em;
        pointer-events: none;
        user-select: none;
      `;
      breakLine.appendChild(badge);

      editor.appendChild(breakLine);
      breakLinesRef.current.push(breakLine);
    }
  }, [quillRef, printableHeightPx, margins]);

  // Observe the editor for size changes
  useEffect(() => {
    const setupObserver = () => {
      if (!quillRef?.current) return;
      const quill = quillRef.current.getEditor?.() ?? quillRef.current;
      const editor = quill?.root || document.querySelector('.ql-editor');
      if (!editor) return;

      // Disconnect old observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      const ro = new ResizeObserver(() => {
        recalculate();
      });
      ro.observe(editor);
      observerRef.current = ro;

      // Initial calculation
      recalculate();
    };

    // Small delay to let Quill mount
    const timer = setTimeout(setupObserver, 200);

    return () => {
      clearTimeout(timer);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      // Clean up break lines
      breakLinesRef.current.forEach((el) => el.remove());
      breakLinesRef.current = [];
    };
  }, [quillRef, recalculate]);

  // Recalculate when page size or margins change
  useEffect(() => {
    recalculate();
  }, [pageSizeName, margins, zoom, recalculate]);

  return {
    pageCount,
    contentHeight,
    printableHeightPx,
    wordCount,
    charCount,
    recalculate,
  };
}
