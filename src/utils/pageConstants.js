/**
 * Page sizes in millimeters { width, height }
 */
export const PAGE_SIZES = {
  A4: { name: 'A4', width: 210, height: 297, label: '210 × 297 mm' },
  Letter: { name: 'Letter', width: 215.9, height: 279.4, label: '8.5 × 11 in' },
  Legal: { name: 'Legal', width: 215.9, height: 355.6, label: '8.5 × 14 in' },
  A3: { name: 'A3', width: 297, height: 420, label: '297 × 420 mm' },
  A5: { name: 'A5', width: 148, height: 210, label: '148 × 210 mm' },
};

/**
 * Margin presets in mm { top, right, bottom, left }
 */
export const MARGIN_PRESETS = {
  Normal: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
  Narrow: { top: 12.7, right: 12.7, bottom: 12.7, left: 12.7 },
  Wide: { top: 25.4, right: 50.8, bottom: 25.4, left: 50.8 },
  Compact: { top: 15, right: 15, bottom: 15, left: 15 },
};

/**
 * Convert millimeters to pixels at 96 DPI.
 * 1 inch = 25.4 mm, 1 inch = 96 px
 */
export const mmToPx = (mm) => (mm / 25.4) * 96;

/**
 * Convert pixels to millimeters at 96 DPI.
 */
export const pxToMm = (px) => (px / 96) * 25.4;

/**
 * Available font families for the editor toolbar.
 */
export const FONT_FAMILIES = [
  'Inter',
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Garamond',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
];

/**
 * Available font sizes (in pt).
 */
export const FONT_SIZES = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 42, 48, 56, 64, 72,
];

/**
 * Default editor configuration.
 */
export const EDITOR_DEFAULTS = {
  pageSize: 'A4',
  zoom: 100,
  margins: { ...MARGIN_PRESETS.Normal },
  fontFamily: 'Inter',
  fontSize: 11,
  lineSpacing: 1.5,
};

/**
 * Zoom range limits.
 */
export const ZOOM_MIN = 50;
export const ZOOM_MAX = 200;
export const ZOOM_STEP = 10;
