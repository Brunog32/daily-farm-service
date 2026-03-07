import { ClipboardList, ChevronRight, Settings2, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChecklists } from '../hooks/useChecklists';

const Checklists = () => {
    const navigate = useNavigate();
    const { checklists, loading } = useChecklists();

    const getGroupLabel = (key) => {
        const labels = {
            PRE_SERVICE: 'Preparación Preliminar',
            FIELD_SERVICE: 'Ejecución en Campo'
        };
        return labels[key] || key;
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-60 gap-4">
            <div className="w-12 h-12 border-2 border-slate-100 border-t-[#5558fa] rounded-full animate-spin" />
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center">Sincronizando Protocolos...</p>
        </div>
    );

    // Group sections by their group field
    const groupedSections = checklists.reduce((acc, section) => {
        const group = section.group || 'OTHER';
        if (!acc[group]) acc[group] = [];
        acc[group].push(section);
        return acc;
    }, {});

    return (
        <div className="checklists-templates animate-fade-in pb-20">


            <div className="sections-container">
                {['PRE_SERVICE', 'FIELD_SERVICE'].map(groupKey => {
                    const sections = groupedSections[groupKey] || [];
                    if (sections.length === 0) return null;
                    return (
                        <div key={groupKey} className="group-wrapper">
                            <div className="group-header-refined">
                                <Settings2 size={16} className="text-[#bbb]" />
                                <h2 className="group-title-label-refined">{getGroupLabel(groupKey)}</h2>
                            </div>

                            <div className="checklist-grid-layout">
                                {sections.map(section => (
                                    <div key={section.id} className="template-card-modern shadow-soft">
                                        <div className="card-top-header">
                                            <div className="icon-badge-centered">
                                                <ClipboardList size={22} color="#5558fa" strokeWidth={2.5} />
                                            </div>
                                            <div className="info-main">
                                                <h3 className="section-title-h3">{section.title}</h3>
                                                <div className="items-chip">{section.items.length} ÍTEMS VERIFICABLES</div>
                                            </div>
                                        </div>

                                        <button
                                            className="btn-edit-template-jm"
                                            onClick={() => navigate(`/checklists/edit/${section.id}`)}
                                        >
                                            <span>Editar Plantilla</span>
                                            <div className="chevron-circle-jm">
                                                <ChevronRight size={14} strokeWidth={3} />
                                            </div>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {checklists.length === 0 && (
                    <div className="empty-checklists-state">
                        <Database size={48} className="text-slate-100 mb-6" />
                        <h3 className="text-2xl font-black text-slate-800">Plantillas Vacías</h3>
                        <p className="text-slate-400 font-bold text-sm">No hay plantillas en la base de datos operativa.</p>
                        <button onClick={() => navigate('/settings')} className="btn-primary-jm mt-10">
                            Ir a Administración para Sincronizar
                        </button>
                    </div>
                )}
            </div>

            <style>{`
        .sections-container { display: flex; flex-direction: column; gap: 80px; }
        
        .group-header-refined { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; border-bottom: 2px solid #f9f9f9; padding-bottom: 16px; width: 100%; }
        .group-title-label-refined { text-transform: uppercase; font-size: 11px; font-weight: 900; letter-spacing: 2px; color: #999; margin: 0 !important; }
        
        .checklist-grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 32px; }
        
        .template-card-modern { background: white; border: 1.5px solid #f6f6f6; border-radius: 28px; padding: 32px; transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1); display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
        .template-card-modern:hover { transform: translateY(-8px); border-color: #5558fa33; box-shadow: 0 20px 40px rgba(0,0,0,0.03); }
        
        .card-top-header { display: flex; align-items: center; gap: 24px; margin-bottom: 40px; }
        
        .info-main { display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
        .section-title-h3 { margin: 0 !important; font-size: 1.25rem; font-weight: 900; color: #111; tracking-tight: -0.01em; }
        .items-chip { display: inline-block; font-size: 9px; font-weight: 900; color: #5558fa; background: #f0f1ff; padding: 4px 12px; border-radius: 50px; text-transform: uppercase; width: fit-content; letter-spacing: 1px; }
        
        .btn-edit-template-jm { background: #fdfdfd; border: 1.5px solid #f2f2f2; border-radius: 50px; padding: 12px 28px; display: flex; align-items: center; justify-content: space-between; color: #111; font-weight: 800; font-size: 13px; width: 100%; cursor: pointer; transition: all 0.2s; }
        .btn-edit-template-jm:hover { background: #111; color: #fff; border-color: #111; }
        
        .chevron-circle-jm { width: 24px; height: 24px; background: rgba(0,0,0,0.04); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .btn-edit-template-jm:hover .chevron-circle-jm { background: rgba(255,255,255,0.1); }

        .empty-checklists-state { padding: 120px 40px; text-align: center; background: #fafafa; border-radius: 40px; border: 3px dashed #f0f0f0; display: flex; flex-direction: column; align-items: center; }

        @media (max-width: 768px) {
          .sections-container { gap: 40px; }
          .group-header-refined { margin-bottom: 20px; }
          .checklist-grid-layout { grid-template-columns: 1fr; gap: 16px; }
          .template-card-modern { padding: 20px; border-radius: 20px; }
          .card-top-header { gap: 16px; margin-bottom: 24px; }
          .section-title-h3 { font-size: 1.1rem; }
          .icon-badge-centered svg { width: 18px; height: 18px; }
          .btn-edit-template-jm { padding: 10px 20px; font-size: 12px; }
        }
      `}</style>
        </div>
    );
};

export default Checklists;
