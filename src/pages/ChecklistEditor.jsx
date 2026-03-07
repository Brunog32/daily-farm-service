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

        if (hasObjects) {
            const groupsMap = new Map();
            items.forEach(item => {
                const isObj = typeof item === 'object';
                const catName = isObj ? item.category : item.replace(':', '').trim();
                const displayCat = catName ? catName.trim() + ':' : 'OTROS:';

                if (!groupsMap.has(displayCat)) {
                    const newGrp = { id: Math.random().toString(36), title: displayCat, items: [], isOpen: true, isStandalone: false };
                    groups.push(newGrp);
                    groupsMap.set(displayCat, newGrp);
                }

                if (isObj) {
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
        return grps.flatMap(g => {
            if (g.isStandalone) return [g.title];
            const header = g.title.trim().endsWith(':') ? g.title : `${g.title.trim()}:`;
            return [
                header,
                ...g.items.map(it => {
                    if (groupType === 'MATERIALS') {
                        const category = header.replace(':', '').trim();
                        return typeof it === 'string' ? { name: it, category } : { ...it, category };
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
            alert('¡Configuración guardada!');
            navigate('/checklists');
        } catch (err) {
            alert('Error al guardar');
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
            <div className="mb-10 block">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">{section.title}</h1>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[2px]">Configuración de Protocolo</p>
            </div>

            {/* TABLE ENGINE */}
            <div className="table-engine rounded-[20px] overflow-hidden bg-white border-[1.5px] border-[#f2f2f2] shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
                {/* HEADER ROW */}
                <div className="row-grid-v9 row-header bg-[#fafafa] border-b border-[#f2f2f2]" style={{ padding: '8px 20px' }}>
                    <div className="header-label text-center">ORDEN</div>
                    <div className="header-label text-center">VISIBILIDAD</div>
                    <div className="header-label pl-2">SECCIÓN E ÍTEMS</div>
                    <div className="header-label text-center">CANTIDAD</div>
                    <div className="header-label text-right pr-6">ACCIONES</div>
                </div>

                {/* BODY ROWS */}
                <div className="table-body">
                    {groups.map((group, gIdx) => (
                        <React.Fragment key={group.id}>
                            {/* SECTION ROW */}
                            <div
                                className={`row-grid-v9 group-row bg-[#f8fafc] transition-all ${draggedGroupIdx === gIdx ? 'opacity-20' : ''}`}
                                style={{ padding: '6px 20px', borderBottom: '1.5px solid #f1f5f9' }}
                                draggable
                                onDragStart={() => onGroupDragStart(gIdx)}
                                onDragOver={(e) => { e.preventDefault(); !draggedItem && onGroupDragOver(gIdx); }}
                                onDragEnd={() => setDraggedGroupIdx(null)}
                            >
                                <div className="flex justify-center items-center">
                                    <div className="drag-handle-v9"><GripVertical size={16} /></div>
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
                                            onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                                        />
                                    ) : (
                                        <div className="inline-edit-v9 group truncate !bg-transparent text-[#1e293b] font-black cursor-default select-none flex items-center h-full">
                                            {group.title || <span className="text-slate-300 italic">Nueva Sección...</span>}
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    {!group.isStandalone ? (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{group.items.length} items</span>
                                    ) : (
                                        <span className="text-slate-200">-</span>
                                    )}
                                </div>
                                <div className="actions-cell-right">
                                    <button
                                        className="action-btn-circle edit"
                                        onClick={() => editingId === `group-${gIdx}` ? setEditingId(null) : setEditingId(`group-${gIdx}`)}
                                        title={editingId === `group-${gIdx}` ? "Listo" : "Editar"}
                                    >
                                        {editingId === `group-${gIdx}` ? <Check size={16} /> : <Edit size={16} />}
                                    </button>
                                    {!group.isStandalone && (
                                        <button
                                            className="action-btn-circle add"
                                            onClick={() => {
                                                const next = [...groups];
                                                const newItem = section.group === 'MATERIALS' ? { name: '', category: group.title.replace(':', '').trim() } : '';
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
                                        className="action-btn-circle delete"
                                        onClick={() => setGroups(groups.filter((_, i) => i !== gIdx))}
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
                                    className={`row-grid-v9 item-row bg-[#fdfdfd]/50 transition-all ${draggedItem?.gIdx === gIdx && draggedItem?.iIdx === iIdx ? 'opacity-20' : ''}`}
                                    style={{ padding: '4px 20px', borderBottom: '1px solid #f9f9f9' }}
                                    draggable
                                    onDragStart={() => onItemDragStart(gIdx, iIdx)}
                                    onDragEnd={() => setDraggedItem(null)}
                                    onDragOver={(e) => { e.preventDefault(); onItemDragOver(gIdx, iIdx); }}
                                >
                                    <div className="flex justify-center items-center">
                                        <div className="drag-handle-v9 mini"><GripVertical size={14} /></div>
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
                                                onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
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
                                            onClick={() => editingId === `item-${gIdx}-${iIdx}` ? setEditingId(null) : setEditingId(`item-${gIdx}-${iIdx}`)}
                                            title={editingId === `item-${gIdx}-${iIdx}` ? "Listo" : "Editar"}
                                        >
                                            {editingId === `item-${gIdx}-${iIdx}` ? <Check size={16} /> : <Edit size={16} />}
                                        </button>
                                        <button
                                            className="action-btn-circle delete"
                                            onClick={() => {
                                                const next = [...groups];
                                                next[gIdx].items.splice(iIdx, 1);
                                                setGroups(next);
                                            }}
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



            <style>{`
                .editor-v9 { font-family: 'Inter', sans-serif; }
                
                /* GRID STRUCTURE - Pixel Perfect Alignment */
                .row-grid-v9 { 
                    display: grid; 
                    grid-template-columns: 60px 100px 1fr 100px 140px; 
                    align-items: center; 
                    position: relative; 
                }
                
                .header-label { color: #bbb; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
                
                .group-row:hover { background: #fdfdfd; }
                .item-row:hover { background: #fff; }

                .drag-handle-v9 { cursor: grab; color: #f1f1f1; transition: color 0.1s; display: flex; align-items: center; justify-content: center; }
                .row-grid-v9:hover .drag-handle-v9 { color: #e2e8f0; }
                .drag-handle-v9.mini { color: #f8fafc; }

                .collapse-toggle-v9 { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #5558fa; background: #fff; border: 1.5px solid #f1f5f9; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
                .collapse-toggle-v9:hover { background: #111; color: #fff; border-color: #111; transform: scale(1.1); }

                .inline-edit-v9 { 
                    border: none; 
                    outline: none; 
                    background: transparent; 
                    width: 100%; 
                    padding: 0px 8px; 
                    border-radius: 6px; 
                    transition: all 0.2s; 
                    line-height: 1.2;
                }
                .inline-edit-v9.group { font-size: 1.15rem; color: #1e293b; font-weight: 900; }
                .inline-edit-v9.item { font-size: 0.95rem; color: #334155; font-weight: 700; }
                .inline-edit-v9:focus { background: #f8f9fc; color: #111; box-shadow: 0 0 0 1px #5558fa20; }

                .action-btn-circle { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; border: 1.5px solid #f1f5f9; background: #fff; color: #cbd5e1; flex-shrink: 0; }
                .actions-cell-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: nowrap; padding-right: 16px; width: 100%; }
                .action-btn-circle.add { color: #5558fa; border-color: #f1f5f9; }
                .action-btn-circle.add:hover { background: #5558fa; color: #fff; border-color: #5558fa; box-shadow: 0 4px 12px rgba(85, 88, 250, 0.25); }
                .action-btn-circle.delete:hover { background: #fee2e2; color: #ef4444; border-color: #fee2e2; transform: rotate(15deg) scale(1.05); }
                .action-btn-circle.edit { color: #64748b; }
                .action-btn-circle.edit:hover { background: #f8fafc; color: #1e293b; border-color: #e2e8f0; }
                .action-btn-circle.edit:has(.lucide-check) { background: #10b981; color: #fff; border-color: #10b981; }

                .tree-arm-v9 { width: 1.5px; height: 40px; background: #f1f5f9; position: relative; }
                .tree-arm-v9::after { content: ''; position: absolute; left: 0; top: 50%; width: 15px; height: 1.5px; background: #f1f5f9; }

                .shadow-soft { box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
                .shadow-large { box-shadow: 0 20px 60px rgba(0,0,0,0.05); }
            `}</style>
        </div>
    );
};

export default ChecklistEditor;
