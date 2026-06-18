import { useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ResumeContext } from "../context/ResumeContent.jsx";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./Home.css";
import { pdfExtractorPrompt } from '../component/ChatEditor/prompt.jsx'
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import { useAuth } from "../context/AuthContext.jsx";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const extractPdfText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer
    }).promise;

    if (pdf.numPages > 5) {
        alert("File is too large, max 5 pages allowed");
        return null;
    }

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        // Group items by line (y-coordinate)
        const linesMap = [];
        content.items.forEach(item => {
            if (!item.str || item.str.trim() === '') return;

            const transform = item.transform; // [scaleX, skewY, skewX, scaleY, transformX, transformY]
            const fontSize = Math.round(transform[3]);
            const x = transform[4];
            const y = transform[5];

            const fontObj = content.styles[item.fontName] || {};
            const fontFamily = fontObj.fontFamily || "sans-serif";

            const lowerFamily = fontFamily.toLowerCase();
            const isBold = lowerFamily.includes("bold") || !!fontObj.bold;
            const isItalic = lowerFamily.includes("italic") || lowerFamily.includes("oblique") || !!fontObj.italic;

            // Find a line that is very close vertically
            let line = linesMap.find(l => Math.abs(l.y - y) < 5);
            if (!line) {
                line = { y, items: [] };
                linesMap.push(line);
            }

            line.items.push({
                x,
                text: item.str,
                fontSize,
                fontFamily,
                isBold,
                isItalic
            });
        });

        // Sort lines from top to bottom (descending Y)
        linesMap.sort((a, b) => b.y - a.y);

        let pageText = `--- PAGE ${i} ---\n`;

        linesMap.forEach(line => {
            // Sort items in the line from left to right (ascending X)
            line.items.sort((a, b) => a.x - b.x);

            // Merge items with identical style
            const mergedItems = [];
            line.items.forEach(item => {
                const prev = mergedItems[mergedItems.length - 1];
                if (prev &&
                    prev.fontSize === item.fontSize &&
                    prev.fontFamily === item.fontFamily &&
                    prev.isBold === item.isBold &&
                    prev.isItalic === item.isItalic
                ) {
                    prev.text += " " + item.text;
                } else {
                    mergedItems.push({ ...item });
                }
            });

            let lineStr = "";
            mergedItems.forEach(item => {
                lineStr += `<span font-family="${item.fontFamily}" font-size="${item.fontSize}pt" bold="${item.isBold}" italic="${item.isItalic}">${item.text}</span> `;
            });

            if (lineStr.trim()) {
                pageText += lineStr.trim() + "\n";
            }
        });

        text += pageText + "\n";
    }

    console.log('pageCount', pdf.numPages);
    return {
        text,
        pageCount: pdf.numPages
    };
};

const extractDocxText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const htmlResult = await mammoth.convertToHtml({
        arrayBuffer
    });
    const textResult = await mammoth.extractRawText({
        arrayBuffer
    });

    const len = Math.ceil(textResult.value.length / 1500) || 1;

    if (len > 5) {
        alert("File is too large, max 5 pages allowed");
        return null;
    }

    console.log('pageCount',
        JSON.stringify(htmlResult.value),
        len
    )

    return {
        text: htmlResult.value,
        pageCount: len
    };
};

