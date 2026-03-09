import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Shield, Key, Trash2, Plus, Users, ShieldCheck, AtSign, RefreshCw, X, Save } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { resetChecklistsFromMaster } from '../services/seeder';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resetting, setResetting] = useState(false);

    // Tabs
    const [activeTab, setActiveTab] = useState('usuarios');

    // Modals
    const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // For edit password

    const [formData, setFormData] = useState({
        name: '',
        lastName: '',
        username: '',
        password: '',
        role: 'operator'
    });

    const [passwordData, setPasswordData] = useState({
        newPassword: ''
    });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'users'), {
                ...formData,
                username: formData.username.toLowerCase().trim(),
                createdAt: new Date().toISOString()
            });
            setFormData({ name: '', lastName: '', username: '', password: '', role: 'operator' });
            setIsNewUserModalOpen(false);
            fetchUsers();
        } catch (err) {
            alert('Error al crear usuario: ' + err.message);
        }
    };

    const handleEditPasswordSubmit = async (e) => {
        e.preventDefault();
        if (!editingUser) return;
        try {
            await updateDoc(doc(db, 'users', editingUser.id), {
                password: passwordData.newPassword
            });
            setEditingUser(null);
            setPasswordData({ newPassword: '' });
            fetchUsers();
        } catch (err) {
            alert('Error al actualizar contraseña: ' + err.message);
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
        try {
            await deleteDoc(doc(db, 'users', id));
            fetchUsers();
        } catch (err) {
            alert('Error al eliminar: ' + err.message);
        }
    };

    const [resetStep, setResetStep] = useState(0);

    const handleReset = async () => {
        if (resetStep === 0) {
            setResetStep(1);
            return;
        }
        setResetting(true);
        try {
            await resetChecklistsFromMaster();
            setResetStep(2);
            setTimeout(() => setResetStep(0), 4000);
        } catch (err) {
            console.error('Error al restablecer:', err);
            setResetStep(0);
        } finally {
            setResetting(false);
        }
    };

    return (
        <div className="admin-management animate-fade-in mx-auto pb-20 mt-[-20px]">
            <div className="flex justify-between items-center mb-12 mt-2">
                <div className="execution-tabs-bar mb-0">
                    <button
                        className={`exec-tab ${activeTab === 'usuarios' ? 'active' : ''}`}
                        onClick={() => setActiveTab('usuarios')}
                    >
                        Usuarios
                    </button>
                    <button
                        className={`exec-tab ${activeTab === 'mantenimiento' ? 'active' : ''}`}
                        onClick={() => setActiveTab('mantenimiento')}
                    >
                        Mantenimiento
                    </button>
                </div>
            </div>

            {activeTab === 'usuarios' && (
                <div className="animate-fade-in">
                    <div className="responsive-table-outer shadow-large !border-none">
                        <table className="tambos-styled-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40%' }} className="pl-6">Nombre</th>
                                    <th style={{ width: '25%' }}>Username</th>
                                    <th style={{ width: '15%' }}>Rol de Acceso</th>
                                    <th style={{ width: '20%', position: 'relative' }}>
                                        <button
                                            className="btn-add-table-corner"
                                            onClick={() => setIsNewUserModalOpen(true)}
                                            title="Nuevo Usuario"
                                        >
                                            <Plus size={14} strokeWidth={4} />
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => {
                                    const initials = ((u.name?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase() || '?';
                                    return (
                                        <tr key={u.id} className="tambo-row-item">
                                            <td className="name-col-td" style={{ paddingLeft: '24px' }}>
                                                <div className="user-name-wrapper">
                                                    <div className="user-avatar-circle">
                                                        {u.img ? <img src={u.img} alt="Avatar" /> : initials}
                                                    </div>
                                                    <div className="tambo-name-main font-bold">{u.name} {u.lastName}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="credentials-chip flex items-center gap-2">
                                                    <AtSign size={14} className="text-slate-400" />
                                                    <span>{u.username || 'sin-usuario'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge-tambo-modern ${u.role === 'admin' ? 'admin' : 'tech'}`}>
                                                    {u.role === 'admin' ? 'ADMINISTRADOR' : 'TÉCNICO'}
                                                </span>
                                            </td>
                                            <td className="pr-8">
                                                <div className="actions-group-cell-right pr-[28px]">
                                                    <button onClick={() => setEditingUser(u)} className="icon-btn-pill edit-btn-jm" title="Cambiar Contraseña">
                                                        <Key size={18} />
                                                    </button>
                                                    <button onClick={() => handleDelete(u.id)} className="icon-btn-pill not-ready text-red-400 hover:text-red-500 hover:bg-red-50" title="Eliminar Usuario">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }

            {
                activeTab === 'mantenimiento' && (
                    <div className="animate-fade-in pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mt-8">
                            {/* CARD RESET DATA */}
                            <div className={`mantenimiento-card ${resetStep === 1 ? 'border-orange-200 bg-orange-50/30' : ''}`}>
                                <div className="maint-card-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                                    <RefreshCw size={24} className={resetting ? 'animate-spin' : ''} />
                                </div>
                                <div className="maint-card-body">
                                    <h4>Restablecer Base de Datos</h4>
                                    <p>Sincroniza todas las listas de control con el modelo maestro del sistema.</p>
                                    <button
                                        className={`maint-action-btn ${resetting ? 'processing' : resetStep === 1 ? 'confirm' : resetStep === 2 ? 'success' : 'danger'}`}
                                        onClick={handleReset}
                                        disabled={resetting || resetStep === 2}
                                    >
                                        {resetting ? 'Procesando...' : resetStep === 1 ? '¡Confirma Ahora!' : resetStep === 2 ? 'Sincronizado' : 'Ejecutar Reset'}
                                    </button>
                                </div>
                            </div>

                            {/* CARD RECOVER ADMIN */}
                            <div className="mantenimiento-card">
                                <div className="maint-card-icon" style={{ background: '#f0f9ff', color: '#0ea5e9' }}>
                                    <ShieldCheck size={24} />
                                </div>
                                <div className="maint-card-body">
                                    <h4>Recuperar Acceso Admin</h4>
                                    <p>Crea el usuario administrador por defecto si fue borrado accidentalmente.</p>
                                    <button
                                        className="maint-action-btn default"
                                        onClick={async () => {
                                            const { seedDefaultAdmin } = await import('../services/seeder');
                                            const res = await seedDefaultAdmin();
                                            if (res) {
                                                alert('Acceso asegurado exitosamente.');
                                                fetchUsers();
                                            } else {
                                                alert('El usuario administrativo ya existe.');
                                            }
                                        }}
                                    >
                                        <span>Restaurar Cuenta</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL CREAR USUARIO */}
            {
                isNewUserModalOpen && createPortal(
                    <div className="modal-overlay animate-fade-in" onClick={() => setIsNewUserModalOpen(false)}>
                        <div className="modal-card-reborn animate-slide-up" onClick={e => e.stopPropagation()}>
                            <button className="close-modal-btn" onClick={() => setIsNewUserModalOpen(false)}>
                                <X size={20} strokeWidth={2.5} />
                            </button>
                            <div className="mb-6">
                                <h3 className="text-xl font-black text-slate-800">Nuevo Usuario</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Alta de Personal Técnico</p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="input-group-jm">
                                        <label>Nombre</label>
                                        <div className="input-with-icon-jm">
                                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="input-group-jm">
                                        <label>Apellido</label>
                                        <div className="input-with-icon-jm">
                                            <input type="text" required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                                <div className="input-group-jm">
                                    <label>Usuario (Login)</label>
                                    <div className="input-with-icon-jm">
                                        <AtSign size={16} />
                                        <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                                    </div>
                                </div>
                                <div className="input-group-jm">
                                    <label>Contraseña</label>
                                    <div className="input-with-icon-jm">
                                        <Key size={16} />
                                        <input type="password" required minLength="6" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                    </div>
                                </div>
                                <div className="input-group-jm">
                                    <label>Rol de Acceso</label>
                                    <select className="select-jm-modern" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                        <option value="operator">Operador Técnico</option>
                                        <option value="admin">Administrador Central</option>
                                    </select>
                                </div>

                                <div className="modal-actions-container">
                                    <button type="submit" className="btn-primary-jm px-10 h-[44px] text-sm">
                                        <Save size={16} />
                                        <span>Guardar</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* MODAL EDITAR PASS */}
            {
                editingUser && createPortal(
                    <div className="modal-overlay animate-fade-in" onClick={() => setEditingUser(null)}>
                        <div className="modal-card-reborn animate-slide-up" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                            <button className="close-modal-btn" onClick={() => setEditingUser(null)}>
                                <X size={20} strokeWidth={2.5} />
                            </button>
                            <div className="mb-6">
                                <h3 className="text-xl font-black text-slate-800">Actualizar Clave</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Usuario: {editingUser.username}</p>
                            </div>

                            <form onSubmit={handleEditPasswordSubmit} className="flex flex-col gap-4">
                                <div className="input-group-jm">
                                    <label>Nueva Contraseña</label>
                                    <div className="input-with-icon-jm">
                                        <Key size={16} />
                                        <input type="password" required minLength="6" value={passwordData.newPassword} onChange={e => setPasswordData({ newPassword: e.target.value })} />
                                    </div>
                                </div>

                                <div className="modal-actions-container">
                                    <button type="submit" className="btn-primary-jm px-10 h-[44px] text-sm">
                                        <Save size={16} />
                                        <span>Guardar</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )
            }

            <style>{`
                .content-card { background: #fff; padding: 40px; border-radius: 32px; }
                .card-top-header { display: flex; gap: 16px; margin-bottom: 32px; }
                .icon-badge-centered { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

                /* TABS */
                .execution-tabs-bar { display: inline-flex; background: #fdfdfd; padding: 6px; border-radius: 16px; border: 1.5px solid #f2f2f2; }
                .exec-tab { padding: 12px 32px; font-weight: 800; font-size: 13px; color: #aaa; text-transform: uppercase; letter-spacing: 1px; border: none; background: transparent; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
                .exec-tab:hover { color: #111; }
                .exec-tab.active { background: #111; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

                /* Tabla Estilo Tambos.jsx */
                .responsive-table-outer { background: #fff; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow-x: auto; }
                .tambos-styled-table { width: 100%; border-collapse: collapse; min-width: 700px; }
                .tambos-styled-table th { text-align: left; padding: 12px 20px; color: #a1a1aa; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; background: #fafafa; border-bottom: 1.5px solid #f2f2f2; }
                .tambos-styled-table td { padding: 12px 20px; border-bottom: 1px solid #f6f6f6; vertical-align: middle; }
                .tambo-row-item { transition: all 0.2s; }
                .tambo-row-item:hover { background: #fdfdfd; }
                .tambo-row-item:last-child td { border-bottom: none; }

                .tambo-name-main { font-weight: 900; color: #111; font-size: 0.95rem; letter-spacing: -0.01em; }

                .credentials-chip { display: inline-flex; padding: 6px 14px; background: #f8f8f8; border-radius: 10px; border: 1px solid #eee; font-size: 11px; font-weight: 800; color: #666; letter-spacing: 1px; }

                .badge-tambo-modern { display: inline-block; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 6px 14px; border-radius: 10px; letter-spacing: 1.5px; }
                .badge-tambo-modern.admin { background: #f0fdf4; color: #10b981; }
                .badge-tambo-modern.tech { background: #f8f8f8; color: #666; }

                .actions-group-cell-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
                .icon-btn-pill { width: 38px; height: 38px; border-radius: 12px; border: 1px solid #eee; background: #fff; color: #999; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .icon-btn-pill:hover { transform: scale(1.05); }
                .icon-btn-pill.edit-btn-jm:hover { background: #f0f1ff; color: #5558fa; border-color: #e0e2ff; }

                /* FORMS */
                .input-group-jm label { display: block; font-size: 10px; font-weight: 900; color: #bbb; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
                .input-with-icon-jm { display: flex; align-items: center; gap: 12px; background: #fdfdfd; border: 2px solid #f2f2f2; border-radius: 12px; padding: 0 16px; height: 44px; transition: all 0.2s; color: #ccc; }
                .input-with-icon-jm:focus-within { border-color: #5558fa33; background: #fff; color: #5558fa; }
                .input-with-icon-jm input { flex: 1; border: none; background: transparent; outline: none; font-size: 0.875rem; font-weight: 800; color: #111; height: 100%; }
                .select-jm-modern { width: 100%; height: 44px; border: 2px solid #f2f2f2; border-radius: 12px; padding: 0 16px; font-weight: 800; color: #111; background: #fdfdfd; cursor: pointer; font-size: 0.875rem; }
                
                /* Modal */
                .modal-overlay { position: fixed; inset: 0; background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 999; padding: 20px; transition: all 0.3s ease; }
                @keyframes slideUpFade { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .animate-slide-up { animation: slideUpFade 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
                
                .close-modal-btn { position: absolute; top: 20px; right: 20px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #fdfdfd; border: 1.5px solid #f2f2f2; color: #a1a1aa; cursor: pointer; transition: all 0.2s; }
                .close-modal-btn:hover { background: #f4f4f5; color: #111; transform: scale(1.05); }

                .modal-actions-container { display: flex; justify-content: center; margin-top: 32px; width: 100%; }

                /* Mantenimiento Cards Redesign */
                .mantenimiento-card { background: #fff; border: 1.5px solid #f2f2f2; border-radius: 20px; padding: 24px; display: flex; gap: 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .mantenimiento-card:hover { transform: translateY(-4px); border-color: #e0e2ff; box-shadow: 0 12px 24px rgba(0,0,0,0.04); }
                
                .maint-card-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .maint-card-body { flex: 1; display: flex; flex-direction: column; gap: 4px; }
                .maint-card-body h4 { margin: 0; color: #111; font-size: 0.95rem; font-weight: 900; letter-spacing: -0.01em; }
                .maint-card-body p { margin: 0; color: #999; font-size: 0.75rem; font-weight: 700; line-height: 1.4; margin-bottom: 16px; }

                .maint-action-btn { width: fit-content; height: 34px; padding: 0 16px; border-radius: 8px; font-weight: 900; font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; border: none; cursor: pointer; transition: all 0.2s; }
                .maint-action-btn.default { background: #111; color: #fff; }
                .maint-action-btn.default:hover { background: #333; transform: scale(1.03); }
                
                .maint-action-btn.danger { background: #ef444415; color: #ef4444; border: 1px solid #ef444422; }
                .maint-action-btn.danger:hover { background: #ef4444; color: #fff; transform: scale(1.03); }
                
                .maint-action-btn.confirm { background: #f97316; color: #fff; animation: pulse-orange 2s infinite; }
                @keyframes pulse-orange { 0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); } 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); } }
                
                .maint-action-btn.processing { background: #f1f5f9; color: #94a3b8; pointer-events: none; }
                .maint-action-btn.success { background: #10b981; color: #fff; pointer-events: none; }

                /* Botón + en esquina de Tabla */
                .btn-add-table-corner { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; background: #111; color: #fff; width: 26px; height: 26px; border-radius: 8px; cursor: pointer; border: none; transition: all 0.2s; z-index: 10; }
                .btn-add-table-corner:hover { background: #5558fa; transform: translateY(-50%) scale(1.1); box-shadow: 0 4px 8px rgba(85,88,250,0.3); }

                /* Avatar en tabla */
                .user-name-wrapper { display: flex; align-items: center; gap: 12px; }
                .user-avatar-circle { width: 34px; height: 34px; min-width: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #f0f1ff; border: 1.5px solid #e0e2ff; color: #5558fa; font-weight: 800; font-size: 11px; text-transform: uppercase; overflow: hidden; }
                .user-avatar-circle img { width: 100%; height: 100%; object-fit: cover; }

                /* Cajas Modales Corregidas CSS Puro */
                .modal-card-reborn { background: #fff; width: 100%; max-width: 440px; padding: 32px; border-radius: 24px; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.08); border: 1px solid #f2f2f2; }
            `}</style>
        </div >
    );
};

export default UserManagement;
