import './EditorStatusBar.css';

/**
 * Bottom status bar showing page info, word count, and stats.
 */
export default function EditorStatusBar({ pageCount, wordCount, charCount, zoom, pageSizeName }) {
    return (
        <div className="editor-status-bar">
            <div className="status-left">
                <span className="status-item">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/></svg>
                    Page {pageCount > 0 ? `1–${pageCount}` : '1'} of {pageCount}
                </span>
                <span className="status-divider">|</span>
                <span className="status-item">{pageSizeName}</span>
            </div>
            <div className="status-right">
                <span className="status-item">
                    {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
                </span>
                <span className="status-divider">|</span>
                <span className="status-item">
                    {charCount.toLocaleString()} chars
                </span>
                <span className="status-divider">|</span>
                <span className="status-item">
                    {zoom}% zoom
                </span>
            </div>
        </div>
    );
}
