import { Link } from 'react-router-dom';

export default function Topbar({ role, user, onLogout }) {
  const title =
    role === 'admin'
      ? 'Panel exclusivo del administrador / dueño'
      : user
        ? 'Área del cliente'
        : 'Tienda online MUBI';

  const sessionText =
    user
      ? `${user.nombre} · ${role}`
      : 'Invitado · explorando catálogo';

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">MUBI Plataforma Web</p>
        <h2>{title}</h2>
      </div>

      <div className="topbar-actions">
        <span className={`session-chip ${role === 'admin' ? 'admin' : 'client'}`}>
          <i className={`bi ${role === 'admin' ? 'bi-person-gear' : user ? 'bi-person-heart' : 'bi-person'}`}></i>
          {sessionText}
        </span>

        {user ? (
          <button className="btn btn-outline-dark btn-sm" type="button" onClick={onLogout}>
            <i className="bi bi-box-arrow-right"></i> Salir
          </button>
        ) : (
          <Link className="btn btn-primary btn-sm" to="/login">
            <i className="bi bi-shield-lock"></i> Iniciar sesión
          </Link>
        )}
      </div>
    </header>
  );
}