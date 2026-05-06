import { useEffect, useMemo, useState } from 'react';
import StatCard from '../components/StatCard.jsx';
import { api, endpoints } from '../services/api.js';

const safeArray = (value) => Array.isArray(value) ? value : [];

export default function Dashboard({ role, user }) {
  const [data, setData] = useState({
    productos: [],
    clientes: [],
    pedidos: [],
    pagos: [],
    materiales: []
  });

  const [error, setError] = useState('');
  const [ideaPedido, setIdeaPedido] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(endpoints.productos),
      api.get(endpoints.clientes),
      api.get(endpoints.pedidos),
      api.get(endpoints.pagos),
      api.get(endpoints.materiales)
    ])
      .then(([productos, clientes, pedidos, pagos, materiales]) =>
        setData({ productos, clientes, pedidos, pagos, materiales })
      )
      .catch((err) => setError(err.message));
  }, []);

  const productos = safeArray(data.productos);
  const clientes = safeArray(data.clientes);
  const pedidos = safeArray(data.pedidos);
  const pagos = safeArray(data.pagos);
  const materiales = safeArray(data.materiales);

  const totalPagos = useMemo(
    () => pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0),
    [pagos]
  );

  const stockBajo = useMemo(
    () => materiales.filter((m) => Number(m.stockActual) <= Number(m.stockMinimo)).length,
    [materiales]
  );

  const pendientes = pedidos.filter(
    (p) => String(p.estadoPedido).toLowerCase() === 'pendiente'
  ).length;

  const categorias = useMemo(() => {
    const nombres = productos.map((p) => p.categoria).filter(Boolean);
    return [...new Set(nombres)].slice(0, 6);
  }, [productos]);

  const productosDestacados = productos.slice(0, 6);

  const enviarIdeaPedido = () => {
    const texto = ideaPedido.trim();

    if (!texto) {
      alert('Describe cómo deseas tu polo para continuar.');
      return;
    }

    localStorage.setItem('ideaPedidoMubi', texto);
    window.location.href = '/pedidos';
  };

  if (role === 'cliente' && !user) {
    return (
      <div className="fade-in">
        {error && (
          <div className="alert alert-warning">
            No se pudo conectar al backend: {error}
          </div>
        )}

        <section className="client-hero public-store-hero">
          <div>
            <span className="badge-soft">Tienda online MUBI</span>
            <h1>Polos sublimados y personalizados hechos a tu estilo.</h1>
            <p>
              Explora diseños, revisa categorías y solicita tu polo personalizado sin
              complicarte. Primero eliges o describes tu idea, y al confirmar el pedido
              podrás iniciar sesión.
            </p>

            <div className="hero-actions">
              <a href="/productos" className="btn btn-primary">
                Ver catálogo
              </a>
              <a href="#pedido-rapido" className="btn btn-glass">
                Realizar pedido
              </a>
            </div>
          </div>
        </section>

        <section className="store-section mt-4">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Categorías</span>
              <h2>Elige el tipo de polo que necesitas</h2>
            </div>
            <a href="/productos" className="small-link">Ver todos</a>
          </div>

          <div className="category-grid">
            {(categorias.length ? categorias : ['Urbanos', 'Anime', 'Pareja', 'Deportivos', 'Escolares', 'Publicitarios']).map((cat, index) => (
              <article className="category-card" key={cat}>
                <div className={`category-icon cat-${index % 4}`}>
                  <i className="bi bi-stars"></i>
                </div>
                <h3>{cat}</h3>
                <p>Diseños personalizados según tu idea, evento o estilo.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="store-section mt-4">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Trabajos y diseños</span>
              <h2>Modelos que puedes personalizar</h2>
            </div>
            <a href="/productos" className="small-link">Explorar catálogo</a>
          </div>

          <div className="product-grid">
            {productosDestacados.map((p, index) => (
              <article className="product-card product-card-premium" key={p.idProducto}>
                <div className={`product-art art-${index % 4}`}>
                  <i className="bi bi-tshirt"></i>
                </div>

                <div className="product-body">
                  <span className="status-pill">{p.categoria || 'MUBI'}</span>
                  <h3>{p.nombre}</h3>
                  <p>{p.descripcion || 'Polo personalizable con diseño a elección del cliente.'}</p>

                  <div className="product-footer">
                    <strong>S/ {Number(p.precio || 0).toFixed(2)}</strong>
                    <a className="btn btn-sm btn-outline-dark" href="/pedidos">
                      Pedir
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="quick-order-card mt-4" id="pedido-rapido">
          <div>
            <span className="badge-soft">Pedido rápido</span>
            <h2>Describe cómo deseas tu polo</h2>
            <p>
              Cuéntanos el diseño, color, talla, cantidad o temática. Luego podrás
              continuar con el registro del pedido.
            </p>
          </div>

          <div className="quick-order-form">
            <textarea
              value={ideaPedido}
              onChange={(e) => setIdeaPedido(e.target.value)}
              placeholder="Ejemplo: Quiero 3 polos negros con diseño de anime, talla M, con nombre personalizado..."
            />

            <button className="btn btn-primary" onClick={enviarIdeaPedido}>
              Continuar pedido
            </button>

            <small>
              No necesitas iniciar sesión para explorar. Se solicitará acceso al confirmar pedido o pago.
            </small>
          </div>
        </section>
      </div>
    );
  }

  if (role === 'cliente' && user) {
    return (
      <div className="fade-in">
        {error && (
          <div className="alert alert-warning">
            No se pudo conectar al backend: {error}
          </div>
        )}

        <section className="client-hero">
          <div>
            <span className="badge-soft">Área del cliente</span>
            <h1>Bienvenido a tu espacio MUBI.</h1>
            <p>
              Revisa tus pedidos, consulta pagos pendientes y solicita nuevos diseños
              personalizados.
            </p>

            <div className="hero-actions">
              <a href="/productos" className="btn btn-primary">
                Ver catálogo
              </a>
              <a href="/pedidos" className="btn btn-glass">
                Mis pedidos
              </a>
            </div>
          </div>
        </section>

        <div className="stats-grid mt-4">
          <StatCard icon="bi-bag-heart" label="Productos" value={productos.length} note="Disponibles en catálogo" />
          <StatCard icon="bi-clipboard-check" label="Pedidos" value={pedidos.length} note="Registrados en sistema" />
          <StatCard icon="bi-wallet2" label="Pagos" value={`S/ ${totalPagos.toFixed(2)}`} note="Pagos registrados" />
          <StatCard icon="bi-chat-dots" label="Contacto" value="24/7" note="Atención por consulta" />
        </div>

        <section className="store-section mt-4">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Recomendados</span>
              <h2>Productos destacados para ti</h2>
            </div>
          </div>

          <div className="product-grid">
            {productos.slice(0, 3).map((p, index) => (
              <article className="product-card product-card-premium" key={p.idProducto}>
                <div className={`product-art art-${index % 4}`}>
                  <i className="bi bi-stars"></i>
                </div>

                <div className="product-body">
                  <span className="status-pill">{p.categoria || 'MUBI'}</span>
                  <h3>{p.nombre}</h3>
                  <p>{p.descripcion}</p>

                  <div className="product-footer">
                    <strong>S/ {Number(p.precio || 0).toFixed(2)}</strong>
                    <a className="btn btn-sm btn-outline-dark" href="/pedidos">
                      Pedir
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {error && (
        <div className="alert alert-danger">
          No se pudo conectar al backend: {error}
        </div>
      )}

      <section className="hero-card admin-hero">
        <div>
          <span className="badge-soft">Panel administrativo</span>
          <h1>Controla ventas, clientes, pedidos, pagos e inventario desde un solo lugar.</h1>
          <p>
            Dashboard del dueño con indicadores reales consumidos desde el backend
            ASP.NET Core y la base de datos del sistema.
          </p>

          <div className="hero-actions">
            <a className="btn btn-primary" href="/pedidos">
              Registrar pedido
            </a>
            <a className="btn btn-outline-dark" href="/productos">
              Gestionar catálogo
            </a>
          </div>
        </div>

        <div className="hero-preview">
          <i className="bi bi-graph-up-arrow"></i>
          <h3>Resumen del negocio</h3>
          <p>Visualiza operación, pagos y stock para tomar mejores decisiones.</p>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard icon="bi-bag-check" label="Productos" value={productos.length} note="Catálogo activo" />
        <StatCard icon="bi-people" label="Clientes" value={clientes.length} note="Registrados en BD" />
        <StatCard icon="bi-cash-stack" label="Pagos" value={`S/ ${totalPagos.toFixed(2)}`} note="Ingresos registrados" />
        <StatCard icon="bi-exclamation-triangle" label="Stock bajo" value={stockBajo} note="Alertas de inventario" />
      </div>

      <div className="row g-4 mt-1">
        <div className="col-lg-7">
          <div className="panel-card">
            <h4>Últimos pedidos</h4>

            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Saldo</th>
                  </tr>
                </thead>

                <tbody>
                  {pedidos.slice(0, 5).map((p) => (
                    <tr key={p.idPedido}>
                      <td>{p.cliente || `Cliente #${p.idCliente}`}</td>
                      <td>
                        <span className="status-pill">{p.estadoPedido}</span>
                      </td>
                      <td>S/ {Number(p.montoTotal || 0).toFixed(2)}</td>
                      <td>S/ {Number(p.saldoPendiente || 0).toFixed(2)}</td>
                    </tr>
                  ))}

                  {!pedidos.length && (
                    <tr>
                      <td colSpan="4">No hay pedidos registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="panel-card accent-panel">
            <h4>Prioridad de hoy</h4>
            <p>
              Tienes {pendientes} pedido(s) pendiente(s). Revisa pagos e inventario
              antes de confirmar producción.
            </p>

            <ul className="check-list">
              <li>Catálogo conectado al backend</li>
              <li>CRUD de clientes y productos</li>
              <li>Registro de pedidos y pagos</li>
              <li>Alertas de stock bajo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}