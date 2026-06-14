import { useContext, useState, useRef, useEffect, useTransition, memo } from "react";
import { ResumeContext } from "../../context/ResumeContent.jsx";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./ChatInterface.scss";
import { getPromt } from './prompt.jsx'

const BotIcon = ({ className }) => (
    <svg
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M15 13v2" />
        <path d="M9 13v2" />
    </svg>
);

const UserIcon = ({ className }) => (
    <svg
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const RetryIcon = ({ className }) => (
    <svg
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
    </svg>
);

const ExpandIcon = ({ onClick }) => (
    <svg
        onClick={onClick}
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
    >
        <path d="M8 3H3v5" />
        <path d="M21 8V3h-5" />
        <path d="M3 16v5h5" />
        <path d="M16 21h5v-5" />
    </svg>
);

const CloseIcon = () => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

function ChatInterface() {
    const { resumeHTML, setResumeHTML, chatHistory, setChatHistory, pageSize, setPageSize, orientation, setOrientation } = useContext(ResumeContext);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const [userInput, setUserInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const chatEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, loading]);

    const handleSendMessage = async () => {
        if (!apiKey) {
            alert("Please set your VITE_GEMINI_API_KEY in the .env file.");
            return;
        }
        if (!userInput.trim()) return;

        const userMessage = {
            role: "user",
            content: userInput,
            timestamp: new Date().toLocaleTimeString()
        };

        // Add user message to chat
        startTransition(() => {
            setChatHistory(prev => [...prev, userMessage]);
        });
        setUserInput("");
        setLoading(true);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

            const systemPrompt = getPromt({ resumeHTML, userInput });

            const result = await model.generateContent(systemPrompt);
            const responseText = result.response.text();

            console.log("AI RESPONSE:", responseText);

            // ====================================
            // CHANGE BLOCKS
            // ====================================

            const changeMatches = [
                ...responseText.matchAll(
                    /<CHANGE>([\s\S]*?)<\/CHANGE>/g
                )
            ];

            const parsedChanges = changeMatches.map(match => {
                const block = match[1];

                return {
                    type: "html",

                    description:
                        block.match(
                            /<DESCRIPTION>([\s\S]*?)<\/DESCRIPTION>/
                        )?.[1]?.trim() || "Update",

                    oldHTML:
                        block.match(
                            /<OLD>([\s\S]*?)<\/OLD>/
                        )?.[1]?.trim() || "",

                    newHTML:
                        block.match(
                            /<NEW>([\s\S]*?)<\/NEW>/
                        )?.[1]?.trim() || "",

                    status: "pending"
                };
            });

            // ====================================
            // DOCUMENT REPLACE
            // ====================================

            const documentReplaceMatch =
                responseText.match(
                    /<DOCUMENT_REPLACE>([\s\S]*?)<\/DOCUMENT_REPLACE>/
                );

            const documentReplace =
                documentReplaceMatch
                    ? documentReplaceMatch[1].trim()
                    : null;

            // ====================================
            // SETTINGS
            // ====================================

            const settingMatch =
                responseText.match(
                    /<SETTING_CHANGE>([\s\S]*?)<\/SETTING_CHANGE>/
                );

            let settingsChange = null;

            if (settingMatch) {
                const block = settingMatch[1];

                settingsChange = {
                    pageSize:
                        block.match(
                            /<PAGE_SIZE>([\s\S]*?)<\/PAGE_SIZE>/
                        )?.[1]?.trim() || null,

                    orientation:
                        block.match(
                            /<ORIENTATION>([\s\S]*?)<\/ORIENTATION>/
                        )?.[1]?.trim() || null
                };
            }

            // ====================================
            // EXPLANATION
            // ====================================

            const explanation = responseText
                .replace(
                    /<CHANGE>[\s\S]*?<\/CHANGE>/g,
                    ""
                )
                .replace(
                    /<SETTING_CHANGE>[\s\S]*?<\/SETTING_CHANGE>/g,
                    ""
                )
                .replace(
                    /<DOCUMENT_REPLACE>[\s\S]*?<\/DOCUMENT_REPLACE>/g,
                    ""
                )
                .trim();

            // ====================================
            // CHAT MESSAGE
            // ====================================

            const initialChanges = documentReplace
                ? [{
                    type: "document",
                    description: "Complete Resume Update",
                    oldHTML: resumeHTML,
                    newHTML: documentReplace,
                    status: "pending"
                }]
                : parsedChanges;

            if (settingsChange && (settingsChange.pageSize || settingsChange.orientation)) {
                initialChanges.push({
                    type: "setting",
                    description: "Page Layout Settings Change",
                    settings: settingsChange,
                    status: "pending"
                });
            }

            const aiMessage = {
                role: "assistant",
                content:
                    explanation ||
                    (documentReplace
                        ? "Resume generated successfully."
                        : ""),
                timestamp: new Date().toLocaleTimeString(),

                changes: initialChanges,

                settingsChange,

                documentReplace
            };

            startTransition(() => {
                setChatHistory(prev => [
                    ...prev,
                    aiMessage
                ]);
            });
        } catch (error) {
            console.error(error);
            const errorMessage = {
                role: "assistant",
                content: "Sorry, I encountered an error. Please check your API key and try again.",
                timestamp: new Date().toLocaleTimeString(),
                isError: true,
                userInput
            };
            startTransition(() => {
                setChatHistory(prev => [...prev, errorMessage]);
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApplyChange = (messageIndex, changeIndex) => {
        const message = chatHistory[messageIndex];
        const change = message.changes?.[changeIndex];

        if (!change) return;

        if (change.type === "setting") {
            // Page size handling
            if (change.settings?.pageSize) {
                const sizeKey = ["A4", "Letter", "Legal", "A3", "A5"].find(
                    k => k.toLowerCase() === change.settings.pageSize.toLowerCase()
                ) || change.settings.pageSize;
                setPageSize(sizeKey);
            }
            // Orientation handling
            if (change.settings?.orientation) {
                const orient = change.settings.orientation.toLowerCase();
                setOrientation(orient === "landscape" ? "landscape" : "portrait");
            }
            setChatHistory(prev => {
                const copy = [...prev];
                copy[messageIndex].changes[changeIndex].status = "applied";
                return [...copy];
            });
            return;
        }

        if (change.type === "document") {
            setResumeHTML(change.newHTML);

            setChatHistory(prev => {
                const copy = [...prev];
                copy[messageIndex].changes[changeIndex].status = "applied";
                return [...copy];
            });

            return;
        }


        // 1. Update the document HTML
        setResumeHTML(prev => {
            const normalizedPrev = prev.replace(/\s+/g, " ");
            const normalizedOld = change.oldHTML.replace(/\s+/g, " ");
            console.log(
                '......................setResumeHTML......................\n', prev,
                '\n......................normalizedPrev......................\n', normalizedPrev,
                '\n......................normalizedOld......................\n', normalizedOld
            );
            if (normalizedPrev.includes(normalizedOld)) {

                setChatHistory(prev => {
                    const copy = [...prev];
                    copy[messageIndex].changes[changeIndex].status = "applied";
                    return [...copy];
                });

                return prev.replace(
                    change.oldHTML.trim(),
                    change.newHTML.trim()
                );
            }
            return prev;
        });
    };

    const handleRejectChange = (messageIndex, changeIndex) => {
        setChatHistory(prev => {
            const newHistory = [...prev];
            const msg = { ...newHistory[messageIndex], changes: [...newHistory[messageIndex].changes] };
            msg.changes[changeIndex] = { ...msg.changes[changeIndex], status: 'rejected' };
            newHistory[messageIndex] = msg;
            return newHistory;
        });
    };

    const handleRetry = (failedInput) => {
        setUserInput(failedInput);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const [showPreviewModel, setShowPreviewModel] = useState({
        show: false,
        data: null
    })

    console.log('showPreviewModel', showPreviewModel)

    console.log("chatHistory", chatHistory)

    return (
        <div className="chat-interface">
            <div className="chat-header">
                <h2>Resume Assistant</h2>
                <p>Ask me to update your resume!</p>
            </div>

            <div className="chat-messages">
                {chatHistory.length === 0 && (
                    <div className="welcome-message">
                        <h3>👋 Hello! I'm your Resume Assistant</h3>
                        <p>I can help you update your resume. Try asking me to:</p>
                        <ul>
                            <li>Change colors or fonts</li>
                            <li>Add new sections (like Projects or Certifications)</li>
                            <li>Update your experience or skills</li>
                            <li>Rearrange content</li>
                            <li>Improve formatting</li>
                        </ul>
                    </div>
                )}

                {chatHistory.map((message, index) => (
                    <ChatMessage
                        key={`${message.timestamp}-${index}`}
                        message={message}
                        index={index}
                        onApply={handleApplyChange}
                        onReject={handleRejectChange}
                        setShowPreviewModel={setShowPreviewModel}
                        onRetry={handleRetry}
                    />
                ))}

                {loading && (
                    <div className="message assistant">
                        <div className="message-header">
                            <span className="message-role"><BotIcon className="assistant-emoji" /> Assistant</span>
                        </div>
                        <div className="message-content typing">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            <div className="chat-input-container">
                <div className="input-wrapper">
                    <textarea
                        value={userInput}
                        onChange={(e) => {
                            setUserInput(e.target.value)
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask anything..."
                        className="chat-input"
                        rows="1"
                        disabled={loading}
                    />
                    <div className="input-actions">
                        <button
                            onClick={handleSendMessage}
                            disabled={loading || !userInput.trim()}
                            className="send-btn"
                            title="Send message"
                        >
                            {loading ? '⏳' : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>}
                        </button>
                    </div>
                </div>
            </div>

            {showPreviewModel.show && <CustomerModal data={showPreviewModel.data} setShowPreviewModel={setShowPreviewModel} />}
        </div>
    );
}

// Extracted ChatMessage to allow for React.memo optimization
const ChatMessage = memo(({ message, index, onApply, onReject, setShowPreviewModel, onRetry }) => {
    // Simple helper to convert basic Markdown-style bold and lists to HTML
    const formatContent = (text) => {
        if (!text) return "";
        
        let html = text;

        // 1. Headers: ###, ##, #
        html = html.replace(/^(?:###)\s+(.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/^(?:##)\s+(.*?)$/gm, '<h2>$1</h2>');
        html = html.replace(/^(?:#)\s+(.*?)$/gm, '<h1>$1</h1>');

        // 2. Bold: **text**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 3. Italics: *text* or _text_
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');

        // 4. Lists (consecutive bullet points and numbered lists)
        const lines = html.split('\n');
        const processedLines = [];
        let inList = false;
        let inNumberedList = false;

        lines.forEach(line => {
            const trimmed = line.trim();
            const isBullet = /^[*-•]\s+(.*)/.exec(trimmed);
            const isNumbered = /^\d+\.\s+(.*)/.exec(trimmed);

            if (isBullet) {
                if (inNumberedList) {
                    processedLines.push('</ol>');
                    inNumberedList = false;
                }
                if (!inList) {
                    processedLines.push('<ul>');
                    inList = true;
                }
                processedLines.push(`<li>${isBullet[1]}</li>`);
            } else if (isNumbered) {
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                }
                if (!inNumberedList) {
                    processedLines.push('<ol>');
                    inNumberedList = true;
                }
                processedLines.push(`<li>${isNumbered[1]}</li>`);
            } else {
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                }
                if (inNumberedList) {
                    processedLines.push('</ol>');
                    inNumberedList = false;
                }
                processedLines.push(line);
            }
        });

        if (inList) processedLines.push('</ul>');
        if (inNumberedList) processedLines.push('</ol>');

        return processedLines.join('\n');
    };

    const handleExpandOld = (data) => {
        setShowPreviewModel({
            show: true,
            data
        })
    }

    return (
        <div className={`message ${message.role}`}>
            <div className="message-header">
                <span className="message-role">
                    {message.role === 'user' ? (
                        <><UserIcon className="user-emoji" /> You</>
                    ) : (
                        <><BotIcon className="assistant-emoji" /> Assistant</>
                    )}
                </span>
                <span className="message-time">{message.timestamp}</span>
            </div>
            <div
                className="message-content"
                dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
            />

            {message.changes && message.changes.length > 0 && (
                <div className="granular-changes">
                    {message.changes.map((change, cIdx) => (
                        <div key={cIdx} className={`change-item`}>
                            <div className="change-desc">{change.description}</div>
                            {change.type === "setting" ? (
                                <div className="change-setting-details">
                                    {change.settings.pageSize && (
                                        <div><strong>Page Size:</strong> {change.settings.pageSize}</div>
                                    )}
                                    {change.settings.orientation && (
                                        <div><strong>Orientation:</strong> {change.settings.orientation}</div>
                                    )}
                                </div>
                            ) : (
                                <div className="change-comparison">
                                    <div className="comparison-box old">
                                        <span className="comparison-label">Current <ExpandIcon onClick={() => handleExpandOld(change.oldHTML)} /></span>
                                        <div className="page-preview">
                                            <div
                                                dangerouslySetInnerHTML={{
                                                    __html: change.oldHTML
                                                }}

                                            />
                                        </div>
                                    </div>
                                    <div className="comparison-box new">
                                        <span className="comparison-label">Proposed <ExpandIcon onClick={() => handleExpandOld(change.newHTML)} /></span>
                                        <div className="page-preview">
                                            <div
                                                dangerouslySetInnerHTML={{
                                                    __html: change.newHTML
                                                }}

                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {change.status === 'pending' ? (
                                <div className="change-actions-mini">
                                    <button onClick={() => onApply(index, cIdx)} className="mini-btn approve-btn">Accept</button>
                                    <button onClick={() => onReject(index, cIdx)} className="mini-btn reject-btn">Reject</button>
                                </div>
                            ) : (
                                <div className={`message-status ${change.status}`}>
                                    {change.status === 'applied' ? '✓ Applied' : '✗ Rejected'}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {message.isError && (
                <button
                    onClick={() => onRetry?.(message.userInput)}
                    className="message-status error retry-btn"
                    title="Click to retry message"
                >
                    <RetryIcon className="retry-icon" /> Retry
                </button>
            )}
        </div>
    );
});

export default ChatInterface;


const CustomerModal = ({ data, setShowPreviewModel }) => {
    return (
        <div className="custommodle">
            <div className="custommodle-inner">
                <button className="custommodle-close" onClick={() => setShowPreviewModel({ show: false, data: null })}>
                    <CloseIcon />
                </button>
                <div>
                    <div className="preview-box">
                        <div
                            dangerouslySetInnerHTML={{
                                __html: data
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
