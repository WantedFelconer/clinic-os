function pdfEscape(value) {
  return String(value ?? '')
    .normalize('NFKD').replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapLine(value, max = 92) {
  const words = String(value ?? '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= max) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function createTextPdf(inputLines, title = 'ClinicOS Document') {
  const lines = inputLines.flatMap((line) => wrapLine(line));
  const pages = [];
  for (let i = 0; i < lines.length; i += 44) pages.push(lines.slice(i, i + 44));
  if (!pages.length) pages.push(['']);

  const objects = [];
  const add = (value) => { objects.push(value); return objects.length; };
  const catalogId = add('');
  const pagesId = add('');
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];

  for (const pageLines of pages) {
    const content = [
      'BT', '/F1 18 Tf', '50 790 Td', `(${pdfEscape(title)}) Tj`,
      '/F1 10 Tf', '0 -28 Td', '14 TL',
      ...pageLines.flatMap((line, index) => index === 0 ? [`(${pdfEscape(line)}) Tj`] : ['T*', `(${pdfEscape(line)}) Tj`]),
      'ET',
    ].join('\n');
    const contentId = add(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

module.exports = { createTextPdf, pdfEscape, wrapLine };
