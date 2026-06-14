import { useCallback, useContext } from 'react';
import { ResumeContext } from '../context/ResumeContent.jsx';
import { PAGE_SIZES } from '../utils/pageConstants';

/**
 * Custom hook for printing with the correct page size.
 *
 * @param {string} pageSizeName – key in PAGE_SIZES
 * @param {Object} margins – { top, right, bottom, left } in mm
 * @returns {{ handlePrint: Function }}
 */
export default function usePrint(pageSizeName, margins) {
  const { orientation, documentTitle } = useContext(ResumeContext);
  const handlePrint = useCallback(() => {
    const pageSize = PAGE_SIZES[pageSizeName] || PAGE_SIZES.A4;
    const orientedPage = orientation === 'landscape'
      ? { ...pageSize, width: pageSize.height, height: pageSize.width }
      : pageSize;

    // Inject a dynamic <style> for @page
    const styleEl = document.createElement('style');
    styleEl.id = 'resume-print-styles';
    styleEl.textContent = `
      @page {
        size: ${orientedPage.width}mm ${orientedPage.height}mm;
        margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
      }
    `;
    document.head.appendChild(styleEl);

    // Set page title synchronously before printing
    const trimmed = (documentTitle || '').trim();
    document.title = trimmed || 'Untitled Resume';

    // Print
    window.print();

    // Clean up the injected style after printing
    setTimeout(() => {
      const el = document.getElementById('resume-print-styles');
      if (el) el.remove();
    }, 1000);
  }, [pageSizeName, margins, orientation, documentTitle]);

  return { handlePrint };
}
