import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Plus, Trash2, MapPin, Loader2, User } from 'lucide-react';
import { doc, getDoc, addDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';

const TamboSettings = ({ id, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(id ? true : false);
    const [saving, setSaving] = useState(false);

    const [tambo, setTambo] = useState({
        name: '',
        location: '',
        owner: '',
        features: []
    });

    useEffect(() => {
        if (id) {
            getDoc(doc(db, 'tambos', id)).then(snap => {
                if (snap.exists()) setTambo({ id: snap.id, ...snap.data() });
                setLoading(false);
            });
        }
    }, [id]);

    const handleSave = async (e) => {
        e.preventDefault();
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

    const addFeature = () => {
        setTambo({ ...tambo, features: [...(tambo.features || []), { name: '', value: '' }] });
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
            <div className="modal-card-reborn animate-slide-up !max-w-[800px] w-[95vw] overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <button className="close-modal-btn" onClick={onClose}>
                    <X size={20} strokeWidth={2.5} />
                </button>

                <div className="mb-8">
                    <h3 className="text-xl font-black text-slate-800">{id ? 'Editar Tambo' : 'Nuevo Tambo'}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Detalles del Establecimiento</p>
                </div>

                <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* INFORMACIÓN GENERAL */}
                    <div className="flex flex-col gap-6">
                        <div className="input-group-jm">
                            <label>Nombre Comercial</label>
                            <div className="input-with-icon-jm">
                                <input
                                    type="text"
                                    placeholder="Ej: Las Lilas II"
                                    value={tambo.name}
                                    onChange={e => setTambo({ ...tambo, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="input-group-jm">
                            <label>Ubicación Geográfica</label>
                            <div className="input-with-icon-jm">
                                <MapPin size={18} />
                                <input
                                    type="text"
                                    placeholder="Localidad, Provincia"
                                    value={tambo.location}
                                    onChange={e => setTambo({ ...tambo, location: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="input-group-jm">
                            <label>Productor Responsable</label>
                            <div className="input-with-icon-jm">
                                <User size={18} />
                                <input
                                    type="text"
                                    placeholder="Nombre Completo"
                                    value={tambo.owner}
                                    onChange={e => setTambo({ ...tambo, owner: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* CARACTERÍSTICAS TÉCNICAS */}
                    <div className="flex flex-col gap-4">
                        <div className="features-editor-area">
                            <div className="flex flex-col gap-3">
                                {tambo.features?.map((feat, idx) => (
                                    <div key={idx} className="feature-edit-row flex gap-3 animate-fade-in group">
                                        <input
                                            type="text"
                                            className="flex-1"
                                            placeholder="Atributo"
                                            value={feat.name}
                                            onChange={e => {
                                                const newFeat = [...tambo.features];
                                                newFeat[idx].name = e.target.value;
                                                setTambo({ ...tambo, features: newFeat });
                                            }}
                                        />
                                        <input
                                            type="text"
                                            className="flex-1"
                                            placeholder="Valor"
                                            value={feat.value}
                                            onChange={e => {
                                                const newFeat = [...tambo.features];
                                                newFeat[idx].value = e.target.value;
                                                setTambo({ ...tambo, features: newFeat });
                                            }}
                                        />
                                        <button type="button" className="w-12 h-12 rounded-xl bg-white border border-slate-100 text-red-100 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-center flex-shrink-0" onClick={() => {
                                            setTambo({ ...tambo, features: tambo.features.filter((_, i) => i !== idx) });
                                        }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button type="button" className="btn-add-feature-jm" onClick={addFeature}>
                                <Plus size={16} strokeWidth={3} />
                                <span>Añadir Especificación</span>
                            </button>
                        </div>
                    </div>
                </form>

                <div className="modal-actions-container !justify-end mt-12 pt-8 border-t border-slate-50">
                    <button type="button" className="btn-secondary-jm !h-[44px] !px-8" onClick={onClose}>Cancelar</button>
                    <button type="button" className="btn-primary-jm px-10 h-[44px] text-sm shadow-soft" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                    </button>
                </div>

                <style>{`
                    .input-group-jm label { font-size: 10px; font-weight: 900; color: #bbb; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px; margin-left: 4px; }
                    .input-with-icon-jm { display: flex; align-items: center; gap: 12px; background: #fdfdfd; border: 2px solid #f2f2f2; border-radius: 12px; padding: 0 16px; height: 48px; transition: all 0.2s; color: #ccc; }
                    .input-with-icon-jm:focus-within { border-color: #5558fa33; background: #fff; color: #5558fa; }
                    .input-with-icon-jm input { flex: 1; border: none; background: transparent; outline: none; font-size: 0.9375rem; font-weight: 800; color: #111; height: 100%; }
                    
                    .features-editor-area .feature-edit-row input { height: 48px; font-size: 0.8125rem; background: #fdfdfd; border: 2px solid #f2f2f2; border-radius: 12px; font-weight: 800; padding: 0 16px; outline: none; }
                    .features-editor-area .feature-edit-row input:focus { background: #fff; border-color: #5558fa33; }
                    .feature-edit-row .w-12.h-12 { width: 48px; height: 48px; border-radius: 12px; border-width: 2px; }

                    .btn-add-feature-jm { width: 100%; margin-top: 24px; padding: 18px 0; display: flex; align-items: center; justify-content: center; gap: 12px; background: #fafafa; border: 2px dashed #eee; border-radius: 16px; color: #bbb; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; }
                    .btn-add-feature-jm:hover { background: #fff; border-color: #5558fa33; color: #5558fa; }

                    /* MODAL OVERRIDES FOR TAMBO SETTINGS */
                    .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.2); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex !important; align-items: center; justify-content: center; z-index: 9999; padding: 20px; transition: all 0.3s ease; }
                    .modal-card-reborn { background: #fff; width: 100%; max-width: 440px; padding: 32px; border-radius: 24px; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.08); border: 1px solid #f2f2f2; z-index: 10000; }
                    @keyframes slideUpFade { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                    .animate-slide-up { animation: slideUpFade 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
                    .close-modal-btn { position: absolute; top: 20px; right: 20px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #fdfdfd; border: 1.5px solid #f2f2f2; color: #a1a1aa; cursor: pointer; transition: all 0.2s; }
                    .close-modal-btn:hover { background: #f4f4f5; color: #111; transform: scale(1.05); }
                    .modal-actions-container { display: flex; justify-content: center; margin-top: 32px; width: 100%; gap: 12px; }
                `}</style>
            </div>
        </div>,
        document.body
    );
};

export default TamboSettings;
