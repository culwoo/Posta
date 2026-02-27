const DANGEROUS_PREFIX = /^[=+\-@]/;

const protectFormula = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    if (!text) return '';
    return DANGEROUS_PREFIX.test(text) ? `'${text}` : text;
};

const escapeCsv = (value) => {
    const safe = protectFormula(value).replace(/"/g, '""');
    return `"${safe}"`;
};

export const buildCsvContent = ({ headers, rows }) => {
    const lines = [];
    lines.push(headers.join(','));
    rows.forEach((row) => {
        const line = headers.map((key) => escapeCsv(row[key])).join(',');
        lines.push(line);
    });
    return lines.join('\n');
};

export const downloadCsvFile = ({ filename, headers, rows }) => {
    const csv = buildCsvContent({ headers, rows });
    const contentWithBom = `\uFEFF${csv}`;
    const blob = new Blob([contentWithBom], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
