/**
 * Custom client-side HTML to Canvas Editor elements parser.
 * Maps standard HTML elements and their inline CSS styling (like font-family, font-size, weights, colors, alignment, line-height, padding, margins)
 * directly to the element structures required by @hufe921/canvas-editor.
 */

function parseCSSLength(val, defaultFontSize = 16) {
    if (!val) return 0;
    const match = val.trim().match(/^([\d.-]+)([a-zA-Z%]*)$/);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (isNaN(num)) return 0;
    
    switch (unit) {
        case "px":
            return num;
        case "pt":
            return num * 1.33;
        case "em":
        case "rem":
            return num * defaultFontSize;
        case "%":
            return (num / 100) * defaultFontSize;
        case "":
            return num; // Unitless
        default:
            return num; // Fallback
    }
}

function parseBoxSpacing(prefix, styleMap, defaultFontSize = 16) {
    let top = 0, right = 0, bottom = 0, left = 0;
    
    const shorthand = styleMap[prefix];
    if (shorthand) {
        const parts = shorthand.trim().split(/\s+/);
        const p0 = parseCSSLength(parts[0], defaultFontSize);
        const p1 = parts[1] !== undefined ? parseCSSLength(parts[1], defaultFontSize) : p0;
        const p2 = parts[2] !== undefined ? parseCSSLength(parts[2], defaultFontSize) : p0;
        const p3 = parts[3] !== undefined ? parseCSSLength(parts[3], defaultFontSize) : p1;
        
        if (parts.length === 1) {
            top = right = bottom = left = p0;
        } else if (parts.length === 2) {
            top = bottom = p0;
            right = left = p1;
        } else if (parts.length === 3) {
            top = p0;
            right = left = p1;
            bottom = p2;
        } else if (parts.length >= 4) {
            top = p0;
            right = p1;
            bottom = p2;
            left = p3;
        }
    }
    
    if (styleMap[`${prefix}-top`]) top = parseCSSLength(styleMap[`${prefix}-top`], defaultFontSize);
    if (styleMap[`${prefix}-right`]) right = parseCSSLength(styleMap[`${prefix}-right`], defaultFontSize);
    if (styleMap[`${prefix}-bottom`]) bottom = parseCSSLength(styleMap[`${prefix}-bottom`], defaultFontSize);
    if (styleMap[`${prefix}-left`]) left = parseCSSLength(styleMap[`${prefix}-left`], defaultFontSize);
    
    return { top, right, bottom, left };
}

