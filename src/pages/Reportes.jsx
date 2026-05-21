import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

const safeArray = (value) => Array.isArray(value) ? value : [];

export default function Reportes() {
  const [data, setData] = useState({
    clientes: [],
    pedidos: [],
    pagos: [],
    materiales: [],
    productos: [],
    comprobantes: []
  });

  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(endpoints.clientes),
      api.get(endpoints.pedidos),
      api.get(endpoints.pagos),
      api.get(endpoints.materiales),
      api.get(endpoints.productos),
      api.get(endpoints.comprobantes)
    ])
      .then(([clientes, pedidos, pagos, materiales, productos, comprobantes]) =>
        setData({
          clientes: safeArray(clientes),
          pedidos: safeArray(pedidos),
          pagos: safeArray(pagos),
          materiales: safeArray(materiales),
          productos: safeArray(productos),
          comprobantes: safeArray(comprobantes)
        })
      )
      .catch(err => setError(err.message));
  }, []);

  const totalPagos = useMemo(
    () => data.pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0),
    [data.pagos]
  );

  const comprobantesEmitidos = data.comprobantes.filter(
    c => String(c.estado || '').toLowerCase() === 'emitido'
  );

  const totalComprobantes = useMemo(
    () => comprobantesEmitidos.reduce((acc, c) => acc + Number(c.total || 0), 0),
    [comprobantesEmitidos]
  );

  const pendientes = data.pedidos.filter(
    p => String(p.estadoPedido || '').toLowerCase() === 'pendiente'
  ).length;

  const confirmados = data.pedidos.filter(
    p => String(p.estadoPedido || '').toLowerCase() === 'confirmado'
  ).length;

  const pagados = data.pedidos.filter(
    p => String(p.estadoPedido || '').toLowerCase() === 'pagado'
  ).length;

  const enProceso = data.pedidos.filter(
    p => String(p.estadoPedido || '').toLowerCase() === 'en_proceso'
  ).length;

  const entregados = data.pedidos.filter(
    p => String(p.estadoPedido || '').toLowerCase() === 'entregado'
  ).length;

  const ingresosPendientes = data.pedidos.reduce(
    (acc, p) => acc + Number(p.saldoPendiente || 0),
    0
  );

  const stockBajo = data.materiales.filter(
    m => Number(m.stockActual) <= Number(m.stockMinimo)
  );

  const estadoChartData = [
    { name: 'Pendientes', value: pendientes },
    { name: 'Confirmados', value: confirmados },
    { name: 'Pagados', value: pagados },
    { name: 'En proceso', value: enProceso },
    { name: 'Entregados', value: entregados }
  ].filter(item => item.value > 0);

  const finanzasData = [
    { name: 'Pagos', value: Number(totalPagos || 0) },
    { name: 'Comprobantes', value: Number(totalComprobantes || 0) },
    { name: 'Saldo pendiente', value: Number(ingresosPendientes || 0) }
  ];

  const topPedidos = [...data.pedidos]
    .sort((a, b) => Number(b.montoTotal || 0) - Number(a.montoTotal || 0))
    .slice(0, 5);

  const COLORS = ['#59ff00', '#95ff77', '#00c853', '#ffc857', '#70d984'];

  return (
    <div className="fade-in admin-management-page reportes-control-page">
      <PageHeader
        icon="bi-bar-chart-fill"
        title="Reportes del administrador"
        subtitle="Indicadores operativos y financieros calculados con datos reales de la API."
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="admin-stats-grid">
        <article className="report-card">
          <span>Pagos registrados</span>
          <strong>S/ {totalPagos.toFixed(2)}</strong>
          <p>Según pagos actuales.</p>
        </article>

        <article className="report-card">
          <span>Ventas comprobadas</span>
          <strong>S/ {totalComprobantes.toFixed(2)}</strong>
          <p>Según boletas/facturas emitidas.</p>
        </article>

        <article className="report-card">
          <span>Saldo pendiente</span>
          <strong>S/ {ingresosPendientes.toFixed(2)}</strong>
          <p>Importe por cobrar.</p>
        </article>

        <article className="report-card">
          <span>Comprobantes emitidos</span>
          <strong>{comprobantesEmitidos.length}</strong>
          <p>Boletas y facturas activas.</p>
        </article>
      </div>

      <div className="admin-dashboard-grid">
        <article className="panel-card admin-chart-card">
          <div className="section-actions">
            <div>
              <span className="badge-soft">Pedidos</span>
              <h4>Distribución por estado</h4>
            </div>
          </div>

          <div className="admin-chart-box">
            {estadoChartData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={estadoChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={64}
                    outerRadius={98}
                    paddingAngle={4}
                  >
                    {estadoChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="admin-empty-chart">
                <i className="bi bi-pie-chart"></i>
                <span>No hay pedidos para graficar.</span>
              </div>
            )}
          </div>

          <div className="admin-status-legend">
            {estadoChartData.map((item, index) => (
              <div key={item.name}>
                <span style={{ background: COLORS[index % COLORS.length] }}></span>
                <strong>{item.name}</strong>
                <small>{item.value}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card admin-chart-card">
          <div className="section-actions">
            <div>
              <span className="badge-soft">Finanzas</span>
              <h4>Pagos, comprobantes y saldo</h4>
            </div>
          </div>

          <div className="admin-chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={finanzasData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(89,255,0,.14)" />
                <XAxis dataKey="name" stroke="rgba(244,255,240,.68)" />
                <YAxis stroke="rgba(244,255,240,.68)" />
                <Tooltip />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#59ff00" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className="admin-dashboard-grid secondary mt-4">
        <article className="panel-card admin-list-panel">
          <div className="admin-list-header">
            <div>
              <h4>Stock bajo</h4>
              <p>Materiales que requieren reposición para evitar retrasos.</p>
            </div>

            <a className="btn btn-outline-dark" href="/materiales">
              Ver inventario
            </a>
          </div>

          <div className="table-responsive admin-dark-table-wrap">
            <table className="table admin-dark-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Stock</th>
                  <th>Mínimo</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {stockBajo.map(m => (
                  <tr key={m.idMaterial}>
                    <td>
                      <strong>{m.nombreMaterial}</strong>
                      <small>{m.descripcion || 'Material de producción'}</small>
                    </td>
                    <td>{m.stockActual} {m.unidadMedida}</td>
                    <td>{m.stockMinimo}</td>
                    <td><span className="status-pill status-pendiente">Reponer</span></td>
                  </tr>
                ))}

                {!stockBajo.length && (
                  <tr>
                    <td colSpan="4">No hay materiales con stock bajo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel-card admin-list-panel">
          <div className="admin-list-header">
            <div>
              <h4>Pedidos de mayor valor</h4>
              <p>Pedidos con mayor monto total registrados en el sistema.</p>
            </div>

            <a className="btn btn-outline-dark" href="/pedidos">
              Ver pedidos
            </a>
          </div>

          <div className="admin-payment-list">
            {topPedidos.map(p => (
              <div className="admin-payment-item" key={p.idPedido}>
                <div>
                  <strong>Pedido #{p.idPedido}</strong>
                  <span>{p.cliente || `Cliente #${p.idCliente}`} · {p.estadoPedido}</span>
                </div>
                <small>S/ {Number(p.montoTotal || 0).toFixed(2)}</small>
              </div>
            ))}

            {!topPedidos.length && (
              <div className="admin-empty-state compact">
                <i className="bi bi-clipboard-check"></i>
                <span>No hay pedidos registrados.</span>
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="panel-card admin-operational-note mt-4">
        <i className="bi bi-info-circle"></i>
        <div>
          <strong>Lectura del reporte</strong>
          <p>
            Los pagos muestran dinero recibido, mientras que las ventas comprobadas representan comprobantes emitidos.
            El saldo pendiente ayuda a identificar pedidos que todavía requieren cobro.
          </p>
        </div>
      </div>
    </div>
  );
}
