import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, CheckCircle2, Clock, ClipboardCheck, Box, Zap, Snowflake, Utensils, Droplets, Gauge, ShieldAlert, Activity, ChevronRight, Layers } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useServices } from '../hooks/useServices';
import { useChecklists } from '../hooks/useChecklists';
import Checklist from '../components/Checklist';
import MaterialsChecklist from '../components/MaterialsChecklist';
import { exportServiceToExcel } from '../utils/exporter';

const ServiceExecution = () => {
    const { tamboId } = useParams();
    const navigate = useNavigate();
    const { addService } = useServices();
    const { checklists, loading: loadingChecklists } = useChecklists();

    const [tambo, setTambo] = useState(null);
    const [formData, setFormData] = useState({
        operator: 'Operador',
        date: new Date().toLocaleDateString('es-AR'),
        startTime: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        sections: {}
    });

    const [activeGroup, setActiveGroup] = useState('PRE_SERVICE');
    const [activeChecklistId, setActiveChecklistId] = useState('');

    useEffect(() => {
        const user = localStorage.getItem('df_user');
        if (user) {
            const userData = JSON.parse(user);
            setFormData(prev => ({
                ...prev,
                operator: `${userData.name} ${userData.lastName}`,
                operatorImg: userData.img || ''
            }));
        }

        if (tamboId) {
            getDoc(doc(db, 'tambos', tamboId)).then(snap => {
                if (snap.exists()) setTambo(snap.data());
            });
        }
    }, [tamboId]);

    useEffect(() => {
        if (!loadingChecklists && checklists.length > 0) {
            const groupChecklists = checklists.filter(c => c.group === activeGroup);
            if (groupChecklists.length > 0) {
                setActiveChecklistId(groupChecklists[0].id);
            } else {
                setActiveChecklistId('');
            }
        }
    }, [loadingChecklists, checklists, activeGroup]);

    const handleStatusChange = (sectionId, itemIndex, status) => {
        setFormData(prev => ({
            ...prev,
            sections: {
                ...prev.sections,
                [sectionId]: {
                    ...prev.sections[sectionId],
                    [itemIndex]: status
                }
            }
        }));
    };

    const handleFinish = async () => {
        const serviceRecord = {
            ...formData,
            tamboId,
            tamboName: tambo?.name || 'Establecimiento desconocido',
            endTime: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
            status: 'completado'
        };

        try {
            await addService(serviceRecord);
            await exportServiceToExcel(serviceRecord, checklists);
            alert('Servicio finalizado con éxito. Reporte generado.');
            navigate('/services');
        } catch (error) {
            console.error('Error al finalizar:', error);
            alert('Error al guardar el servicio.');
        }
    };

    const getSectionIcon = (title, group) => {
        const t = title.toLowerCase();
        if (t.includes('frio')) return <Snowflake size={16} />;
        if (t.includes('comederos')) return <Utensils size={16} />;
        if (t.includes('ordeñe')) return <Gauge size={16} strokeWidth={2.5} />;
        if (t.includes('plomeria') || t.includes('agua')) return <Droplets size={16} />;
        if (t.includes('electrico')) return <Zap size={16} />;
        if (t.includes('materiales') || group === 'MATERIALS') return <Box size={16} />;
        if (t.includes('preparacion') || group === 'PRE_SERVICE') return <ShieldAlert size={16} />;
        return <ClipboardCheck size={16} />;
    };

    if (loadingChecklists) return (
        <div className="flex flex-col items-center justify-center py-60 gap-4">
            <div className="w-10 h-10 border-2 border-slate-100 border-t-[#5558fa] rounded-full animate-spin" />
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center">Iniciando Protocolos Técnicos...</p>
        </div>
    );

    const groupChecklists = checklists.filter(c => c.group === activeGroup);
    const activeSection = groupChecklists.find(c => c.id === activeChecklistId);

    const getProgress = (section) => {
        const itemsCount = section.items.length;
        const responses = formData.sections[section.id] ? Object.keys(formData.sections[section.id]).length : 0;
        return { itemsCount, responses, isCompleted: itemsCount > 0 && responses >= itemsCount };
    };

    return (
        <div className="service-execution-refined animate-fade-in max-w-[1000px] mx-auto pb-20">

            {/* HEADER COMPACTO CON BOTONES A LA DERECHA */}
            <div className="execution-top-bar">
                <div className="top-info">
                    <div className="execution-badge">
                        <Activity size={12} color="#5558fa" />
                        <span>Ejecutando</span>
                    </div>
                    <h2>{tambo?.name || 'Establecimiento...'}</h2>
                </div>

                <div className="execution-actions">
                    <button className="btn-secondary-jm btn-sm" onClick={() => navigate('/tambos')}>
                        Cancelar
                    </button>
                    <button className="btn-primary-jm btn-sm" onClick={handleFinish}>
                        <CheckCircle2 size={14} />
                        <span>Finalizar</span>
                    </button>
                </div>
            </div>

            {/* TABS PRINCIPALES */}
            <div className="main-tabs-container">
                {[
                    { id: 'PRE_SERVICE', label: 'Pre-Servicio', icon: <ShieldAlert size={16} /> },
                    { id: 'MATERIALS', label: 'Materiales', icon: <Box size={16} /> },
                    { id: 'FIELD_SERVICE', label: 'Service Tambo', icon: <Layers size={16} /> }
                ].map(tab => (

                    <button
                        key={tab.id}
                        className={`group-tab-btn ${activeGroup === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveGroup(tab.id)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="execution-layout">

                {/* LISTA DE CHECKLISTS LATERAL (SUB-TABS) */}
                <div className="sidebar-checklists">
                    <h3>Checklists Activos</h3>
                    {groupChecklists.map(section => {
                        const { isCompleted, responses, itemsCount } = getProgress(section);
                        const isActive = activeChecklistId === section.id;
                        return (
                            <button
                                key={section.id}
                                className={`sub-tab-btn ${isActive ? 'active' : ''}`}
                                onClick={() => setActiveChecklistId(section.id)}
                            >
                                <div className="sub-tab-header">
                                    <div className="sub-tab-title">
                                        <div className="icon-wrapper">
                                            {getSectionIcon(section.title, section.group)}
                                        </div>
                                        <span>{section.title}</span>
                                    </div>
                                    {isCompleted && <CheckCircle2 size={14} className="icon-check" />}
                                </div>
                                <div className="sub-tab-progress">
                                    <span>{responses}/{itemsCount} COMPLETADO</span>
                                    <div className="progress-bar-bg">
                                        <div className={`progress-bar-fill ${isCompleted ? 'completed' : ''}`} style={{ width: `${(responses / itemsCount) * 100}%` }} />
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    {groupChecklists.length === 0 && (
                        <div className="empty-sidebar">
                            <span>No hay listas aquí</span>
                        </div>
                    )}
                </div>

                {/* CONTENIDO DEL CHECKLIST ACTIVO */}
                <div className="active-checklist-content">
                    {activeSection ? (
                        <div key={activeSection.id} className="checklist-render-card animate-fade-in">
                            <div className="checklist-render-header">
                                <div>
                                    <h3>{activeSection.title}</h3>
                                    {activeSection.group !== 'MATERIALS' && (
                                        <p>{activeSection.items.length} puntos de verificación</p>
                                    )}
                                </div>
                                <div className="icon-badge-centered" style={{ background: '#f8f9fa', color: '#94a3b8' }}>
                                    {getSectionIcon(activeSection.title, activeSection.group)}
                                </div>
                            </div>

                            <div className="minimal-checklists-wrapper">
                                {activeSection.group === 'MATERIALS' ? (
                                    <MaterialsChecklist
                                        title={activeSection.title}
                                        items={activeSection.items}
                                        values={formData.sections[activeSection.id] || {}}
                                        onChange={(idx, val) => handleStatusChange(activeSection.id, idx, val)}
                                    />
                                ) : (
                                    <Checklist
                                        title={activeSection.title}
                                        items={activeSection.items}
                                        values={formData.sections[activeSection.id] || {}}
                                        onChange={(idx, val) => handleStatusChange(activeSection.id, idx, val)}
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-checklist-state">
                            Selecciona una lista a la izquierda para comenzar
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .service-execution-refined { max-width: 1000px; margin: 0 auto; padding-bottom: 80px; }
                
                /* Top Bar */
                .execution-top-bar { display: flex; justify-content: space-between; align-items: center; width: 100%; border-bottom: 1.5px solid #f2f2f2; padding-bottom: 16px; margin-bottom: 24px; }
                .top-info h2 { font-size: 1.25rem; font-weight: 900; color: #111; margin: 0; }
                .execution-badge { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
                .execution-badge span { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; }
                .execution-actions { display: flex; align-items: center; gap: 12px; }
                .btn-sm { padding: 8px 16px !important; height: 36px !important; font-size: 11px !important; border-radius: 8px !important; }

                /* Main Tabs */
                .main-tabs-container { display: flex; gap: 8px; background: #f8f9fa; padding: 6px; border-radius: 16px; margin-bottom: 24px; width: fit-content; }
                .group-tab-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 12px; font-size: 14px; font-weight: 800; border: none; outline: none; background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s; }
                .group-tab-btn:hover { color: #111; }
                .group-tab-btn.active { background: #fff; color: #5558fa; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }

                /* Layout */
                .execution-layout { display: flex; gap: 24px; align-items: flex-start; }
                
                /* Sidebar */
                .sidebar-checklists { width: 260px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
                .sidebar-checklists h3 { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 2px; margin: 0 0 8px 8px; }
                .sub-tab-btn { display: flex; flex-direction: column; text-align: left; padding: 14px; border-radius: 16px; border: 1.5px solid transparent; background: transparent; outline: none; cursor: pointer; transition: all 0.2s; }
                .sub-tab-btn:hover { background: #f8f9fa; }
                .sub-tab-btn.active { background: #fff; border-color: rgba(85, 88, 250, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
                
                .sub-tab-header { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 8px; }
                .sub-tab-title { display: flex; align-items: center; gap: 8px; }
                .sub-tab-title span { font-size: 14px; font-weight: 800; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
                .sub-tab-btn.active .sub-tab-title span { color: #5558fa; }
                .icon-wrapper { color: #64748b; }
                .sub-tab-btn.active .icon-wrapper { color: #5558fa; }
                .icon-check { color: #10b981; }

                .sub-tab-progress { display: flex; justify-content: space-between; align-items: center; width: 100%; }
                .sub-tab-progress span { font-size: 10px; font-weight: 800; color: #94a3b8; }
                .progress-bar-bg { width: 64px; height: 4px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
                .progress-bar-fill { height: 100%; background: #5558fa; transition: width 0.3s; }
                .progress-bar-fill.completed { background: #10b981; }

                .empty-sidebar { padding: 16px; text-align: center; border: 1.5px dashed #e2e8f0; border-radius: 16px; }
                .empty-sidebar span { font-size: 11px; font-weight: 600; color: #94a3b8; }

                /* Content Area */
                .active-checklist-content { flex: 1; min-width: 0; }
                .checklist-render-card { background: #fff; border: 1.5px solid #f6f6f6; border-radius: 24px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
                .checklist-render-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f8f9fa; padding-bottom: 16px; margin-bottom: 24px; }
                .checklist-render-header h3 { font-size: 1.15rem; font-weight: 900; color: #1e293b; margin: 0; }
                .checklist-render-header p { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #bbb; letter-spacing: 1.5px; margin: 4px 0 0 0; }
                
                .empty-checklist-state { height: 160px; border: 1.5px dashed #e2e8f0; border-radius: 24px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #94a3b8; background: #f8f9fa; }

                /* Overrides for child components (Checklist & Materials Checklists) */
                .minimal-checklists-wrapper .checklist-container, .minimal-checklists-wrapper .materials-container { padding: 0; background: transparent; border: none; box-shadow: none; }
                .minimal-checklists-wrapper .checklist-row, .minimal-checklists-wrapper .material-row-refined { padding: 10px 16px; margin-bottom: 8px; border-radius: 12px; border: 1.5px solid #f6f6f6; }
                
                /* Quitar punto de verificacion en el componente Checklist */
                .minimal-checklists-wrapper .item-subtitle-tag { display: none !important; }

                @keyframes fadeScaleIn {
                    from { opacity: 0; transform: scale(0.98) translateY(4px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-fade-in { animation: fadeScaleIn 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
                
                @media (max-width: 768px) {
                    .execution-layout { flex-direction: column; }
                    .sidebar-checklists { width: 100%; flex-direction: row; overflow-x: auto; padding-bottom: 8px; }
                    .sidebar-checklists h3 { display: none; }
                    .sub-tab-btn { min-width: 200px; flex-shrink: 0; }
                }
            `}</style>
        </div>
    );
};

export default ServiceExecution;
