import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

export default function Comprobantes({ role }) {
  const [comprobantes, setComprobantes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [selectedComprobante, setSelectedComprobante] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [tipoComprobante, setTipoComprobante] = useState('boleta');
  const [observacion, setObservacion] = useState('');

  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [comprobantesData, pedidosData, clientesData] = await Promise.all([
      api.get(endpoints.comprobantes),
      api.get(endpoints.pedidos),
      api.get(endpoints.clientes)
    ]);

    setComprobantes(Array.isArray(comprobantesData) ? comprobantesData : []);
    setPedidos(Array.isArray(pedidosData) ? pedidosData : []);
    setClientes(Array.isArray(clientesData) ? clientesData : []);
  };

  useEffect(() => {
    load().catch(err => setError(err.message));
  }, []);

  const comprobantesEmitidos = comprobantes.filter(
    c => String(c.estado || '').toLowerCase() === 'emitido'
  );

  const comprobantesAnulados = comprobantes.filter(
    c => String(c.estado || '').toLowerCase() === 'anulado'
  );

  const totalEmitido = useMemo(() => {
    return comprobantesEmitidos.reduce((acc, c) => acc + Number(c.total || 0), 0);
  }, [comprobantes]);

  const pedidosDisponibles = useMemo(() => {
    const pedidosConComprobante = comprobantesEmitidos.map(c => Number(c.idPedido));

    return pedidos.filter(p => {
      const estado = String(p.estadoPedido || '').toLowerCase();
      const saldo = Number(p.saldoPendiente || 0);
      const yaTieneComprobante = pedidosConComprobante.includes(Number(p.idPedido));

      return !yaTieneComprobante && (estado === 'pagado' || saldo === 0);
    });
  }, [pedidos, comprobantes]);

  const comprobantesFiltrados = useMemo(() => {
    return comprobantes.filter(c => {
      const texto = `${c.numeroCompleto || ''} ${c.cliente || ''} ${c.tipoComprobante || ''} ${c.estado || ''} ${c.total || ''}`.toLowerCase();
      const matchSearch = texto.includes(search.toLowerCase());
      const matchTipo = filterTipo === 'todos' || String(c.tipoComprobante || '').toLowerCase() === filterTipo;

      return matchSearch && matchTipo;
    });
  }, [comprobantes, search, filterTipo]);

  const getClientePedido = (pedido) => {
    return clientes.find(c => Number(c.idCliente) === Number(pedido?.idCliente));
  };

  const clienteTexto = (c) => {
    if (!c) return 'Cliente no identificado';

    if (String(c.tipoCliente || '').toLowerCase() === 'empresa' && c.razonSocial) {
      return c.razonSocial;
    }

    return c.cliente || `${c.nombres || ''} ${c.apellidos || ''}`.trim() || 'Cliente no identificado';
  };

  const abrirEmision = (pedido) => {
    setSelectedPedido(pedido);

    const cliente = getClientePedido(pedido);
    const esEmpresa = String(cliente?.tipoCliente || '').toLowerCase() === 'empresa';

    setTipoComprobante(esEmpresa ? 'factura' : 'boleta');
    setObservacion(`Comprobante generado desde pedido #${pedido.idPedido}.`);
    setError('');
    setMessage('');
  };

  const emitirComprobante = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (!selectedPedido) {
        throw new Error('Selecciona un pedido pagado.');
      }

      const cliente = getClientePedido(selectedPedido);

      if (tipoComprobante === 'factura') {
        if (!cliente || String(cliente.tipoCliente || '').toLowerCase() !== 'empresa') {
          throw new Error('Solo puedes emitir factura a clientes tipo empresa.');
        }

        if (!cliente.ruc || !cliente.razonSocial) {
          throw new Error('El cliente empresa debe tener RUC y razón social.');
        }
      }

      await api.post(endpoints.comprobantes, {
        tipoComprobante,
        idPedido: Number(selectedPedido.idPedido),
        observacion
      });

      setMessage('Comprobante emitido correctamente.');
      setSelectedPedido(null);
      setTipoComprobante('boleta');
      setObservacion('');
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

  const ModalEmision = () => {
    if (!selectedPedido) return null;

    const cliente = getClientePedido(selectedPedido);
    const esEmpresa = String(cliente?.tipoCliente || '').toLowerCase() === 'empresa';

    return (
      <div className="modal-backdrop-custom">
        <div className="pedido-modal admin-management-modal">
          <div className="pedido-modal-header">
            <div>
              <span className="badge-soft">Emitir comprobante</span>
              <h3>Pedido #{selectedPedido.idPedido}</h3>
              <p>{selectedPedido.cliente || clienteTexto(cliente)}</p>
            </div>

            <button
              className="btn btn-sm btn-outline-danger"
              type="button"
              onClick={() => setSelectedPedido(null)}
            >
              Cerrar
            </button>
          </div>

          <form onSubmit={emitirComprobante}>
            <div className="admin-detail-grid">
              <div>
                <strong>Total pedido</strong>
                <p>S/ {Number(selectedPedido.montoTotal || 0).toFixed(2)}</p>
              </div>

              <div>
                <strong>Saldo pendiente</strong>
                <p>S/ {Number(selectedPedido.saldoPendiente || 0).toFixed(2)}</p>
              </div>

              <div>
                <strong>Cliente</strong>
                <p>{clienteTexto(cliente)}</p>
              </div>

              <div>
                <strong>Documento</strong>
                <p>
                  {esEmpresa
                    ? `RUC: ${cliente?.ruc || 'No registrado'}`
                    : `DNI: ${cliente?.documentoIdentidad || 'No registrado'}`}
                </p>
              </div>
            </div>

            <label>Tipo de comprobante</label>
            <select
              className="form-select"
              value={tipoComprobante}
              onChange={e => setTipoComprobante(e.target.value)}
            >
              <option value="boleta">Boleta</option>
              <option value="factura">Factura</option>
            </select>

            {tipoComprobante === 'factura' && !esEmpresa && (
              <div className="alert alert-warning mt-3">
                Para emitir factura, el cliente debe estar registrado como empresa con RUC y razón social.
              </div>
            )}

            <label>Observación</label>
            <textarea
              className="form-control"
              rows="3"
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
              placeholder="Ejemplo: comprobante generado por pago total."
            ></textarea>

            <div className="admin-action-grid mt-3">
              <button className="btn btn-primary" type="submit">
                <i className="bi bi-receipt-cutoff"></i> Emitir comprobante
              </button>

              <button
                className="btn btn-outline-dark"
                type="button"
                onClick={() => setSelectedPedido(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
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
        <p>Los clientes podrán visualizar sus comprobantes desde sus pedidos o pagos.</p>
      </div>
    );
  }

  return (
    <div className="fade-in comprobantes-page admin-management-page">
      <PageHeader
        icon="bi-receipt-cutoff"
        title="Boletas y facturas"
        subtitle="Vista de emisión y seguimiento de comprobantes generados desde pedidos pagados."
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="admin-stats-grid">
        <article className="report-card">
          <span>Total emitido</span>
          <strong>S/ {totalEmitido.toFixed(2)}</strong>
          <p>Comprobantes activos.</p>
        </article>

        <article className="report-card">
          <span>Por emitir</span>
          <strong>{pedidosDisponibles.length}</strong>
          <p>Pedidos pagados sin comprobante.</p>
        </article>

        <article className="report-card">
          <span>Emitidos</span>
          <strong>{comprobantesEmitidos.length}</strong>
          <p>Boletas y facturas vigentes.</p>
        </article>

        <article className="report-card">
          <span>Anulados</span>
          <strong>{comprobantesAnulados.length}</strong>
          <p>Comprobantes anulados.</p>
        </article>
      </div>

      <div className="panel-card invoice-queue-panel">
        <div className="admin-list-header">
          <div>
            <h4>Pedidos listos para comprobante</h4>
            <p>Emite boleta o factura solo desde pedidos pagados o con saldo cero.</p>
          </div>

          <button className="btn btn-outline-dark" type="button" onClick={load}>
            <i className="bi bi-arrow-clockwise"></i> Actualizar
          </button>
        </div>

        {pedidosDisponibles.length ? (
          <div className="invoice-queue-grid">
            {pedidosDisponibles.map(p => {
              const cliente = getClientePedido(p);
              const esEmpresa = String(cliente?.tipoCliente || '').toLowerCase() === 'empresa';

              return (
                <article className="invoice-queue-card" key={p.idPedido}>
                  <span className="badge-soft">Pedido #{p.idPedido}</span>
                  <h4>{p.cliente || clienteTexto(cliente)}</h4>
                  <p>
                    Total S/ {Number(p.montoTotal || 0).toFixed(2)} ·
                    saldo S/ {Number(p.saldoPendiente || 0).toFixed(2)}
                  </p>

                  <small>
                    {esEmpresa
                      ? `Factura disponible · RUC ${cliente?.ruc || 'no registrado'}`
                      : `Boleta sugerida · DNI ${cliente?.documentoIdentidad || 'no registrado'}`}
                  </small>

                  <button
                    className="btn btn-primary w-100 mt-3"
                    type="button"
                    onClick={() => abrirEmision(p)}
                  >
                    Emitir comprobante
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="fifo-empty">
            <i className="bi bi-check2-circle"></i>
            <strong>No hay comprobantes pendientes</strong>
            <span>Cuando un pedido esté pagado, aparecerá aquí para emitir boleta o factura.</span>
          </div>
        )}
      </div>

      <div className="panel-card admin-list-panel mt-4">
        <div className="admin-list-header">
          <div>
            <h4>Historial de comprobantes</h4>
            <p>Consulta, imprime o anula comprobantes ya emitidos.</p>
          </div>
        </div>

        <div className="admin-toolbar">
          <input
            className="form-control"
            placeholder="Buscar por número, cliente, tipo, estado o total..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            className="form-select"
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
          >
            <option value="todos">Todos los tipos</option>
            <option value="boleta">Boletas</option>
            <option value="factura">Facturas</option>
          </select>
        </div>

        <div className="table-responsive admin-dark-table-wrap">
          <table className="table align-middle admin-dark-table">
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
              {comprobantesFiltrados.map(c => (
                <tr key={c.idComprobante}>
                  <td>
                    <strong>{c.numeroCompleto}</strong>
                    <small>Pedido #{c.idPedido}</small>
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

              {!comprobantesFiltrados.length && (
                <tr>
                  <td colSpan="7">No hay comprobantes registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalEmision />
      <ModalComprobante />
    </div>
  );
}
