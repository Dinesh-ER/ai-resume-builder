import { useState, useRef, useEffect, memo } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./DocChatInterface.css";

function DocChatInterface({ getDocumentText, handleReplaceText, handleReplaceAllText, handleSetMargin, handleSetPaperSize }) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const [userInput, setUserInput] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const chatEndRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, loading]);

    const quickActions = [
        { label: "Draft Proposal", prompt: "Draft a formal project proposal outline with sections for executive summary, scope, and target outcomes." },
        { label: "Fix Grammar", prompt: "Please check my document for grammar, syntax errors, and spelling, and suggest correction blocks." },
        { label: "Summarize", prompt: "Summarize the current document into 3 key takeaways and a conclusion block." },
        { label: "Professional Tone", prompt: "Rewrite the document content to sound highly professional, formal, and authoritative." },
    ];

    const generateSystemPrompt = (docHTML, input) => {
        return `
You are a professional AI Document Assistant and Editor (like a copilot for MS Word or Google Docs).

CURRENT DOCUMENT CONTENT (HTML):
${docHTML}

USER REQUEST:
"${input}"

=================================================
DOCUMENT STRUCTURE RULES:
- When you use <DOCUMENT_REPLACE>, you MUST output standard HTML with rich inline styles (style="...") to create a perfect, highly-styled ATS resume layout!
- The parser supports inline styles for font-size (use px or pt), font-family, font-weight, font-style, text-align, and color.
- Preserve and use the existing font family of the document (e.g., 'Inter', 'Calibri', 'Arial', 'Times New Roman', 'Georgia', etc.). Do not force or normalize the font family to Arial/Times New Roman.
- DO NOT use markdown like **bold** or # Headers inside <DOCUMENT_REPLACE> or <CHANGE>. You must use HTML tags.
- DO NOT output container wrappers like <div data-document> or <div data-page="1"> since the canvas handles pagination and document structure automatically. Just output the inner body elements (p, h1, h2, h3, ul, li, span, br, hr, table, etc.).
- Do not wrap responses in markdown code blocks (\`\`\`).

=================================================
TASK DETECTION & OUTPUT FORMATS:

You must choose EXACTLY ONE response format below depending on what the user wants:

=================================================
AVAILABLE ACTIONS:
1. LOCALIZED TEXT REPLACEMENT (<CHANGE> blocks)
If the user asks to change a specific word, sentence or fix grammar, return a targeted change.
- In <CHANGE> blocks, the <OLD> tag MUST contain ONLY the plain, visible text (do NOT include HTML tags in <OLD>).
- The <NEW> tag in <CHANGE> blocks CAN contain HTML tags with inline styles to format the replacement.
Example:
<CHANGE>
<DESCRIPTION>Update summary styling</DESCRIPTION>
<OLD>Professional Summary</OLD>
<NEW><span style="font-size: 14px; font-weight: bold; font-family: Arial, sans-serif; color: #1a73e8;">Professional Summary</span></NEW>
</CHANGE>

2. ENTIRE DOCUMENT REWRITE OR FORMATTING (<DOCUMENT_REPLACE> blocks)
If the user asks to generate a new document, create a resume, or apply formatting/styling, you MUST rewrite the entire document using rich HTML with inline CSS.
<DOCUMENT_REPLACE>
<h1 style="font-size: 24px; font-family: Arial, sans-serif; font-weight: bold; text-align: center; margin-bottom: 5px;">John Doe</h1>
<p style="font-size: 11px; text-align: center; margin-bottom: 20px;">Email: john@example.com | Phone: 123-456-7890</p>

<h2 style="font-size: 14px; font-family: Arial, sans-serif; font-weight: bold; margin-top: 15px; border-bottom: 1px solid #cccccc; padding-bottom: 3px;">Professional Summary</h2>
<p style="font-size: 12px; margin-bottom: 10px; font-family: Arial, sans-serif;">Experienced software engineer specializing in frontend development...</p>

<h2 style="font-size: 14px; font-family: Arial, sans-serif; font-weight: bold; margin-top: 15px; border-bottom: 1px solid #cccccc; padding-bottom: 3px;">Skills</h2>
<ul style="font-size: 12px; margin-bottom: 10px; font-family: Arial, sans-serif;">
    <li>React, Javascript, CSS</li>
    <li>Node.js, Express</li>
</ul>
</DOCUMENT_REPLACE>

3. GENERAL CONVERSATION (No XML Tags)
If the user is asking a general question, reviewing content, or just chatting, respond normally using clean Markdown. Do NOT include <CHANGE> or <DOCUMENT_REPLACE> tags.

4. MARGIN CHANGES (<SET_MARGIN> blocks)
If the user asks to change or update the document margins (top, right, bottom, left), return:
<SET_MARGIN>top, right, bottom, left</SET_MARGIN>
Example for normal margins: <SET_MARGIN>72, 72, 72, 72</SET_MARGIN>
Example for narrow margins: <SET_MARGIN>36, 36, 36, 36</SET_MARGIN>

5. PAPER SIZE CHANGES (<SET_PAPER_SIZE> blocks)
If the user asks to change the paper or page format (e.g. Letter, A4), return:
<SET_PAPER_SIZE>width, height</SET_PAPER_SIZE>
Example for Letter (8.5x11 inches): <SET_PAPER_SIZE>816, 1056</SET_PAPER_SIZE>
Example for A4: <SET_PAPER_SIZE>794, 1123</SET_PAPER_SIZE>

=================================================
OUTPUT DECISION:
Only return one response type (Normal Markdown, or <CHANGE> tags, or <DOCUMENT_REPLACE> tags, or <SET_MARGIN> tags, or <SET_PAPER_SIZE> tags). Never combine them.
`;
    };

    const handleSendMessage = async (textToSend) => {
        const query = textToSend || userInput;
        if (!query.trim()) return;

        if (!apiKey) {
            setErrorMsg("Missing Gemini API Key. Please add VITE_GEMINI_API_KEY to your .env file.");
            return;
        }

        setErrorMsg("");
        const userMsg = {
            role: "user",
            content: query,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setChatHistory(prev => [...prev, userMsg]);
        if (!textToSend) setUserInput("");
        setLoading(true);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

            const docContent = getDocumentText();
            const systemPrompt = generateSystemPrompt(docContent, query);
            const result = await model.generateContent(systemPrompt);
            const responseText = result.response.text();

            console.log("Gemini doc response:", responseText);

            // Parse change blocks
            const changeMatches = [...responseText.matchAll(/<CHANGE>([\s\S]*?)<\/CHANGE>/g)];
            const parsedChanges = changeMatches.map(match => {
                const block = match[1];
                return {
                    type: "partial",
                    description: block.match(/<DESCRIPTION>([\s\S]*?)<\/DESCRIPTION>/)?.[1]?.trim() || "Update section",
                    oldText: block.match(/<OLD>([\s\S]*?)<\/OLD>/)?.[1]?.trim() || "",
                    newText: block.match(/<NEW>([\s\S]*?)<\/NEW>/)?.[1]?.trim() || "",
                    status: "pending"
                };
            });

            // Parse doc replacement
            const docReplaceMatch = responseText.match(/<DOCUMENT_REPLACE>([\s\S]*?)<\/DOCUMENT_REPLACE>/);
            const documentReplace = docReplaceMatch ? docReplaceMatch[1].trim() : null;

            // Parse margin changes
            const marginMatches = [...responseText.matchAll(/<SET_MARGIN>([\s\S]*?)<\/SET_MARGIN>/g)];
            const marginChanges = marginMatches.map(match => {
                const parts = match[1].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                const marginsArray = parts.length === 4 ? parts : [72, 72, 72, 72];
                return {
                    type: "margin",
                    description: `Change margins to [${marginsArray.join(', ')}]`,
                    margins: marginsArray,
                    status: "pending"
                };
            });

            // Parse paper size changes
            const paperMatches = [...responseText.matchAll(/<SET_PAPER_SIZE>([\s\S]*?)<\/SET_PAPER_SIZE>/g)];
            const paperChanges = paperMatches.map(match => {
                const parts = match[1].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                const sizeArray = parts.length === 2 ? parts : [816, 1056];
                return {
                    type: "paper_size",
                    description: `Change paper size to [${sizeArray.join(', ')}]`,
                    size: sizeArray,
                    status: "pending"
                };
            });

            // Clear XML formatting for text responses
            let explanation = responseText
                .replace(/<CHANGE>[\s\S]*?<\/CHANGE>/g, "")
                .replace(/<DOCUMENT_REPLACE>[\s\S]*?<\/DOCUMENT_REPLACE>/g, "")
                .replace(/<SET_MARGIN>[\s\S]*?<\/SET_MARGIN>/g, "")
                .replace(/<SET_PAPER_SIZE>[\s\S]*?<\/SET_PAPER_SIZE>/g, "")
                .trim();

            const initialChanges = documentReplace
                ? [{
                    type: "document",
                    description: "Rewrite/Generate entire document",
                    oldText: docContent,
                    newText: documentReplace,
                    status: "pending"
                }]
                : [...parsedChanges, ...marginChanges, ...paperChanges];

            const aiMsg = {
                role: "assistant",
                content: explanation || (documentReplace ? "I have drafted the document content for you." : "I proposed some updates below."),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                changes: initialChanges
            };

            setChatHistory(prev => [...prev, aiMsg]);
        } catch (err) {
            console.error(err);
            setErrorMsg("Failed to communicate with AI: " + (err.message || "Unknown error"));
            setChatHistory(prev => [...prev, {
                role: "assistant",
                content: "I ran into an error processing that request. Please try again.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isError: true
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyChange = (msgIdx, cIdx) => {
        const msg = chatHistory[msgIdx];
        const change = msg.changes?.[cIdx];
        if (!change) return;

        let success = false;
        if (change.type === "document") {
            handleReplaceAllText(change.newText);
            success = true;
        } else if (change.type === "margin") {
            if (handleSetMargin) handleSetMargin(change.margins);
            success = true;
        } else if (change.type === "paper_size") {
            if (handleSetPaperSize) handleSetPaperSize(change.size[0], change.size[1]);
            success = true;
        } else {
            success = handleReplaceText(change.oldText, change.newText);
        }

        if (success) {
            setChatHistory(prev => {
                const copy = [...prev];
                copy[msgIdx].changes[cIdx].status = "applied";
                return copy;
            });
        } else {
            alert("Could not automatically locate the old text in the document. It may have been edited.");
        }
    };

    const handleRejectChange = (msgIdx, cIdx) => {
        setChatHistory(prev => {
            const copy = [...prev];
            copy[msgIdx].changes[cIdx].status = "rejected";
            return copy;
        });
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="doc-chat-container">
            <div className="doc-chat-header">
                <h2>🤖 Document Copilot</h2>
                <p>Chat with the AI to write, format, or proofread your report.</p>
            </div>

            <div className="quick-actions-bar">
                {quickActions.map((action, idx) => (
                    <button
                        key={idx}
                        className="action-chip"
                        onClick={() => handleSendMessage(action.prompt)}
                        disabled={loading}
                    >
                        <span>⚡</span> {action.label}
                    </button>
                ))}
            </div>

            <div className="doc-chat-messages">
                {chatHistory.length === 0 && (
                    <div className="welcome-box">
                        <h3>✍️ Welcome to the AI Workspace!</h3>
                        <p>I can edit this document in real-time. Try asking me to:</p>
                        <ul>
                            <li>"Draft a project scope document"</li>
                            <li>"Change the title to 'Annual Sales Report'"</li>
                            <li>"Rewrite the introduction paragraph to be more professional"</li>
                            <li>"Summarize the entire document into bullet points"</li>
                        </ul>
                    </div>
                )}

                {chatHistory.map((msg, msgIdx) => (
                    <div key={msgIdx} className={`chat-msg ${msg.role}`}>
                        <div className="msg-header">
                            <span>{msg.role === "user" ? "👤 You" : "🤖 Assistant"}</span>
                            <span>{msg.timestamp}</span>
                        </div>
                        <div className="msg-body" dangerouslySetInnerHTML={{
                            __html: msg.content
                                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                                .replace(/\n/g, "<br/>")
                        }} />

                        {msg.changes && msg.changes.map((change, cIdx) => (
                            <div key={cIdx} className="change-proposal-card">
                                <div className="proposal-header">
                                    📝 Proposed: {change.description}
                                </div>
                                {change.type === "margin" ? (
                                    <div className="proposal-diff-view">
                                        <div className="diff-section">
                                            <div className="diff-label new">New Margins</div>
                                            <div className="diff-content new">[Top, Right, Bottom, Left]: {change.margins.join(', ')}</div>
                                        </div>
                                    </div>
                                ) : change.type === "paper_size" ? (
                                    <div className="proposal-diff-view">
                                        <div className="diff-section">
                                            <div className="diff-label new">New Paper Size</div>
                                            <div className="diff-content new">[Width, Height]: {change.size.join(', ')}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="proposal-diff-view">
                                        {change.oldText && (
                                            <div className="diff-section">
                                                <div className="diff-label old">Original</div>
                                                <div className="diff-content old" dangerouslySetInnerHTML={{ __html: change.oldText }} />
                                            </div>
                                        )}
                                        <div className="diff-section">
                                            <div className="diff-label new">Replacement</div>
                                            <div className="diff-content new" dangerouslySetInnerHTML={{ __html: change.newText }} />
                                        </div>
                                    </div>
                                )}
                                {change.status === "pending" ? (
                                    <div className="proposal-actions">
                                        <button className="proposal-btn accept" onClick={() => handleApplyChange(msgIdx, cIdx)}>
                                            Accept Change
                                        </button>
                                        <button className="proposal-btn reject" onClick={() => handleRejectChange(msgIdx, cIdx)}>
                                            Reject
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`proposal-status ${change.status}`}>
                                        {change.status === "applied" ? "✓ Applied" : "✗ Rejected"}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}

                {loading && (
                    <div className="chat-msg assistant">
                        <div className="msg-header">🤖 Assistant thinking...</div>
                        <div className="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            <div className="doc-chat-input-wrapper">
                <div className="chat-input-box">
                    <textarea
                        className="chat-textarea"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type an instruction (e.g. 'Draft a cover letter')..."
                        disabled={loading}
                        rows="2"
                    />
                    <button
                        className="chat-send-btn"
                        onClick={() => handleSendMessage()}
                        disabled={loading || !userInput.trim()}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>
                {errorMsg && <div className="chat-error-msg">{errorMsg}</div>}
            </div>
        </div>
    );
}

export default memo(DocChatInterface);
