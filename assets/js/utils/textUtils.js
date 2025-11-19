const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;

function escapeHtml(text = '') {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function convertMarkdownToHtml(text = '') {
  let html = text;
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const clean = match.replace(/```/g, '');
    return `<pre class="ai-code">${clean.trim()}</pre>`;
  });
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  const listRegex = /(^|\n)[-*]\s+([^\n]+)/g;
  if (listRegex.test(html)) {
    html = html.replace(/(?:^|\n)([-*])\s+([^\n]+)/g, (_, __, item) => `\n<li>${item}</li>`);
    html = html.replace(/(\n<li>.*<\/li>)/gs, (match) => `<ul>${match.replace(/\n<li>/g, '<li>')}</ul>`);
  }
  return html;
}

function normalizeParagraphs(html) {
  return html
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function formatAssistantHtml(text = '', allowMarkdown = true) {
  const safe = escapeHtml(text);
  const processed = allowMarkdown ? convertMarkdownToHtml(safe) : safe;
  return normalizeParagraphs(processed || '');
}

export function htmlToPlainText(html = '') {
  if (!parser) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

export function markdownToPlainText(text = '') {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\((.*?)\)/g, '$1')
    .replace(/#+\s*(.+)/g, '$1')
    .replace(/[-*]\s+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
