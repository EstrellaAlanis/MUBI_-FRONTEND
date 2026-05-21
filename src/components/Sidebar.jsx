import { NavLink } from 'react-router-dom';

const adminLinks = [
  ['/', 'bi-speedometer2', 'Dashboard Admin'],
  ['/usuarios', 'bi-person-gear', 'Usuarios'],
  ['/productos', 'bi-bag-heart-fill', 'Productos'],
  ['/clientes', 'bi-people-fill', 'Clientes'],
  ['/pedidos', 'bi-clipboard-check-fill', 'Pedidos'],
  ['/pagos', 'bi-cash-coin', 'Pagos'],
  ['/comprobantes', 'bi-receipt-cutoff', 'Comprobantes'],
  ['/materiales', 'bi-box-seam-fill', 'Inventario'],
  ['/contacto', 'bi-chat-dots-fill', 'Contacto'],
  ['/reportes', 'bi-bar-chart-fill', 'Reportes']
];

const publicLinks = [
  ['/', 'bi-house-heart-fill', 'Inicio'],
  ['/productos', 'bi-bag-heart-fill', 'Catálogo'],
  ['/contacto', 'bi-chat-dots-fill', 'Contacto'],
  ['/login', 'bi-shield-lock-fill', 'Iniciar sesión']
];

const clientLinks = [
  ['/', 'bi-house-heart-fill', 'Inicio'],
  ['/productos', 'bi-bag-heart-fill', 'Catálogo'],
  ['/pedidos', 'bi-clipboard-plus-fill', 'Mis pedidos'],
  ['/pagos', 'bi-wallet2', 'Mis pagos'],
  ['/contacto', 'bi-chat-dots-fill', 'Contacto']
];

export default function Sidebar({ role = 'cliente', user }) {
  const links = role === 'admin' ? adminLinks : user ? clientLinks : publicLinks;

  return (
    <aside className="sidebar responsive-admin-sidebar">
      <div className="brand">
        <div className="brand-logo">M</div>
        <div className="brand-text">
          <h1>MUBI</h1>
          <span>
            {role === 'admin'
              ? 'Panel administrativo'
              : user
                ? 'Área del cliente'
                : 'Tienda online'}
          </span>
        </div>
      </div>

      <nav className="nav-list" aria-label="Navegación principal">
        {links.map(([to, icon, label]) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <i className={`bi ${icon}`}></i>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-card">
        <strong>
          {role === 'admin'
            ? 'Modo dueño'
            : user
              ? 'Modo cliente'
              : 'Modo visitante'}
        </strong>

        <p>
          {role === 'admin'
            ? 'Privilegios completos: usuarios, productos, pedidos, pagos, inventario y reportes.'
            : user
              ? 'Consulta tu catálogo, pedidos, pagos y contacto sin acceso a administración.'
              : 'Explora productos, diseños y categorías. Inicia sesión recién al realizar o pagar un pedido.'}
        </p>

        {user && <small>Sesión: {user.correo}</small>}
      </div>
    </aside>
  );
}
