import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResumeContext } from "../context/ResumeContent.jsx";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./Home.css";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// ─── PDF → Images → Gemini Vision ────────────────────────────────────────────
// Render each PDF page to a JPEG image at 1.5x scale so Gemini can SEE colors,
// margins, fonts, spacing directly from the visual — not from stripped text.
const extractPdfAsImages = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    if (pdf.numPages > 5) {
        alert("File is too large, max 5 pages allowed.");
        return null;
    }

    const images = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // 1.5x for good resolution
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        // Convert to base64 JPEG (smaller than PNG, good enough for Gemini)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        const base64 = dataUrl.split(",")[1];
        images.push(base64);
    }

    return { images, pageCount: pdf.numPages };
};

// ─── DOCX → HTML via mammoth ──────────────────────────────────────────────────
// mammoth reads the DOCX XML and produces structured HTML preserving bold,
// italic, font sizes, and headings — unlike extractRawText which discards them.
const extractDocxHTML = async (file) => {
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.convertToHtml({ arrayBuffer }, {
        styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "b => strong",
            "i => em",
        ]
    });

    const html = result.value;
    const estPages = Math.max(1, Math.ceil(html.length / 3000));

    if (estPages > 5) {
        alert("File is too large, max 5 pages allowed.");
        return null;
    }

    return { html, pageCount: estPages };
};

// ─── Gemini Vision prompt for PDF images ─────────────────────────────────────
const buildVisionPrompt = (pageCount) => `
You are an expert resume HTML converter. You will receive ${pageCount} screenshot(s) of a resume PDF.

Your task: Convert the visual resume EXACTLY into valid HTML with inline styles.

CRITICAL RULES — follow all of them:
1. OUTPUT ONLY valid HTML. No markdown, no code fences, no explanations.
2. Root element MUST be: <div data-document style="font-family: 'DETECTED_FONT', sans-serif;"> (Use the actual font family detected from the screenshot, e.g. 'Calibri', 'Inter', 'Georgia', 'Times New Roman', 'Arial', 'Montserrat', 'Poppins', etc. to match the style of the original document)
3. Each page MUST be wrapped in:
   <div data-page="N" style="width: 210mm; height: 297mm; background: white; padding: 0px 48px; box-sizing: border-box; overflow: hidden;">
4. Match the visual layout, spacing, and styling EXACTLY:
   - Extract and copy all heading colors, text colors, and border/line colors from the screenshots. Use EXACT hexadecimal color codes (e.g., color: #1a3a6e; or border-bottom: 1px solid #1a3a6e;) instead of defaulting everything to black.
   - You MUST apply these style colors and fonts directly to the individual elements (h1, h2, h3, p, span, li) themselves, rather than relying on wrapper elements, since the parent wrappers will be stripped.
   - Match font sizes using physical pt units: name (20-24pt), section headings (11-13pt), job titles (10-11pt), body/text (9-10pt).
   - Match bold, italic, and normal font weights precisely.
   - Set explicit inline styles for margins and line-heights on all headings, paragraphs, and list items. Use tight, professional spacings:
     * paragraphs and list items: style="margin: 0 0 3px 0; line-height: 1.15; font-size: Xpt;"
     * headings: style="margin: 8px 0 3px 0; line-height: 1.2; font-size: Ypt;" (adjust top margin to match the spacing between sections)
     * list wrapper: style="margin: 0 0 4px 0; padding-left: 20px;"
     NEVER let elements fallback to default browser margins (which are 1em and are too large).
   - If a heading has a border or line beneath it, recreate it using border-bottom with the exact color and width.
   - BUDGET FOR THE PAGE COUNT: If the source PDF page count is 1 (or fits on exactly ${pageCount} page(s)), you MUST budget your fonts, line-height, and margins so that all content fits on exactly ${pageCount} page(s). Use smaller font sizes (e.g., 9pt to 9.5pt for body text), a tighter line-height (e.g., 1.1 to 1.15), and compact margins to prevent overflowing to a subsequent page.
5. Use semantic HTML elements: h1 (for the name), h2 (for section headers), h3 (for job titles/organizations), p (for description text), ul/li (for bullets).
6. Apply all styles as inline style="..." attributes only — no CSS classes or stylesheets.
7. Identify the actual font style (font family, weight, style) used in the uploaded screenshots. Choose the closest matching font family from: 'Inter', 'Calibri', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Garamond', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins'. Ensure that the parent <div data-document> and all individual elements use this detected font family.
8. Reproduce the exact content text, section order, and layout from the resume screenshots.
9. If the resume has N pages, use data-page="1", data-page="2", ..., up to data-page="N".

EXAMPLE OUTPUT STRUCTURE:
<div data-document style="font-family: 'Inter', sans-serif;">
    <div data-page="1" style="width: 210mm; height: 297mm; background: white; padding: 0px 48px; box-sizing: border-box; overflow: hidden;">
        <h1 style="font-size: 22pt; font-family: 'Inter', sans-serif; font-weight: bold; text-align: center; color: #1a3a6e; margin: 0 0 4px 0;">DINESHKUMAR E</h1>
        <p style="font-size: 9.5pt; text-align: center; margin: 0 0 12px 0; line-height: 1.15; color: #333333; font-family: 'Inter', sans-serif;">edineshkumar07@gmail.com | +91 9551209927</p>
        
        <h2 style="font-size: 11pt; font-family: 'Inter', sans-serif; font-weight: bold; color: #1a3a6e; border-bottom: 1px solid #1a3a6e; margin: 12px 0 4px 0; padding-bottom: 2px;">PROFESSIONAL SUMMARY</h2>
        <p style="font-size: 9pt; margin: 0 0 4px 0; line-height: 1.15; color: #000000; font-family: 'Inter', sans-serif;">Frontend Software Engineer with 3 years of experience...</p>
    </div>
</div>

OUTPUT ONLY THE HTML — start directly with <div data-document
`;

