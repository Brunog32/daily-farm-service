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
    'PRE_SERVICE': 'preService',
    'FIELD_SERVICE': 'execution'
};

const ServiceWorkflow = () => {
    const { serviceId } = useParams();
    const navigate = useNavigate();
    const { getDraftById, updateStageData, deleteDraft, loading: draftsLoading } = useDraftService();
    const { addService } = useServices();
    const { checklists, loading: loadingChecklists } = useChecklists();

    const [draft, setDraft] = useState(null);
    const [activeGroup, setActiveGroup] = useState('PRE_SERVICE');
    const [activeChecklistId, setActiveChecklistId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [validationError, setValidationError] = useState(null);
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
            showToast('No se encontró el borrador del service.', 'error');
            navigate('/services-hub');
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
                ...(draft[stageKey].data.sections || {}),
                [sectionId]: {
                    ...((draft[stageKey].data.sections && draft[stageKey].data.sections[sectionId]) || {}),
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
                    ...prev[stageKey].data,
                    sections: {
                        ...(prev[stageKey].data.sections || {}),
                        [sectionId]: {
                            ...((prev[stageKey].data.sections && prev[stageKey].data.sections[sectionId]) || {}),
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

    const isServiceReadyToFinish = () => {
        if (!draft) return { isValid: false, missingDetails: [] };

        let isValid = true;
        let missingDetails = [];

        checklists.forEach(section => {
            const stageKey = STAGE_KEYS[section.group];
            if (!stageKey) return;

            const stageData = draft[stageKey]?.data?.sections || {};
            const responses = stageData[section.id] || {};

            const isMaterialStyle = section.group === 'MATERIALS' || section.id === 'materiales' || section.title?.includes('Materiales');

            // Excluir listas de materiales de la validación estricta
            if (isMaterialStyle) return;

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

            if (validResponsesCount < requiredCount) {
                isValid = false;
                missingDetails.push(`Faltan ${requiredCount - validResponsesCount} ítems en "${section.title}"`);
            }
        });

        return { isValid, missingDetails };
    };

    const handleFinish = async () => {
        const validation = isServiceReadyToFinish();
        if (!validation.isValid) {
            setValidationError(validation.missingDetails);
            return;
        }

        setIsSaving(true);

        try {
            // Unify the responses
            const allSections = {
                ...(draft.preService?.data?.sections || {}),
                ...(draft.execution?.data?.sections || {})
            };

            const serviceRecord = {
                tamboId: draft.tamboId,
                tamboName: draft.tamboName,
                operator: draft.operator,
                date: new Date(draft.createdAt).toLocaleDateString('es-AR'),
                startTime: new Date(draft.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                endTime: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                sections: allSections,
                status: 'completado'
            };

            const userStorage = localStorage.getItem('df_user');
            const currentUser = userStorage ? JSON.parse(userStorage) : null;
            const resolvedName = (currentUser && currentUser.username === draft.operator)
                ? `${currentUser.name} ${currentUser.lastName}`
                : draft.operator;

            await addService(serviceRecord);

            // Pausa breve para permitir a los WebSockets de Firebase terminar el envío
            // y evitar que el bloqueo del hilo de ExcelJS interrumpa las transacciones de IndexedDB
            await new Promise(resolve => setTimeout(resolve, 300));

            await exportServiceToExcel(serviceRecord, checklists, resolvedName);

            // Pausa breve para restablecer el hilo
            await new Promise(resolve => setTimeout(resolve, 300));

            // Si el guardado y el excel fue exitoso, la borramos de local (Esperamos a que termine)
            await deleteDraft(draft.id);

            showToast('Service finalizado con éxito. Reporte generado.', 'success');

            // Dar tiempo extra para que IndexedDB libere bloqueos antes del cambio de ruta y nuevos onSnapshots
            setTimeout(() => navigate('/services'), 1500);
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
        if (t.includes('preparacion') || group === 'PRE_SERVICE') return <ShieldAlert size={16} />;
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

            {/* HEADER COMPACTO CON BOTONES A LA DERECHA */}
            <div className="execution-top-bar">
                <div className="top-info">
                    <div className="execution-badge">
                        <Activity size={12} color="#5558fa" />
                        <span>Ejecutando en Nube (Offline Soportado)</span>
                    </div>
                    <h2>{draft.tamboName}</h2>
                </div>

                <div className="execution-actions">
                    <button className="btn-secondary-jm btn-sm" onClick={() => navigate('/services-hub')}>
                        Guardar y Salir
                    </button>
                    <button className="btn-primary-jm btn-sm" onClick={handleFinish} disabled={isSaving}>
                        <CheckCircle2 size={14} />
                        <span>{isSaving ? 'Guardando...' : 'Finalizar Service'}</span>
                    </button>
                </div>
            </div>

            {/* TABS PRINCIPALES */}
            <div className="main-tabs-container">
                {[
                    { id: 'PRE_SERVICE', label: '1. Pre-Service', icon: <ShieldAlert size={16} /> },
                    { id: 'FIELD_SERVICE', label: '2. Ejecución', icon: <Layers size={16} /> }
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div className="icon-badge-centered" style={{ background: '#f8f9fa', color: '#5558fa' }}>
                                        {getSectionIcon(activeSection.title, activeSection.group)}
                                    </div>
                                    <div>
                                        <h3>{activeSection.title}</h3>
                                        {activeSection.title !== 'Materiales en Service' && (
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
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', flexWrap: 'nowrap' }}>
                                    {/* GLOBAL SELECT ALL */}
                                    {activeSection.title !== 'Materiales en Service' && (() => {
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
                                {activeSection.title === 'Materiales en Service' ? (
                                    <MaterialsChecklist
                                        title={activeSection.title}
                                        items={activeSection.items}
                                        values={draft[STAGE_KEYS[activeGroup]]?.data?.sections[activeSection.id] || {}}
                                        onChange={(idx, val) => handleStatusChange(activeSection.id, idx, val)}
                                    />
                                ) : (
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

            {/* Validation Modal - Premium Design */}
            {validationError && createPortal(
                <div className="modal-overlay animate-fade-in" onClick={() => setValidationError(null)}>
                    <div className="modal-card-reborn animate-slide-up" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
                        <button className="close-modal-btn" onClick={() => setValidationError(null)}>
                            <X size={18} strokeWidth={3} />
                        </button>

                        {/* Header Section */}
                        <div className="modal-header-section-v9">
                            <div className="premium-warning-badge">
                                <AlertTriangle size={28} strokeWidth={2.5} />
                                <div className="badge-ring" />
                            </div>
                            <h3 className="modal-title-v9">
                                Protocolos<br />Incompletos
                            </h3>
                            <p className="modal-subtitle-v9">
                                Para finalizar el service, es obligatorio completar todos los ítems de verificación.
                            </p>
                        </div>

                        {/* List of pending items */}
                        <div className="missing-items-report mt-8">
                            <div className="report-header">
                                <span className="report-title">Detalle de faltantes</span>
                                <span className="items-count-badge">{validationError.length} listas</span>
                            </div>

                            <div className="report-list-container custom-scrollbar">
                                {validationError.map((detail, idx) => (
                                    <div key={idx} className="report-item">
                                        <div className="report-item-indicator" />
                                        <span className="report-item-text">{detail}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="modal-footer-v9">
                            <button
                                className="btn-entendido-v9"
                                onClick={() => setValidationError(null)}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* TOAST SYSTEM */}
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

                /* Overrides */
                .minimal-checklists-wrapper .checklist-container, .minimal-checklists-wrapper .materials-container { padding: 0; background: transparent; border: none; box-shadow: none; }
                .minimal-checklists-wrapper .checklist-row, .minimal-checklists-wrapper .material-row-refined { padding: 10px 16px; margin-bottom: 8px; border-radius: 12px; border: 1.5px solid #f6f6f6; }
                .minimal-checklists-wrapper .item-subtitle-tag { display: none !important; }

                /* Modal Styles */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex !important; align-items: center; justify-content: center; z-index: 9999; padding: 20px; transition: all 0.3s ease; }
                .modal-card-reborn { background: #fff; width: 100%; max-width: 440px; padding: 40px; border-radius: 32px; position: relative; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.15); border: 1.5px solid #f2f2f2; z-index: 10000; overflow: hidden; }
                .close-modal-btn { position: absolute; top: 24px; right: 24px; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1.5px solid #f1f5f9; color: #94a3b8; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); z-index: 10; padding: 0; }
                .close-modal-btn:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; transform: rotate(90deg); }
                
                .modal-header-section-v9 { display: flex; flex-direction: column; align-items: center; text-align: center; margin-top: 16px; }
                .modal-title-v9 { font-size: 24px; font-weight: 900; color: #1e293b; margin: 24px 0 8px; line-height: 1.1; letter-spacing: -0.02em; }
                .modal-subtitle-v9 { font-size: 13px; font-weight: 500; color: #64748b; max-width: 280px; line-height: 1.5; }
                
                .modal-footer-v9 { display: flex; justify-content: center; width: 100%; margin-top: 32px; }
                .btn-entendido-v9 { background: #111; color: #fff; border: none; border-radius: 16px; padding: 14px 60px; font-size: 15px; font-weight: 900; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .btn-entendido-v9:hover { transform: translateY(-2px); background: #333; box-shadow: 0 15px 30px rgba(0,0,0,0.15); }

                .premium-warning-badge { width: 72px; height: 72px; background: #fff7ed; border-radius: 24px; display: flex; align-items: center; justify-content: center; color: #f97316; position: relative; border: 2px solid #ffedd5; }
                .badge-ring { position: absolute; inset: -8px; border-radius: 30px; border: 1.5px solid #ffedd5; opacity: 0.5; animation: pulseRing 3s infinite linear; }
                @keyframes pulseRing { 0% { transform: scale(0.95); opacity: 0.5; } 50% { transform: scale(1.05); opacity: 0.2; } 100% { transform: scale(0.95); opacity: 0.5; } }

                .missing-items-report { background: #f8fafc; border-radius: 20px; border: 1.5px solid #f1f5f9; overflow: hidden; }
                .report-header { background: #fff; padding: 12px 20px; border-bottom: 1.5px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
                .report-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; }
                .items-count-badge { font-size: 10px; font-weight: 900; background: #1e293b; color: #fff; padding: 4px 10px; border-radius: 50px; }
                
                .report-list-container { max-height: 200px; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
                .report-item { display: flex; align-items: flex-start; gap: 12px; }
                .report-item-indicator { width: 6px; height: 6px; border-radius: 50%; background: #f97316; margin-top: 6px; flex-shrink: 0; box-shadow: 0 0 8px #f97316; }
                .report-item-text { font-size: 13px; font-weight: 700; color: #475569; line-height: 1.4; text-align: left; }

                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

                @keyframes slideUpFade { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .animate-slide-up { animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

                @keyframes fadeScaleIn {
                    from { opacity: 0; transform: scale(0.98) translateY(4px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-fade-in { animation: fadeScaleIn 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
                
                @media (max-width: 1024px) {
                    .service-execution-refined { padding: 0 4px; }
                    .execution-top-bar { flex-direction: column; align-items: stretch; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; text-align: center; }
                    .execution-badge { justify-content: center; }
                    .top-info h2 { font-size: 1.4rem; }
                    .execution-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                    .btn-sm { height: 44px !important; width: 100%; border-radius: 12px !important; font-size: 12px !important; }
                    
                    .main-tabs-container { width: 100%; display: grid; grid-template-columns: 1fr 1fr; }
                    .group-tab-btn { padding: 12px 10px; font-size: 12px; justify-content: center; }
                    
                    .execution-layout { flex-direction: column; }
                    .sidebar-checklists { 
                        width: 100%; 
                        flex-direction: row; 
                        overflow-x: auto; 
                        padding: 4px 0 16px 0; 
                        margin-bottom: 8px;
                        gap: 12px;
                        -webkit-overflow-scrolling: touch;
                        scrollbar-width: none;
                    }
                    .sidebar-checklists::-webkit-scrollbar { display: none; }
                    .sidebar-checklists h3 { display: none; }
                    
                    .sub-tab-btn { 
                        min-width: 150px; 
                        max-width: 200px;
                        padding: 10px 12px; 
                        background: #f8f9fa;
                        border: 1.5px solid #f1f5f9;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                    }
                    .sub-tab-btn.active { border-color: #5558fa33; }
                    .sub-tab-title { align-items: center; gap: 6px; margin-bottom: 8px; }
                    .sub-tab-title span { 
                        font-size: 12px; 
                        font-weight: 900;
                        max-width: none; 
                        white-space: normal; 
                        overflow: visible; 
                        text-overflow: clip;
                        line-height: 1.2;
                        text-align: left;
                    }
                    .sub-tab-title .icon-wrapper { width: 25px; }
                    .sub-tab-title .icon-wrapper svg { width: 14px; height: 14px; }
                    .sub-tab-progress { margin-top: auto; padding-top: 6px; border-top: 1px solid rgba(0,0,0,0.03); }
                    .sub-tab-progress span { font-size: 9px; font-weight: 900; }
                    .progress-bar-bg { width: 44px; }
                    
                    .active-checklist-content { width: 100%; margin-top: 8px; }
                    .checklist-render-card { padding: 16px; border-radius: 20px; }
                    .checklist-render-header h3 { font-size: 1.1rem; }
                    
                    .modal-card-reborn { padding: 32px 24px; border-radius: 28px; width: 95%; }
                    .modal-title-v9 { font-size: 20px; }
                    .btn-entendido-v9 { width: 100%; padding: 14px 0; }
                }

                /* TOAST REFINED STYLES */
                .toast-portal-v9 {
                    position: fixed;
                    bottom: 40px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 99999;
                    animation: slideUpFadeToast 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .toast-content-v9 {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 24px;
                    border-radius: 50px;
                    color: white;
                    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.4);
                    border: 1px solid rgba(255,255,255,0.1);
                    min-width: 280px;
                    justify-content: center;
                }
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
            `}</style>
        </div>
    );
};

export default ServiceWorkflow;
