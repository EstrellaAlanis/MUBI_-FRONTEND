import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { api, endpoints } from '../services/api.js';

export default function Topbar({ role, user, onLogout }) {
  const [pedidos, setPedidos] = useState([]);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openClientMenu, setOpenClientMenu] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const getCartCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem('mubiCart') || '[]');
      return Array.isArray(cart)
        ? cart.reduce((acc, item) => acc + Number(item.cantidad || 1), 0)
        : 0;
    } catch {
      return 0;
    }
  };


  useEffect(() => {
    if (role !== 'admin') return;

    const loadPedidos = async () => {
      try {
        const data = await api.get(endpoints.pedidos);
        setPedidos(Array.isArray(data) ? data : []);
      } catch {
        setPedidos([]);
      }
    };

    loadPedidos();
    const interval = setInterval(loadPedidos, 30000);
    window.addEventListener('mubi-admin-refresh', loadPedidos);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mubi-admin-refresh', loadPedidos);
    };
  }, [role]);

  useEffect(() => {
    const updateCartCount = () => setCartCount(getCartCount());

    updateCartCount();

    window.addEventListener('mubi-cart-updated', updateCartCount);
    window.addEventListener('storage', updateCartCount);

    return () => {
      window.removeEventListener('mubi-cart-updated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, []);

  useEffect(() => {
    setOpenClientMenu(false);
    setOpenNotifications(false);
  }, [role, user]);

  const pedidosPendientes = useMemo(() => {
    return pedidos
      .filter(p => String(p.estadoPedido || '').toLowerCase() === 'pendiente')
      .sort((a, b) => new Date(a.fechaPedido || 0) - new Date(b.fechaPedido || 0));
  }, [pedidos]);

  const ultimosPendientes = pedidosPendientes.slice(0, 5);

  const closeClientMenu = () => setOpenClientMenu(false);

  if (role !== 'admin') {
    return (
      <header className="client-web-navbar responsive-client-navbar">
        <div className="client-navbar-main-row">
          <Link to="/" className="client-brand" onClick={closeClientMenu}>
            <div className="client-brand-logo">
              <img src="public/img/image.png" alt="MUBI" width="50px" />
            </div>
            <div>
              <strong>MUBI</strong>
              <span>Textil Store</span>
            </div>
          </Link>

          <div className="client-mobile-actions">
            <Link className="client-cart-btn" to="/carrito" aria-label="Carrito" onClick={closeClientMenu}>
              <i className="bi bi-cart3"></i>
              {cartCount > 0 && <span>{cartCount}</span>}
            </Link>

            <button
              className={`client-menu-toggle ${openClientMenu ? 'active' : ''}`}
              type="button"
              onClick={() => setOpenClientMenu(!openClientMenu)}
              aria-label="Abrir menú"
            >
              <i className={`bi ${openClientMenu ? 'bi-x-lg' : 'bi-list'}`}></i>
            </button>
          </div>
        </div>

        <nav className={`client-menu ${openClientMenu ? 'open' : ''}`}>
          <NavLink to="/" onClick={closeClientMenu}>Inicio</NavLink>
          <NavLink to="/productos" onClick={closeClientMenu}>Catálogo</NavLink>
          <NavLink to="/carrito" onClick={closeClientMenu}>Carrito</NavLink>
          <NavLink to="/pedido-personalizado" onClick={closeClientMenu}>Hacer pedido</NavLink>

          {user && (
            <>
              <NavLink to="/pedidos" onClick={closeClientMenu}>Mis pedidos</NavLink>
              <NavLink to="/pagos" onClick={closeClientMenu}>Mis pagos</NavLink>
            </>
          )}

          <NavLink to="/contacto" onClick={closeClientMenu}>Contacto</NavLink>
        </nav>

        <div className={`client-navbar-actions ${openClientMenu ? 'open' : ''}`}>
          <Link className="client-cart-btn desktop-cart-btn" to="/carrito" aria-label="Carrito">
            <i className="bi bi-cart3"></i>
            {cartCount > 0 && <span>{cartCount}</span>}
          </Link>

          {user ? (
            <>
              <span className="client-session">
                <i className="bi bi-person-heart"></i>
                {user.nombre || 'Cliente'}
              </span>

              <button
                className="client-login-btn outline"
                type="button"
                onClick={() => {
                  closeClientMenu();
                  onLogout();
                }}
              >
                <i className="bi bi-box-arrow-right"></i>
                Salir
              </button>
            </>
          ) : (
            <Link className="client-login-btn" to="/login" onClick={closeClientMenu}>
              <i className="bi bi-shield-lock"></i>
              Iniciar sesión
            </Link>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="topbar admin-topbar responsive-admin-topbar">
      <div className="admin-topbar-title">
        <p className="eyebrow">MUBI Plataforma Web</p>
        <h2>Centro de control administrativo</h2>
        <small className="admin-topbar-subtitle">
          Supervisa pedidos, clientes, pagos y comprobantes desde una vista de gestión.
        </small>
      </div>

      <div className="topbar-actions admin-topbar-actions">
        <div className="admin-notification-wrap">
          <button
            className={`admin-notification-btn ${pedidosPendientes.length ? 'has-alert' : ''}`}
            type="button"
            onClick={() => setOpenNotifications(!openNotifications)}
            aria-label="Notificaciones"
          >
            <i className="bi bi-bell-fill"></i>
            {pedidosPendientes.length > 0 && <span>{pedidosPendientes.length}</span>}
          </button>

          {openNotifications && (
            <div className="admin-notification-panel">
              <div className="admin-notification-header">
                <strong>Pedidos pendientes</strong>
                <small>{pedidosPendientes.length} en cola FIFO</small>
              </div>

              {ultimosPendientes.length ? (
                <div className="admin-notification-list">
                  {ultimosPendientes.map((p, index) => (
                    <Link
                      key={p.idPedido}
                      to="/pedidos"
                      className="admin-notification-item"
                      onClick={() => setOpenNotifications(false)}
                    >
                      <span className={index === 0 ? 'next-order-dot urgent' : 'next-order-dot'}></span>
                      <div>
                        <strong>Pedido #{p.idPedido}</strong>
                        <small>{p.cliente || `Cliente #${p.idCliente}`}</small>
                      </div>
                      {index === 0 && <em>Siguiente</em>}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="admin-notification-empty">
                  <i className="bi bi-check2-circle"></i>
                  No hay pedidos pendientes.
                </div>
              )}

              <Link
                to="/pedidos"
                className="admin-notification-footer"
                onClick={() => setOpenNotifications(false)}
              >
                Ir a gestión de pedidos
              </Link>
            </div>
          )}
        </div>

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
