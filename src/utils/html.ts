// HTML Utilities
// Functions for safe HTML string handling

/**
 * Escape HTML special characters to prevent XSS and rendering issues.
 * Handles: & < > " '
 *
 * Note: Newlines are preserved as-is. Use CSS `white-space: pre-wrap`
 * to render them correctly in HTML output.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
