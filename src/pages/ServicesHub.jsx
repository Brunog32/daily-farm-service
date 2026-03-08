import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, ChevronRight, Factory } from 'lucide-react';
import { useDraftService } from '../hooks/useDraftService';
import { useTambos } from '../hooks/useTambos';

const ServicesHub = () => {
    const navigate = useNavigate();
    const { drafts, loading, createServiceDraft, deleteDraft } = useDraftService();
    const { tambos } = useTambos();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTambo, setSelectedTambo] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleStartNew = async () => {
        if (!selectedTambo) {
            alert('Por favor selecciona un establecimiento');
            return;
        }

        setIsCreating(true);
        const tamboObj = tambos.find(t => t.id === selectedTambo);
        if (!tamboObj) {
            setIsCreating(false);
            return;
        }

        const userStorage = localStorage.getItem('df_user');
        let operator = 'operador';
        if (userStorage) {
            const user = JSON.parse(userStorage);
            operator = user.username;
        }

        const newId = await createServiceDraft(tamboObj.id, tamboObj.name, operator);
        setIsCreating(false);
        navigate(`/service-flow/${newId}`);
    };

    return (
        <div className="services-hub-container animate-fade-in pb-20">
            <div className="hub-header">
                <h2>Centro de Operaciones</h2>
                <p>Inicia nuevos services o retoma los que están en curso.</p>
            </div>

            <div className="hub-actions-card">
                <div>
                    <h3>Nuevo Service</h3>
                    <p>Comienza un nuevo reporte técnico para un establecimiento.</p>
                </div>
                <button className="btn-primary-jm" onClick={() => setIsModalOpen(true)}>
                    <Play size={16} fill="currentColor" />
                    <span>Iniciar Ahora</span>
                </button>
            </div>

            <div className="hub-drafts-section">
                <h3 className="section-title">
                    <Clock size={20} className="icon-clock" />
                    Services en Curso
                </h3>

                {loading ? (
                    <div className="empty-drafts" style={{ padding: '32px' }}>
                        <div className="w-8 h-8 mx-auto border-2 border-slate-100 border-t-[#5558fa] rounded-full animate-spin mb-4" />
                        <p style={{ fontSize: '14px' }}>Cargando borradores...</p>
                    </div>
                ) : drafts.length === 0 ? (
                    <div className="empty-drafts">
                        <Clock size={48} className="icon-empty" />
                        <p>No hay services pendientes</p>
                    </div>
                ) : (
                    <div className="drafts-grid">
                        {drafts.map(draft => (
                            <div key={draft.id} className="draft-card" onClick={() => navigate(`/service-flow/${draft.id}`)}>
                                <div>
                                    <div className="draft-card-header">
                                        <div className="draft-badge">Borrador Nube</div>
                                        <button className="delete-draft-btn" onClick={(e) => { e.stopPropagation(); deleteDraft(draft.id); }} title="Eliminar borrador">
                                            ELIMINAR
                                        </button>
                                    </div>
                                    <h4>{draft.tamboName}</h4>
                                    <p className="draft-date">Iniciado: {new Date(draft.createdAt).toLocaleString('es-AR')}</p>
                                </div>
                                <div className="draft-continue">
                                    <span>Continuar</span>
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && createPortal(
                <div className="hub-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="hub-modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <h2>Seleccionar Establecimiento</h2>

                        <div className="modal-form-group">
                            <label>Tambo Destino</label>
                            <div className="hub-select-wrapper">
                                <Factory size={18} className="select-icon" />
                                <select
                                    value={selectedTambo}
                                    onChange={(e) => setSelectedTambo(e.target.value)}
                                >
                                    <option value="">Selecciona un tambo...</option>
                                    {tambos.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="hub-modal-actions">
                            <button className="btn-cancel-modal" onClick={() => setIsModalOpen(false)} disabled={isCreating}>Cancelar</button>
                            <button className="btn-primary-jm" style={{ flex: 1 }} onClick={handleStartNew} disabled={isCreating}>
                                {isCreating ? 'Iniciando...' : 'Iniciar'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                .services-hub-container { max-width: 1000px; margin: 0 auto; padding-bottom: 80px; }
                
                .hub-header { margin-bottom: 40px; }
                .hub-header h2 { font-size: 1.75rem; font-weight: 900; color: #1e293b; margin: 0 0 8px 0; letter-spacing: -0.02em; }
                .hub-header p { font-size: 1rem; font-weight: 600; color: #64748b; margin: 0; }
                
                .hub-actions-card { background: #fff; padding: 32px 40px; border-radius: 24px; border: 1.5px solid #f2f2f2; box-shadow: 0 4px 16px rgba(0,0,0,0.02); display: flex; justify-content: space-between; align-items: center; margin-bottom: 56px; transition: all 0.2s; }
                .hub-actions-card:hover { border-color: #5558fa33; box-shadow: 0 8px 32px rgba(85,88,250,0.06); transform: translateY(-2px); }
                .hub-actions-card h3 { font-size: 1.25rem; font-weight: 900; color: #1e293b; margin: 0 0 6px 0; }
                .hub-actions-card p { font-size: 0.95rem; font-weight: 600; color: #64748b; margin: 0; }
                .btn-primary-jm { display: flex; align-items: center; justify-content: center; gap: 8px; }
                
                .hub-drafts-section { margin-bottom: 40px; }
                .section-title { display: flex; align-items: center; gap: 10px; font-size: 1.25rem; font-weight: 900; color: #1e293b; margin: 0 0 24px 0; }
                .icon-clock { color: #94a3b8; }
                
                .empty-drafts { text-align: center; padding: 64px 40px; background: #f8f9fa; border-radius: 24px; border: 1.5px dashed #e2e8f0; }
                .icon-empty { color: #cbd5e1; margin: 0 auto 16px auto; }
                .empty-drafts p { font-size: 1.15rem; font-weight: 800; color: #94a3b8; margin: 0; }
                
                .drafts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
                .draft-card { background: #fff; padding: 28px; border-radius: 20px; border: 1.5px solid #f2f2f2; box-shadow: 0 4px 12px rgba(0,0,0,0.02); display: flex; flex-direction: column; cursor: pointer; transition: all 0.2s; }
                .draft-card:hover { border-color: #5558fa44; box-shadow: 0 12px 24px rgba(85,88,250,0.08); transform: translateY(-4px); }
                
                .draft-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .draft-badge { background: #fff7ed; color: #ea580c; padding: 6px 14px; border-radius: 10px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; }
                .delete-draft-btn { background: transparent; border: none; color: #f87171; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all 0.2s; }
                .delete-draft-btn:hover { background: #fee2e2; color: #ef4444; }
                
                .draft-card h4 { font-size: 1.25rem; font-weight: 900; color: #1e293b; margin: 0 0 8px 0; }
                .draft-date { font-size: 11px; font-weight: 800; color: #94a3b8; margin: 0 0 32px 0; text-transform: uppercase; letter-spacing: 0.5px; }
                
                .draft-continue { display: flex; align-items: center; justify-content: space-between; font-weight: 800; font-size: 13px; color: #5558fa; margin-top: auto; }
                
                .hub-modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.2); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex !important; align-items: center; justify-content: center; z-index: 9999; padding: 20px; transition: all 0.3s ease; }
                .hub-modal-content { background: #fff; padding: 32px; border-radius: 24px; width: 100%; max-width: 440px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); border: 1px solid #f2f2f2; position: relative; }
                .hub-modal-content h2 { font-size: 1.5rem; font-weight: 900; color: #1e293b; margin: 0 0 24px 0; text-align: center; }
                
                .modal-form-group { margin-bottom: 32px; }
                .modal-form-group label { display: block; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; margin-left: 4px; }
                
                .hub-select-wrapper { position: relative; }
                .select-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #bbb; pointer-events: none; z-index: 2; }
                .hub-select-wrapper select { width: 100%; background: #fdfdfd; border: 2px solid #f2f2f2; border-radius: 12px; padding: 0 16px 0 46px; height: 48px; font-size: 0.9375rem; font-weight: 800; color: #111; outline: none; appearance: none; transition: all 0.2s; cursor: pointer; position: relative; z-index: 1; }
                .hub-select-wrapper select:focus { border-color: #5558fa33; background: #fff; color: #5558fa; }
                
                .hub-modal-actions { display: flex; gap: 12px; justify-content: center; margin-top: 32px; }
                .btn-cancel-modal { padding: 0 32px; height: 44px; background: transparent; color: #475569; font-size: 14px; font-weight: 800; border: none; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
                .btn-cancel-modal:hover { background: #f1f5f9; color: #1e293b; }
                .hub-modal-actions .btn-primary-jm { padding: 0 40px; height: 44px; font-size: 14px; box-shadow: 0 4px 12px rgba(85,88,250,0.2) !important; }
                
                @media (max-width: 1024px) {
                    .services-hub-container { padding: 0 4px; }
                    .hub-header { margin-bottom: 24px; }
                    .hub-header h2 { font-size: 1.5rem; }
                    .hub-header p { font-size: 0.875rem; }
                    
                    .hub-actions-card { 
                        flex-direction: column; 
                        text-align: center; 
                        padding: 24px; 
                        gap: 20px; 
                        margin-bottom: 32px; 
                    }
                    .hub-actions-card h3 { font-size: 1.15rem; }
                    .hub-actions-card p { font-size: 0.85rem; margin-bottom: 4px; }
                    .hub-actions-card .btn-primary-jm { width: 100%; height: 48px; }
                    
                    .drafts-grid { grid-template-columns: 1fr; gap: 16px; }
                    .draft-card { padding: 20px; }
                    .draft-card h4 { font-size: 1.1rem; }
                    
                    .hub-modal-content { padding: 24px; border-radius: 20px; }
                    .hub-modal-content h2 { font-size: 1.25rem; margin-bottom: 20px; }
                    .modal-form-group { margin-bottom: 24px; }
                    .hub-modal-actions { flex-direction: column-reverse; gap: 8px; }
                    .btn-cancel-modal { width: 100%; height: 48px; order: 2; }
                    .hub-modal-actions .btn-primary-jm { width: 100%; height: 48px; order: 1; }
                }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeScaleIn { from { opacity: 0; transform: scale(0.98) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                @keyframes slideUpFade { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                
                .animate-fade-in { animation: fadeScaleIn 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
                .animate-slide-up { animation: slideUpFade 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
            `}</style>
        </div>
    );
};

export default ServicesHub;
