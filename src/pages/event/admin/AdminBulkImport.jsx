import React, { useState, useRef } from 'react';
import { read, utils, write } from 'xlsx';
import { db, auth, collection, doc, writeBatch } from '../../../api/firebase';
import classes from '../Admin.module.css';

const TEMPLATE_HEADERS = ['이름*', '연락처*', '이메일(선택)', '수량*'];

const isValidHeaders = (hdrs) =>
    hdrs.length >= TEMPLATE_HEADERS.length &&
    TEMPLATE_HEADERS.every((h, i) => h === hdrs[i]);

const downloadTemplate = () => {
    const wb = utils.book_new();
    const ws = utils.aoa_to_sheet([
        ['아래 헤더를 수정하지 마세요! 이 행은 자동으로 무시됩니다.'],
        TEMPLATE_HEADERS,
    ]);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    ws['!cols'] = [{ wch: 16 }, { wch: 16, z: '@' }, { wch: 24 }, { wch: 10 }, { wch: 4 }, { wch: 4 }];
    ws['!rows'] = [{ hpt: 28 }];
    // 연락처 열(B) 데이터 영역을 텍스트 서식(@)으로 설정하여 앞자리 0 보존
    for (let r = 2; r <= 501; r++) {
        const ref = utils.encode_cell({ r, c: 1 });
        ws[ref] = { t: 's', v: '', z: '@' };
    }
    utils.book_append_sheet(wb, ws, '예약 양식');
    const buf = write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '예약_일괄등록_양식.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const parseSheet = (sheet) => {
    // Try row 1 as headers (no warning row)
    let data = utils.sheet_to_json(sheet, { defval: '' });
    if (data.length > 0 && isValidHeaders(Object.keys(data[0]))) return data;

    // Try row 2 as headers (warning row exists)
    data = utils.sheet_to_json(sheet, { defval: '', range: 1 });
    if (data.length > 0 && isValidHeaders(Object.keys(data[0]))) return data;

    return null;
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

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError('');

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = parseSheet(firstSheet);

                if (!jsonData) {
                    setError('양식이 맞지 않습니다. 양식을 다운로드하여 헤더를 변경하지 말고 사용해주세요.');
                    return;
                }

                if (jsonData.length === 0) {
                    setError('파일에 데이터가 없습니다.');
                    return;
                }

                setParsedData(jsonData);
                setStep('preview');
            } catch {
                setError('파일을 읽을 수 없습니다. 양식에 맞는 엑셀(.xlsx) 파일인지 확인해주세요.');
            }
        };
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
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
                    <button onClick={downloadTemplate} style={templateBtnStyle}>
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
