import { useContext, useEffect, useState, useRef, useMemo } from "react";
import { ResumeContext } from "../../context/ResumeContent.jsx";
import { PAGE_SIZES } from "../../utils/pageConstants.js";
import "./ResumeViewer.css";

function ResumeViewer() {
    const { resumeHTML, pageSize: pageSizeName, orientation, margins, documentTitle } = useContext(ResumeContext);
    const [pageBreaks, setPageBreaks] = useState([]);
    const printAreaRef = useRef(null);

    console.log(pageBreaks, 'pageBreaks');

    const handlePrint = () => {
        const trimmed = (documentTitle || '').trim();
        document.title = trimmed || 'Untitled Resume';
        window.print();
    };

    const currentPage = PAGE_SIZES[pageSizeName] || PAGE_SIZES.A4;
    const orientedPage = orientation === 'landscape'
        ? { ...currentPage, width: currentPage.height, height: currentPage.width }
        : currentPage;
    const viewerStyle = {
        "--page-width": `${orientedPage.width}mm`,
        "--page-height": `${orientedPage.height}mm`,
        "--margin-top": `${margins?.top ?? 25.4}mm`,
        "--margin-bottom": `${margins?.bottom ?? 25.4}mm`,
        "--margin-left": `${margins?.left ?? 25.4}mm`,
        "--margin-right": `${margins?.right ?? 25.4}mm`,
    };

    // Allow page container to grow dynamically in preview by applying min-height and height: auto
    useEffect(() => {
        if (!printAreaRef.current) return;
        const pages = printAreaRef.current.querySelectorAll('[data-page]');
        pages.forEach(p => {
            p.style.width = `${orientedPage.width}mm`;
            p.style.minHeight = `${orientedPage.height}mm`;
            p.style.height = 'auto';
        });
    }, [orientedPage, resumeHTML]);

    // Measure page height changes and calculate virtual page boundary breaks
    useEffect(() => {
        if (!printAreaRef.current) return;

        const updateBreaks = () => {
            // Standard page height in pixels (at standard 96 DPI)
            const singlePageHeightPx = (orientedPage.height / 25.4) * 96;
            const actualHeightPx = printAreaRef.current.scrollHeight;

            const numBreaks = Math.floor(actualHeightPx / singlePageHeightPx);
            const breaks = [];
            for (let i = 1; i <= numBreaks; i++) {
                // Only add guideline if it's within the scrollable content bounds
                if (i * singlePageHeightPx < actualHeightPx - 5) {
                    breaks.push(i * orientedPage.height);
                }
            }
            console.log("updateBreaks (printArea): actualHeightPx =", actualHeightPx, "singlePageHeightPx =", singlePageHeightPx, "numBreaks =", numBreaks, "breaks =", breaks);
            
            // Skip state updates if the calculated page breaks are identical to avoid infinite loop
            setPageBreaks(prevBreaks => {
                const isSame = prevBreaks.length === breaks.length && prevBreaks.every((val, idx) => val === breaks[idx]);
                if (isSame) {
                    return prevBreaks;
                }
                return breaks;
            });
        };

        updateBreaks();

        const observer = new ResizeObserver(updateBreaks);
        observer.observe(printAreaRef.current);

        const mutationObserver = new MutationObserver(updateBreaks);
        mutationObserver.observe(printAreaRef.current, { childList: true, subtree: true, characterData: true });

        return () => {
            observer.disconnect();
            mutationObserver.disconnect();
        };
    }, [resumeHTML, orientedPage]);


    // Compute line coordinates dynamically on-the-fly using useMemo (prevents double renders and crash loops)
    const { limitLines, splitLines } = useMemo(() => {
        const limit = [];
        const split = [];

        if (pageBreaks.length > 0) {
            for (let i = 0; i < pageBreaks.length + 1; i++) {
                // Top margin limit of page i + 1
                limit.push(i * orientedPage.height + (margins?.top ?? 25.4));
                // Bottom margin limit of page i + 1
                limit.push((i + 1) * orientedPage.height - (margins?.bottom ?? 25.4));
                if (i > 0) {
                    // Physical page break line between page i and page i + 1
                    split.push(i * orientedPage.height);
                }
            }
        }
        return { limitLines: limit, splitLines: split };
    }, [pageBreaks, orientedPage, margins]);

    return (
        <div className="viewer-container" style={viewerStyle}>
            <style>
                {`
                    @media print {
                        @page {
                            size: ${orientedPage.width}mm ${orientedPage.height}mm portrait;
                            margin: ${margins?.top ?? 25.4}mm ${margins?.right ?? 25.4}mm ${margins?.bottom ?? 25.4}mm ${margins?.left ?? 25.4}mm !important;
                        }
                    }
                `}
            </style>
            <div className="viewer-toolbar no-print">
                <h2>📄 Resume Preview</h2>
                <button className="download-btn" onClick={handlePrint}>
                    Download PDF
                </button>
            </div>

            <div className="viewer-scroll-area">
                <div style={{ position: "relative" }}>
                    <div
                        ref={printAreaRef}
                        id="resume-print-area"
                        className="resume-doc-wrapper"
                        dangerouslySetInnerHTML={{ __html: resumeHTML }}
                    />

                    {/* Content Margin Limit Lines (Subtle guides drawn ONLY inside left/right margins, not crossing text) */}
                    {limitLines.map((lineMm, index) => {
                        const pageNum = Math.floor(index / 2) + 1;
                        const isTop = index % 2 === 0;
                        const labelText = isTop ? `P${pageNum} TOP` : `P${pageNum} LMT`;
                        return (
                            <div key={`limit-${index}`} className="no-print" style={{ pointerEvents: "none" }}>
                                {/* Left Margin Segment */}
                                <div
                                    style={{
                                        position: "absolute",
                                        top: `${lineMm}mm`,
                                        left: 0,
                                        width: `${margins?.left ?? 25.4}mm`,
                                        borderTop: "1.2px dashed rgba(66, 133, 244, 0.45)",
                                        zIndex: 10
                                    }}
                                />

                                {/* Right Margin Segment */}
                                <div
                                    style={{
                                        position: "absolute",
                                        top: `${lineMm}mm`,
                                        right: 0,
                                        width: `${margins?.right ?? 25.4}mm`,
                                        borderTop: "1.2px dashed rgba(66, 133, 244, 0.45)",
                                        zIndex: 10
                                    }}
                                />

                                {/* Small indicator text inside outer right margin */}
                                <div
                                    style={{
                                        position: "absolute",
                                        top: `${lineMm}mm`,
                                        right: "4px",
                                        transform: "translateY(-50%)",
                                        color: "rgba(66, 133, 244, 0.55)",
                                        fontSize: "8px",
                                        fontFamily: "monospace",
                                        fontWeight: "600",
                                        zIndex: 10
                                    }}
                                >
                                    {labelText}
                                </div>
                            </div>
                        );
                    })}

                    {/* Page Break Split Lines (Subtle guides drawn ONLY inside left/right margins, not crossing text) */}
                    {splitLines.map((lineMm, index) => {
                        const pageNum = index + 1;
                        return (
                            <div key={`split-${index}`} className="no-print" style={{ pointerEvents: "none" }}>
                                {/* Left Margin Segment */}
                                <div
                                    style={{
                                        position: "absolute",
                                        top: `${lineMm}mm`,
                                        left: 0,
                                        width: `${margins?.left ?? 25.4}mm`,
                                        borderTop: "2px dashed rgba(239, 68, 68, 0.5)",
                                        zIndex: 10
                                    }}
                                />

                                {/* Right Margin Segment */}
                                <div
                                    style={{
                                        position: "absolute",
                                        top: `${lineMm}mm`,
                                        right: 0,
                                        width: `${margins?.right ?? 25.4}mm`,
                                        borderTop: "2px dashed rgba(239, 68, 68, 0.5)",
                                        zIndex: 10
                                    }}
                                />

                                {/* Page Split label in outer right margin */}
                                <div
                                    style={{
                                        position: "absolute",
                                        top: `${lineMm}mm`,
                                        right: "4px",
                                        transform: "translateY(-50%)",
                                        color: "rgba(239, 68, 68, 0.7)",
                                        fontSize: "8px",
                                        fontFamily: "monospace",
                                        fontWeight: "bold",
                                        zIndex: 10
                                    }}
                                >
                                    PAGE {pageNum} END
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default ResumeViewer;