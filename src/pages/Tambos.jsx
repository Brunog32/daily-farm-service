import { Plus, Play, Edit, Search, Factory, MoreVertical, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTambos } from '../hooks/useTambos';
import TamboSettings from './TamboSettings';

const Tambos = () => {
    const navigate = useNavigate();
    const { tambos, loading, error, refresh } = useTambos();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTamboId, setSelectedTamboId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTambos = tambos.filter(tambo =>
        tambo.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tambo.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openCreateModal = () => {
        setSelectedTamboId(null);
        setIsModalOpen(true);
    };

    const openEditModal = (id) => {
        setSelectedTamboId(id);
        setIsModalOpen(true);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-60 gap-4">
            <div className="w-12 h-12 border-2 border-slate-100 border-t-[#5558fa] rounded-full animate-spin" />
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sincronizando Establecimientos...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-60 gap-4 text-red-500">
            <p className="font-bold uppercase tracking-widest text-xs">Error de conexión con la base de datos.</p>
        </div>
    );

    return (
        <div className="tambos-container animate-fade-in pb-20">



            {/* BARRA DE BÚSQUEDA Y ACCIONES */}
            <div className="top-management-bar mb-16">
                <div className="jm-search-container-main">
                    <Search size={22} className="text-slate-300" strokeWidth={2.5} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o ubicación..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {/* BOTÓN AGREGAR PARA MOBILE (ARRIBA) */}
                <button className="mobile-only btn-add-mobile-top" onClick={openCreateModal}>
                    <Plus size={24} strokeWidth={3} />
                </button>
            </div>

            <div className="responsive-table-outer shadow-large desktop-only">
                <table className="tambos-styled-table">
                    <thead>
                        <tr>
                            <th className="check-col-th"><input type="checkbox" className="custom-chk" /></th>
                            <th style={{ width: '40%' }}>Establecimiento</th>
                            <th style={{ width: '25%' }}>Localidad</th>
                            <th style={{ width: '15%' }}>Categoría</th>
                            <th style={{ width: '20%', position: 'relative' }}>
                                <div className="flex items-center justify-end pr-[48px]">
                                    <span>Acciones</span>
                                </div>
                                <button
                                    className="btn-add-table-corner"
                                    onClick={openCreateModal}
                                    title="Nuevo Establecimiento"
                                >
                                    <Plus size={14} strokeWidth={4} />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTambos.map((tambo) => (
                            <tr key={tambo.id} className="tambo-row-item">
                                <td className="check-col-td"><input type="checkbox" className="custom-chk" /></td>
                                <td className="name-col-td">
                                    <div className="tambo-name-main">{tambo.name}</div>
                                    <div className="tambo-id-sub">REG #ID: {tambo.id.slice(0, 8).toUpperCase()}</div>
                                </td>
                                <td className="location-col-td">
                                    <div className="flex items-center gap-3 text-slate-500 font-bold text-xs uppercase tracking-tight">
                                        <MapPin size={14} className="text-slate-200" />
                                        {tambo.location || 'Sudamérica'}
                                    </div>
                                </td>
                                <td className="category-col-td">
                                    <span className="badge-tambo-modern">ACTIVO</span>
                                </td>
                                <td className="actions-col-td">
                                    <div className="actions-group-cell-right">
                                        <button onClick={() => openEditModal(tambo.id)} className="icon-btn-pill edit-btn-jm" title="Editar Configuración">
                                            <Edit size={18} strokeWidth={2} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* VISTA MOBILE (CARDS) */}
            <div className="mobile-only tambos-mobile-list">
                {filteredTambos.map((tambo) => (
                    <div key={tambo.id} className="tambo-mobile-card shadow-sm" onClick={() => openEditModal(tambo.id)}>
                        <div className="card-top">
                            <div className="card-icon">
                                <Factory size={20} />
                            </div>
                            <div className="card-info">
                                <h3 className="card-name">{tambo.name}</h3>
                                <div className="card-location">
                                    <MapPin size={12} />
                                    <span>{tambo.location || 'Sin ubicación'}</span>
                                </div>
                            </div>
                            <div className="card-badge">
                                <span className="badge-tambo-modern">ACTIVO</span>
                            </div>
                        </div>
                        <div className="card-footer">
                            <span className="card-id">#ID: {tambo.id.slice(0, 8).toUpperCase()}</span>
                            <div className="card-action-text">Toca para editar <Edit size={12} /></div>
                        </div>
                    </div>
                ))}

                {filteredTambos.length === 0 && (
                    <div className="empty-state-visual py-20">
                        <div className="empty-icon-circle">
                            <Factory size={48} strokeWidth={1} />
                        </div>
                        <p className="text-slate-300 font-black text-xl">Sin registros</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <TamboSettings
                    id={selectedTamboId}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedTamboId(null);
                    }}
                />
            )}

            <style>{`
        .top-management-bar { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 80px; }
        .jm-search-container-main { flex: 1; display: flex; align-items: center; gap: 12px; background: #fff; border: 1.5px solid #f2f2f2; padding: 10px 20px; border-radius: 16px; transition: all 0.2s; }
        .jm-search-container-main:focus-within { border-color: #5558fa33; box-shadow: 0 4px 16px rgba(0,0,0,0.03); }
        .jm-search-container-main input { border: none; background: transparent; outline: none; width: 100%; font-size: 0.875rem; font-weight: 600; color: #111; }
        .jm-search-container-main input::placeholder { color: #ccc; }
        
        .responsive-table-outer { background: #fff; border: 1.5px solid #f2f2f2; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.02); }
        .tambos-styled-table { width: 100%; border-collapse: collapse; }
        .tambos-styled-table th { text-align: left; padding: 16px 20px; color: #bbb; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background: #fafafa; border-bottom: 1px solid #f2f2f2; }
        .tambos-styled-table td { padding: 16px 20px; border-bottom: 1px solid #f6f6f6; vertical-align: middle; }
        .tambo-row-item { transition: all 0.2s; }
        .tambo-row-item:hover { background: #fdfdfd; }
        .tambo-row-item:last-child td { border-bottom: none; }

        .custom-chk { width: 16px; height: 16px; border-radius: 6px; border: 1.5px solid #ddd; cursor: pointer; accent-color: #111; }
        .tambo-name-main { font-weight: 800; color: #111; font-size: 1rem; letter-spacing: -0.01em; }
        .tambo-id-sub { font-size: 9px; font-weight: 800; color: #ccc; letter-spacing: 1px; margin-top: 2px; text-transform: uppercase; }
        
        .badge-tambo-modern { display: inline-block; background: #f0fdf4; color: #10b981; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 8px; letter-spacing: 1px; }

        .actions-group-cell-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding-right: 28px; }
        .actions-group-cell-right .icon-btn-pill { width: 36px !important; height: 36px !important; border-radius: 10px !important; }
        .empty-table-td { padding: 100px 0; border: none; }
        .empty-state-visual { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
        .empty-icon-circle { width: 80px; height: 80px; background: #f8f8f8; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #eee; }

        /* Botón + en esquina de Tabla */
        .btn-add-table-corner { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; background: #111; color: #fff; width: 26px; height: 26px; border-radius: 8px; cursor: pointer; border: none; transition: all 0.2s; z-index: 10; }
        .btn-add-table-corner:hover { background: #5558fa; transform: translateY(-50%) scale(1.1); box-shadow: 0 4px 8px rgba(85,88,250,0.3); }

        .mobile-only { display: none; }

        @media (max-width: 768px) {
          .tambos-container { padding-bottom: 80px; }
          .desktop-only { display: none !important; }
          .mobile-only { display: block; }
          
          .top-management-bar { 
            display: flex; 
            align-items: center; 
            gap: 12px; 
            margin-bottom: 32px; 
            padding: 0 4px;
          }
          
          .btn-add-mobile-top { 
            width: 50px; 
            height: 50px; 
            background: #111; 
            color: #fff; 
            border: none; 
            border-radius: 14px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transition: all 0.2s;
          }
          .btn-add-mobile-top:active { transform: scale(0.9); background: #5558fa; }
          
          .tambo-mobile-card { background: white; border-radius: 20px; padding: 20px; margin-bottom: 16px; border: 1.5px solid #f2f2f2; transition: all 0.2s; position: relative; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
          .tambo-mobile-card:active { transform: scale(0.98); background: #fafafa; border-color: #eee; }
          
          .card-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 16px; }
          .card-icon { width: 44px; height: 44px; background: #f8f9fa; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #111; border: 1px solid #f0f0f0; }
          .card-info { flex: 1; min-width: 0; }
          .card-name { font-size: 1.15rem; font-weight: 900; color: #111; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .card-location { display: flex; align-items: center; gap: 4px; color: #64748b; font-size: 13px; font-weight: 700; margin-top: 4px; }
          
          .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid #f8f9fa; }
          .card-id { font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; }
          .card-action-text { font-size: 13px; font-weight: 800; color: #5558fa; text-transform: uppercase; display: flex; align-items: center; gap: 4px; letter-spacing: -0.2px; }
          
          .mobile-fab { display: none; }
        }
      `}</style>
        </div >
    );
};

export default Tambos;
