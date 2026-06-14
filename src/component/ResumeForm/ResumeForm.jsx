import { useContext, useState } from "react";
import { ResumeContext } from "../../context/ResumeContent.jsx";
import { GoogleGenerativeAI } from "@google/generative-ai";

function ResumeForm() {
    const { resumeHTML, setResumeHTML } = useContext(ResumeContext);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    console.log("apiKeyapiKeyapiKey ", apiKey)

    const handleSubmit = async () => {
        if (!apiKey) {
            alert("Please enter your Gemini API Key.");
            return;
        }
        if (!prompt) return;

        setLoading(true);
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

            const systemPrompt = `You are an AI HTML editor for a resume.
Current Resume HTML:
${resumeHTML}

User Request: "${prompt}"

Task: Update the Current Resume HTML based on the User Request. You can modify structure, text, inline styles (like color, font-size, layout).
Return ONLY valid HTML content representing the entirely updated resume. Do NOT use markdown blocks like \`\`\`html. Return pure HTML.`;

            const result = await model.generateContent(systemPrompt);
            const responseText = result.response.text();

            // Clean up potentially wrapped HTML
            let cleanHtml = responseText.replace(/```html/gi, "").replace(/```/g, "").trim();

            setResumeHTML(cleanHtml);
            setPrompt("");
        } catch (error) {
            console.error(error);
            alert("Error updating resume. Please check API key and ensure your request is clear.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-section">

            <div className="prompt-container">
                <textarea
                    placeholder="E.g., Make my name bigger, change header color to blue, add a new section..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="prompt-textarea"
                />
                <button onClick={handleSubmit} disabled={loading} className="submit-btn">
                    {loading ? "Updating..." : "Update Resume"}
                </button>
            </div>
        </div>
    );
}

export default ResumeForm;