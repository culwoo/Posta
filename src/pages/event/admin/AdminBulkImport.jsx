import React, { useState, useRef } from 'react';
import { read, utils } from 'xlsx';
import { db, auth, collection, doc, writeBatch } from '../../../api/firebase';
import classes from '../Admin.module.css';

const COLUMN_DEFS = [
    { key: 'name', label: '이름 *', patterns: ['이름', 'name', '성명', '입금자', '입금명', '예약자'] },
    { key: 'phone', label: '연락처', patterns: ['연락처', 'phone', '전화', '전화번호', '핸드폰', '휴대폰', '휴대전화'] },
    { key: 'email', label: '이메일', patterns: ['이메일', 'email', '메일', 'e-mail'] },
    { key: 'ticketCount', label: '수량', patterns: ['수량', '인원', 'count', 'ticket', '장', '매수', '티켓'] },
];

function autoDetect(headers) {
    const map = {};
    for (const def of COLUMN_DEFS) {
        const found = headers.find(h =>
            def.patterns.some(p => h.toLowerCase().includes(p.toLowerCase()))
        );
        if (found) map[def.key] = found;
    }
    return map;
}

const AdminBulkImport = ({ eventId }) => {
    const [step, setStep] = useState('idle'); // idle | mapping | importing | done
    const [parsedData, setParsedData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [columnMap, setColumnMap] = useState({});
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
                const jsonData = utils.sheet_to_json(firstSheet, { defval: '' });

                if (jsonData.length === 0) {
                    setError('파일에 데이터가 없습니다.');
                    return;
                }

                const hdrs = Object.keys(jsonData[0]);
                setParsedData(jsonData);
                setHeaders(hdrs);
                setColumnMap(autoDetect(hdrs));
                setStep('mapping');
            } catch {
                setError('파일을 읽을 수 없습니다. 엑셀(.xlsx) 또는 CSV 파일을 확인해주세요.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleMapChange = (key, value) => {
        setColumnMap(prev => {
            const next = { ...prev };
            if (value) next[key] = value;
            else delete next[key];
            return next;
        });
    };

    const getPreviewRows = () => parsedData.slice(0, 5);

    const getMappedValue = (row, key) => {
        const col = columnMap[key];
        if (!col) return key === 'ticketCount' ? '1' : '-';
        const val = row[col];
        return val !== undefined && val !== '' ? String(val) : (key === 'ticketCount' ? '1' : '-');
    };

    const handleImport = async () => {
        if (!columnMap.name) {
            setError('이름 컬럼은 필수입니다.');
            return;
        }
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
                    const name = String(row[columnMap.name] || '').trim();
                    if (!name) { skipped++; continue; }

                    const phone = columnMap.phone ? String(row[columnMap.phone] || '').replace(/[-.\s]/g, '').trim() : '';
                    const email = columnMap.email ? String(row[columnMap.email] || '').trim() : '';
                    const ticketCount = columnMap.ticketCount ? (Number(row[columnMap.ticketCount]) || 1) : 1;

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
            setStep('mapping');
        }
    };

    const handleReset = () => {
        setStep('idle');
        setParsedData([]);
        setHeaders([]);
        setColumnMap({});
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

            {/* Phase 1: File Selection */}
            {step === 'idle' && (
                <div>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={() => fileRef.current?.click()}
                        style={{
                            padding: '0.6rem 1.2rem',
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            color: 'var(--text-primary)',
                            border: '1px dashed rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            width: '100%',
                        }}
                    >
                        파일 선택 (.xlsx, .csv)
                    </button>
                </div>
            )}

            {/* Phase 2: Column Mapping */}
            {step === 'mapping' && (
                <div>
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
                            컬럼 매핑 (파일의 컬럼을 예약 필드에 연결하세요)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '5rem 1fr', gap: '0.4rem 0.75rem', alignItems: 'center' }}>
                            {COLUMN_DEFS.map(def => (
                                <React.Fragment key={def.key}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{def.label}</label>
                                    <select
                                        value={columnMap[def.key] || ''}
                                        onChange={(e) => handleMapChange(def.key, e.target.value)}
                                        style={selectStyle}
                                    >
                                        <option value="">사용 안함</option>
                                        {headers.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Preview Table */}
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>
                        미리보기 (상위 5건)
                    </div>
                    <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                        <table className={classes.table} style={{ fontSize: '0.8rem' }}>
                            <thead>
                                <tr>
                                    <th>이름</th>
                                    <th>연락처</th>
                                    <th>이메일</th>
                                    <th>수량</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getPreviewRows().map((row, i) => (
                                    <tr key={i}>
                                        <td>{getMappedValue(row, 'name')}</td>
                                        <td>{getMappedValue(row, 'phone')}</td>
                                        <td>{getMappedValue(row, 'email')}</td>
                                        <td>{getMappedValue(row, 'ticketCount')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            onClick={handleImport}
                            disabled={!columnMap.name}
                            style={{
                                padding: '0.5rem 1.2rem',
                                backgroundColor: columnMap.name ? '#333' : '#555',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: columnMap.name ? 'pointer' : 'not-allowed',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                            }}
                        >
                            총 {parsedData.length}건 가져오기
                        </button>
                        <button onClick={handleReset} style={ghostBtnStyle}>
                            취소
                        </button>
                    </div>
                </div>
            )}

            {/* Phase 3: Importing */}
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

            {/* Phase 4: Done */}
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

const selectStyle = {
    padding: '0.4rem',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    minWidth: 0,
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
