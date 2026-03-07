import { LayoutDashboard, Factory, History, CheckCircle2, TrendingUp, Calendar, ChevronRight } from 'lucide-react';
import { useTambos } from '../hooks/useTambos';
import { useServices } from '../hooks/useServices';

const DashboardCard = ({ title, value, icon: Icon, trend, color, subtitle }) => (
    <div className="card hover:shadow-md transition-all p-8 flex flex-col justify-between overflow-hidden relative border-0 group border-b border-slate-50">
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-xl ${color} shadow-sm group-hover:scale-105 transition-transform`}>
                    <Icon size={20} color="white" strokeWidth={2.5} />
                </div>
                {trend && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-success-bg rounded-lg">
                        <TrendingUp size={12} className="text-success" />
                        <span className="text-success text-[10px] font-bold">+{trend}%</span>
                    </div>
                )}
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
            <div className="flex items-baseline gap-1.5">
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{value}</h2>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{subtitle}</span>
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    const { tambos } = useTambos();
    const { services } = useServices();

    const servicesToday = services.filter(s => s.date === new Date().toLocaleDateString('es-AR')).length;

    return (
        <div className="dashboard animate-fade-in max-w-[1200px] mx-auto pb-40">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Panel de Control</h1>
                    <p className="text-slate-400 text-base font-medium mt-1">Resumen operativo del día de hoy.</p>
                </div>
                <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm leading-none">
                    <Calendar size={16} className="text-primary" />
                    <p className="font-semibold text-slate-600 text-sm">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                <DashboardCard
                    title="Servicios"
                    value={servicesToday}
                    subtitle="Hoy"
                    icon={CheckCircle2}
                    color="bg-indigo-500"
                    trend="8"
                />
                <DashboardCard
                    title="Tambos"
                    value={tambos.length}
                    subtitle="Activos"
                    icon={Factory}
                    color="bg-sky-500"
                />
                <DashboardCard
                    title="Historial"
                    value={services.length}
                    subtitle="Total"
                    icon={History}
                    color="bg-slate-700"
                />
            </div>

            <div className="grid lg:grid-cols-5 gap-8">
                <div className="card lg:col-span-3 p-10">
                    <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Actividad Reciente</h3>
                        </div>
                        <button className="btn-secondary text-[10px] uppercase font-bold tracking-widest px-4 py-2 border-0 bg-slate-50">Ver todos</button>
                    </div>

                    <div className="activity-placeholder py-24 flex flex-col items-center gap-6 bg-slate-50/50 rounded-[2rem] border-dashed border-2 border-slate-200/50">
                        <TrendingUp size={32} className="text-slate-200" />
                        <p className="text-slate-400 text-xs font-semibold">El gráfico de rendimiento se generará con más datos.</p>
                    </div>
                </div>

                <div className="card lg:col-span-2 p-10">
                    <div className="mb-10 border-b border-slate-50 pb-6">
                        <h3 className="text-lg font-bold text-slate-800">Últimos Tambos</h3>
                    </div>

                    <div className="flex flex-col gap-2">
                        {tambos.slice(0, 5).map(tambo => (
                            <div key={tambo.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-all cursor-pointer group">
                                <div className="w-10 h-10 bg-primary-light flex items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                                    <Factory size={16} className="text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-slate-800 leading-none mb-1.5">{tambo.name}</p>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none">{tambo.owner}</p>
                                </div>
                                <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                        {tambos.length === 0 && (
                            <div className="text-center py-10 opacity-40">
                                <p className="text-slate-400 text-xs italic">No hay registros.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        .bg-indigo-500 { background: #6366f1; }
        .bg-sky-500 { background: #0ea5e9; }
        .bg-slate-700 { background: #334155; }
      `}</style>
        </div>
    );
};

export default Dashboard;
