import { Link } from 'react-router-dom';

export default function Topbar({ role, user, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">MUBI Plataforma Web</p>
        <h2>{role === 'admin' ? 'Panel exclusivo del administrador / dueño' : 'Vista del cliente comprador'}</h2>
      </div>
      <div className="topbar-actions">
        <span className={`session-chip ${role === 'admin' ? 'admin' : 'client'}`}>
          <i className={`bi ${role === 'admin' ? 'bi-person-gear' : 'bi-person-heart'}`}></i>
          {user ? `${user.nombre} · ${role}` : 'Invitado · cliente'}
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