// ─── Gemini text prompt for DOCX HTML ────────────────────────────────────────
const buildDocxPrompt = (rawHtml, pageCount) => `
You are an expert resume HTML formatter.

DOCX EXTRACTED HTML (from mammoth parser):
${rawHtml}

Your task: Convert this extracted HTML into a perfectly styled resume HTML with inline styles.

RULES:
1. OUTPUT ONLY valid HTML. No markdown, no code fences.
2. Root element: <div data-document style="font-family: 'DETECTED_FONT', sans-serif; color: #000;"> (Use the actual font family detected from the document styles, e.g. 'Calibri', 'Inter', 'Georgia', 'Times New Roman', 'Arial', 'Montserrat', 'Poppins', etc. to match the style of the original document)
3. Each page wrapped in:
   <div data-page="N" style="width: 210mm; height: 297mm; background: white; padding: 0px 48px; box-sizing: border-box; overflow: hidden;">
4. Use exactly ${pageCount} data-page blocks.
5. Preserve ALL heading/text formatting from the extracted HTML (bold, italic, colors, sizes, and font families if present).
6. Apply appropriate font sizes: name/title → 20-24pt, section headings → 11-13pt, body text → 9-10pt.
7. Add appropriate tight margins and line-heights directly inline to every single element:
   - For paragraphs (p) and list items (li): style="margin: 0 0 3px 0; line-height: 1.15; font-size: Xpt;"
   - For headings (h1, h2, h3): style="margin: 8px 0 3px 0; line-height: 1.2; font-size: Ypt;"
   - For lists (ul, ol): style="margin: 0 0 4px 0; padding-left: 20px;"
   NEVER rely on browser default margins (which are around 1em and are too large). All elements must have explicit inline margins overriding defaults.
   - BUDGET FOR THE PAGE COUNT: If the source document fits on exactly ${pageCount} page(s), you MUST budget your fonts, line-height, and margins so that all content fits exactly on ${pageCount} page(s). Use smaller font sizes (e.g., 9pt to 9.5pt for body text), a tighter line-height (e.g., 1.1 to 1.15), and compact margins to prevent overflowing to a subsequent page.
8. Section headings should have: border-bottom: 1px solid #000; padding-bottom: 3px;
9. Preserve any colors if present in the extracted HTML (e.g. blue links, colored headings or lines).
10. Identify the actual font style (font family, weight, style) used in the uploaded document if indicated. Choose the closest matching font family from: 'Inter', 'Calibri', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Garamond', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins'. Ensure that the parent <div data-document> and all individual elements use this detected font family.
11. Use only inline style="..." — no CSS classes. Apply colors and styles directly to child tags, not just wrappers.

OUTPUT ONLY THE HTML.
`;
// Helper to generate content with model fallback to handle 429 quota limits or model unavailability
const generateWithFallback = async (genAI, promptOrParts, primaryModel = "gemini-2.0-flash") => {
    // Try in order: gemini-2.0-flash (best quality), gemini-1.5-flash (standard fallback with high quota), gemini-3.1-flash-lite (safe lightweight fallback)
    const modelsToTry = [primaryModel, "gemini-1.5-flash", "gemini-3.1-flash-lite"];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying Gemini model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            let result;
            if (Array.isArray(promptOrParts)) {
                result = await model.generateContent({ contents: [{ role: "user", parts: promptOrParts }] });
            } else {
                result = await model.generateContent(promptOrParts);
            }
            console.log(`Success with Gemini model: ${modelName}`);
            return result;
        } catch (err) {
            console.warn(`Model ${modelName} failed or quota exceeded:`, err.message || err);
            lastError = err;
        }
    }
    throw lastError;
};

