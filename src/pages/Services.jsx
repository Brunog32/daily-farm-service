import { FileDown, Search, Filter, History, Calendar, X, ChevronDown, CloudUpload } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useServices } from '../hooks/useServices';
import { useChecklists } from '../hooks/useChecklists';
import { exportServiceToExcel, getServiceExcelBase64 } from '../utils/exporter';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const Services = () => {
    const { services, loading } = useServices();
    const { checklists } = useChecklists();
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [usersMap, setUsersMap] = useState({});

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const snap = await getDocs(collection(db, 'users'));
                const map = {};
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.username) {
                        map[data.username.toLowerCase()] = {
                            ...data,
                            fullName: `${data.name} ${data.lastName}`
                        };
                    }
                });
                setUsersMap(map);
            } catch (err) {
                console.error('Error fetching users for map:', err);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        const handleStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);
        return () => {
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }, []);

    const handleDownload = async (service) => {
        try {
            if (!service) return;
            const userData = usersMap[service.operator?.toLowerCase() || ''];
            const resolvedName = userData ? userData.fullName : service.operator;
            await exportServiceToExcel(service, checklists, resolvedName);
        } catch (err) {
            console.error('Error in export:', err);
            alert('Error descargando el archivo Excel.');
        }
    };

    const handleUploadToDrive = async (service) => {
        try {
            if (!service) return;
            const webAppUrl = 'https://script.google.com/macros/s/AKfycbzZMMisAcaqeNqlRZ5brjg4IP3XXSUBC-SPFUWKp7lo1hiZrQPlisMYHU2RFpv2tynP/exec';
            const userData = usersMap[service.operator?.toLowerCase()];
            const resolvedName = userData ? userData.fullName : service.operator;

            setIsUploading(true);
            const { base64, filename } = await getServiceExcelBase64(service, checklists, resolvedName);

            const response = await fetch(webAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ base64, filename })
            });

            const data = await response.json();

            if (data.success) {
                // Pequeño delay para que el estado de carga se limpie suavemente antes del alert
                setTimeout(() => alert('¡Excel subido a Google Drive correctamente!\nNombre: ' + filename), 100);
            } else {
                throw new Error(data.error || 'Error de la API de Google');
            }

        } catch (err) {
            console.error('Error in upload to drive:', err);
            // Movemos el alert al final para evitar el parpadeo por el bloqueo del hilo
            setTimeout(() => alert('Error al intentar subir el archivo: ' + err.message), 100);
        } finally {
            setIsUploading(false);
        }
    };

    const filteredServices = useMemo(() => {
        let result = services;

        // Búsqueda de texto
        if (searchTerm) {
            const lowSearch = searchTerm.toLowerCase();
            result = result.filter(s => {
                const userData = usersMap[s.operator?.toLowerCase()];
                const operatorDisplay = userData ? userData.fullName : (s.operator || '');

                return s.tamboName?.toLowerCase().includes(lowSearch) ||
                    s.id?.toLowerCase().includes(lowSearch) ||
                    operatorDisplay.toLowerCase().includes(lowSearch) ||
                    s.date?.includes(lowSearch);
            });
        }

        // Solo mostrar reportes que no sean "borrador" (por seguridad)
        result = result.filter(s => s.status?.toLowerCase() !== 'borrador');

        // Filtro de Fecha (Rango)
        if (startDate && endDate) {
            const start = new Date(startDate + 'T00:00:00');
            const end = new Date(endDate + 'T23:59:59');
            result = result.filter(s => {
                if (!s.date) return false;
                const parts = s.date.split('/');
                if (parts.length !== 3) return false;
                const sDate = new Date(parts[2], parts[1] - 1, parts[0]);
                return sDate >= start && sDate <= end;
            });
        }

        return result;
    }, [services, searchTerm, startDate, endDate]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-12 h-12 border-2 border-slate-100 border-t-[#5558fa] rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center">Sincronizando Historial...</span>
        </div>
    );

    return (
        <div className="services-history animate-fade-in relative pb-20">

            {/* OVERLAY DE CARGA GLOBAL */}
            {isUploading && (
                <div className="global-upload-overlay">
                    <div className="upload-loader-card">
                        <div className="loader-spinner-wrapper">
                            <div className="loader-spinner-main"></div>
                            <CloudUpload className="loader-icon-center" size={32} />
                        </div>
                        <h3>Sincronizando con Drive</h3>
                        <p>Por favor, no cierres la ventana...</p>
                    </div>
                </div>
            )}

            {/* BARRA DE FILTROS SUPERIOR */}
            <div className="filters-bar-service">
                <div className="jm-search-container-main flex-1">
                    <Search size={22} className="text-slate-300" strokeWidth={2.5} />
                    <input
                        type="text"
                        placeholder="Buscar por ID, establecimiento o fecha..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filters-secondary-row">
                    <div className="date-range-pill">
                        <Calendar size={16} className="text-slate-400" />
                        <div className="date-inputs-group">
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="range-input"
                            />
                            <span className="range-sep">AL</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="range-input"
                            />
                        </div>
                    </div>

                    {(searchTerm || startDate !== '' || endDate !== '') && (
                        <button className="btn-clear-filters" onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }}>
                            <X size={16} strokeWidth={3} />
                        </button>
                    )}
                </div>
            </div>

            {/* TABLA DE RESULTADOS (DESKTOP) */}
            <div className="responsive-table-outer desktop-only">
                <table className="tambos-styled-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30%' }}>Reporte Técnico</th>
                            <th style={{ width: '30%' }}>Cronología</th>
                            <th style={{ width: '25%' }}>Operador</th>
                            <th style={{ width: '15%' }} className="text-right pr-6">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredServices.map((service) => (
                            <tr key={service.id} className="tambo-row-item group">
                                <td className="name-col-td">
                                    <div className="tambo-name-main">{service.tamboName}</div>
                                    <div className="tambo-id-sub">ID: {service.id.slice(0, 12).toUpperCase()}</div>
                                </td>
                                <td>
                                    <div className="chrono-cell">
                                        <div className="chrono-icon">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <div className="chrono-date">{service.date}</div>
                                            <div className="chrono-time">FIN: {service.endTime || service.startTime}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="user-name-wrapper">
                                        {(() => {
                                            const userData = usersMap[service.operator?.toLowerCase()];
                                            const displayName = userData ? userData.fullName : (service.operator || 'TÉCNICO');
                                            const displayImg = userData ? userData.img : null;
                                            const finalImg = displayImg || service.operatorImg;

                                            return (
                                                <>
                                                    <div className="user-avatar-circle" style={{ width: '32px', height: '32px', minWidth: '32px', fontSize: '10px' }}>
                                                        {finalImg ? (
                                                            <img src={finalImg} alt="Avatar" />
                                                        ) : (
                                                            displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                                        )}
                                                    </div>
                                                    <div className="operator-cell text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                        {displayName}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </td>
                                <td>
                                    <div className="actions-group-cell-right">
                                        <button
                                            className={`icon-btn-pill upload-btn-jm ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onClick={() => isOnline && handleUploadToDrive(service)}
                                            title={isOnline ? "Subir Excel a Google Drive" : "No disponible sin conexión"}
                                            disabled={isUploading || !isOnline}
                                        >
                                            <CloudUpload size={18} />
                                        </button>
                                        <button className="icon-btn-pill dl-btn-jm" onClick={() => handleDownload(service)} title="Descargar Excel">
                                            <FileDown size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* VISTA MOBILE (CARDS) */}
            <div className="mobile-only services-mobile-list">
                {filteredServices.map((service) => (
                    <div key={service.id} className="service-mobile-card shadow-sm">
                        <div className="card-mobile-header">
                            <div className="tambo-info">
                                <h3 className="card-tambo-name">{service.tamboName}</h3>
                                <span className="card-service-id">ID: {service.id.slice(0, 12).toUpperCase()}</span>
                            </div>
                        </div>

                        <div className="card-mobile-body">
                            <div className="mobile-chrono-row">
                                <Calendar size={14} className="text-slate-400" />
                                <span>{service.date} • FIN: {service.endTime || service.startTime}</span>
                            </div>

                            <div className="mobile-operator-row">
                                {(() => {
                                    const userData = usersMap[service.operator?.toLowerCase()];
                                    const displayName = userData ? userData.fullName : (service.operator || 'TÉCNICO');
                                    const displayImg = userData ? userData.img : null;
                                    const finalImg = displayImg || service.operatorImg;

                                    return (
                                        <div className="flex items-center gap-2">
                                            <div className="user-avatar-circle" style={{ width: '24px', height: '24px', minWidth: '24px', fontSize: '8px' }}>
                                                {finalImg ? (
                                                    <img src={finalImg} alt="Avatar" />
                                                ) : (
                                                    displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                                )}
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{displayName}</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="card-mobile-actions">
                            <button
                                className={`mobile-action-btn-pill upload ${!isOnline ? 'disabled' : ''}`}
                                onClick={() => isOnline && handleUploadToDrive(service)}
                                disabled={isUploading || !isOnline}
                            >
                                <CloudUpload size={16} />
                                <span>Drive</span>
                            </button>
                            <button className="mobile-action-btn-pill download" onClick={() => handleDownload(service)}>
                                <FileDown size={16} />
                                <span>Excel</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredServices.length === 0 && (
                <div className="empty-state-visual py-40">
                    <div className="empty-icon-circle">
                        <History size={48} strokeWidth={1} />
                    </div>
                    <p className="text-slate-300 font-black text-xl text-center">Sin reportes registrados</p>
                    <p className="text-[#bbb] font-bold text-[10px] uppercase tracking-widest mt-1 text-center">Ajusta los filtros para encontrar resultados</p>
                </div>
            )}



            <style>{`
                /* Filtros y Top Bar */
                .filters-bar-service { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 32px; }
                .filters-secondary-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
                
                .jm-search-container-main { flex: 1; display: flex; align-items: center; gap: 12px; background: #fff; border: 1.5px solid #f2f2f2; padding: 12px 24px; border-radius: 16px; transition: all 0.2s; min-width: 300px; }
                .jm-search-container-main:focus-within { border-color: #5558fa33; box-shadow: 0 4px 16px rgba(0,0,0,0.03); }
                .jm-search-container-main input { border: none; background: transparent; outline: none; width: 100%; font-size: 0.95rem; font-weight: 600; color: #111; }
                .jm-search-container-main input::placeholder { color: #ccc; }
                
                .select-pill-wrapper { background: #fff; border: 1.5px solid #f2f2f2; padding: 0 20px; border-radius: 16px; display: flex; align-items: center; gap: 10px; height: 50px; transition: all 0.2s; position: relative; }
                .select-pill-wrapper:hover { border-color: #5558fa22; background: #fdfdfd; }
                .select-pill-wrapper select { background: transparent; border: none; outline: none; font-size: 11px; font-weight: 800; color: #111; text-transform: uppercase; letter-spacing: 1.5px; cursor: pointer; appearance: none; padding-right: 28px; width: 100%; position: relative; z-index: 2; height: 100%; }
                .select-pill-wrapper .chevron-custom { position: absolute; right: 20px; pointer-events: none; color: #ccc; z-index: 1; }

                .date-range-pill { background: #fff; border: 1.5px solid #f2f2f2; padding: 0 20px; border-radius: 16px; display: flex; align-items: center; gap: 12px; height: 50px; transition: all 0.2s; }
                .date-range-pill:hover { border-color: #5558fa22; background: #fdfdfd; }
                .date-inputs-group { display: flex; align-items: center; gap: 8px; }
                .range-input { background: transparent; border: none; outline: none; font-size: 11px; font-weight: 800; color: #111; cursor: pointer; font-family: inherit; width: 110px; }
                .range-sep { font-size: 9px; font-weight: 900; color: #ccc; letter-spacing: 1px; }
                
                .btn-clear-filters { background: #fee2e2; color: #ef4444; border: none; height: 50px; width: 50px; border-radius: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .btn-clear-filters:hover { background: #fecaca; transform: scale(1.05); }

                /* Tabla Estilo Tambos.jsx */
                .responsive-table-outer { background: #fff; border: 1.5px solid #f2f2f2; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.02); overflow-x: auto; }
                .tambos-styled-table { width: 100%; border-collapse: collapse; min-width: 800px; }
                .tambos-styled-table th { text-align: left; padding: 18px 24px; color: #bbb; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; background: #fafafa; border-bottom: 1px solid #f2f2f2; }
                .tambos-styled-table td { padding: 20px 24px; border-bottom: 1px solid #f6f6f6; vertical-align: middle; }
                .tambo-row-item { transition: all 0.2s; }
                .tambo-row-item:hover { background: #fdfdfd; }
                .tambo-row-item:last-child td { border-bottom: none; }

                .tambo-name-main { font-weight: 900; color: #111; font-size: 1rem; letter-spacing: -0.01em; }
                .tambo-id-sub { font-size: 9px; font-weight: 800; color: #ccc; letter-spacing: 1px; margin-top: 4px; text-transform: uppercase; }
                
                .chrono-cell { display: flex; align-items: center; gap: 12px; }
                .chrono-icon { width: 36px; height: 36px; background: #f8f8f8; border: 1px solid #eee; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #aaa; transition: all 0.2s; }
                .tambo-row-item:hover .chrono-icon { background: #fff; border-color: #5558fa33; color: #5558fa; }
                .chrono-date { font-weight: 900; font-size: 13px; color: #444; }
                .chrono-time { font-size: 9px; font-weight: 800; color: #bbb; letter-spacing: 0.5px; margin-top: 2px; text-transform: uppercase; }

                .operator-cell { font-weight: 800; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; }

                .actions-group-cell-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
                .icon-btn-pill { width: 38px; height: 38px; border-radius: 12px; border: 1.5px solid transparent; background: #f8f8f8; color: #999; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .icon-btn-pill:hover { transform: scale(1.05); }

                .icon-btn-pill.upload-btn-jm:hover { background: #e0f2fe; color: #0284c7; border-color: #bae6fd; }
                .icon-btn-pill.dl-btn-jm:hover { background: #f0fdf4; color: #10b981; border-color: #dcfce7; }
                
                .empty-table-td { padding: 100px 0; border: none; }
                .empty-state-visual { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
                .empty-icon-circle { width: 80px; height: 80px; background: #f8f8f8; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #eee; }



                /* GLOBAL UPLOAD OVERLAY */
                .global-upload-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(255, 255, 255, 0.4);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.3s ease;
                }
                .upload-loader-card {
                    background: #fff;
                    padding: 48px;
                    border-radius: 32px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.1);
                    max-width: 320px;
                    width: 90%;
                    text-align: center;
                    animation: slideUpFade 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
                    border: 1px solid #f2f2f2;
                }
                .loader-spinner-wrapper {
                    position: relative;
                    width: 80px;
                    height: 80px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .loader-spinner-main {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border: 4px solid #f0f0f0;
                    border-top: 4px solid #0284c7;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                .loader-icon-center {
                    color: #0284c7;
                    z-index: 1;
                }
                .upload-loader-card h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 900;
                    color: #1e293b;
                }
                .upload-loader-card p {
                    margin: 0;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #64748b;
                }

                /* Avatar en tabla (estilo UserManagement) */
                .user-name-wrapper { display: flex; align-items: center; gap: 12px; }
                .user-avatar-circle { width: 34px; height: 34px; min-width: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #f0f1ff; border: 1.5px solid #e0e2ff; color: #5558fa; font-weight: 800; font-size: 11px; text-transform: uppercase; overflow: hidden; }
                .user-avatar-circle img { width: 100%; height: 100%; object-fit: cover; }

                .desktop-only { display: block; }
                .mobile-only { display: none; }
 
                 @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                 @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                 
                 @media (max-width: 1024px) {
                     .desktop-only { display: none; }
                     .mobile-only { display: block; }
                     
                     .filters-bar-service { gap: 12px; margin-bottom: 20px; }
                     .jm-search-container-main { min-width: 100%; padding: 10px 16px; }
                     .filters-secondary-row { width: 100%; display: grid; grid-template-columns: 1fr auto; gap: 8px; }
                     .date-range-pill { padding: 0 12px; min-width: 0; flex: 1; }
                     .date-inputs-group { gap: 4px; overflow: hidden; }
                     .range-input { width: 90px; font-size: 10px; }
                     .range-sep { font-size: 8px; }
                     .btn-clear-filters { height: 50px; width: 50px; }
 
                     .services-history { padding-bottom: 120px; }
                     .services-mobile-list { display: flex; flex-direction: column; gap: 12px; }
                     
                     .service-mobile-card { 
                         background: #fff; 
                         border: 1.5px solid #f2f2f2; 
                         border-radius: 20px; 
                         padding: 16px;
                     }
                     
                     .card-mobile-header { margin-bottom: 12px; }
                     .card-tambo-name { margin: 0; font-size: 1.1rem; font-weight: 900; color: #111; }
                     .card-service-id { font-size: 9px; font-weight: 800; color: #ccc; letter-spacing: 0.5px; text-transform: uppercase; }
                     
                     .card-mobile-body { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
                     .mobile-chrono-row, .mobile-operator-row { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #666; }
                     
                     .card-mobile-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                     .mobile-action-btn-pill { 
                         height: 44px; 
                         border-radius: 12px; 
                         border: 1.5px solid #f2f2f2; 
                         background: #fdfdfd; 
                         display: flex; 
                         align-items: center; 
                         justify-content: center; 
                         gap: 6px; 
                         font-size: 12px; 
                         font-weight: 800;
                         transition: all 0.2s;
                     }
                     .mobile-action-btn-pill.upload { color: #0284c7; border-color: #bae6fd; background: #f0f9ff; }
                     .mobile-action-btn-pill.download { color: #10b981; border-color: #dcfce7; background: #f0fdf4; }
                     .mobile-action-btn-pill.disabled { opacity: 0.5; filter: grayscale(1); }
 
                     .upload-loader-card { padding: 32px 24px; }
                 }
            `}</style>
        </div>
    );
};

export default Services;
