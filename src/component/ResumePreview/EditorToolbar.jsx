import { useContext, useState, useCallback, useEffect, memo } from 'react';
import { ResumeContext } from '../../context/ResumeContent';
import { FONT_FAMILIES, FONT_SIZES, PAGE_SIZES, MARGIN_PRESETS, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from '../../utils/pageConstants';
import './EditorToolbar.css';

/**
 * Custom editor toolbar that replaces Quill's built-in toolbar.
 * Drives formatting via Quill's programmatic API.
 */
export default function EditorToolbar({ quillRef }) {
    const {
        pageSize, setPageSize,
        zoom, setZoom,
        margins, marginPreset, applyMarginPreset,
    } = useContext(ResumeContext);

    const [activeFormats, setActiveFormats] = useState({});
    const [showPageMenu, setShowPageMenu] = useState(false);

    // Track current selection format
    useEffect(() => {
        if (!quillRef?.current) return;
        const quill = quillRef.current.getEditor?.() ?? quillRef.current;
        if (!quill) return;

        const handleUpdate = () => {
            const fmt = quill.getFormat();
            setActiveFormats(prev => {
                // Faster shallow comparison instead of JSON.stringify
                const keys1 = Object.keys(prev);
                const keys2 = Object.keys(fmt);
                if (keys1.length !== keys2.length) return fmt;
                for (let key of keys1) {
                    if (prev[key] !== fmt[key]) return fmt;
                }
                return prev;
            });
        };

        console.log("[Toolbar] Listening to selection changes...");

        quill.on('selection-change', handleUpdate);

        return () => {
            quill.off('selection-change', handleUpdate);
        };
    }, [quillRef]);

    const applyFormat = useCallback((format, value) => {
        if (!quillRef?.current) return;
        const quill = quillRef.current.getEditor?.() ?? quillRef.current;
        if (!quill) return;

        const current = quill.getFormat();
        if (value === undefined) {
            // Toggle boolean format
            quill.format(format, !current[format]);
        } else {
            quill.format(format, value);
        }
        quill.focus();
    }, [quillRef]);

    const handleUndo = useCallback(() => {
        if (!quillRef?.current) return;
        const quill = quillRef.current.getEditor?.() ?? quillRef.current;
        quill?.history?.undo();
    }, [quillRef]);

    const handleRedo = useCallback(() => {
        if (!quillRef?.current) return;
        const quill = quillRef.current.getEditor?.() ?? quillRef.current;
        quill?.history?.redo();
    }, [quillRef]);

    const handleClean = useCallback(() => {
        if (!quillRef?.current) return;
        const quill = quillRef.current.getEditor?.() ?? quillRef.current;
        if (!quill) return;
        const range = quill.getSelection();
        if (range && range.length > 0) {
            quill.removeFormat(range.index, range.length);
        }
    }, [quillRef]);

    const insertHR = useCallback(() => {
        if (!quillRef?.current) return;
        const quill = quillRef.current.getEditor?.() ?? quillRef.current;
        if (!quill) return;
        const range = quill.getSelection(true);
        quill.insertText(range.index, '\n');
        quill.insertEmbed(range.index + 1, 'divider', true);
        quill.setSelection(range.index + 2);
    }, [quillRef]);

    const currentHeader = activeFormats.header || 0;
    const currentFont = activeFormats.font || 'Inter';
    const currentSize = activeFormats.size || false;
    const currentAlign = activeFormats.align || 'left';

    // Performance: Only re-render the actual UI if the values this toolbar cares about change.
    // We use a memoized inner component to prevent lag while typing in the editor.
    return <MemoizedToolbarUI
        {...{ pageSize, setPageSize, zoom, setZoom, margins, marginPreset, applyMarginPreset, activeFormats, handleUndo, handleRedo, handleClean, insertHR, applyFormat, currentFont, currentSize, currentHeader, currentAlign }}
    />;
}

const MemoizedToolbarUI = memo(({
    pageSize, setPageSize, zoom, setZoom, margins, marginPreset, applyMarginPreset,
    activeFormats, handleUndo, handleRedo, handleClean, insertHR, applyFormat,
    currentFont, currentSize, currentHeader, currentAlign
}) => (
    <div className="editor-toolbar-wrapper">
        {/* Row 1: Main formatting */}
        <div className="toolbar-row toolbar-row-main">
            {/* Undo / Redo */}
            <div className="toolbar-group">
                <button className="tb-btn" onClick={handleUndo} title="Undo (Ctrl+Z)">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h10a5 5 0 0 1 0 10H9" /><path d="M3 10l4-4M3 10l4 4" /></svg>
                </button>
                <button className="tb-btn" onClick={handleRedo} title="Redo (Ctrl+Y)">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10H11a5 5 0 0 0 0 10h4" /><path d="M21 10l-4-4M21 10l-4 4" /></svg>
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Font Family */}
            <div className="toolbar-group">
                <select
                    className="tb-select font-select"
                    value={currentFont}
                    onChange={(e) => applyFormat('font', e.target.value)}
                    title="Font Family"
                >
                    {FONT_FAMILIES.map(f => (
                        <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                    ))}
                </select>
            </div>

            {/* Font Size */}
            <div className="toolbar-group">
                <select
                    className="tb-select size-select"
                    value={currentSize || ''}
                    onChange={(e) => applyFormat('size', e.target.value ? e.target.value : false)}
                    title="Font Size"
                >
                    <option value="">Size</option>
                    {FONT_SIZES.map(s => (
                        <option key={s} value={`${s}px`}>{s}</option>
                    ))}
                </select>
            </div>

            {/* Heading */}
            <div className="toolbar-group">
                <select
                    className="tb-select heading-select"
                    value={currentHeader}
                    onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        applyFormat('header', val || false);
                    }}
                    title="Heading Level"
                >
                    <option value="0">Normal</option>
                    <option value="1">Heading 1</option>
                    <option value="2">Heading 2</option>
                    <option value="3">Heading 3</option>
                </select>
            </div>

            <div className="toolbar-divider" />

            {/* Bold / Italic / Underline / Strike */}
            <div className="toolbar-group">
                <button className={`tb-btn ${activeFormats.bold ? 'active' : ''}`} onClick={() => applyFormat('bold')} title="Bold (Ctrl+B)">
                    <strong>B</strong>
                </button>
                <button className={`tb-btn ${activeFormats.italic ? 'active' : ''}`} onClick={() => applyFormat('italic')} title="Italic (Ctrl+I)">
                    <em>I</em>
                </button>
                <button className={`tb-btn ${activeFormats.underline ? 'active' : ''}`} onClick={() => applyFormat('underline')} title="Underline (Ctrl+U)">
                    <u>U</u>
                </button>
                <button className={`tb-btn ${activeFormats.strike ? 'active' : ''}`} onClick={() => applyFormat('strike')} title="Strikethrough">
                    <s>S</s>
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Text Color / Background Color */}
            <div className="toolbar-group">
                <label className="tb-color-wrapper" title="Text Color">
                    <span className="tb-color-icon" style={{ borderBottomColor: activeFormats.color || '#000' }}>A</span>
                    <input type="color" className="tb-color-input" value={activeFormats.color || '#000000'}
                        onChange={(e) => applyFormat('color', e.target.value)} />
                </label>
                <label className="tb-color-wrapper" title="Highlight Color">
                    <span className="tb-color-icon highlight-icon" style={{ backgroundColor: activeFormats.background || 'transparent' }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M5 19h14v2H5zM18.37 3.29a1 1 0 0 0-1.41 0L7.88 12.37l3.75 3.75 9.08-9.08a1 1 0 0 0 0-1.41l-2.34-2.34zM6.81 13.44l-2.6 2.6c-.39.39-.39 1.02 0 1.41l.7.7L3 19h3.48l1.93-1.93-1.6-3.63z" /></svg>
                    </span>
                    <input type="color" className="tb-color-input" value={activeFormats.background || '#ffffff'}
                        onChange={(e) => applyFormat('background', e.target.value)} />
                </label>
            </div>

            <div className="toolbar-divider" />

            {/* Alignment */}
            <div className="toolbar-group">
                <button className={`tb-btn ${currentAlign === 'left' || !currentAlign ? 'active' : ''}`} onClick={() => applyFormat('align', false)} title="Align Left">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 3h18v2H3zm0 4h12v2H3zm0 4h18v2H3zm0 4h12v2H3zm0 4h18v2H3z" /></svg>
                </button>
                <button className={`tb-btn ${currentAlign === 'center' ? 'active' : ''}`} onClick={() => applyFormat('align', 'center')} title="Align Center">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 3h18v2H3zm3 4h12v2H6zm-3 4h18v2H3zm3 4h12v2H6zm-3 4h18v2H3z" /></svg>
                </button>
                <button className={`tb-btn ${currentAlign === 'right' ? 'active' : ''}`} onClick={() => applyFormat('align', 'right')} title="Align Right">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 3h18v2H3zm6 4h12v2H9zm-6 4h18v2H3zm6 4h12v2H9zm-6 4h18v2H3z" /></svg>
                </button>
                <button className={`tb-btn ${currentAlign === 'justify' ? 'active' : ''}`} onClick={() => applyFormat('align', 'justify')} title="Justify">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 3h18v2H3zm0 4h18v2H3zm0 4h18v2H3zm0 4h18v2H3zm0 4h18v2H3z" /></svg>
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Lists & Indent */}
            <div className="toolbar-group">
                <button className={`tb-btn ${activeFormats.list === 'bullet' ? 'active' : ''}`} onClick={() => applyFormat('list', activeFormats.list === 'bullet' ? false : 'bullet')} title="Bullet List">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><circle cx="4" cy="6" r="1.5" /><circle cx="4" cy="12" r="1.5" /><circle cx="4" cy="18" r="1.5" /><path d="M8 5h13v2H8zm0 6h13v2H8zm0 6h13v2H8z" /></svg>
                </button>
                <button className={`tb-btn ${activeFormats.list === 'ordered' ? 'active' : ''}`} onClick={() => applyFormat('list', activeFormats.list === 'ordered' ? false : 'ordered')} title="Numbered List">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 4h2v4H4V5H3V4zm0 8.5h1.5v.5H3v1h2v-3H3.5v-.5H5V10H3v2.5zM3 19h2v.5H4v1h1V22H3v-1h1v-.5H3V19zm5-14h13v2H8zm0 6h13v2H8zm0 6h13v2H8z" /></svg>
                </button>
                <button className="tb-btn" onClick={() => applyFormat('indent', '+1')} title="Increase Indent">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 3h18v2H3zm6 4h12v2H9zm-6 4h18v2H3zm6 4h12v2H9zm-6 4h18v2H3zM3 8l4 3-4 3V8z" /></svg>
                </button>
                <button className="tb-btn" onClick={() => applyFormat('indent', '-1')} title="Decrease Indent">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 3h18v2H3zm6 4h12v2H9zm-6 4h18v2H3zm6 4h12v2H9zm-6 4h18v2H3zM7 8v6l-4-3 4-3z" /></svg>
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Clear Formatting */}
            <div className="toolbar-group">
                <button className="tb-btn" onClick={handleClean} title="Clear Formatting">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z" /></svg>
                </button>
            </div>
        </div>

        {/* Row 2: Page & Document controls */}
        <div className="toolbar-row toolbar-row-doc">
            {/* Page Size */}
            <div className="toolbar-group page-controls">
                <div className="page-size-control">
                    <label className="tb-label">Page:</label>
                    <select
                        className="tb-select page-select"
                        value={pageSize}
                        onChange={(e) => setPageSize(e.target.value)}
                    >
                        {Object.entries(PAGE_SIZES).map(([key, val]) => (
                            <option key={key} value={key}>{val.name} ({val.label})</option>
                        ))}
                    </select>
                </div>
                <div className="orientation-control" style={{ marginLeft: '12px' }}>
                    <label className="tb-label">Orientation:</label>
                    <select
                        className="tb-select orientation-select"
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value)}
                    >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                    </select>
                </div>

                {/* Margin Preset */}
                <div className="margin-control">
                    <label className="tb-label">Margins:</label>
                    <select
                        className="tb-select margin-select"
                        value={marginPreset}
                        onChange={(e) => applyMarginPreset(e.target.value)}
                    >
                        {Object.entries(MARGIN_PRESETS).map(([key]) => (
                            <option key={key} value={key}>{key}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="toolbar-spacer" />

            {/* Zoom */}
            <div className="toolbar-group zoom-controls">
                <button
                    className="tb-btn zoom-btn"
                    onClick={() => setZoom(z => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
                    disabled={zoom <= ZOOM_MIN}
                    title="Zoom Out"
                >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
                <span className="zoom-value">{zoom}%</span>
                <button
                    className="tb-btn zoom-btn"
                    onClick={() => setZoom(z => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
                    disabled={zoom >= ZOOM_MAX}
                    title="Zoom In"
                >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
                <input
                    type="range"
                    min={ZOOM_MIN}
                    max={ZOOM_MAX}
                    step={ZOOM_STEP}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="zoom-slider"
                    title="Zoom Level"
                />
            </div>
        </div>
    </div>
));