function Home() {
    const navigate = useNavigate();
    const { setResumeHTML } = useContext(ResumeContext);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const handleFresh = () => {
        setResumeHTML(`<h1 style="font-size: 24pt; font-family: Arial, sans-serif; font-weight: bold; text-align: center; margin: 0 0 4px 0;">Your Name</h1>
<p style="font-size: 10pt; text-align: center; margin: 0 0 4px 0; color: #333;">your.email@example.com | +1 (555) 000-0000 | linkedin.com/in/yourname | github.com/yourname</p>

<h2 style="font-size: 12pt; font-family: Arial, sans-serif; font-weight: bold; border-bottom: 1.5px solid #000; margin: 14px 0 4px 0; padding-bottom: 2px;">PROFESSIONAL SUMMARY</h2>
<p style="font-size: 10pt; margin: 0 0 10px 0;">Results-driven professional with experience in building scalable software solutions. Passionate about delivering high-quality products and collaborating with cross-functional teams to drive business outcomes.</p>

<h2 style="font-size: 12pt; font-family: Arial, sans-serif; font-weight: bold; border-bottom: 1.5px solid #000; margin: 14px 0 4px 0; padding-bottom: 2px;">EXPERIENCE</h2>
<h3 style="font-size: 11pt; font-weight: bold; margin: 8px 0 2px 0;">Job Title <span style="font-weight: normal;">· Company Name | Month Year – Present</span></h3>
<ul style="font-size: 10pt; padding-left: 18px; margin: 2px 0 10px 0;">
    <li style="margin-bottom: 3px;">Led development of key features that improved performance by 30%.</li>
    <li style="margin-bottom: 3px;">Collaborated with designers and backend engineers to deliver end-to-end solutions.</li>
</ul>

<h2 style="font-size: 12pt; font-family: Arial, sans-serif; font-weight: bold; border-bottom: 1.5px solid #000; margin: 14px 0 4px 0; padding-bottom: 2px;">EDUCATION</h2>
<p style="font-size: 10pt; margin: 0 0 10px 0;">B.Tech in Computer Science · University Name · 2019 – 2023</p>

<h2 style="font-size: 12pt; font-family: Arial, sans-serif; font-weight: bold; border-bottom: 1.5px solid #000; margin: 14px 0 4px 0; padding-bottom: 2px;">SKILLS</h2>
<p style="font-size: 10pt; margin: 0 0 4px 0;"><strong>Languages:</strong> JavaScript, TypeScript, Python</p>
<p style="font-size: 10pt; margin: 0 0 4px 0;"><strong>Frameworks:</strong> React.js, Node.js, Express</p>
<p style="font-size: 10pt; margin: 0 0 4px 0;"><strong>Tools:</strong> Git, Docker, Figma, Postman</p>`);
        navigate("/doc-editor");
    };

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError("");

        try {
            if (!apiKey) {
                alert("Please set your VITE_GEMINI_API_KEY in the .env file.");
                setLoading(false);
                return;
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const fileName = file.name.toLowerCase();
            let cleanHtml = "";

            // ── PDF: render to images, send to Gemini Vision ──────────────────
            if (fileName.endsWith(".pdf")) {
                const extracted = await extractPdfAsImages(file);
                if (!extracted) { setLoading(false); return; }

                const { images, pageCount } = extracted;

                // Build the content parts: images + text prompt
                const parts = [
                    ...images.map(b64 => ({
                        inlineData: { mimeType: "image/jpeg", data: b64 }
                    })),
                    { text: buildVisionPrompt(pageCount) }
                ];

                const result = await generateWithFallback(genAI, parts, "gemini-2.0-flash");
                cleanHtml = result.response.text()
                    .replace(/```html/gi, "")
                    .replace(/```/g, "")
                    .trim();
            }

            // ── DOCX: mammoth HTML → Gemini text model for styling ────────────
            else if (fileName.endsWith(".docx")) {
                const extracted = await extractDocxHTML(file);
                if (!extracted) { setLoading(false); return; }

                const { html, pageCount } = extracted;
                const prompt = buildDocxPrompt(html, pageCount);

                const result = await generateWithFallback(genAI, prompt, "gemini-2.0-flash");
                cleanHtml = result.response.text()
                    .replace(/```html/gi, "")
                    .replace(/```/g, "")
                    .trim();
            }

            // ── TXT: plain text → Gemini ─────────────────────────────────────
            else if (fileName.endsWith(".txt")) {
                const text = await file.text();
                const prompt = buildDocxPrompt(text, 1);
                const result = await generateWithFallback(genAI, prompt, "gemini-2.0-flash");
                cleanHtml = result.response.text()
                    .replace(/```html/gi, "")
                    .replace(/```/g, "")
                    .trim();
            }

            else {
                alert("Please select a PDF, DOCX or TXT file.");
                setLoading(false);
                return;
            }

            console.log("Generated HTML:", cleanHtml);
            setResumeHTML(cleanHtml);
            navigate("/doc-editor");

        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to process file.");
        } finally {
            setLoading(false);
            e.target.value = "";
        }
    };

    return (
        <div className="home-page">
            <nav className="home-nav">
                <div className="nav-brand">📝 ResumeAI</div>
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
                        className="home-card"
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

                    <label className={`home-card upload-card ${loading ? "loading" : ""}`}>
                        <div className="card-icon">📄</div>
                        <div className="card-content">
                            <h3>Upload Resume</h3>
                            <p>Import PDF or DOCX — AI visually reads your exact colors, margins, and formatting.</p>
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
                        <p>Reading your resume visually — this captures exact colors and layout...</p>
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
                        <h4>Visual Color Capture</h4>
                        <p>PDF uploads use Gemini Vision to read exact colors and margins from the image.</p>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">📱</span>
                        <h4>Responsive Design</h4>
                        <p>Works perfectly on desktop, tablet, and mobile devices.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Home;