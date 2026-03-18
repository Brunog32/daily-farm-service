import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, CheckCircle2, Box, Zap, Snowflake, Utensils, Droplets, Gauge, ShieldAlert, Activity, Layers, ClipboardCheck, AlertTriangle, X, Minus } from 'lucide-react';
import { useDraftService } from '../hooks/useDraftService';
import { useServices } from '../hooks/useServices';
import { useChecklists } from '../hooks/useChecklists';
import Checklist from '../components/Checklist';
import MaterialsChecklist from '../components/MaterialsChecklist';
import { exportServiceToExcel } from '../utils/exporter';

const STAGE_KEYS = {
    'URGENCIAS': 'urgencia'
};

const UrgenciaWorkflow = () => {
    const { serviceId } = useParams();
    const navigate = useNavigate();
    const { getDraftById, updateStageData, deleteDraft, loading: draftsLoading } = useDraftService('urgencia');
    const { addService } = useServices('urgencia');
    const { checklists, loading: loadingChecklists } = useChecklists();

    const [draft, setDraft] = useState(null);
    const [activeGroup, setActiveGroup] = useState('URGENCIAS');
    const [activeChecklistId, setActiveChecklistId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
    };

    useEffect(() => {
        if (draftsLoading) return;
        const loadedDraft = getDraftById(serviceId);
        if (loadedDraft) {
            setDraft(loadedDraft);
        } else {
            showToast('No se encontró el borrador de la urgencia.', 'error');
            navigate('/urgencias-hub');
        }
    }, [serviceId, draftsLoading]);

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

    const handleBulkStatusChange = (sectionId, updates) => {
        const stageKey = STAGE_KEYS[activeGroup];

        updateStageData(serviceId, stageKey, {
            sections: {
                ...(draft[stageKey]?.data?.sections || {}),
                [sectionId]: {
                    ...((draft[stageKey]?.data?.sections && draft[stageKey]?.data?.sections[sectionId]) || {}),
                    ...updates
                }
            }
        }, 'IN_PROGRESS', draft);

        setDraft(prev => ({
            ...prev,
            [stageKey]: {
                ...prev[stageKey],
                status: 'IN_PROGRESS',
                data: {
                    ...prev[stageKey]?.data,
                    sections: {
                        ...(prev[stageKey]?.data?.sections || {}),
                        [sectionId]: {
                            ...((prev[stageKey]?.data?.sections && prev[stageKey]?.data?.sections[sectionId]) || {}),
                            ...updates
                        }
                    }
                }
            }
        }));
    };

    const handleStatusChange = (sectionId, itemIndex, status) => {
        handleBulkStatusChange(sectionId, { [itemIndex]: status });
    };

    const handleFinish = async () => {
        setIsSaving(true);

        try {
            // Unify the responses (for Urgencia only the urgencia stage)
            const allSections = {
                ...(draft.urgencia?.data?.sections || {})
            };

            const serviceRecord = {
                tamboId: draft.tamboId,
                tamboName: draft.tamboName,
                operator: draft.operator,
                date: new Date(draft.createdAt).toLocaleDateString('es-AR'),
                startTime: new Date(draft.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                endTime: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                sections: allSections,
                status: 'completado',
                type: 'urgencia'
            };

            const userStorage = localStorage.getItem('df_user');
            const currentUser = userStorage ? JSON.parse(userStorage) : null;
            const resolvedName = (currentUser && currentUser.username === draft.operator)
                ? `${currentUser.name} ${currentUser.lastName}`
                : draft.operator;

            const savePromise = addService(serviceRecord);
            if (navigator.onLine) {
                try {
                    await Promise.race([
                        savePromise,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
                    ]);
                } catch (err) {
                    console.warn('Conexión lenta o error de red, guardado localmente:', err);
                }
            } else {
                await new Promise(resolve => setTimeout(resolve, 600));
            }

            await deleteDraft(draft.id);

            showToast(navigator.onLine ? 'Urgencia guardada con éxito. Generando reporte...' : 'Urgencia guardada en modo offline. Generando reporte...', 'success');

            navigate('/services');

            setTimeout(() => {
                exportServiceToExcel(serviceRecord, checklists, resolvedName).catch(err => {
                    console.log("Exportar archivo en background cancelado o con error:", err);
                });
            }, 1000);

        } catch (error) {
            console.error('Error al finalizar:', error);
            showToast('Error al guardar en el servidor. El borrador local está seguro.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const getSectionIcon = (title, group) => {
        const t = title.toLowerCase();
        if (t.includes('frio')) return <Snowflake size={16} />;
        if (t.includes('comederos')) return <Utensils size={16} />;
        if (t.includes('ordeñe')) return <Gauge size={16} strokeWidth={2.5} />;
        if (t.includes('plomeria') || t.includes('agua')) return <Droplets size={16} />;
        if (t.includes('electrico')) return <Zap size={16} />;
        if (t.includes('materiales')) return <Box size={16} />;
        return <ClipboardCheck size={16} />;
    };

    if (loadingChecklists || !draft) return (
        <div className="flex flex-col items-center justify-center py-60 gap-4">
            <div className="w-10 h-10 border-2 border-slate-100 border-t-[#5558fa] rounded-full animate-spin" />
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center">Cargando Borrador...</p>
        </div>
    );

    const groupChecklists = checklists.filter(c => c.group === activeGroup);
    const activeSection = groupChecklists.find(c => c.id === activeChecklistId);

    const getProgress = (section) => {
        const stageKey = STAGE_KEYS[section.group];
        const stageData = draft[stageKey]?.data?.sections || {};
        const responses = stageData[section.id] || {};

        const isMaterialStyle = section.group === 'MATERIALS' || section.id === 'materiales' || section.title?.includes('Materiales');

        let requiredCount = 0;
        let validResponsesCount = 0;
        section.items.forEach((item, idx) => {
            const isSubsection = typeof item === 'string' && (isMaterialStyle || item.trim().endsWith(':'));

            let isCountable = false;
            if (!isSubsection) {
                isCountable = true;
            } else {
                const next = section.items[idx + 1];
                const isNextSubsection = !next || (typeof next === 'string' && (isMaterialStyle || next.trim().endsWith(':')));
                if (isNextSubsection) isCountable = true;
            }

            if (isCountable) {
                requiredCount++;
                const val = responses[idx];
                if (val !== undefined && val !== null && val !== '') {
                    validResponsesCount++;
                }
            }
        });

        return {
            itemsCount: requiredCount,
            responses: validResponsesCount,
            isCompleted: requiredCount > 0 && validResponsesCount >= requiredCount
        };
    };

    return (
        <div className="service-execution-refined animate-fade-in max-w-[1000px] mx-auto pb-20">

            <div className="execution-top-bar">
                <div className="top-info">
                    <div className="execution-badge">
                        <AlertTriangle size={12} color="#5558fa" />
                        <span>Ejecutando Urgencia (Offline Soportado)</span>
                    </div>
                    <h2>{draft.tamboName}</h2>
                </div>

                <div className="execution-actions">
                    <button className="btn-secondary-jm btn-sm" onClick={() => navigate('/urgencias-hub')}>
                        Guardar y Salir
                    </button>
                    <button className="btn-primary-jm btn-sm" onClick={handleFinish} disabled={isSaving}>
                        <CheckCircle2 size={14} />
                        <span>{isSaving ? 'Guardando...' : 'Finalizar Urgencia'}</span>
                    </button>
                </div>
            </div>

            <div className="main-tabs-container">
                {[
                    { id: 'URGENCIAS', label: '1. Checklist', icon: <ClipboardCheck size={16} /> }
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

                <div className="active-checklist-content">
                    {activeSection ? (
                        <div key={activeSection.id} className="checklist-render-card animate-fade-in">
                            <div className="checklist-render-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div className="icon-badge-centered" style={{ background: '#f8f9fa', color: '#5558fa' }}>
                                        {getSectionIcon(activeSection.title, activeSection.group)}
                                    </div>
                                    <div>
                                        <h3>{activeSection.title}</h3>
                                        <p>
                                            {activeSection.items.reduce((acc, item, idx) => {
                                                const isMaterialStyle = activeSection.group === 'MATERIALS' || activeSection.id === 'materiales' || activeSection.title?.includes('Materiales');
                                                const isSubsection = typeof item === 'string' && (isMaterialStyle || item.trim().endsWith(':'));

                                                if (!isSubsection) return acc + 1;
                                                const next = activeSection.items[idx + 1];
                                                const isNextSubsection = !next || (typeof next === 'string' && (isMaterialStyle || next.trim().endsWith(':')));
                                                if (isNextSubsection) return acc + 1;
                                                return acc;
                                            }, 0)} puntos de verificación
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', flexWrap: 'nowrap' }}>
                                    {(() => {
                                        const isMaterialStyle = activeSection.group === 'MATERIALS' || activeSection.id === 'materiales' || activeSection.title?.includes('Materiales');
                                        const responses = draft[STAGE_KEYS[activeGroup]]?.data?.sections[activeSection.id] || {};

                                        const countableIndices = [];
                                        activeSection.items.forEach((item, idx) => {
                                            const isSubsection = typeof item === 'string' && (isMaterialStyle || item.trim().endsWith(':'));
                                            if (!isSubsection) {
                                                countableIndices.push(idx);
                                            } else {
                                                const next = activeSection.items[idx + 1];
                                                const isNextSubsection = !next || (typeof next === 'string' && (isMaterialStyle || next.trim().endsWith(':')));
                                                if (isNextSubsection) countableIndices.push(idx);
                                            }
                                        });

                                        const allOk = countableIndices.length > 0 && countableIndices.every(idx => responses[idx] === 'ok');
                                        const allFail = countableIndices.length > 0 && countableIndices.every(idx => responses[idx] === 'fail');
                                        const allNa = countableIndices.length > 0 && countableIndices.every(idx => responses[idx] === 'na');

                                        const handleGlobalSelect = (status) => {
                                            const updates = {};
                                            countableIndices.forEach(idx => updates[idx] = status);
                                            handleBulkStatusChange(activeSection.id, updates);
                                        };

                                        return (
                                            <div className="status-button-group-v2 !bg-white" style={{ display: 'flex', flexDirection: 'row', padding: '2px', transform: 'scale(0.9)', margin: '-4px 0', flexShrink: 0 }}>
                                                <button
                                                    className={`status-btn-compact ok ${allOk ? 'active' : 'opacity-70 hover:opacity-100'}`}
                                                    onClick={() => handleGlobalSelect('ok')}
                                                    title="Marcar toda la lista OK"
                                                    style={{ width: '32px', height: '32px' }}
                                                >
                                                    <CheckCircle2 size={16} strokeWidth={3} />
                                                </button>
                                                <button
                                                    className={`status-btn-compact fail ${allFail ? 'active' : 'opacity-70 hover:opacity-100'}`}
                                                    onClick={() => handleGlobalSelect('fail')}
                                                    title="Marcar toda la lista FALLA"
                                                    style={{ width: '32px', height: '32px' }}
                                                >
                                                    <X size={16} strokeWidth={3} />
                                                </button>
                                                <button
                                                    className={`status-btn-compact na ${allNa ? 'active' : 'opacity-70 hover:opacity-100'}`}
                                                    onClick={() => handleGlobalSelect('na')}
                                                    title="Marcar toda la lista N/A"
                                                    style={{ width: '32px', height: '32px' }}
                                                >
                                                    <Minus size={16} strokeWidth={3} />
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="minimal-checklists-wrapper">
                                <Checklist
                                    title={activeSection.title}
                                    items={activeSection.items}
                                    values={draft[STAGE_KEYS[activeGroup]]?.data?.sections[activeSection.id] || {}}
                                    onChange={(idxOrObj, val) => {
                                        if (typeof idxOrObj === 'object') {
                                            handleBulkStatusChange(activeSection.id, idxOrObj);
                                        } else {
                                            handleStatusChange(activeSection.id, idxOrObj, val);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="empty-checklist-state">
                            Selecciona una lista a la izquierda para comenzar
                        </div>
                    )}
                </div>
            </div>

            {toast.show && createPortal(
                <div className={`toast-portal-v9 ${toast.type}`}>
                    <div className="toast-content-v9">
                        {toast.type === 'success' ? (
                            <div className="toast-icon-v9 success"><CheckCircle2 size={18} strokeWidth={3} /></div>
                        ) : (
                            <div className="toast-icon-v9 error">!</div>
                        )}
                        <span className="toast-message-v9">{toast.message}</span>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                .service-execution-refined { max-width: 1000px; margin: 0 auto; padding-bottom: 80px; }
                
                .execution-top-bar { display: flex; justify-content: space-between; align-items: center; width: 100%; border-bottom: 1.5px solid #f2f2f2; padding-bottom: 16px; margin-bottom: 24px; }
                .top-info h2 { font-size: 1.25rem; font-weight: 900; color: #111; margin: 0; }
                .execution-badge { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
                .execution-badge span { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; }
                .execution-actions { display: flex; align-items: center; gap: 12px; }
                .btn-sm { padding: 8px 16px !important; height: 36px !important; font-size: 11px !important; border-radius: 8px !important; }

                .main-tabs-container { display: flex; gap: 8px; background: #f8f9fa; padding: 6px; border-radius: 16px; margin-bottom: 24px; width: fit-content; }
                .group-tab-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 12px; font-size: 14px; font-weight: 800; border: none; outline: none; background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s; }
                .group-tab-btn:hover { color: #111; }
                .group-tab-btn.active { background: #fff; color: #5558fa; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }

                .execution-layout { display: flex; gap: 24px; align-items: flex-start; }
                
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

                .active-checklist-content { flex: 1; min-width: 0; }
                .checklist-render-card { background: #fff; border: 1.5px solid #f6f6f6; border-radius: 24px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
                .checklist-render-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f8f9fa; padding-bottom: 16px; margin-bottom: 24px; }
                .checklist-render-header h3 { font-size: 1.15rem; font-weight: 900; color: #1e293b; margin: 0; }
                .checklist-render-header p { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #bbb; letter-spacing: 1.5px; margin: 4px 0 0 0; }
                
                .empty-checklist-state { height: 160px; border: 1.5px dashed #e2e8f0; border-radius: 24px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #94a3b8; background: #f8f9fa; }

                .minimal-checklists-wrapper .checklist-container { padding: 0; background: transparent; border: none; box-shadow: none; }
                .minimal-checklists-wrapper .checklist-row { padding: 10px 16px; margin-bottom: 8px; border-radius: 12px; border: 1.5px solid #f6f6f6; }
                .minimal-checklists-wrapper .item-subtitle-tag { display: none !important; }

                .toast-portal-v9 { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); z-index: 99999; animation: slideUpFadeToast 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .toast-content-v9 { display: flex; align-items: center; gap: 12px; padding: 12px 24px; border-radius: 50px; color: white; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); min-width: 280px; justify-content: center; }
                .toast-portal-v9.success .toast-content-v9 { background: #10b981; }
                .toast-portal-v9.error .toast-content-v9 { background: #1e293b; }
                .toast-icon-v9 { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
                .toast-icon-v9.error { background: #ef4444; font-size: 12px; font-weight: 900; }
                .toast-icon-v9.success { color: white; }
                .toast-message-v9 { font-size: 14px; font-weight: 700; letter-spacing: 0.2px; }

                @keyframes slideUpFadeToast {
                    0% { opacity: 0; transform: translate(-50%, 24px) scale(0.9); }
                    100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
                }

                @keyframes fadeScaleIn {
                    from { opacity: 0; transform: scale(0.98) translateY(4px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-fade-in { animation: fadeScaleIn 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
            `}</style>
        </div>
    );
};

export default UrgenciaWorkflow;
