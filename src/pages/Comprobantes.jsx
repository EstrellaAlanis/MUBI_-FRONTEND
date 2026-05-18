import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

const emptyForm = {
  tipoComprobante: 'boleta',
  idPedido: '',
  observacion: ''
};

export default function Comprobantes({ role }) {
  const [comprobantes, setComprobantes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedComprobante, setSelectedComprobante] = useState(null);

  const load = async () => {
    const [comprobantesData, pedidosData, clientesData] = await Promise.all([
      api.get(endpoints.comprobantes),
      api.get(endpoints.pedidos),
      api.get(endpoints.clientes)
    ]);

    const comprobantesList = Array.isArray(comprobantesData) ? comprobantesData : [];
    const pedidosList = Array.isArray(pedidosData) ? pedidosData : [];
    const clientesList = Array.isArray(clientesData) ? clientesData : [];

    setComprobantes(comprobantesList);
    setPedidos(pedidosList);
    setClientes(clientesList);

    const pedidosDisponibles = getPedidosDisponibles(pedidosList, comprobantesList);

    setForm(prev => ({
      ...prev,
      idPedido: prev.idPedido || pedidosDisponibles[0]?.idPedido || ''
    }));
  };

  useEffect(() => {
    load().catch(err => setError(err.message));
  }, []);

  const getPedidosDisponibles = (pedidosList = pedidos, comprobantesList = comprobantes) => {
    const pedidosConComprobante = comprobantesList
      .filter(c => String(c.estado).toLowerCase() === 'emitido')
      .map(c => Number(c.idPedido));

    return pedidosList.filter(p => {
      const estado = String(p.estadoPedido || '').toLowerCase();
      const saldo = Number(p.saldoPendiente || 0);
      const yaTieneComprobante = pedidosConComprobante.includes(Number(p.idPedido));

      return !yaTieneComprobante && (estado === 'pagado' || saldo === 0);
    });
  };

  const pedidosDisponibles = getPedidosDisponibles();

  const pedidoSeleccionado = pedidos.find(
    p => Number(p.idPedido) === Number(form.idPedido)
  );

  const clientePedido = clientes.find(
    c => Number(c.idCliente) === Number(pedidoSeleccionado?.idCliente)
  );

  const totalEmitido = useMemo(() => {
    return comprobantes
      .filter(c => String(c.estado).toLowerCase() === 'emitido')
      .reduce((acc, c) => acc + Number(c.total || 0), 0);
  }, [comprobantes]);

  const comprobantesEmitidos = comprobantes.filter(
    c => String(c.estado).toLowerCase() === 'emitido'
  ).length;

  const comprobantesAnulados = comprobantes.filter(
    c => String(c.estado).toLowerCase() === 'anulado'
  ).length;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (!form.idPedido) {
        throw new Error('Selecciona un pedido pagado para generar comprobante.');
      }

      if (form.tipoComprobante === 'factura') {
        if (!clientePedido || String(clientePedido.tipoCliente).toLowerCase() !== 'empresa') {
          throw new Error('Solo puedes emitir factura a clientes tipo empresa.');
        }

        if (!clientePedido.ruc || !clientePedido.razonSocial) {
          throw new Error('El cliente empresa debe tener RUC y razón social.');
        }
      }

      await api.post(endpoints.comprobantes, {
        tipoComprobante: form.tipoComprobante,
        idPedido: Number(form.idPedido),
        observacion: form.observacion
      });

      setMessage('Comprobante generado correctamente.');
      setForm({ ...emptyForm });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const anular = async (id) => {
    if (!confirm('¿Anular este comprobante?')) return;

    try {
      await api.put(`${endpoints.comprobantes}/${id}/anular`, {});
      setMessage('Comprobante anulado correctamente.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const imprimir = (comprobante) => {
    setSelectedComprobante(comprobante);

    setTimeout(() => {
      window.print();
    }, 300);
  };

  const clienteTexto = (c) => {
    if (String(c.tipoCliente).toLowerCase() === 'empresa' && c.razonSocial) {
      return c.razonSocial;
    }

    return c.cliente || 'Cliente no identificado';
  };

  const ModalComprobante = () => {
    if (!selectedComprobante) return null;

    return (
      <div className="modal-backdrop-custom print-area-wrapper">
        <div className="pedido-modal invoice-print-card">
          <div className="pedido-modal-header no-print">
            <div>
              <span className="badge-soft">Vista del comprobante</span>
              <h3>{selectedComprobante.numeroComplepleto || selectedComprobante.numeroCompleto}</h3>
            </div>

            <button
              className="btn btn-sm btn-outline-danger"
              type="button"
              onClick={() => setSelectedComprobante(null)}
            >
              Cerrar
            </button>
          </div>

          <div className="invoice-document">
            <div className="invoice-header">
              <div>
                <h2>MUBI</h2>
                <p>Polos sublimados y personalizados</p>
                <small>Sistema interno de venta</small>
              </div>

              <div className="invoice-number-box">
                <span>{selectedComprobante.tipoComprobante?.toUpperCase()}</span>
                <strong>{selectedComprobante.numeroCompleto}</strong>
                <small>Estado: {selectedComprobante.estado}</small>
              </div>
            </div>

            <div className="invoice-info-grid">
              <div>
                <span>Cliente</span>
                <strong>{clienteTexto(selectedComprobante)}</strong>
                <p>
                  DNI: {selectedComprobante.documentoIdentidad || 'No registrado'}
                  {selectedComprobante.ruc ? ` | RUC: ${selectedComprobante.ruc}` : ''}
                </p>
              </div>

              <div>
                <span>Fecha</span>
                <strong>{new Date(selectedComprobante.fechaEmision).toLocaleDateString()}</strong>
                <p>Pedido #{selectedComprobante.idPedido}</p>
              </div>
            </div>

            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th className="text-end">Importe</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Venta de productos personalizados MUBI</td>
                  <td className="text-end">S/ {Number(selectedComprobante.total || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div className="invoice-totals">
              <div>
                <span>Subtotal</span>
                <strong>S/ {Number(selectedComprobante.subtotal || 0).toFixed(2)}</strong>
              </div>

              <div>
                <span>IGV</span>
                <strong>S/ {Number(selectedComprobante.igv || 0).toFixed(2)}</strong>
              </div>

              <div className="invoice-total-final">
                <span>Total</span>
                <strong>S/ {Number(selectedComprobante.total || 0).toFixed(2)}</strong>
              </div>
            </div>

            {selectedComprobante.observacion && (
              <div className="invoice-note">
                <strong>Observación:</strong> {selectedComprobante.observacion}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (role !== 'admin') {
    return (
      <div className="panel-card no-access-card fade-in">
        <span className="badge-soft">Acceso restringido</span>
        <h2>Solo el administrador puede generar comprobantes</h2>
        <p>Los clientes podrán visualizar sus comprobantes más adelante desde sus pedidos o pagos.</p>
      </div>
    );
  }

  return (
    <div className="fade-in comprobantes-page">
      <PageHeader
        icon="bi-receipt-cutoff"
        title="Boletas y facturas"
        subtitle="Genera comprobantes internos desde pedidos pagados y consulta el historial de ventas."
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="stats-grid compact">
        <article className="report-card">
          <span>Total emitido</span>
          <strong>S/ {totalEmitido.toFixed(2)}</strong>
          <p>Comprobantes activos.</p>
        </article>

        <article className="report-card">
          <span>Emitidos</span>
          <strong>{comprobantesEmitidos}</strong>
          <p>Boletas y facturas vigentes.</p>
        </article>

        <article className="report-card">
          <span>Anulados</span>
          <strong>{comprobantesAnulados}</strong>
          <p>Comprobantes anulados.</p>
        </article>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <form className="panel-card form-card" onSubmit={submit}>
            <h4>Generar comprobante</h4>

            <label>Tipo de comprobante</label>
            <select
              className="form-select"
              value={form.tipoComprobante}
              onChange={e => setForm({ ...form, tipoComprobante: e.target.value })}
            >
              <option value="boleta">Boleta</option>
              <option value="factura">Factura</option>
            </select>

            <label>Pedido pagado</label>
            <select
              className="form-select"
              value={form.idPedido}
              onChange={e => setForm({ ...form, idPedido: e.target.value })}
              required
            >
              <option value="">Seleccionar pedido</option>
              {pedidosDisponibles.map(p => (
                <option key={p.idPedido} value={p.idPedido}>
                  #{p.idPedido} - {p.cliente} - S/ {Number(p.montoTotal || 0).toFixed(2)}
                </option>
              ))}
            </select>

            {!pedidosDisponibles.length && (
              <small className="helper-text">
                No hay pedidos pagados disponibles o todos ya tienen comprobante.
              </small>
            )}

            {pedidoSeleccionado && (
              <div className="payment-order-summary">
                <div>
                  <span>Cliente</span>
                  <strong>{pedidoSeleccionado.cliente}</strong>
                </div>

                <div>
                  <span>Total pedido</span>
                  <strong>S/ {Number(pedidoSeleccionado.montoTotal || 0).toFixed(2)}</strong>
                </div>

                <div>
                  <span>Estado</span>
                  <strong>{pedidoSeleccionado.estadoPedido}</strong>
                </div>
              </div>
            )}

            {clientePedido && (
              <div className="payment-client-info mt-3">
                <span className="badge-soft">
                  {clientePedido.tipoCliente === 'empresa' ? 'Cliente empresa' : 'Persona natural'}
                </span>

                <p className="mt-2">
                  {clientePedido.tipoCliente === 'empresa'
                    ? `${clientePedido.razonSocial || 'Sin razón social'} | RUC: ${clientePedido.ruc || 'Sin RUC'}`
                    : `DNI: ${clientePedido.documentoIdentidad || 'No registrado'}`}
                </p>
              </div>
            )}

            <label>Observación</label>
            <textarea
              className="form-control"
              rows="3"
              value={form.observacion}
              onChange={e => setForm({ ...form, observacion: e.target.value })}
              placeholder="Ejemplo: Comprobante generado por pago total."
            ></textarea>

            <button
              className="btn btn-primary w-100 mt-3"
              type="submit"
              disabled={!pedidosDisponibles.length}
            >
              <i className="bi bi-receipt"></i> Generar comprobante
            </button>
          </form>
        </div>

        <div className="col-lg-8">
          <div className="panel-card">
            <div className="section-actions">
              <h4>Historial de comprobantes</h4>

              <button className="btn btn-outline-dark" type="button" onClick={load}>
                Actualizar
              </button>
            </div>

            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {comprobantes.map(c => (
                    <tr key={c.idComprobante}>
                      <td>
                        <strong>{c.numeroCompleto}</strong>
                        <small className="d-block text-muted">Pedido #{c.idPedido}</small>
                      </td>

                      <td>{clienteTexto(c)}</td>
                      <td>{c.tipoComprobante}</td>
                      <td>S/ {Number(c.total || 0).toFixed(2)}</td>

                      <td>
                        <span className={`status-pill status-${String(c.estado).toLowerCase()}`}>
                          {c.estado}
                        </span>
                      </td>

                      <td>{new Date(c.fechaEmision).toLocaleDateString()}</td>

                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-sm btn-outline-dark"
                            type="button"
                            onClick={() => setSelectedComprobante(c)}
                          >
                            Ver
                          </button>

                          <button
                            className="btn btn-sm btn-outline-dark"
                            type="button"
                            onClick={() => imprimir(c)}
                          >
                            Imprimir
                          </button>

                          {String(c.estado).toLowerCase() !== 'anulado' && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              type="button"
                              onClick={() => anular(c.idComprobante)}
                            >
                              Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!comprobantes.length && (
                    <tr>
                      <td colSpan="7">No hay comprobantes registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ModalComprobante />
    </div>
  );
}