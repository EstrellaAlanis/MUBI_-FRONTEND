import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

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
        setData({ clientes, pedidos, pagos, materiales, productos, comprobantes })
      )
      .catch(err => setError(err.message));
  }, []);

  const totalPagos = useMemo(
    () => data.pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0),
    [data.pagos]
  );

  const totalComprobantes = useMemo(
    () =>
      data.comprobantes
        .filter(c => String(c.estado).toLowerCase() === 'emitido')
        .reduce((acc, c) => acc + Number(c.total || 0), 0),
    [data.comprobantes]
  );

  const pendientes = data.pedidos.filter(
    p => String(p.estadoPedido).toLowerCase() === 'pendiente'
  ).length;

  const enProceso = data.pedidos.filter(
    p => String(p.estadoPedido).toLowerCase() === 'en_proceso'
  ).length;

  const stockBajo = data.materiales.filter(
    m => Number(m.stockActual) <= Number(m.stockMinimo)
  );

  const comprobantesEmitidos = data.comprobantes.filter(
    c => String(c.estado).toLowerCase() === 'emitido'
  ).length;

  return (
    <div className="fade-in">
      <PageHeader
        icon="bi-bar-chart-fill"
        title="Reportes del administrador"
        subtitle="Indicadores básicos calculados con datos reales de la API."
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="stats-grid">
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
          <span>Comprobantes emitidos</span>
          <strong>{comprobantesEmitidos}</strong>
          <p>Boletas y facturas activas.</p>
        </article>

        <article className="report-card">
          <span>Pedidos pendientes</span>
          <strong>{pendientes}</strong>
          <p>Requieren atención.</p>
        </article>

        <article className="report-card">
          <span>Pedidos en proceso</span>
          <strong>{enProceso}</strong>
          <p>Producción activa.</p>
        </article>

        <article className="report-card">
          <span>Clientes registrados</span>
          <strong>{data.clientes.length}</strong>
          <p>Base de datos comercial.</p>
        </article>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-lg-6">
          <div className="panel-card">
            <h4>Stock bajo</h4>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Stock</th>
                    <th>Mínimo</th>
                  </tr>
                </thead>

                <tbody>
                  {stockBajo.map(m => (
                    <tr key={m.idMaterial}>
                      <td>{m.nombreMaterial}</td>
                      <td>
                        {m.stockActual} {m.unidadMedida}
                      </td>
                      <td>{m.stockMinimo}</td>
                    </tr>
                  ))}

                  {!stockBajo.length && (
                    <tr>
                      <td colSpan="3">No hay materiales con stock bajo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="panel-card">
            <h4>Resumen operativo</h4>

            <ul className="check-list dark">
              <li>{data.productos.length} productos en catálogo</li>
              <li>{data.pedidos.length} pedidos registrados</li>
              <li>{data.pagos.length} pagos registrados</li>
              <li>{data.comprobantes.length} comprobantes registrados</li>
              <li>{data.materiales.length} materiales controlados</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}