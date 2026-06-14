import { createContext, useState } from "react";
import { EDITOR_DEFAULTS, MARGIN_PRESETS } from "../utils/pageConstants";

export const ResumeContext = createContext();

export const ResumeProvider = ({ children }) => {
    // Main HTML content for the WYSIWYG editor
    const [resumeHTML, setResumeHTML] = useState(`
<div
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
</div>
`);

    // Chat history for the chatbot interface
    const [chatHistory, setChatHistory] = useState([]);

    // Document settings
    const [pageSize, setPageSize] = useState(EDITOR_DEFAULTS.pageSize);
    const [orientation, setOrientation] = useState('portrait'); // added orientation state
    const [zoom, setZoom] = useState(EDITOR_DEFAULTS.zoom);
    const [margins, setMargins] = useState({ ...EDITOR_DEFAULTS.margins });
    const [marginPreset, setMarginPreset] = useState('Narrow');
    const [documentTitle, setDocumentTitle] = useState('My Resume');


    // Helper to change margin preset
    const applyMarginPreset = (presetName) => {
        if (MARGIN_PRESETS[presetName]) {
            setMargins({ ...MARGIN_PRESETS[presetName] });
            setMarginPreset(presetName);
        }
    };

    return (
        <ResumeContext.Provider value={{
            resumeHTML, setResumeHTML,
            chatHistory, setChatHistory,
            pageSize, setPageSize,
            orientation, setOrientation,
            zoom, setZoom,
            margins, setMargins,
            marginPreset, applyMarginPreset,
            documentTitle, setDocumentTitle,
            applySettings: (change) => {
                if (change.settings?.pageSize) {
                    const sizeKey = ["A4", "Letter", "Legal", "A3", "A5"].find(
                        k => k.toLowerCase() === change.settings.pageSize.toLowerCase()
                    ) || change.settings.pageSize;
                    setPageSize(sizeKey);
                }
                if (change.settings?.orientation) {
                    const orient = change.settings.orientation.toLowerCase();
                    setOrientation(orient === 'landscape' ? 'landscape' : 'portrait');
                }
            }
        }}>
            {children}
        </ResumeContext.Provider>
    );
};
