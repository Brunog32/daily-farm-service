import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, MapPin, Loader2, User, Building2 } from 'lucide-react';
import { doc, getDoc, addDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';

const TamboSettings = ({ id, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(id ? true : false);
    const [saving, setSaving] = useState(false);

    const [tambo, setTambo] = useState({
        name: '',
        location: '',
        owner: '',
    });

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
        }
    }, [id]);

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
                    .modal-card-reborn { background: #fff; width: 100%; max-width: 440px; padding: 32px; border-radius: 28px; position: relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); border: 1px solid #f8fafc; z-index: 10000; }
                    
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
                `}</style>
            </div>
        </div>,
        document.body
    );
};

export default TamboSettings;
