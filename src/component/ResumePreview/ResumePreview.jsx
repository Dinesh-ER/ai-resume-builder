import { useContext, useRef, useEffect, useMemo, memo } from "react";
import { ResumeContext } from "../../context/ResumeContent.jsx";
import ReactQuill, { Quill } from "react-quill-new";
import EditorToolbar from "./EditorToolbar.jsx";
import EditorStatusBar from "./EditorStatusBar.jsx";
import usePagination from "../../hooks/usePagination.js";
import usePrint from "../../hooks/usePrint.js";
import { PAGE_SIZES, FONT_FAMILIES, mmToPx } from "../../utils/pageConstants.js";
import "./ResumeViewer.css";

/* ──────────────────────────────────────────────
   Register custom Quill fonts so the toolbar
   font-family selector actually works.
   ────────────────────────────────────────────── */
const FontStyle = Quill.import("attributors/style/font");
FontStyle.whitelist = FONT_FAMILIES;
Quill.register(FontStyle, true);

const SizeStyle = Quill.import("attributors/style/size");
SizeStyle.whitelist = [
    "8px", "9px", "10px", "11px", "12px", "14px", "16px", "18px",
    "20px", "22px", "24px", "28px", "32px", "36px", "42px", "48px", "56px", "64px", "72px",
];
Quill.register(SizeStyle, true);

/* ──────────────────────────────────────────────
   Memoized Editor to prevent performance hangs on selection changes
   ────────────────────────────────────────────── */
const QuillEditor = memo(({ value, onChange, modules, formats, quillRef }) => (
    <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        className="resume-quill-editor"

    />
));

function ResumePreview() {
    const {
        resumeHTML, setResumeHTML,
        pageSize: pageSizeName,
        zoom,
        margins,
    } = useContext(ResumeContext);

    const quillRef = useRef(null);
    const pageContainerRef = useRef(null);

    /* Quill modules — hide the built-in toolbar, enable history */
    const modules = useMemo(() => ({
        toolbar: false,
        history: { delay: 1000, maxStack: 100, userOnly: true },
    }), []);

    const formats = useMemo(() => [
        'header', 'font', 'size',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'indent',
        'color', 'background',
        'align',
        'link', 'image',
        'clean',
    ], []);

    /* Pagination hook */
    const { pageCount, wordCount, charCount, recalculate } = usePagination({
        quillRef,
        pageSizeName,
        margins,
        zoom,
    });

    /* Print hook */
    const { handlePrint } = usePrint(pageSizeName, margins);

    /* Recalculate when content changes */
    useEffect(() => {
        if (!resumeHTML || typeof recalculate !== 'function') return;

        // Increased debounce to 1 second to ensure typing is smooth
        // and the main thread isn't blocked by DOM measurements.
        const timer = setTimeout(() => {
            console.log("[ResumePreview] Recalculating pagination...");
            recalculate();
        }, 1000);

        return () => clearTimeout(timer);
    }, [resumeHTML, pageSizeName, JSON.stringify(margins)]);

    /* Dynamic CSS custom properties for page dimensions */
    const currentPage = PAGE_SIZES[pageSizeName] || PAGE_SIZES.A4;
    const pageWidthPx = mmToPx(currentPage.width);
    const pageHeightPx = mmToPx(currentPage.height);

    // Safety cap: Prevents memory crashes if a layout loop starts.
    const safePageCount = useMemo(() => Math.min(Math.max(pageCount || 1, 1), 25), [pageCount]);

    const editorStyle = useMemo(() => ({
        '--page-width': `${pageWidthPx}px`,
        '--page-height': `${pageHeightPx}px`,
        '--margin-top': `${mmToPx(margins.top)}px`,
        '--margin-right': `${mmToPx(margins.right)}px`,
        '--margin-bottom': `${mmToPx(margins.bottom)}px`,
        '--margin-left': `${mmToPx(margins.left)}px`,
        '--zoom': zoom / 100,
        // Fixed paper minimum height based on one page, allow content to grow naturally
        '--paper-min-height': `${pageHeightPx}px`,
    }), [pageWidthPx, pageHeightPx, JSON.stringify(margins), zoom]);

    // Memoize page labels to prevent re-rendering them on every keystroke
    const pageLabels = useMemo(() => (
        <div className="page-labels-container no-print">
            {Array.from({ length: safePageCount }).map((_, i) => (
                <div
                    key={i}
                    className="page-number-label"
                    style={{ top: `${i * pageHeightPx + (pageHeightPx / 2)}px` }}
                >
                    {i + 1}
                </div>
            ))}
        </div>
    ), [safePageCount, pageHeightPx]);

    // Word doc look: Single continuous surface with visual pagination via CSS
    return (
        <div className="resume-editor-container" style={editorStyle}>
            {/* Custom Toolbar */}
            <EditorToolbar quillRef={quillRef} />

            {/* Editor Area */}
            <div className="editor-scroll-area" ref={pageContainerRef}>
                <div className="editor-zoom-wrapper" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
                    <div className="editor-paper">
                        {/* Page number labels */}
                        {pageLabels}

                        {/* Quill Editor */}
                        <QuillEditor
                            quillRef={quillRef}
                            value={resumeHTML}
                            onChange={setResumeHTML}
                            modules={modules}
                            formats={formats}
                        />
                    </div>
                </div>
            </div>

            {/* Action bar above status bar */}
            <div className="editor-action-bar no-print">
                <button className="action-print-btn" onClick={handlePrint} title="Print / Save as PDF">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Print / PDF
                </button>
            </div>

            {/* Status Bar */}
            <EditorStatusBar
                pageCount={safePageCount}
                wordCount={wordCount}
                charCount={charCount}
                zoom={zoom}
                pageSizeName={pageSizeName}
            />
        </div>
    );
}

export default ResumePreview;