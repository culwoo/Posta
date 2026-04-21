import React, { useState, useRef } from 'react';
import { db, auth, collection, doc, writeBatch } from '../../../api/firebase';
import classes from '../Admin.module.css';

const TEMPLATE_HEADERS = ['이름*', '연락처*', '이메일(선택)', '수량*'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;

const loadExcelJS = async () => {
    const module = await import('exceljs');
    return module.default;
};

const isValidHeaders = (hdrs) =>
    hdrs.length >= TEMPLATE_HEADERS.length &&
    TEMPLATE_HEADERS.every((h, i) => h === hdrs[i]);

const downloadTemplate = async () => {
    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('예약 양식');

    worksheet.addRow(['아래 헤더를 수정하지 마세요! 이 행은 자동으로 무시됩니다.']);
    worksheet.addRow(TEMPLATE_HEADERS);
    worksheet.mergeCells(1, 1, 1, 6);
    worksheet.getRow(1).height = 28;
    worksheet.getColumn(1).width = 16;
    worksheet.getColumn(2).width = 16;
    worksheet.getColumn(2).numFmt = '@';
    worksheet.getColumn(3).width = 24;
    worksheet.getColumn(4).width = 10;

    // 연락처 열(B) 데이터 영역을 텍스트 서식(@)으로 설정하여 앞자리 0 보존
    for (let row = 3; row <= 502; row++) {
        worksheet.getCell(row, 2).numFmt = '@';
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '예약_일괄등록_양식.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const normalizeCellValue = (value) => {
    if (value == null) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
        if (Array.isArray(value.richText)) {
            return value.richText.map((part) => part.text || '').join('');
        }
        if ('text' in value) return value.text || '';
        if ('result' in value) return value.result || '';
    }
    return value;
};

const rowsToObjects = (rows, headerIndex) => {
    const headers = (rows[headerIndex] || []).map((cell) => String(cell || '').replace(/^\uFEFF/, '').trim());
    if (!isValidHeaders(headers)) return null;

    return rows.slice(headerIndex + 1)
        .map((row) => TEMPLATE_HEADERS.reduce((acc, header, index) => {
            acc[header] = row[index] ?? '';
            return acc;
        }, {}))
        .filter((row) => TEMPLATE_HEADERS.some((header) => String(row[header] || '').trim() !== ''));
};

const parseRows = (rows) => {
    // Try row 1 as headers (no warning row), then row 2 (template warning row).
    return rowsToObjects(rows, 0) || rowsToObjects(rows, 1);
};

const parseCsvText = (text) => {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let index = 0; index < text.length; index++) {
        const char = text[index];

        if (char === '"') {
            if (inQuotes && text[index + 1] === '"') {
                field += '"';
                index++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(field);
            field = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[index + 1] === '\n') index++;
            row.push(field);
            if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
            row = [];
            field = '';
        } else {
            field += char;
        }
    }

    row.push(field);
    if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);

    return parseRows(rows);
};

const parseXlsxBuffer = async (arrayBuffer) => {
    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return null;

    const rows = [];
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const values = [];
        for (let col = 1; col <= Math.max(row.cellCount, TEMPLATE_HEADERS.length); col++) {
            values.push(normalizeCellValue(row.getCell(col).value));
        }
        rows[rowNumber - 1] = values;
    });

    return parseRows(rows.filter(Boolean));
};

