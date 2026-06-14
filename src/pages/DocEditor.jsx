import { useState, useRef, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ResumeContext } from "../context/ResumeContent.jsx";
import Editor from '@hufe921/canvas-editor';
import DocChatInterface from "../component/DocChat/DocChatInterface.jsx";
import { parseHTMLToElements } from "../utils/htmlParser.js";
import "./DocEditor.css";

function DocEditor() {
    const navigate = useNavigate();
    const { resumeHTML } = useContext(ResumeContext);

    console.log(resumeHTML)
    const editorRef = useRef(null);
    const instanceRef = useRef(null);

    const [docTitle, setDocTitle] = useState("Resume");

    // Initialize the canvas editor
    useEffect(() => {
        const currentContainer = editorRef.current;
        const preventContextMenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        if (currentContainer && !instanceRef.current) {
            let initialData = [];
            if (resumeHTML) {
                try {
                    // Provide a default width of 650 for initial parsing (800 - margins)
                    initialData = parseHTMLToElements(resumeHTML, 650);
                } catch (e) {
                    console.error("Failed to parse initial resumeHTML", e);
                }
            }

            if (!initialData || initialData.length === 0) {
                initialData = [
                    { value: "PROJECT IMPLEMENTATION PROPOSAL", size: 22, bold: true },
                    { value: "\n\n" },
                    { value: "1. Background", size: 13, bold: true },
                    { value: "\n" },
                    { value: "This document outlines the proposal to build a web-based document workspace. The workspace integrates visual page dividers, dynamic pagination, and an interactive AI copilot sidebar designed to read and edit document sections programmatically." },
                    { value: "\n\n" },
                    { value: "2. Core Project Objectives", size: 13, bold: true },
                    { value: "\n" },
                    { value: "- Establish a split-pane interface with responsive panels." },
                    { value: "\n" },
                    { value: "- Render visual page guides calculating character bounds and margins." },
                    { value: "\n" },
                    { value: "- Support natural language document edits (drafting, summarization, proofreading)." },
                    { value: "\n\n" },
                    { value: "3. Integration Approach", size: 13, bold: true },
                    { value: "\n" },
                    { value: "By combining rich text states with Large Language Model API payloads, changes are proposed as targeted insertions and replacements, showing a live comparison before application." },
                    { value: "\n" }
                ];
            }

            let baseFont = 'Inter';
            if (resumeHTML) {
                const match = resumeHTML.match(/font-family:\s*['"]?([^'";,]+)/i);
                if (match && match[1]) {
                    baseFont = match[1].trim();
                }
            }

            instanceRef.current = new Editor(
                currentContainer,
                {
                    main: initialData,
                },
                {
                    width: 794,
                    height: 1123,
                    margins: [72, 72, 72, 72],
                    pageMode: 'paging',
                    pageGap: 20,
                    marginIndicatorSize: 0,
                    pageIndicatorSize: 0,
                    pageNumber: {
                        disabled: true
                    },
                    defaultFont: baseFont
                }
            );

            // Set locale to English to prevent Japanese/Chinese right-click menu and formatting UI
            try {
                instanceRef.current.command.executeSetLocale('en');
            } catch (localeErr) {
                console.error("Failed to set English locale for canvas-editor:", localeErr);
            }

            // Disable custom and native context menu inside the editor container by intercepting at capture phase
            currentContainer.addEventListener('contextmenu', preventContextMenu, true);
        }

        return () => {
            if (instanceRef.current) {
                instanceRef.current.destroy();
                instanceRef.current = null;
            }
            if (currentContainer) {
                currentContainer.removeEventListener('contextmenu', preventContextMenu, true);
            }
        };
    }, []);

    // Retrieve active text
    const getDocumentText = useCallback(() => {
        if (instanceRef.current) {
            const textResult = instanceRef.current.command.getText();
            // getText() might return { header, main, footer } or just a string
            if (typeof textResult === "object" && textResult !== null) {
                return textResult.main || "";
            }
            return textResult || "";
        }
        return "";
    }, []);

    // Retrieve active HTML
    const getDocumentHTML = useCallback(() => {
        if (instanceRef.current) {
            try {
                const htmlResult = instanceRef.current.command.getHTML();
                if (htmlResult && typeof htmlResult === "object" && htmlResult !== null) {
                    return htmlResult.main || "";
                }
                return htmlResult || "";
            } catch (e) {
                console.error("Failed to get HTML from editor:", e);
            }
        }
        return "";
    }, []);

    // Perform full document rewrite
    const handleReplaceAllText = useCallback((newText) => {
        if (instanceRef.current) {
            let elements = [];
            console.log("handleReplaceAllText: Parsing text of length", newText.length);

            // Check if there are HTML tags in the text
            const hasHTML = /<[a-z][\s\S]*>/i.test(newText);

            if (hasHTML) {
                try {
                    // Try to parse HTML into canvas-editor elements using our custom parser
                    let innerWidth = 650;
                    try {
                        const options = instanceRef.current.command.getOptions();
                        innerWidth = options.width - options.margins[1] - options.margins[3];
                    } catch (e) {
                        console.error("Failed to compute innerWidth, using default 650:", e);
                    }
                    console.log("Parsing HTML with innerWidth:", innerWidth);
                    elements = parseHTMLToElements(newText, innerWidth);
                    console.log("Successfully parsed elements. Count:", elements?.length);
                } catch (err) {
                    console.error("Failed to parse HTML to canvas elements:", err);
                }
            }

            // Fallback: If no elements generated or not HTML, parse as plain text
            if (!elements || elements.length === 0) {
                console.log("Falling back to plain text parsing");
                let plainText = newText;
                if (hasHTML) {
                    const tempDiv = document.createElement("div");
                    tempDiv.innerHTML = newText;
                    plainText = tempDiv.textContent || tempDiv.innerText || "";
                }

                const lines = plainText.split("\n");
                lines.forEach((line, index) => {
                    if (line) elements.push({ value: line });
                    if (index < lines.length - 1) elements.push({ value: '\n' });
                });
            }

            try {
                const command = instanceRef.current.command;
                command.executeSelectAll();
                command.executeBackspace();
                console.log("Inserting elements list...");
                command.executeInsertElementList(elements);
                console.log("Done inserting elements.");
            } catch (err) {
                console.error("CRITICAL: Failed to insert elements into editor:", err);
                // Last-ditch fallback: try to insert plain text elements
                try {
                    const command = instanceRef.current.command;
                    command.executeSelectAll();
                    command.executeBackspace();

                    let plainText = newText;
                    if (hasHTML) {
                        const tempDiv = document.createElement("div");
                        tempDiv.innerHTML = newText;
                        plainText = tempDiv.textContent || tempDiv.innerText || "";
                    }
                    const fallbackElements = [];
                    const lines = plainText.split("\n");
                    lines.forEach((line, index) => {
                        if (line) fallbackElements.push({ value: line });
                        if (index < lines.length - 1) fallbackElements.push({ value: '\n' });
                    });
                    command.executeInsertElementList(fallbackElements);
                } catch (fallbackErr) {
                    console.error("Double fallback failed:", fallbackErr);
                }
            }
        }
    }, []);

    // Perform partial replace supporting HTML replacement in search ranges
    const handleReplaceText = useCallback((oldText, newText) => {
        if (instanceRef.current) {
            const command = instanceRef.current.command;
            try {
                // Find matching ranges in the document
                const ranges = command.getKeywordRangeList(oldText);
                if (ranges && ranges.length > 0) {
                    const range = ranges[0];
                    const { startIndex, endIndex } = range;
                    console.log(`handleReplaceText: Found match for "${oldText}" at range [${startIndex}, ${endIndex}]`);

                    // Set selection range to this match (including the first character, startIndex - 1)
                    command.executeSetRange(startIndex - 1, endIndex);

                    const hasHTML = /<[a-z][\s\S]*>/i.test(newText);
                    let elements = [];

                    if (hasHTML) {
                        let innerWidth = 650;
                        try {
                            const options = command.getOptions();
                            innerWidth = options.width - options.margins[1] - options.margins[3];
                        } catch (e) { }
                        elements = parseHTMLToElements(newText, innerWidth);
                    }

                    if (!elements || elements.length === 0) {
                        // Insert as plain text if no elements parsed
                        let plainText = newText;
                        if (hasHTML) {
                            const tempDiv = document.createElement("div");
                            tempDiv.innerHTML = newText;
                            plainText = tempDiv.textContent || tempDiv.innerText || "";
                        }
                        command.executeReplace(plainText);
                    } else {
                        // Replace the selected content by deleting and inserting elements
                        command.executeBackspace();
                        command.executeInsertElementList(elements);
                    }
                    return true;
                }
            } catch (e) {
                console.error("Custom partial replace failed, falling back to native replace:", e);
            }

            // Fallback: standard search-and-replace
            const fullText = getDocumentText();
            if (fullText.includes(oldText)) {
                try {
                    command.executeSearch(oldText);
                    command.executeReplace(newText);
                    command.executeSearch(null); // Clear search highlights
                } catch (e) {
                    console.error("Native replace failed, using full rewrite fallback", e);
                    const updatedText = fullText.replace(oldText, newText);
                    handleReplaceAllText(updatedText);
                }
                return true;
            }
            return false;
        }
    }, [getDocumentText, handleReplaceAllText]);

    // Change Document Margins
    const handleSetMargin = useCallback((marginsArray) => {
        if (instanceRef.current) {
            try {
                instanceRef.current.command.executeSetPaperMargin(marginsArray);
            } catch (err) {
                console.error("Failed to set margin:", err);
            }
        }
    }, []);

    // Change Paper Size
    const handleSetPaperSize = useCallback((width, height) => {
        if (instanceRef.current) {
            try {
                instanceRef.current.command.executePaperSize(width, height);
            } catch (err) {
                console.error("Failed to set paper size:", err);
            }
        }
    }, []);

    return (
        <div className="doc-editor-page">
            {/* Top Navigation */}
            <nav className="doc-editor-nav">
                <div className="nav-left">
                    <button className="nav-back-btn" onClick={() => navigate("/")} title="Back to Home">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="nav-brand-mini">
                        <span className="brand-icon">📝</span>
                        <span className="brand-text">AI DocWorkspace</span>
                    </div>
                    <div className="doc-title-wrapper">
                        <input
                            type="text"
                            className="doc-title-input"
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                            placeholder="Untitled Document"
                            maxLength={40}
                        />
                    </div>
                </div>
            </nav>

            {/* Split screen content layout */}
            <div className="doc-editor-layout">
                {/* Left Panel */}
                <div className="left-pane">
                    <div className="doc-editor-desktop">
                        <div className="editor-instruction-banner" style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px' }}>
                            <button className="action-btn download-btn" onClick={() => instanceRef.current?.command.executePrint()}>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Download PDF
                            </button>
                        </div>

                        <div className="canvas-editor-container">
                            <div className="canvas-editor" ref={editorRef}></div>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="right-pane">
                    <DocChatInterface
                        getDocumentText={getDocumentHTML}
                        handleReplaceText={handleReplaceText}
                        handleReplaceAllText={handleReplaceAllText}
                        handleSetMargin={handleSetMargin}
                        handleSetPaperSize={handleSetPaperSize}
                    />
                </div>
            </div>
        </div>
    );
}

export default DocEditor;
