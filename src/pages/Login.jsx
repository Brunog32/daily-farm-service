import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Cow } from '../components/Icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const Login = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Intentar por username
            const usernameLower = credentials.username.toLowerCase().trim();
            let q = query(
                collection(db, 'users'),
                where('username', '==', usernameLower),
                where('password', '==', credentials.password)
            );
            let querySnapshot = await getDocs(q);

            // 2. Si no hay nada, intentar por name (para usuarios viejos como Bruno)
            if (querySnapshot.empty) {
                // Buscamos exacto o capitalizado
                const nameNormal = credentials.username.trim();
                const nameCapitalized = nameNormal.charAt(0).toUpperCase() + nameNormal.slice(1).toLowerCase();

                q = query(
                    collection(db, 'users'),
                    where('name', 'in', [nameNormal, nameCapitalized]),
                    where('password', '==', credentials.password)
                );
                querySnapshot = await getDocs(q);
            }

            if (!querySnapshot.empty) {
                const user = querySnapshot.docs[0].data();
                localStorage.setItem('df_user', JSON.stringify({
                    id: querySnapshot.docs[0].id,
                    name: user.name,
                    lastName: user.lastName || '',
                    username: user.username || user.name, // fallback
                    role: user.role || 'operator',
                    img: user.img || ''
                }));
                navigate('/tambos');
            } else {
                setError('Credenciales incorrectas. Verifica tu usuario y contraseña.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Error de conexión. Intente de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-screen">
            <div className="login-container animate-fade-in shadow-large">
                <div className="login-branding">
                    <div className="logo-box-dark">
                        <Cow size={36} color="#fff" strokeWidth={2.5} />
                    </div>
                    <div className="brand-labels">
                        <h1>OJ Service</h1>
                        <p>SISTEMA DE GESTIÓN RURAL ELITE</p>
                    </div>
                </div>

                <form className="login-form-refined" onSubmit={handleLogin}>
                    <div className="form-head">
                        <h2>Acceso al Sistema</h2>
                        <p>Ingresa tu nombre de usuario para continuar</p>
                    </div>

                    {error && <div className="error-badge-jm">{error}</div>}

                    <div className="input-field-login">
                        <div className="icon-side">
                            <User size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Nombre de usuario"
                            required
                            value={credentials.username}
                            onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                        />
                    </div>

                    <div className="input-field-login mt-6">
                        <div className="icon-side">
                            <Lock size={20} />
                        </div>
                        <input
                            type="password"
                            placeholder="Contraseña"
                            required
                            value={credentials.password}
                            onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                        />
                    </div>

                    <button className="btn-login-submit mt-10" type="submit" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                <span>Ingresar</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>

                    <p className="footer-copyright mt-12 text-center">© 2026 OJ Service S.A. • Gestión Elite</p>
                </form>
            </div>

            <style>{`
                .login-screen { position: fixed; inset: 0; background-color: #fff; background-image: radial-gradient(#fafafa 2px, transparent 2px); background-size: 32px 32px; display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
                .login-container { background: #fff; width: 100%; max-width: 480px; border-radius: 40px; overflow: hidden; border: 1.5px solid #f8f8f8; }
                
                .login-branding { padding: 48px; background: #111; display: flex; align-items: center; gap: 24px; color: #fff; }
                .logo-box-dark { width: 64px; height: 64px; border: 2.5px solid rgba(255,255,255,0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .brand-labels h1 { margin: 0 !important; color: #fff; font-size: 1.65rem; font-weight: 900; letter-spacing: -0.025em; }
                .brand-labels p { margin: 4px 0 0 0 !important; color: #444; font-size: 9px; font-weight: 900; letter-spacing: 2.5px; }

                .login-form-refined { padding: 56px; background: #fff; }
                .form-head h2 { font-size: 1.75rem; font-weight: 900; color: #111; margin-bottom: 8px !important; letter-spacing: -0.04em; }
                .form-head p { font-size: 0.9375rem; color: #bbb; font-weight: 600; margin-bottom: 40px !important; }

                .error-badge-jm { background: #fff1f2; color: #e11d48; border-radius: 14px; padding: 14px; font-size: 13px; font-weight: 800; margin-bottom: 24px; text-align: center; border: 1.5px solid #ffe4e6; }

                .input-field-login { border: 2px solid #f8f8f8; border-radius: 18px; display: flex; align-items: center; overflow: hidden; transition: all 0.2s; background: #fafafa; }
                .input-field-login:focus-within { border-color: #5558fa33; background: #fff; box-shadow: 0 10px 30px rgba(85, 88, 250, 0.05); }
                .icon-side { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; color: #ccc; border-right: 2px solid #f8f8f8; }
                .input-field-login:focus-within .icon-side { color: #5558fa; }
                .input-field-login input { flex: 1; border: none; background: transparent; outline: none; padding: 0 24px; font-size: 1rem; font-weight: 800; color: #111; }
                .input-field-login input::placeholder { color: #ddd; font-weight: 700; font-size: 0.9375rem; }

                .btn-login-submit { width: 100%; border: none; height: 64px; background: #111; color: #fff; border-radius: 20px; font-weight: 900; display: flex; align-items: center; justify-content: center; gap: 16px; cursor: pointer; transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1); box-shadow: 0 12px 30px rgba(0,0,0,0.1); }
                .btn-login-submit:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.15); background: #222; }
                
                .footer-copyright { text-align: center; font-size: 10px; font-weight: 800; color: #eee; letter-spacing: 0.5px; }
            `}</style>
        </div>
    );
};

export default Login;
