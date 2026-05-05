import { useEffect, useMemo, useState } from 'react';
import StatCard from '../components/StatCard.jsx';
import { api, endpoints } from '../services/api.js';

const safeArray = (value) => Array.isArray(value) ? value : [];

export default function Dashboard({ role }) {
  const [data, setData] = useState({ productos: [], clientes: [], pedidos: [], pagos: [], materiales: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(endpoints.productos),
      api.get(endpoints.clientes),
      api.get(endpoints.pedidos),
      api.get(endpoints.pagos),
      api.get(endpoints.materiales)
    ])
      .then(([productos, clientes, pedidos, pagos, materiales]) => setData({ productos, clientes, pedidos, pagos, materiales }))
      .catch((err) => setError(err.message));
  }, []);

  const totalPagos = useMemo(() => safeArray(data.pagos).reduce((acc, p) => acc + Number(p.monto || 0), 0), [data.pagos]);
  const stockBajo = useMemo(() => safeArray(data.materiales).filter(m => Number(m.stockActual) <= Number(m.stockMinimo)).length, [data.materiales]);
  const pendientes = safeArray(data.pedidos).filter(p => String(p.estadoPedido).toLowerCase() === 'pendiente').length;

  if (role === 'cliente') {
    return (
      <div className="fade-in">
        <section className="client-hero">
          <div>
            <span className="badge-soft">Tienda online MUBI</span>
            <h1>Polos sublimados y personalizados hechos para ti.</h1>
            <p>Explora el catálogo, solicita diseños personalizados y consulta el avance de tus pedidos.</p>
            <div className="hero-actions"><a href="/productos" className="btn btn-primary">Ver catálogo</a><a href="/contacto" className="btn btn-glass">Consultar por WhatsApp</a></div>
          </div>
        </section>
        <div className="product-grid mt-4">
          {safeArray(data.productos).slice(0, 3).map((p, index) => (
            <article className="product-card product-card-premium" key={p.idProducto}>
              <div className={`product-art art-${index % 4}`}><i className="bi bi-stars"></i></div>
              <div className="product-body"><span className="status-pill">{p.categoria || 'MUBI'}</span><h3>{p.nombre}</h3><p>{p.descripcion}</p><div className="product-footer"><strong>S/ {Number(p.precio || 0).toFixed(2)}</strong><a className="btn btn-sm btn-outline-dark" href="/pedidos">Pedir</a></div></div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {error && <div className="alert alert-danger">No se pudo conectar al backend: {error}</div>}
      <section className="hero-card admin-hero">
        <div>
          <span className="badge-soft">Panel administrativo</span>
          <h1>Controla ventas, clientes, pedidos, pagos e inventario desde un solo lugar.</h1>
          <p>Dashboard del dueño con indicadores reales consumidos desde el backend ASP.NET Core y SQL Server.</p>
          <div className="hero-actions"><a className="btn btn-primary" href="/pedidos">Registrar pedido</a><a className="btn btn-outline-dark" href="/productos">Gestionar catálogo</a></div>
        </div>
        <div className="hero-preview"><i className="bi bi-graph-up-arrow"></i><h3>Resumen del negocio</h3><p>Visualiza operación, pagos y stock para tomar mejores decisiones.</p></div>
      </section>

      <div className="stats-grid">
        <StatCard icon="bi-bag-check" label="Productos" value={safeArray(data.productos).length} note="Catálogo activo" />
        <StatCard icon="bi-people" label="Clientes" value={safeArray(data.clientes).length} note="Registrados en BD" />
        <StatCard icon="bi-cash-stack" label="Pagos" value={`S/ ${totalPagos.toFixed(2)}`} note="Ingresos registrados" />
        <StatCard icon="bi-exclamation-triangle" label="Stock bajo" value={stockBajo} note="Alertas de inventario" />
      </div>

      <div className="row g-4 mt-1">
        <div className="col-lg-7"><div className="panel-card"><h4>Últimos pedidos</h4><div className="table-responsive"><table className="table align-middle"><thead><tr><th>Cliente</th><th>Estado</th><th>Total</th><th>Saldo</th></tr></thead><tbody>{safeArray(data.pedidos).slice(0,5).map(p => <tr key={p.idPedido}><td>{p.cliente || `Cliente #${p.idCliente}`}</td><td><span className="status-pill">{p.estadoPedido}</span></td><td>S/ {Number(p.montoTotal || 0).toFixed(2)}</td><td>S/ {Number(p.saldoPendiente || 0).toFixed(2)}</td></tr>)}</tbody></table></div></div></div>
        <div className="col-lg-5"><div className="panel-card accent-panel"><h4>Prioridad de hoy</h4><p>Tienes {pendientes} pedido(s) pendiente(s). Revisa pagos e inventario antes de confirmar producción.</p><ul className="check-list"><li>Catálogo conectado al backend</li><li>CRUD de clientes y productos</li><li>Registro de pedidos y pagos</li><li>Alertas de stock bajo</li></ul></div></div>
      </div>
    </div>
  );
}