const cleanName = (val) => String(val || '').replace(/\s+/g, ' ').trim();
const cleanPhone = (val) => {
    const digits = String(val || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('0') ? digits : '0' + digits;
};
const cleanTicketCount = (val) => {
    const digits = String(val || '').replace(/[^\d]/g, '');
    return parseInt(digits, 10) || 1;
};

const AdminBulkImport = ({ eventId }) => {
    const [step, setStep] = useState('idle'); // idle | preview | importing | done
    const [parsedData, setParsedData] = useState([]);
    const [progress, setProgress] = useState({ imported: 0, skipped: 0, total: 0 });
    const [error, setError] = useState('');
    const fileRef = useRef(null);

    const handleDownloadTemplate = async () => {
        setError('');
        try {
            await downloadTemplate();
        } catch {
            setError('양식을 다운로드할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError('');

        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!['xlsx', 'csv'].includes(extension)) {
            setError('보안을 위해 .xlsx 또는 UTF-8 .csv 파일만 업로드할 수 있습니다.');
            e.target.value = '';
            return;
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            setError('파일은 5MB 이하만 업로드할 수 있습니다.');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const arrayBuffer = event.target.result;
                const jsonData = extension === 'csv'
                    ? parseCsvText(new TextDecoder('utf-8').decode(arrayBuffer))
                    : await parseXlsxBuffer(arrayBuffer);

                if (!jsonData) {
                    setError('양식이 맞지 않습니다. 양식을 다운로드하여 헤더를 변경하지 말고 사용해주세요.');
                    return;
                }

                if (jsonData.length === 0) {
                    setError('파일에 데이터가 없습니다.');
                    return;
                }

                if (jsonData.length > MAX_IMPORT_ROWS) {
                    setError(`한 번에 최대 ${MAX_IMPORT_ROWS}건까지 가져올 수 있습니다.`);
                    return;
                }

                setParsedData(jsonData);
                setStep('preview');
            } catch {
                setError('파일을 읽을 수 없습니다. 양식에 맞는 .xlsx 또는 UTF-8 .csv 파일인지 확인해주세요.');
            }
        };
        reader.onerror = () => setError('파일을 읽을 수 없습니다.');
        reader.readAsArrayBuffer(file);
    };

    const handleImport = async () => {
        if (!eventId || !auth.currentUser) return;

        setStep('importing');
        setProgress({ imported: 0, skipped: 0, total: parsedData.length });

        const BATCH_SIZE = 500;
        let imported = 0;
        let skipped = 0;

        try {
            for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const chunk = parsedData.slice(i, i + BATCH_SIZE);

                for (const row of chunk) {
                    const name = cleanName(row['이름*']);
                    if (!name) { skipped++; continue; }

                    const phone = cleanPhone(row['연락처*']);
                    const email = String(row['이메일(선택)'] || '').trim();
                    const ticketCount = cleanTicketCount(row['수량*']);

                    const docRef = doc(collection(db, 'events', eventId, 'reservations'));
                    batch.set(docRef, {
                        name,
                        phone,
                        email,
                        ticketCount,
                        token: `a_${Math.random().toString(36).slice(2, 11)}`,
                        createdByUid: auth.currentUser.uid,
                        status: 'reserved',
                        depositConfirmed: false,
                        source: 'admin',
                        createdAt: new Date().toISOString(),
                    });
                    imported++;
                }

                await batch.commit();
                setProgress({ imported, skipped, total: parsedData.length });
            }

            setStep('done');
        } catch (err) {
            console.error('Bulk import failed:', err);
            setError(`가져오기 중 오류 발생 (${imported}건 완료, ${parsedData.length - imported - skipped}건 미처리)`);
            setStep('idle');
        }
    };

    const handleReset = () => {
        setStep('idle');
        setParsedData([]);
        setProgress({ imported: 0, skipped: 0, total: 0 });
        setError('');
        if (fileRef.current) fileRef.current.value = '';
    };

    return (
        <div>
            {error && (
                <div style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(255,71,87,0.08)', borderRadius: '8px' }}>
                    {error}
                </div>
            )}

            {step === 'idle' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
                    <button onClick={handleDownloadTemplate} style={templateBtnStyle}>
                        양식 다운로드
                    </button>
                    <button onClick={() => fileRef.current?.click()} style={uploadBtnStyle}>
                        파일 업로드
                    </button>
                </div>
            )}

            {step === 'preview' && (
                <div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>
                        미리보기 (상위 5건)
                    </div>
                    <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                        <table className={classes.table} style={{ fontSize: '0.8rem' }}>
                            <thead>
                                <tr>
                                    {TEMPLATE_HEADERS.map(h => <th key={h}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.slice(0, 5).map((row, i) => (
                                    <tr key={i}>
                                        <td>{cleanName(row['이름*']) || '-'}</td>
                                        <td>{cleanPhone(row['연락처*']) || '-'}</td>
                                        <td>{String(row['이메일(선택)'] || '').trim() || '-'}</td>
                                        <td>{cleanTicketCount(row['수량*'])}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button onClick={handleImport} style={importBtnStyle}>
                            총 {parsedData.length}건 가져오기
                        </button>
                        <button onClick={handleReset} style={ghostBtnStyle}>
                            취소
                        </button>
                    </div>
                </div>
            )}

            {step === 'importing' && (
                <div>
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        가져오는 중... {progress.imported} / {progress.total}
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${Math.round((progress.imported / Math.max(progress.total, 1)) * 100)}%`,
                            height: '100%',
                            background: '#00d4aa',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                        }} />
                    </div>
                </div>
            )}

            {step === 'done' && (
                <div>
                    <div style={{ fontSize: '0.95rem', color: '#00d4aa', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                        {progress.imported}건 가져오기 완료!
                        {progress.skipped > 0 && (
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                                (이름 없음 {progress.skipped}건 건너뜀)
                            </span>
                        )}
                    </div>
                    <button onClick={handleReset} style={ghostBtnStyle}>
                        추가 업로드
                    </button>
                </div>
            )}
        </div>
    );
};

const templateBtnStyle = {
    padding: '0.6rem 1.2rem',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    flex: 1,
};

const uploadBtnStyle = {
    padding: '0.6rem 1.2rem',
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    border: '1px dashed rgba(255,255,255,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    flex: 1,
};

const importBtnStyle = {
    padding: '0.5rem 1.2rem',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 'bold',
};

const ghostBtnStyle = {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
};

export default AdminBulkImport;
