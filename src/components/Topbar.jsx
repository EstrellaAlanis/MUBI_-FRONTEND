import { Link, NavLink } from 'react-router-dom';

export default function Topbar({ role, user, onLogout }) {
  if (role !== 'admin') {
    return (
      <header className="client-web-navbar">
        <Link to="/" className="client-brand">
          <div className="client-brand-logo">M</div>
          <div>
            <strong>MUBI</strong>
            <span>Textil Store</span>
          </div>
        </Link>

        <nav className="client-menu">
          <NavLink to="/">Inicio</NavLink>
          <NavLink to="/productos">Catálogo</NavLink>
          <NavLink to="/pedido-personalizado">Hacer pedido</NavLink>

          {user && (
            <>
              <NavLink to="/pedidos">Mis pedidos</NavLink>
              <NavLink to="/pagos">Mis pagos</NavLink>
            </>
          )}

          <NavLink to="/contacto">Contacto</NavLink>
        </nav>

        <div className="client-navbar-actions">
          {user ? (
            <>
              <span className="client-session">
                <i className="bi bi-person-heart"></i>
                {user.nombre || 'Cliente'}
              </span>

              <button className="client-login-btn outline" type="button" onClick={onLogout}>
                <i className="bi bi-box-arrow-right"></i>
                Salir
              </button>
            </>
          ) : (
            <Link className="client-login-btn" to="/login">
              <i className="bi bi-shield-lock"></i>
              Iniciar sesión
            </Link>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">MUBI Plataforma Web</p>
        <h2>Panel exclusivo del administrador / dueño</h2>
      </div>

      <div className="topbar-actions">
        <span className="session-chip admin">
          <i className="bi bi-person-gear"></i>
          {user ? `${user.nombre} · admin` : 'Administrador'}
        </span>

        <button className="btn btn-outline-dark btn-sm" type="button" onClick={onLogout}>
          <i className="bi bi-box-arrow-right"></i> Salir
        </button>
      </div>
    </header>
  );
}