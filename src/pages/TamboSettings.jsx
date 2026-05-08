import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, MapPin, Loader2, User, Building2, UploadCloud, FileSpreadsheet, Trash2, CheckCircle2, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { doc, getDoc, addDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import ExcelJS from 'exceljs';

const TamboSettings = ({ id, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(id ? true : false);
    const [saving, setSaving] = useState(false);

    const [tambo, setTambo] = useState({
        name: '',
        location: '',
        owner: '',
    });

    const [template, setTemplate] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [showSpecs, setShowSpecs] = useState(false);
    const [openSheets, setOpenSheets] = useState(new Set());

    useEffect(() => {
        if (id) {
            getDoc(doc(db, 'tambos', id)).then(snap => {
                if (snap.exists()) {
                    const data = snap.data();
                    setTambo({
                        id: snap.id,
                        name: data.name || '',
                        location: data.location || '',
                        owner: data.owner || ''
                    });
                }
                setLoading(false);
            });

            // Fetch existing template
            const templateQuery = query(collection(db, 'tambo_templates'), where('tamboId', '==', id));
            getDocs(templateQuery).then(snap => {
                if (!snap.empty) {
                    setTemplate({
                        id: snap.docs[0].id,
                        ...snap.docs[0].data()
                    });
                }
            });
        }
    }, [id]);

    const handleFileUpload = async (file) => {
        if (!id) return alert('Primero guarda el tambo antes de subir una plantilla');
        if (!file.name.endsWith('.xlsx')) return alert('Solo se admiten archivos .xlsx');

        setUploading(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const arrayBuffer = await file.arrayBuffer();
            await workbook.xlsx.load(arrayBuffer);

            // Estructura esperada: col B = label, col C = valor, múltiples hojas temáticas
            const specs = {};
            let totalFields = 0;

            const getCellText = (cell) => {
                const v = cell.value;
                if (v === null || v === undefined) return '';
                if (typeof v === 'string') return v.trim();
                if (typeof v === 'number') return String(v);
                if (typeof v === 'object') {
                    if (v.richText) return v.richText.map(r => r.text || '').join('').trim();
                    if (v.text) return String(v.text).trim();
                    if (v.result !== undefined) return String(v.result).trim();
                }
                return String(v).trim();
            };

            workbook.eachSheet((worksheet) => {
                const sheetData = [];
                worksheet.eachRow((row) => {
                    if (row.number === 1) return; // skip header row
                    const label = getCellText(row.getCell(2));
                    const value = getCellText(row.getCell(3));
                    if (label) {
                        const cleanLabel = label.replace(/:$/, '');
                        sheetData.push({ label: cleanLabel, value });
                        totalFields++;
                    }
                });
                if (sheetData.length > 0) {
                    specs[worksheet.name] = sheetData;
                }
            });

            const templateData = {
                tamboId: id,
                fileName: file.name,
                uploadedAt: new Date().toISOString(),
                totalFields,
                specs,
            };

            if (template?.id) {
                await deleteDoc(doc(db, 'tambo_templates', template.id));
            }

            const docRef = await addDoc(collection(db, 'tambo_templates'), templateData);
            setTemplate({ id: docRef.id, ...templateData });

        } catch (err) {
            console.error('Error uploading template:', err);
            alert('Error al procesar el archivo Excel');
        } finally {
            setUploading(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleDeleteTemplate = async () => {
        if (!template?.id) return;
        if (!confirm('¿Estás seguro de eliminar la plantilla actual?')) return;

        try {
            await deleteDoc(doc(db, 'tambo_templates', template.id));
            setTemplate(null);
        } catch (err) {
            alert('Error al eliminar plantilla');
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!tambo.name) return alert('El nombre es obligatorio');
        setSaving(true);
        try {
            if (id) {
                await updateDoc(doc(db, 'tambos', id), tambo);
            } else {
                await addDoc(collection(db, 'tambos'), {
                    ...tambo,
                    createdAt: new Date().toISOString()
                });
            }
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            alert('Error al guardar establecimiento');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return createPortal(
        <div className="modal-overlay animate-fade-in">
            <div className="modal-card-reborn flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-2 border-slate-100 border-t-[#5558fa] rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Cargando...</p>
            </div>
        </div>,
        document.body
    );

    return createPortal(
        <div className="modal-overlay animate-fade-in" onClick={onClose}>
            <div className="modal-card-reborn animate-slide-up !max-w-[440px] w-full overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <button className="close-modal-btn" onClick={onClose}>
                    <X size={20} strokeWidth={2.5} />
                </button>

                <div className="mb-8 flex items-center gap-4 border-b border-slate-50 pb-6">
                    <div className="flex items-center justify-center w-12 h-12 bg-[#5558fa15] text-[#5558fa] rounded-xl flex-shrink-0">
                        <Building2 size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">{id ? 'Editar Tambo' : 'Nuevo Tambo'}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 line-clamp-1">Configuración del Establecimiento</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="flex flex-col gap-5">
                    <div className="input-group-jm">
                        <label>Nombre</label>
                        <div className="input-with-icon-jm">
                            <Building2 size={18} />
                            <input
                                type="text"
                                placeholder="..."
                                value={tambo.name}
                                onChange={e => setTambo({ ...tambo, name: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group-jm">
                        <label>Ubicación</label>
                        <div className="input-with-icon-jm">
                            <MapPin size={18} />
                            <input
                                type="text"
                                placeholder="..."
                                value={tambo.location}
                                onChange={e => setTambo({ ...tambo, location: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="input-group-jm">
                        <label>Dueño</label>
                        <div className="input-with-icon-jm">
                            <User size={18} />
                            <input
                                type="text"
                                placeholder="..."
                                value={tambo.owner}
                                onChange={e => setTambo({ ...tambo, owner: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="divider-jm my-4" />

                    <div className="template-section">
                        <label className="section-label-jm mb-3 px-1 block">Plantilla de Instalaciones</label>

                        {!id ? (
                            <div className="template-alert-box">
                                <p>Guarda el tambo para habilitar la carga de plantilla</p>
                            </div>
                        ) : template ? (
                            <div>
                                <div className="template-info-card">
                                    <div className="template-info-top">
                                        <FileSpreadsheet size={16} className="template-info-icon" />
                                        <span className="template-info-date">Planilla cargada el {new Date(template.uploadedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                        <button type="button" className="template-delete-btn" onClick={handleDeleteTemplate} title="Eliminar planilla">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>

                                    {template.specs && (
                                        <button
                                            type="button"
                                            className="specs-toggle-btn"
                                            onClick={() => setShowSpecs(v => !v)}
                                        >
                                            <Eye size={13} />
                                            <span>{showSpecs ? 'Ocultar planilla' : 'Ver planilla'}</span>
                                            {showSpecs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                        </button>
                                    )}
                                </div>

                                {showSpecs && template.specs && (
                                    <div className="specs-viewer">
                                        {Object.entries(template.specs).map(([sheetName, fields]) => {
                                            // Soporte para formato nuevo (array) y viejo (objeto)
                                            const entries = Array.isArray(fields)
                                                ? fields.filter(({ value }) => value && String(value).trim())
                                                : Object.entries(fields).filter(([, v]) => v && String(v).trim()).map(([label, value]) => ({ label, value }));
                                            if (entries.length === 0) return null;
                                            const isOpen = openSheets.has(sheetName);
                                            const toggle = () => setOpenSheets(prev => {
                                                const next = new Set(prev);
                                                isOpen ? next.delete(sheetName) : next.add(sheetName);
                                                return next;
                                            });
                                            return (
                                                <div key={sheetName} className="specs-sheet-block">
                                                    <button type="button" className="specs-sheet-header" onClick={toggle}>
                                                        <span>{sheetName}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span className="specs-count">{entries.length}</span>
                                                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        </div>
                                                    </button>
                                                    {isOpen && (
                                                        <div className="specs-fields-list">
                                                            {entries.map(({ label, value }) => (
                                                                <div key={label} className="specs-field-row">
                                                                    <span className="specs-field-label">{label}</span>
                                                                    <span className="specs-field-value">{value}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                className={`template-upload-area ${dragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    id="template-input"
                                    style={{ display: 'none' }}
                                    accept=".xlsx"
                                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                                    disabled={uploading}
                                />
                                <label htmlFor="template-input" className="upload-label-trigger">
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="loading-spinner-container">
                                                <Loader2 size={24} className="animate-spin text-[#5558fa]" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analizando Excel...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="upload-icon-wrapper">
                                                <UploadCloud size={28} className="text-[#5558fa]" />
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1">Cargar Plantilla</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Suelta aquí o haz click para buscar</div>
                                            </div>
                                        </div>
                                    )}
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="modal-actions-container">
                        <button type="button" className="btn-action-modern btn-cancel" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-action-modern btn-save" disabled={saving}>
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                        </button>
                    </div>
                </form>

                <style>{`
                    .input-group-jm label { font-size: 10px; font-weight: 950; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.12em; display: block; margin-bottom: 8px; margin-left: 4px; }
                    .input-with-icon-jm { display: flex; align-items: center; gap: 12px; background: #fff; border: 1.5px solid #f1f5f9; border-radius: 14px; padding: 0 16px; height: 52px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); color: #cbd5e1; }
                    .input-with-icon-jm:focus-within { border-color: #5558fa; background: #fff; color: #5558fa; box-shadow: 0 0 0 4px rgba(85, 88, 250, 0.08); }
                    .input-with-icon-jm input { flex: 1; border: none; background: transparent; outline: none; font-size: 0.9375rem; font-weight: 700; color: #1e293b; height: 100%; }
                    .input-with-icon-jm input::placeholder { color: #e2e8f0; font-weight: 500; }
                    
                    .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex !important; align-items: center; justify-content: center; z-index: 9999; padding: 20px; transition: all 0.3s ease; }
                    .modal-card-reborn { background: #fff; width: 100%; max-width: 440px; padding: 32px; border-radius: 28px; position: relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); border: 1px solid #f8fafc; z-index: 10000; overflow-y: auto; max-height: 90vh; -webkit-overflow-scrolling: touch; }
                    
                    @keyframes slideUpFade { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
                    .animate-slide-up { animation: slideUpFade 0.4s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
                    
                    .close-modal-btn { position: absolute; top: 20px; right: 20px; width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px solid #f1f5f9; color: #94a3b8; cursor: pointer; transition: all 0.2s; z-index: 10; }
                    .close-modal-btn:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }
                    
                    .modal-actions-container { display: flex; align-items: center; gap: 12px; width: 100%; margin-top: 32px; padding-top: 24px; border-top: 1.5px solid #f8fafc; }
                    .btn-action-modern { flex: 1; height: 52px; border-radius: 14px; font-weight: 800; font-size: 0.875rem; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); border: none; }
                    
                    .btn-cancel { background: #f8fafc; color: #64748b; border: 1.5px solid #f1f5f9; }
                    .btn-cancel:hover { background: #f1f5f9; color: #1e293b; border-color: #e2e8f0; }
                    
                    .btn-save { background: #111; color: #fff; box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.15); }
                    .btn-save:hover { background: #000; transform: translateY(-2px); box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.25); }
                    .btn-save:active { transform: translateY(0); }
                    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

                    .divider-jm { height: 1.5px; background: #f8fafc; margin: 12px 0; }
                    
                    .section-label-jm { font-size: 10px; font-weight: 950; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.12em; display: block; }

                    .specs-toggle-btn { display: flex; align-items: center; gap: 6px; margin-top: 12px; padding: 6px 12px; background: #fff; border: 1.5px solid #dcfce7; border-radius: 10px; font-size: 10px; font-weight: 900; color: #10b981; text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer; transition: all 0.2s; width: 100%; justify-content: center; }
                    .specs-toggle-btn:hover { background: #f0fdf4; border-color: #86efac; }

                    .specs-viewer { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
                    .specs-sheet-block { background: #f8fafc; border-radius: 14px; overflow: hidden; border: 1.5px solid #f1f5f9; }
                    .specs-sheet-header { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: transparent; border: none; cursor: pointer; font-size: 10px; font-weight: 900; color: #334155; text-transform: uppercase; letter-spacing: 1px; transition: background 0.15s; }
                    .specs-sheet-header:hover { background: #f1f5f9; }
                    .specs-count { font-size: 9px; font-weight: 900; color: #10b981; background: #dcfce7; border-radius: 6px; padding: 2px 6px; }
                    .specs-fields-list { padding: 4px 0 8px 0; }
                    .specs-field-row { display: flex; justify-content: space-between; align-items: baseline; padding: 5px 14px; gap: 12px; }
                    .specs-field-row:not(:last-child) { border-bottom: 1px solid #f1f5f9; }
                    .specs-field-label { font-size: 10px; font-weight: 700; color: #64748b; flex: 1; min-width: 0; }
                    .specs-field-value { font-size: 11px; font-weight: 900; color: #111; white-space: nowrap; background: #fefce8; border: 1px solid #fde68a; border-radius: 6px; padding: 1px 6px; }

                    .template-section { margin-top: 4px; }
                    .template-alert-box { background: #fffcf0; border: 1.5px dashed #fde68a; border-radius: 18px; padding: 20px; text-align: center; }
                    .template-alert-box p { font-size: 10px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 0.05em; }
                    
                    .template-info-card { background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 20px; padding: 16px 20px; }
                    .template-info-top { display: flex; align-items: center; gap: 8px; }
                    .template-info-icon { color: #10b981; flex-shrink: 0; }
                    .template-info-date { font-size: 12px; font-weight: 700; color: #166534; flex: 1; }
                    .template-delete-btn { width: 28px; height: 28px; border-radius: 8px; border: none; background: transparent; color: #86efac; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
                    .template-delete-btn:hover { background: #fee2e2; color: #ef4444; }
                    
                    .template-upload-area { border: 2px dashed #e2e8f0; border-radius: 20px; padding: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: #f8fafc50; min-height: 140px; }
                    .template-upload-area:hover { border-color: #5558fa; background: #5558fa05; transform: translateY(-2px); }
                    .template-upload-area.active { border-color: #5558fa; background: #5558fa10; transform: scale(1.02); box-shadow: 0 12px 24px -12px rgba(85, 88, 250, 0.2); }
                    .template-upload-area.uploading { opacity: 0.8; cursor: wait; border-style: solid; }
                    
                    .upload-label-trigger { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 32px 20px; }
                    .upload-icon-wrapper { width: 56px; height: 56px; background: #fff; border-radius: 18px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(85, 88, 250, 0.1); margin-bottom: 4px; transition: all 0.2s; }
                    .template-upload-area:hover .upload-icon-wrapper { transform: scale(1.1) rotate(5deg); box-shadow: 0 8px 16px rgba(85, 88, 250, 0.15); }
                    
                    .loading-spinner-container { width: 48px; height: 48px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(85, 88, 250, 0.1); }
                `}</style>
            </div>
        </div>,
        document.body
    );
};

export default TamboSettings;