function Home() {
    const navigate = useNavigate();
    const { setResumeHTML, setDocumentTitle } = useContext(ResumeContext);
    const { user, logout } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [mode, setMode] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    useEffect(() => {
        document.title = "AI Resume Builder";

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleFresh = () => {
        setDocumentTitle('My Resume');
        navigate("/builder");
        setResumeHTML(`<div
    data-document
    style="
        font-family: Arial;
    "
>
    <div
        data-page="1"
        style="
            width:210mm;
            height:297mm;
            background:white;
            padding:24px 24px;
            box-sizing:border-box;
            overflow:hidden;
        "
    >
        <h1>AI Resume Builder</h1>
        <p>Start conversation with AI to build resume</p>
    </div>
</div>`);
    };

    const handleFile = async (e) => {
        const file = e.target.files?.[0];

        if (!file) return;

        setLoading(true);
        setError("");

        try {
            let content = "";

            const fileName = file.name.toLowerCase();
            let pages = 1;
            if (fileName.endsWith(".pdf")) {
                const { text, pageCount } = await extractPdfText(file);
                content = text;
                pages = pageCount;
            }
            else if (fileName.endsWith(".docx")) {
                const { text, pageCount } = await extractDocxText(file);
                content = text;
                pages = pageCount;
            }
            else if (fileName.endsWith(".txt")) {
                content = await file.text();
                pages = 0;
            }
            else {
                alert("Please select a PDF, DOCX or TXT file.");
                setLoading(false);
                return;
            }

            if (!apiKey) {
                alert("Please set your VITE_GEMINI_API_KEY in the .env file.");
                setLoading(false);
                return;
            }

            if (!content) {
                setLoading(false);
                return;
            }

            const genAI = new GoogleGenerativeAI(apiKey);

            const model = genAI.getGenerativeModel({
                model: "gemini-3.1-flash-lite"
            });
            console.log("pdfExtractorPrompt===>> Pages",

            )
            const prompt = pdfExtractorPrompt({ content, pages });

            const result = await model.generateContent(prompt);

            const responseText = result.response.text();

            const cleanHtml = responseText
                .replace(/```html/gi, "")
                .replace(/```/g, "")
                .trim();

            const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            setDocumentTitle(nameWithoutExt);
            setResumeHTML(cleanHtml);
            navigate("/builder");
        }
        catch (err) {
            console.error(err);

            setError(
                err.message || "Failed to process file."
            );
        }
        finally {
            setLoading(false);

            e.target.value = "";
        }
    };

    return (
        <div className="home-page">
            <nav className="home-nav">
                <div className="nav-brand">📝 ResumeAI</div>
                {user && (
                    <div className="nav-user-container">
                        <div className="user-profile-menu" ref={dropdownRef}>
                            <button
                                className="profile-avatar-btn"
                                onClick={() => setShowDropdown(!showDropdown)}
                                aria-label="Toggle profile menu"
                            >
                                <img
                                    src={user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.displayName}`}
                                    alt={user.displayName || "User"}
                                    className="user-avatar"
                                />
                            </button>
                            {showDropdown && (
                                <div className="profile-dropdown">
                                    <div className="dropdown-header">
                                        <div className="dropdown-name">{user.displayName}</div>
                                        <div className="dropdown-email">{user.email}</div>
                                    </div>
                                    <button
                                        className="dropdown-btn"
                                        onClick={() => {
                                            logout();
                                            setShowDropdown(false);
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                                        </svg>
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>
            <main className="home-main">
                <div className="home-hero">
                    <div className="hero-badge">✨ AI-Powered</div>
                    <h1>Build Your Perfect Resume</h1>
                    <p className="hero-subtitle">
                        Create, edit, and customize your resume with the power of AI.
                        Just chat with our assistant and watch your resume transform in real-time.
                    </p>
                </div>

                <div className="home-cards">
                    <button
                        className={`home-card ${mode === 'fresh' ? 'active' : ''}`}
                        onClick={handleFresh}
                        disabled={loading}
                    >
                        <div className="card-icon">🚀</div>
                        <div className="card-content">
                            <h3>Start Fresh</h3>
                            <p>Begin with a professionally designed template and customize it with AI chat.</p>
                        </div>
                        <div className="card-arrow">→</div>
                    </button>

                    <label className={`home-card upload-card ${loading ? 'loading' : ''}`}>
                        <div className="card-icon">📄</div>
                        <div className="card-content">
                            <h3>Upload Resume</h3>
                            <p>Import an existing resume PDF and let AI parse and enhance it.</p>
                        </div>
                        <input
                            type="file"
                            accept=".pdf,.docx,.txt"
                            onChange={handleFile}
                            disabled={loading}
                            hidden
                        />
                        {loading ? (
                            <div className="card-loading">⏳</div>
                        ) : (
                            <div className="card-arrow">→</div>
                        )}
                    </label>


                </div>

                {loading && (
                    <div className="home-loading">
                        <div className="loading-spinner"></div>
                        <p>Processing your resume...</p>
                    </div>
                )}

                {error && <div className="home-error">{error}</div>}

                <div className="home-features">
                    <div className="feature">
                        <span className="feature-icon">💬</span>
                        <h4>Chat-Based Editing</h4>
                        <p>Just tell our AI what to change, preview changes, and approve them.</p>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">🎨</span>
                        <h4>Smart Formatting</h4>
                        <p>Clean, professional layouts that adapt to your content.</p>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">📱</span>
                        <h4>Responsive Design</h4>
                        <p>Works perfectly on desktop, tablet, and mobile devices.</p>
                    </div>
                </div>
            </main>
            <footer className="home-footer">
                <div className="footer-content">
                    <div className="footer-left">
                        <p>© 2026 ResumeAI. Created by <strong>Dinesh Kumar</strong>. All Rights Reserved.</p>
                    </div>
                    <div className="footer-right">
                        <a href="https://linkedin.com/in/dineshkumare" target="_blank" rel="noopener noreferrer" className="footer-link">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                            </svg>
                            LinkedIn
                        </a>
                        <a href="https://dineshkumarportfolio2026.vercel.app/" target="_blank" rel="noopener noreferrer" className="footer-link">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="2" y1="12" x2="22" y2="12" />
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                            Portfolio
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Home;