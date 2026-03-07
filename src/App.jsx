import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Tambos from './pages/Tambos';
import Checklists from './pages/Checklists';
import Services from './pages/Services';
import ServiceExecution from './pages/ServiceExecution';
import TamboSettings from './pages/TamboSettings';
import ChecklistEditor from './pages/ChecklistEditor';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';

const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('df_user');
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const user = localStorage.getItem('df_user');
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userData = JSON.parse(user);
  if (userData.role !== 'admin') {
    return <Navigate to="/tambos" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/tambos" replace />} />
          <Route path="tambos" element={<Tambos />} />

          <Route path="checklists" element={<Checklists />} />
          <Route path="checklists/edit/:id" element={<ChecklistEditor />} />

          <Route path="services" element={<Services />} />
          <Route path="service-execution/:tamboId" element={<ServiceExecution />} />

          <Route path="settings" element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
