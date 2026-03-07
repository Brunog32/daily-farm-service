import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    ChevronLeft, Plus, Trash2, Save, Loader2, GripVertical,
    ChevronRight, ChevronDown, Edit, Check
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const ChecklistEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [section, setSection] = useState(null);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // UI States
    const [draggedGroupIdx, setDraggedGroupIdx] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null); // { gIdx, iIdx }
    const [editingId, setEditingId] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
    };

    useEffect(() => {
        if (id) {
            getDoc(doc(db, 'checklists', id)).then(snap => {
                if (snap.exists()) {
                    const data = snap.data();
                    setSection({ id: snap.id, ...data });
                    setGroups(itemsToGroups(data.items || []));
                }
                setLoading(false);
            }).catch(err => {
                console.error('Error fetching checklist:', err);
                setLoading(false);
            });
        }
    }, [id]);

    const itemsToGroups = (items) => {
        const groups = [];
        let currentGroup = null;

        // Check if there are objects (like in MATERIALS) to use category grouping
        const hasObjects = items.some(i => typeof i === 'object');
        const isMaterialList = hasObjects || (section && (section.group === 'MATERIALS' || section.id === 'materiales' || section.title?.includes('Materiales')));

        if (isMaterialList) {
            const groupsMap = new Map();
            items.forEach(item => {
                const isObj = typeof item === 'object';
                const label = isObj ? (item.name || '') : item;
                const isHeader = typeof item === 'string' && (item.trim().endsWith(':') ||
                    !items.some(it => typeof it === 'object' && it.category === item.trim()));

                // Si es un objeto, va a su categoría.
                // Si es un string y termina en ":" o sospechamos que es cabecera, crea grupo.
                if (!isObj && (item.trim().endsWith(':') || !isObj)) {
                    const catName = item.replace(':', '').trim();
                    const displayCat = catName ? catName.trim() + ':' : 'OTROS:';
                    if (!groupsMap.has(displayCat)) {
                        const newGrp = { id: Math.random().toString(36), title: displayCat, items: [], isOpen: true, isStandalone: false };
                        groups.push(newGrp);
                        groupsMap.set(displayCat, newGrp);
                    }
                } else if (isObj) {
                    const catName = item.category || 'OTROS';
                    const displayCat = catName.trim().endsWith(':') ? catName.trim() : `${catName.trim()}:`;
                    if (!groupsMap.has(displayCat)) {
                        const newGrp = { id: Math.random().toString(36), title: displayCat, items: [], isOpen: true, isStandalone: false };
                        groups.push(newGrp);
                        groupsMap.set(displayCat, newGrp);
                    }
                    groupsMap.get(displayCat).items.push(item);
                }
            });
            return groups;
        }

        // Standard string parsing
        items.forEach(item => {
            if (!item || String(item).trim() === '') return;

            const title = typeof item === 'string' ? item : item.name;
            const cleanTitle = title.trim();
            const isHeader = cleanTitle.endsWith(':') ||
                cleanTitle.toUpperCase() === 'MAQUINARIA INDISPENSABLE';

            if (isHeader) {
                const fixedTitle = cleanTitle.endsWith(':') ? cleanTitle : cleanTitle + ':';
                currentGroup = { id: Math.random().toString(36), title: fixedTitle, items: [], isOpen: true, isStandalone: false };
                groups.push(currentGroup);
            } else {
                if (currentGroup) {
                    currentGroup.items.push(item);
                } else {
                    // Fallback for lists with no headers (e.g. SERVICE EN TAMBO)
                    if (groups.length === 0) {
                        currentGroup = { id: Math.random().toString(36), title: 'TAREAS A EJECUTAR:', items: [], isOpen: true, isStandalone: false };
                        groups.push(currentGroup);
                    }
                    groups[0].items.push(item);
                }
            }
        });
        return groups;
    };

    const groupsToItems = (grps, groupType) => {
        const isMaterialStyle = groupType === 'MATERIALS' || section?.id === 'materiales' || section?.title?.includes('Materiales');

        return grps.flatMap(g => {
            if (g.isStandalone) return [g.title];
            const header = g.title.trim().endsWith(':') ? g.title : `${g.title.trim()}:`;
            return [
                header,
                ...g.items.map(it => {
                    if (isMaterialStyle) {
                        const category = header.replace(':', '').trim();
                        // Forzamos que sea objeto en listas de materiales
                        if (typeof it === 'string') return { name: it, category };
                        return { ...it, category };
                    }
                    return it;
                })
            ];
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const flatItems = groupsToItems(groups, section.group);
            await updateDoc(doc(db, 'checklists', section.id), {
                items: flatItems,
                updatedAt: new Date().toISOString()
            });
            showToast('¡Configuración guardada!', 'success');
            setTimeout(() => navigate('/checklists'), 800);
        } catch (err) {
            showToast('Error al guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ----- DRAG AND DROP LOGIC -----
    const onGroupDragStart = (idx) => setDraggedGroupIdx(idx);
    const onGroupDragOver = (idx) => {
        if (draggedGroupIdx === null || draggedGroupIdx === idx) return;
        const newGroups = [...groups];
        const [removed] = newGroups.splice(draggedGroupIdx, 1);
        newGroups.splice(idx, 0, removed);
        setGroups(newGroups);
        setDraggedGroupIdx(idx);
    };

    const onItemDragStart = (gIdx, iIdx) => setDraggedItem({ gIdx, iIdx });
    const onItemDragOver = (gIdx, iIdx) => {
        if (!draggedItem || draggedItem.gIdx !== gIdx || draggedItem.iIdx === iIdx) return;
        const newGroups = [...groups];
        const items = [...newGroups[gIdx].items];
        const [removed] = items.splice(draggedItem.iIdx, 1);
        items.splice(iIdx, 0, removed);
        newGroups[gIdx].items = items;
        setGroups(newGroups);
        setDraggedItem({ gIdx, iIdx });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-60 gap-4 bg-white min-h-screen">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Cargando...</p>
        </div>
    );

    return (
        <div className="editor-v9 mx-auto pb-40 px-4 sm:px-10 lg:px-20 pt-10 animate-fade-in">
            {/* TOOLBAR VIA PORTAL */}
            {document.getElementById('header-portal-action') && createPortal(
                <button
                    className="btn-primary-jm !py-2.5 !px-8 !text-sm shadow-soft"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                </button>,
                document.getElementById('header-portal-action')
            )}

            {/* PAGE TITLE LOCAL */}
            <div className="mb-10">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-0">{section.title}</h1>
            </div>

            {/* TABLE ENGINE */}
            <div className="table-engine rounded-[20px] overflow-hidden bg-white border-[1.5px] border-[#f2f2f2] shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
                {/* HEADER ROW */}
                <div className="row-grid-v9 row-header bg-[#f8fafc] border-b border-[#e2e8f0]" style={{ padding: '8px 20px' }}>
                    <div className="header-label text-center">ORDEN</div>
                    <div className="header-label text-center">VISIBILIDAD</div>
                    <div className="header-label pl-2">SECCIÓN E ÍTEMS</div>
                    <div className="header-label text-center">CANTIDAD</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '12px', gap: '8px' }}>
                        <span className="header-label">ACCIONES</span>
                        <button
                            className="action-btn-circle add"
                            style={{ width: '28px', height: '28px' }}
                            onClick={() => {
                                const next = [...groups];
                                const newIdx = next.length;
                                next.push({ id: Math.random().toString(36), title: '', items: [], isOpen: true, isStandalone: false });
                                setGroups(next);
                                setTimeout(() => {
                                    setEditingId(`group-${newIdx}`);
                                }, 0);
                            }}
                            title="Añadir sección"
                        >
                            <Plus size={16} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                {/* BODY ROWS */}
                <div className="table-body">
                    {groups.map((group, gIdx) => (
                        <React.Fragment key={group.id}>
                            <div
                                className={`row-grid-v9 group-row bg-white transition-all duration-200 ${draggedGroupIdx === gIdx ? 'opacity-20 shadow-inner' : ''}`}
                                style={{ padding: '8px 20px', borderBottom: '1px solid #e2e8f0' }}
                                onDragOver={(e) => { e.preventDefault(); !draggedItem && onGroupDragOver(gIdx); }}
                            >
                                <div className="flex justify-center items-center">
                                    <div
                                        className="drag-handle-v9"
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.effectAllowed = 'move';
                                            onGroupDragStart(gIdx);
                                        }}
                                        onDragEnd={() => setDraggedGroupIdx(null)}
                                    >
                                        <GripVertical size={16} />
                                    </div>
                                </div>
                                <div className="flex justify-center items-center">
                                    <button
                                        className={`collapse-toggle-v9 ${group.isStandalone ? 'opacity-0 pointer-events-none' : ''}`}
                                        onClick={() => {
                                            const next = [...groups];
                                            next[gIdx].isOpen = !next[gIdx].isOpen;
                                            setGroups(next);
                                        }}
                                    >
                                        {group.isOpen ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
                                    </button>
                                </div>
                                <div className="flex items-center">
                                    {editingId === `group-${gIdx}` ? (
                                        <input
                                            className="inline-edit-v9 group"
                                            value={group.title}
                                            autoFocus
                                            onChange={(e) => {
                                                const next = [...groups];
                                                next[gIdx].title = e.target.value;
                                                setGroups(next);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = group.title;
                                                    if (!val || typeof val !== 'string' || val.trim() === '') {
                                                        showToast('El nombre de la sección no puede estar vacío.');
                                                        return;
                                                    }
                                                    setEditingId(null);
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="inline-edit-v9 group truncate !bg-transparent text-[#1e293b] font-black cursor-default select-none flex items-center h-full">
                                            {group.title || <span className="text-slate-300 italic">Nueva Sección...</span>}
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    {!group.isStandalone ? (
                                        group.items.length > 0 ? (
                                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{group.items.length} items</span>
                                        ) : (
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 animate-pulse">Único</span>
                                        )
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </div>
                                <div className="actions-cell-right">
                                    <button
                                        className="action-btn-circle edit"
                                        onClick={() => {
                                            if (editingId === `group-${gIdx}`) {
                                                const val = group.title;
                                                if (!val || typeof val !== 'string' || val.trim() === '') {
                                                    showToast('El nombre de la sección no puede estar vacío.');
                                                    return;
                                                }
                                                setEditingId(null);
                                            } else {
                                                setEditingId(`group-${gIdx}`);
                                            }
                                        }}
                                        title={editingId === `group-${gIdx}` ? "Listo" : "Editar"}
                                    >
                                        {editingId === `group-${gIdx}` ? <Check size={16} /> : <Edit size={16} />}
                                    </button>
                                    {!group.isStandalone && (
                                        <button
                                            className="action-btn-circle add"
                                            onClick={() => {
                                                if (group.items.some(it => {
                                                    const val = typeof it === 'string' ? it : it.name;
                                                    return !val || val.trim() === '';
                                                })) {
                                                    showToast('Hay un ítem vacío en esta sección. Completalo o elimínalo antes de agregar otro.');
                                                    return;
                                                }

                                                const next = [...groups];
                                                const isMaterialStyle = section.group === 'MATERIALS' || section.id === 'materiales' || section.title?.includes('Materiales');
                                                const newItem = isMaterialStyle ? { name: '', category: group.title.replace(':', '').trim() } : '';
                                                const newIdx = next[gIdx].items.length;
                                                next[gIdx].items.push(newItem);
                                                next[gIdx].isOpen = true;
                                                setGroups(next);
                                                setEditingId(`item-${gIdx}-${newIdx}`);
                                            }}
                                            title="Añadir ítem"
                                        >
                                            <Plus size={16} strokeWidth={3} />
                                        </button>
                                    )}
                                    <button
                                        className={`action-btn-circle delete ${pendingDeleteId === `group-${gIdx}` ? 'pending-delete' : ''}`}
                                        onClick={() => {
                                            if (pendingDeleteId === `group-${gIdx}`) {
                                                setGroups(groups.filter((_, i) => i !== gIdx));
                                                setPendingDeleteId(null);
                                            } else {
                                                setPendingDeleteId(`group-${gIdx}`);
                                                showToast(`Vas a eliminar "${group.title || 'Sección sin nombre'}", toca nuevamente para confirmar.`);
                                            }
                                        }}
                                        onMouseLeave={() => setPendingDeleteId(null)}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* ITEM ROWS */}
                            {!group.isStandalone && group.isOpen && group.items.map((item, iIdx) => (
                                <div
                                    key={iIdx}
                                    className={`row-grid-v9 item-row bg-[#fafbfc] transition-all duration-200 ${draggedItem?.gIdx === gIdx && draggedItem?.iIdx === iIdx ? 'opacity-20 shadow-inner' : ''}`}
                                    style={{ padding: '4px 20px', borderBottom: '1px solid #f1f5f9' }}
                                    onDragOver={(e) => { e.preventDefault(); onItemDragOver(gIdx, iIdx); }}
                                >
                                    <div className="flex justify-center items-center">
                                        <div
                                            className="drag-handle-v9 mini"
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.effectAllowed = 'move';
                                                onItemDragStart(gIdx, iIdx);
                                            }}
                                            onDragEnd={() => setDraggedItem(null)}
                                        >
                                            <GripVertical size={14} />
                                        </div>
                                    </div>
                                    <div className="flex justify-center items-center">
                                        <div className="tree-arm-v9" />
                                    </div>
                                    <div className="flex items-center">
                                        {editingId === `item-${gIdx}-${iIdx}` ? (
                                            <input
                                                className="inline-edit-v9 item"
                                                value={typeof item === 'string' ? item : item.name}
                                                autoFocus
                                                onChange={(e) => {
                                                    const next = [...groups];
                                                    if (typeof next[gIdx].items[iIdx] === 'object') {
                                                        next[gIdx].items[iIdx].name = e.target.value;
                                                    } else {
                                                        next[gIdx].items[iIdx] = e.target.value;
                                                    }
                                                    setGroups(next);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = typeof item === 'string' ? item : item.name;
                                                        if (!val || typeof val !== 'string' || val.trim() === '') {
                                                            showToast('El nombre del ítem no puede estar vacío.');
                                                            return;
                                                        }
                                                        setEditingId(null);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div className="inline-edit-v9 item truncate !bg-transparent text-[#334155] font-bold cursor-default select-none flex items-center h-full">
                                                {typeof item === 'string' ? item : item.name || <span className="text-slate-300 italic">Nuevo ítem...</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center text-slate-200 opacity-20">-</div>
                                    <div className="actions-cell-right">
                                        <button
                                            className="action-btn-circle edit"
                                            onClick={() => {
                                                if (editingId === `item-${gIdx}-${iIdx}`) {
                                                    const val = typeof item === 'string' ? item : item.name;
                                                    if (!val || typeof val !== 'string' || val.trim() === '') {
                                                        showToast('El nombre del ítem no puede estar vacío.');
                                                        return;
                                                    }
                                                    setEditingId(null);
                                                } else {
                                                    setEditingId(`item-${gIdx}-${iIdx}`);
                                                }
                                            }}
                                            title={editingId === `item-${gIdx}-${iIdx}` ? "Listo" : "Editar"}
                                        >
                                            {editingId === `item-${gIdx}-${iIdx}` ? <Check size={16} /> : <Edit size={16} />}
                                        </button>
                                        <button
                                            className={`action-btn-circle delete ${pendingDeleteId === `item-${gIdx}-${iIdx}` ? 'pending-delete' : ''}`}
                                            onClick={() => {
                                                const itemName = typeof item === 'string' ? item : item.name;
                                                if (pendingDeleteId === `item-${gIdx}-${iIdx}`) {
                                                    const next = [...groups];
                                                    next[gIdx].items.splice(iIdx, 1);
                                                    setGroups(next);
                                                    setPendingDeleteId(null);
                                                } else {
                                                    setPendingDeleteId(`item-${gIdx}-${iIdx}`);
                                                    showToast(`Vas a eliminar "${itemName || 'Ítem sin nombre'}", toca nuevamente para confirmar.`);
                                                }
                                            }}
                                            onMouseLeave={() => setPendingDeleteId(null)}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* CUSTOM TOAST NOTIFICATION - VIA PORTAL */}
            {toast.show && createPortal(
                <div className={`toast-portal-v9 ${toast.type}`}>
                    <div className="toast-content-v9">
                        {toast.type === 'success' ? (
                            <div className="toast-icon-v9 success"><Check size={18} strokeWidth={3} /></div>
                        ) : (
                            <div className="toast-icon-v9 error">!</div>
                        )}
                        <span className="toast-message-v9">{toast.message}</span>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                .editor-v9 { font-family: 'Inter', sans-serif; }
                
                /* GRID STRUCTURE - Pixel Perfect Alignment */
                .row-grid-v9 { 
                    display: grid; 
                    grid-template-columns: 60px 100px 1fr 100px 140px; 
                    align-items: center; 
                    position: relative; 
                }
                
                .table-engine { border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); }

                .header-label { color: #64748b; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                
                .group-row { cursor: default; }
                .group-row:hover { background: #f8fafc !important; }
                .item-row { cursor: default; }
                .item-row:hover { background: #f1f5f9 !important; }

                .drag-handle-v9 { cursor: grab; color: #cbd5e1; transition: color 0.2s ease; display: flex; align-items: center; justify-content: center; }
                .row-grid-v9:hover .drag-handle-v9 { color: #94a3b8; }
                .drag-handle-v9.mini { color: #e2e8f0; }
                .row-grid-v9.item-row:hover .drag-handle-v9.mini { color: #cbd5e1; }

                .collapse-toggle-v9 { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #64748b; background: transparent; border: 1.5px solid transparent; cursor: pointer; transition: all 0.2s ease; flex-shrink: 0; }
                .collapse-toggle-v9:hover { background: #f1f5f9; color: #1e293b; border-color: #e2e8f0; }

                .inline-edit-v9 { 
                    border: none; 
                    outline: none; 
                    background: transparent; 
                    width: 100%; 
                    padding: 4px 8px; 
                    border-radius: 6px; 
                    transition: all 0.2s ease; 
                    line-height: 1.4;
                }
                .inline-edit-v9.group { font-size: 13px; color: #0f172a; font-weight: 800; }
                .inline-edit-v9.item { font-size: 12px; color: #334155; font-weight: 600; }
                .inline-edit-v9:focus { background: #fff; color: #0f172a; box-shadow: 0 0 0 2px #5558fa30, 0 1px 2px rgba(0,0,0,0.05); }

                .action-btn-circle { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; background: transparent; color: #94a3b8; flex-shrink: 0; }
                .actions-cell-right { display: flex; align-items: center; justify-content: flex-end; gap: 6px; flex-wrap: nowrap; padding-right: 16px; width: 100%; opacity: 0.6; transition: opacity 0.2s ease; }
                .row-grid-v9:hover .actions-cell-right { opacity: 1; }
                
                .action-btn-circle:hover { background: #f1f5f9; color: #334155; border-color: #e2e8f0; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .action-btn-circle.add { color: #5558fa; }
                .action-btn-circle.add:hover { background: #5558fa; color: #fff; border-color: #5558fa; box-shadow: 0 4px 12px rgba(85, 88, 250, 0.25); transform: translateY(-1px); }
                .action-btn-circle.delete:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; transform: translateY(-1px); }
                
                .action-btn-circle.delete.pending-delete { 
                    background: #ef4444 !important; 
                    color: #fff !important; 
                    border-color: #ef4444 !important; 
                    transform: scale(1.1); 
                    opacity: 1 !important;
                }

                .action-btn-circle.edit:has(.lucide-check) { background: #10b981; color: #fff; border-color: #10b981; opacity: 1; }
                .action-btn-circle.edit:has(.lucide-check):hover { background: #059669; border-color: #059669; }

                .tree-arm-v9 { width: 2px; height: 100%; min-height: 32px; background: #e2e8f0; position: relative; border-radius: 2px; }
                .tree-arm-v9::after { content: ''; position: absolute; left: 0; top: 50%; width: 16px; height: 2px; background: #e2e8f0; border-radius: 2px; }

                .shadow-soft { box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
                .shadow-large { box-shadow: 0 20px 60px rgba(0,0,0,0.05); }

                /* TOAST REFINED STYLES (Vanilla CSS) */
                .toast-portal-v9 {
                    position: fixed;
                    bottom: 40px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 99999;
                    animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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

                .toast-icon-v9 {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .toast-icon-v9.error { background: #ef4444; font-size: 12px; font-weight: 900; }
                .toast-icon-v9.success { color: white; }

                .toast-message-v9 {
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 0.2px;
                }

                @keyframes slideUpFade {
                    0% { opacity: 0; transform: translate(-50%, 24px) scale(0.9); }
                    100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default ChecklistEditor;
