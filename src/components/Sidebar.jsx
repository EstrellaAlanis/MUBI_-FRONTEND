import { NavLink } from 'react-router-dom';

const adminLinks = [
  ['/', 'bi-speedometer2', 'Dashboard Admin'],
  ['/usuarios', 'bi-person-gear', 'Usuarios'],
  ['/productos', 'bi-bag-heart-fill', 'Productos'],
  ['/clientes', 'bi-people-fill', 'Clientes'],
  ['/pedidos', 'bi-clipboard-check-fill', 'Pedidos'],
  ['/pagos', 'bi-cash-coin', 'Pagos'],
  ['/materiales', 'bi-box-seam-fill', 'Inventario'],
  ['/contacto', 'bi-chat-dots-fill', 'Contacto'],
  ['/reportes', 'bi-bar-chart-fill', 'Reportes']
];

const clientLinks = [
  ['/', 'bi-house-heart-fill', 'Inicio'],
  ['/productos', 'bi-bag-heart-fill', 'Catálogo'],
  ['/pedidos', 'bi-clipboard-plus-fill', 'Mis pedidos'],
  ['/pagos', 'bi-wallet2', 'Mis pagos'],
  ['/contacto', 'bi-chat-dots-fill', 'Contacto'],
  ['/login', 'bi-shield-lock-fill', 'Login']
];

export default function Sidebar({ role = 'cliente', user }) {
  const links = role === 'admin' ? adminLinks : clientLinks;
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">M</div>
        <div>
          <h1>MUBI</h1>
          <span>{role === 'admin' ? 'Panel administrativo' : 'Tienda online'}</span>
        </div>
      </div>
      <nav className="nav-list">
        {links.map(([to, icon, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <i className={`bi ${icon}`}></i>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-card">
        <strong>{role === 'admin' ? 'Modo dueño' : 'Modo cliente'}</strong>
        <p>{role === 'admin' ? 'Privilegios completos: usuarios, productos, pedidos, pagos, inventario y reportes.' : 'Catálogo, pedidos, pagos y contacto sin acceso a administración.'}</p>
        {user && <small>Sesión: {user.correo}</small>}
      </div>
    </aside>
  );
}