export function parseHTMLToElements(htmlText, innerWidth = 650) {
    if (!htmlText) return [];
    
    // Create a temporary container
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlText.trim();
    
    const elements = [];
    let lastBlockBottom = 0;

    // Helper to ensure indentation spaces are applied if at a newline or start of document
    function applyIndentation(style = {}, currentIndentation = "") {
        if (!currentIndentation) return;
        const lastElement = elements[elements.length - 1];
        if (!lastElement || lastElement.value === "\n") {
            elements.push({
                value: currentIndentation,
                ...style
            });
        }
    }
    
    // Recursive helper to traverse the DOM tree
    function traverse(node, currentStyle = {}, indentation = "") {
        if (node.nodeType === 3) { // Text Node
            const text = node.textContent;
            if (!text) return;
            
            // Skip formatting/indentation whitespace-only text nodes
            if (!text.trim()) {
                if (text.includes("\n") || text.includes("\r")) {
                    return;
                }
                elements.push({
                    value: " ",
                    ...currentStyle
                });
                return;
            }
            
            // Collapse internal whitespaces and strip formatting newlines from text nodes
            const cleanedText = text.replace(/[\r\n]+/g, " ").replace(/\s\s+/g, " ");
            
            elements.push({
                value: cleanedText,
                ...currentStyle
            });
        } else if (node.nodeType === 1) { // Element Node
            const tagName = node.tagName.toLowerCase();
            
            const inlineStyle = {};
            const styleAttr = node.getAttribute("style") || "";
            
            const styleMap = {};
            if (styleAttr) {
                styleAttr.split(";").forEach(decl => {
                    const idx = decl.indexOf(":");
                    if (idx !== -1) {
                        const key = decl.slice(0, idx).trim().toLowerCase();
                        const val = decl.slice(idx + 1).trim();
                        styleMap[key] = val;
                    }
                });
            }

            // Set tag-based default styling
            if (tagName === "b" || tagName === "strong") {
                inlineStyle.bold = true;
            } else if (tagName === "i" || tagName === "em") {
                inlineStyle.italic = true;
            } else if (tagName === "u") {
                inlineStyle.underline = true;
            } else if (tagName === "strike" || tagName === "del") {
                inlineStyle.strikeout = true;
            } else if (tagName === "sub") {
                inlineStyle.type = "subscript";
            } else if (tagName === "sup") {
                inlineStyle.type = "superscript";
            } else if (/h[1-6]/.test(tagName)) {
                inlineStyle.bold = true;
                if (tagName === "h1") inlineStyle.size = 22;
                else if (tagName === "h2") inlineStyle.size = 16;
                else if (tagName === "h3") inlineStyle.size = 14;
                else inlineStyle.size = 12;
            }

            // Map styleMap properties to inlineStyle
            if (styleMap["font-size"]) {
                const val = styleMap["font-size"];
                const sizeVal = parseFloat(val);
                if (!isNaN(sizeVal)) {
                    inlineStyle.size = Math.round(parseCSSLength(val));
                }
            }
            if (styleMap["font-family"]) {
                inlineStyle.font = styleMap["font-family"].replace(/['"]/g, "").split(",")[0].trim();
            }
            if (styleMap["font-weight"]) {
                const val = styleMap["font-weight"];
                inlineStyle.bold = val === "bold" || val === "600" || val === "700" || parseInt(val) >= 500;
            }
            if (styleMap["font-style"]) {
                inlineStyle.italic = styleMap["font-style"] === "italic";
            }
            if (styleMap["color"]) {
                inlineStyle.color = styleMap["color"];
            }
            if (styleMap["background-color"]) {
                inlineStyle.highlight = styleMap["background-color"];
            } else if (styleMap["background"]) {
                inlineStyle.highlight = styleMap["background"];
            }
            if (styleMap["text-align"]) {
                const align = styleMap["text-align"].toLowerCase();
                if (align === "center" || align === "right" || align === "justify" || align === "left") {
                    inlineStyle.rowFlex = align;
                }
            }
            if (styleMap["text-decoration"]) {
                const val = styleMap["text-decoration"];
                inlineStyle.underline = val.includes("underline");
                inlineStyle.strikeout = val.includes("line-through");
            }
            if (styleMap["border-bottom"]) {
                inlineStyle.hasBorderBottom = true;
            }

            // Calculate resolved size for line-height and letter-spacing helpers
            const resolvedSize = inlineStyle.size || currentStyle.size || 16;

            if (styleMap["line-height"]) {
                const val = styleMap["line-height"].trim();
                let ratio = 1.0;
                if (val.endsWith("%")) {
                    ratio = parseFloat(val) / 100;
                } else if (/^\d+(\.\d+)?$/.test(val)) {
                    ratio = parseFloat(val);
                } else {
                    const lhPx = parseCSSLength(val, resolvedSize);
                    ratio = lhPx / resolvedSize;
                }
                if (!isNaN(ratio) && ratio > 0) {
                    inlineStyle.rowMargin = Math.max(0, ratio - 1);
                }
            }

            if (styleMap["letter-spacing"]) {
                const spacing = parseCSSLength(styleMap["letter-spacing"], resolvedSize);
                if (!isNaN(spacing)) {
                    inlineStyle.letterSpacing = spacing;
                }
            }
            
            const mergedStyle = {
                ...currentStyle,
                ...inlineStyle
            };

            // Detect page/document container elements to bypass spacing and block behavior
            const isDocumentOrPage = node.hasAttribute("data-document") || 
                                     node.hasAttribute("data-page") || 
                                     node.getAttribute("data-document") !== null || 
                                     node.getAttribute("data-page") !== null;
            
            const isBlock = !isDocumentOrPage && [
                "p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "tr", "ul", "ol",
                "section", "article", "header", "footer", "aside", "main"
            ].includes(tagName);
            
            let currentIndentation = indentation;
            
            if (isBlock) {
                const margin = parseBoxSpacing("margin", styleMap, mergedStyle.size || 16);
                const padding = parseBoxSpacing("padding", styleMap, mergedStyle.size || 16);
                const totalTopSpace = margin.top + padding.top;
                const totalBottomSpace = margin.bottom + padding.bottom;
                const totalLeftSpace = margin.left + padding.left;
                
                // If there are already elements, we push a block separator newline before this block
                if (elements.length > 0) {
                    // Margin collapse: take the max of the previous block's bottom margin and current block's top margin
                    const spacing = Math.max(lastBlockBottom, totalTopSpace);
                    // Use a small spacing of 6px to separate blocks if margins are 0
                    const finalSpacing = spacing > 0 ? spacing : 6;
                    
                    elements.push({
                        value: "\n",
                        size: finalSpacing,
                        rowFlex: mergedStyle.rowFlex,
                        rowMargin: 0
                    });
                }
                
                // Update track of bottom margin for the current block hierarchy
                lastBlockBottom = Math.max(lastBlockBottom, totalBottomSpace);
                
                if (totalLeftSpace >= 12) {
                    const spaceCount = Math.round(totalLeftSpace / 8);
                    if (spaceCount > 0) {
                        const spaces = "\u00A0".repeat(spaceCount);
                        currentIndentation = indentation + spaces;
                        
                        // Immediately apply the new indentation to the current line
                        applyIndentation(mergedStyle, currentIndentation);
                    }
                }
            }
            
            if (tagName === "br") {
                elements.push({
                    value: "\n",
                    ...mergedStyle
                });
                applyIndentation(mergedStyle, currentIndentation);
            } else if (tagName === "hr") {
                elements.push({ value: "\n", type: "separator" });
            } else if (tagName === "li") {
                // Determine bullet type
                const isOl = node.parentNode && node.parentNode.tagName.toLowerCase() === "ol";
                let index = 1;
                if (isOl) {
                    // Find list item index
                    let sibling = node.previousElementSibling;
                    while (sibling) {
                        if (sibling.tagName.toLowerCase() === "li") index++;
                        sibling = sibling.previousElementSibling;
                    }
                }
                const bullet = isOl ? `${index}. ` : "• ";
                
                // Push the bullet point
                elements.push({
                    value: bullet,
                    ...mergedStyle
                });
                
                // Parse the item contents
                node.childNodes.forEach(child => traverse(child, mergedStyle, currentIndentation));
            } else if (tagName === "ol" || tagName === "ul") {
                node.childNodes.forEach(child => traverse(child, mergedStyle, currentIndentation));
            } else if (tagName === "table") {
                const trElements = [];
                node.querySelectorAll("tr").forEach(tr => {
                    const tdElements = [];
                    tr.querySelectorAll("td, th").forEach(td => {
                        const cellElements = parseHTMLToElements(td.innerHTML, innerWidth);
                        tdElements.push({
                            colspan: parseInt(td.getAttribute("colspan")) || 1,
                            rowspan: parseInt(td.getAttribute("rowspan")) || 1,
                            value: cellElements,
                            verticalAlign: td.style.verticalAlign || "top",
                            width: parseFloat(td.style.width) || (innerWidth / 2)
                        });
                    });
                    if (tdElements.length > 0) {
                        trElements.push({
                            height: parseFloat(tr.style.height) || 40,
                            minHeight: parseFloat(tr.style.height) || 40,
                            tdList: tdElements
                        });
                    }
                });
                
                if (trElements.length > 0) {
                    const colCount = trElements[0].tdList.reduce((acc, cell) => acc + cell.colspan, 0);
                    const colWidth = Math.ceil(innerWidth / colCount);
                    const colgroup = [];
                    for (let c = 0; c < colCount; c++) {
                        colgroup.push({ width: colWidth });
                    }
                    elements.push({
                        type: "table",
                        value: "\n",
                        colgroup,
                        trList: trElements
                    });
                }
            } else {
                // Standard div/span, traverse children
                node.childNodes.forEach(child => traverse(child, mergedStyle, currentIndentation));
            }
            
            // If the element has a border-bottom, draw a horizontal separator line
            if (inlineStyle.hasBorderBottom) {
                elements.push({ value: "\n", type: "separator" });
            }
        }
    }
    
    // Process child nodes
    tempDiv.childNodes.forEach(child => traverse(child));
    
    // Merge adjacent elements with identical styles
    const merged = [];
    for (let i = 0; i < elements.length; i++) {
        const current = elements[i];
        if (merged.length > 0) {
            const last = merged[merged.length - 1];
            const isText = (!current.type || current.type === 'text') && (!last.type || last.type === 'text');
            // Do not merge if either the current or the last element is or ends with a newline character.
            // This preserves empty spacer newlines and keeps text spans cleanly separated from their structural breaks.
            const isNewline = current.value === "\n" || last.value.endsWith("\n");
            if (isText && !isNewline &&
                current.size === last.size &&
                current.bold === last.bold &&
                current.italic === last.italic &&
                current.color === last.color &&
                current.font === last.font &&
                current.rowFlex === last.rowFlex &&
                current.rowMargin === last.rowMargin &&
                current.letterSpacing === last.letterSpacing &&
                current.underline === last.underline &&
                current.strikeout === last.strikeout &&
                current.highlight === last.highlight
            ) {
                last.value += current.value;
                continue;
            }
        }
        merged.push(current);
    }
    
    return merged;
}
