import { useContext, useEffect, useState, useTransition, memo } from "react";
import { useNavigate } from "react-router-dom";
import { ResumeContext } from "../context/ResumeContent.jsx";
import ResumePreview from "../component/ResumePreview/ResumePreview.jsx";
import ResumeViewer from "../component/ResumePreview/ResumeViewer.jsx";
import ChatInterface from "../component/ChatEditor/ChatInterface.jsx";
import "../styles/Builder.css";

// Isolated Document Title to prevent re-rendering the entire layout on every keystroke
const DocumentTitleInput = memo(() => {
    const { documentTitle, setDocumentTitle } = useContext(ResumeContext);

    return (
        <div className="doc-title-wrapper">
            <input
                type="text"
                className="doc-title-input"
                maxLength={50}
                value={documentTitle}
                onChange={(e) =>
                    setDocumentTitle(e.target.value || '')
                }
                placeholder="Untitled Document"
                spellCheck={false}
            />
        </div>
    );
});

function Builder() {
    const navigate = useNavigate();
    const { documentTitle } = useContext(ResumeContext);

    /* Keyboard shortcuts */
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+P → Print
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                const trimmed = (documentTitle || '').trim();
                document.title = trimmed || 'Untitled Resume';
                window.print();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="builder-page">
            {/* Top Navigation */}
            <nav className="builder-nav no-print">
                <div className="nav-left">
                    <button className="nav-back-btn" onClick={() => navigate("/")} title="Back to Home">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="nav-brand-mini">
                        <span className="brand-icon">📝</span>
                        <span className="brand-text">ResumeAI</span>
                    </div>
                </div>

                <div className="nav-center">
                    <DocumentTitleInput />
                </div>

                <div className="nav-right">
                    <div className="nav-status">
                        <span className="status-dot" />
                        <span className="status-text">Editing</span>
                    </div>
                </div>
            </nav>

            {/* Main Layout */}
            <div className="builder-layout">
                <div className="left-pane">
                    <ResumeViewer />
                </div>
                <div className="right-pane no-print">
                    <ChatInterface />
                </div>
            </div>
        </div>
    );
}

export default Builder;
