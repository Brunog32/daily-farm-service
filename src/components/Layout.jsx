import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, Factory, History, Settings, LogOut, Search, Bell, User, ChevronLeft } from 'lucide-react';
import { Cow } from './Icons';
import { useEffect, useState } from 'react';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('df_user');
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
  }, [location]);

  const isActive = (path) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const handleLogout = () => {
    localStorage.removeItem('df_user');
    navigate('/login');
  };

  const NavItem = ({ to, icon: Icon, label }) => (
    <Link to={to} className={`nav-item ${isActive(to) ? 'active' : ''}`}>
      <div className="icon-wrapper">
        <Icon size={18} strokeWidth={isActive(to) ? 2.5 : 2} />
      </div>
      <span>{label}</span>
      {isActive(to) && <div className="active-indicator" />}
    </Link>
  );

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/service-execution')) return 'Ejecución de Servicio';
    if (path.startsWith('/tambos')) return 'Gestión de Tambos';
    if (path.startsWith('/checklists')) return 'Protocolos de Checklist';
    if (path.startsWith('/services')) return 'Historial de Servicios';
    if (path.startsWith('/settings')) return 'Administración';
    return 'Panel de Control';
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-circle">
            <Cow size={26} color="#111" strokeWidth={2.5} />
          </div>
          <div className="brand-text">
            <h2 className="logo-text">OJ Service</h2>
            <p className="sidebar-subtext">ELITE RURAL SYSTEM</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavItem to="/tambos" icon={Factory} label="Establecimientos" />
          <NavItem to="/checklists" icon={ClipboardList} label="Plantillas" />
          <NavItem to="/services" icon={History} label="Historial" />
          <div className="divider" />
          {currentUser && currentUser.role === 'admin' && (
            <NavItem to="/settings" icon={Settings} label="Administración" />
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <div className="icon-wrapper">
              <LogOut size={18} />
            </div>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="header-left">
            <button onClick={() => navigate(-1)} className="back-btn">
              <ChevronLeft size={20} />
            </button>
            <h1 className="header-title">{getPageTitle()}</h1>
          </div>

          <div className="header-right">
            <div id="header-portal-action"></div>
            <div className="user-area" style={{ borderLeft: 'none', paddingLeft: 0 }}>
              <div className="user-info-text text-right" style={{ marginRight: '24px' }}>
                <span className="user-name block font-black text-slate-800">{currentUser ? `${currentUser.name} ${currentUser.lastName}` : 'Operador'}</span>
              </div>
              <div className="avatar">
                {currentUser?.img ? (
                  <img src={currentUser.img} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '14px', fontWeight: '800' }}>
                    {currentUser ? `${currentUser.name[0]}${currentUser.lastName[0]}`.toUpperCase() : <User size={20} />}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="content-container">
          <Outlet />
        </div>
      </main>

      <style>{`
        .layout { display: flex; min-height: 100vh; background-color: #fff; width: 100%; }
        
        .sidebar { width: 280px; min-width: 280px; max-width: 280px; background-color: #111; height: 100vh; position: sticky; top: 0; display: flex; flex-direction: column; padding: 40px 0; border: none; z-index: 100; flex-shrink: 0; }
        .sidebar-header { display: flex; align-items: center; gap: 16px; padding: 0 40px; margin-bottom: 60px; }
        .logo-circle { width: 44px; height: 44px; background: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .logo-text { font-size: 1.25rem; font-weight: 900; color: #fff; margin: 0 !important; letter-spacing: -0.02em; }
        .sidebar-subtext { font-weight: 900; color: #444;text-transform: uppercase; font-size: 8px; letter-spacing: 2.5px; margin-top: 2px; }
        
        .sidebar-nav { flex: 1; padding: 0 20px; display: flex; flex-direction: column; gap: 4px; }
        .icon-wrapper { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nav-item { position: relative; display: flex; align-items: center; gap: 8px; padding: 12px 16px; color: #666; transition: all 0.2s; border-radius: 14px; font-weight: 700; font-size: 0.9375rem; text-decoration: none; }
        .nav-item:hover { color: #fff; background-color: rgba(255,255,255,0.03); }
        .nav-item.active { background-color: #222; color: #fff; }
        .active-indicator { position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 20px; background-color: #5558fa; border-radius: 0 4px 4px 0; }
        .divider { height: 1px; background-color: rgba(255,255,255,0.05); margin: 24px 20px; }
        
        .logout-btn { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border: none; background: none; color: #666; font-weight: 700; font-size: 0.9375rem; width: 100%; cursor: pointer; text-align: left; transition: all 0.2s; }
        .logout-btn:hover { color: #fff; }

        .main-content { flex: 1; min-width: 0; display: flex; flex-direction: column; background-color: #fff; }
        .top-header { border-bottom: 1.5px solid #f8f8f8; padding: 24px 60px; display: flex; justify-content: space-between; align-items: center; background: white; position: sticky; top: 0; z-index: 50; }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .back-btn { background: #fdfdfd; border: 1.5px solid #f0f0f0; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; color: #111; }
        .back-btn:hover { background: #111; color: #fff; border-color: #111; }
        .header-title { font-size: 1.625rem; font-weight: 900; margin: 0 !important; color: #111; letter-spacing: -0.025em; }

        .header-right { display: flex; align-items: center; gap: 40px; }
        .user-area { display: flex; align-items: center; }
        .user-name { font-size: 0.9375rem; font-weight: 900; color: #111; }
        .avatar { width: 44px; height: 44px; background: #f0f1ff; border-radius: 14px; display: flex; align-items: center; justify-content: center; border: 1.5px solid #e0e2ff; color: #5558fa; overflow: hidden; }

        .content-container { padding: 40px 60px; flex: 1; }
      `}</style>
    </div>
  );
};

export default Layout;
