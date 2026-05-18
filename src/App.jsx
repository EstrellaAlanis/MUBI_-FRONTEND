import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import Productos from './pages/Productos.jsx';
import Clientes from './pages/Clientes.jsx';
import Pedidos from './pages/Pedidos.jsx';
import Pagos from './pages/Pagos.jsx';
import Materiales from './pages/Materiales.jsx';
import Contacto from './pages/Contacto.jsx';
import Reportes from './pages/Reportes.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Comprobantes from './pages/Comprobantes.jsx';

function RequireAdmin({ user, children }) {
  if (user?.role === 'admin') return children;

  return (
    <div className="panel-card no-access-card fade-in">
      <span className="badge-soft">Acceso restringido</span>
      <h2>Solo el administrador puede ingresar a este módulo</h2>
      <p>
        Esta sección forma parte del panel del dueño: usuarios, clientes,
        inventario, reportes y mantenimiento general.
      </p>
      <a className="btn btn-primary" href="/login">
        Iniciar sesión como administrador
      </a>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mubiUser');
    return saved ? JSON.parse(saved) : null;
  });

  const role = user?.role || 'cliente';
  const isAdmin = user?.role === 'admin';
  const isClientView = role === 'cliente';

  const handleLogin = (loggedUser) => {
    setUser(loggedUser);
    localStorage.setItem('mubiUser', JSON.stringify(loggedUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('mubiUser');
  };

  useEffect(() => {
    if (user) localStorage.setItem('mubiUser', JSON.stringify(user));
  }, [user]);

  return (
    <div
      className={`app-shell ${
        isAdmin ? 'admin-mode' : 'client-mode website-mode'
      } ${!user ? 'public-mode' : ''}`}
    >
      {isAdmin && <Sidebar role={role} user={user} />}

      <main className="main-content">
        <Topbar role={role} user={user} onLogout={handleLogout} />

        <section className="content-area">
          <Routes>
            <Route path="/" element={<Dashboard role={role} user={user} />} />

            <Route
              path="/login"
              element={user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />}
            />

            <Route path="/productos" element={<Productos role={role} user={user} />} />

            <Route
              path="/clientes"
              element={
                <RequireAdmin user={user}>
                  <Clientes />
                </RequireAdmin>
              }
            />

            <Route
              path="/usuarios"
              element={
                <RequireAdmin user={user}>
                  <Usuarios />
                </RequireAdmin>
              }
            />

            <Route path="/pedidos" element={<Pedidos role={role} user={user} />} />
            <Route path="/pedido-personalizado" element={<Pedidos role={role} user={user} />} />
            <Route path="/pagos" element={<Pagos role={role} user={user} />} />
            <Route
              path="/comprobantes"
              element={
                <RequireAdmin user={user}>
                  <Comprobantes role={role} user={user} />
                </RequireAdmin>
              }
            />

            <Route
              path="/materiales"
              element={
                <RequireAdmin user={user}>
                  <Materiales />
                </RequireAdmin>
              }
            />

            <Route path="/contacto" element={<Contacto role={role} user={user} />} />

            <Route
              path="/reportes"
              element={
                <RequireAdmin user={user}>
                  <Reportes />
                </RequireAdmin>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </section>
      </main>
    </div>
  );
}