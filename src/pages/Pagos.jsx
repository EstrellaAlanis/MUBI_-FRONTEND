import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

const API_BASE_URL = 'http://localhost:5071';

const emptyForm = {
  idPedido: '',
  monto: '',
  metodoPago: 'Yape',
  tipoPago: 'adelanto',
  comprobante: ''
};

export default function Pagos({ role, user }) {
  const [pagos, setPagos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [comprobantes, setComprobantes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [archivoComprobante, setArchivoComprobante] = useState(null);
  const [previewComprobante, setPreviewComprobante] = useState('');
  const [selectedPago, setSelectedPago] = useState(null);
  const [search, setSearch] = useState('');
  const [filterMetodo, setFilterMetodo] = useState('todos');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [pagosData, pedidosData, comprobantesData] = await Promise.all([
      api.get(endpoints.pagos),
      api.get(endpoints.pedidos),
      api.get(endpoints.comprobantes)
    ]);

    const pagosList = Array.isArray(pagosData) ? pagosData : [];
    const pedidosList = Array.isArray(pedidosData) ? pedidosData : [];

    setPagos(pagosList);
    setPedidos(pedidosList);
    setComprobantes(Array.isArray(comprobantesData) ? comprobantesData : []);

    const pedidosCliente = getPedidosCliente(pedidosList);
    const pedidosDisponibles = role === 'cliente'
      ? pedidosCliente.filter(p => {
          const estado = String(p.estadoPedido || '').toLowerCase();
          return estado === 'confirmado' || estado === 'pagado' || Number(p.saldoPendiente || 0) > 0;
        })
      : pedidosList;

    setForm(prev => ({
      ...prev,
      idPedido: prev.idPedido || pedidosDisponibles[0]?.idPedido || pedidosList[0]?.idPedido || ''
    }));
  };

  useEffect(() => {
    load().catch(err => setError(err.message));
  }, []);

  const getPedidosCliente = (listaPedidos = pedidos) => {
    if (role !== 'cliente') return listaPedidos;

    return listaPedidos.filter(p =>
      String(p.cliente || '').toLowerCase().includes(String(user?.nombre || '').toLowerCase())
    );
  };

  const idsPedidosCliente = getPedidosCliente().map(p => Number(p.idPedido));

  const pagosCliente = role === 'cliente'
    ? pagos.filter(p => idsPedidosCliente.includes(Number(p.idPedido)))
    : pagos;

  const pedidosParaPago = role === 'cliente'
    ? getPedidosCliente().filter(p => {
        const estado = String(p.estadoPedido || '').toLowerCase();
        return estado === 'confirmado' || estado === 'pagado' || Number(p.saldoPendiente || 0) > 0;
      })
    : pedidos;

  const pedidoSeleccionado = pedidos.find(
    p => Number(p.idPedido) === Number(form.idPedido)
  );

  const pedidoName = (id) => {
    const pedido = pedidos.find(p => Number(p.idPedido) === Number(id));
    return pedido?.cliente || `Pedido #${id}`;
  };

  const getPedidoPago = (idPedido) => {
    return pedidos.find(p => Number(p.idPedido) === Number(idPedido));
  };

  const getComprobantePedido = (idPedido) => {
    return comprobantes.find(c =>
      Number(c.idPedido) === Number(idPedido) &&
      String(c.estado || '').toLowerCase() === 'emitido'
    );
  };

  const pagosFiltrados = useMemo(() => {
    return pagosCliente.filter(p => {
      const pedido = getPedidoPago(p.idPedido);
      const texto = `${pedidoName(p.idPedido)} ${p.metodoPago} ${p.tipoPago} ${p.monto} ${pedido?.estadoPedido || ''}`.toLowerCase();
      const matchSearch = texto.includes(search.toLowerCase());
      const matchMetodo = filterMetodo === 'todos' || String(p.metodoPago || '').toLowerCase() === filterMetodo;

      return matchSearch && matchMetodo;
    });
  }, [pagosCliente, pedidos, search, filterMetodo]);

  const totalMostrado = useMemo(
    () => pagosCliente.reduce((acc, p) => acc + Number(p.monto || 0), 0),
    [pagosCliente]
  );

  const pedidosConSaldo = useMemo(() => {
    return pedidos.filter(p => Number(p.saldoPendiente || 0) > 0);
  }, [pedidos]);

  const pagosConArchivo = useMemo(() => {
    return pagosCliente.filter(p => p.comprobante).length;
  }, [pagosCliente]);

  const subirComprobante = async () => {
    if (!archivoComprobante) return form.comprobante || '';

    const uploaded = await api.upload(`${endpoints.pagos}/upload-comprobante`, archivoComprobante);
    return uploaded.ruta || '';
  };

  const handleComprobante = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();

    if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extension)) {
      setError('Solo se permiten comprobantes JPG, PNG, WEBP o PDF.');
      e.target.value = '';
      return;
    }

    setError('');
    setArchivoComprobante(file);

    if (extension === 'pdf') {
      setPreviewComprobante('');
    } else {
      setPreviewComprobante(URL.createObjectURL(file));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (!form.idPedido) {
        throw new Error('Selecciona un pedido.');
      }

      if (Number(form.monto) <= 0) {
        throw new Error('El monto debe ser mayor a 0.');
      }

      if (role === 'cliente') {
        const estado = String(pedidoSeleccionado?.estadoPedido || '').toLowerCase();

        if (estado === 'pendiente') {
          throw new Error('Tu pedido aún está pendiente. Espera la confirmación del administrador para registrar el pago.');
        }

        if (!archivoComprobante) {
          throw new Error('Sube tu comprobante de pago para que el administrador pueda validarlo.');
        }
      }

      const comprobante = await subirComprobante();

      await api.post(endpoints.pagos, {
        ...form,
        idPedido: Number(form.idPedido),
        monto: Number(form.monto),
        comprobante
      });

      setMessage(
        role === 'cliente'
          ? 'Pago enviado correctamente. El administrador revisará tu comprobante.'
          : 'Pago registrado y saldo actualizado.'
      );

      setForm({
        ...emptyForm,
        idPedido: pedidosParaPago[0]?.idPedido || pedidos[0]?.idPedido || ''
      });

      setArchivoComprobante(null);
      setPreviewComprobante('');

      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar pago?')) return;

    try {
      await api.delete(`${endpoints.pagos}/${id}`);
      setMessage('Pago eliminado.');
      await load();
      setSelectedPago(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const ModalPago = () => {
    if (!selectedPago) return null;

    const pedido = getPedidoPago(selectedPago.idPedido);
    const comprobanteVenta = getComprobantePedido(selectedPago.idPedido);

    return (
      <div className="modal-backdrop-custom">
        <div className="pedido-modal admin-management-modal">
          <div className="pedido-modal-header">
            <div>
              <span className="badge-soft">Detalle del pago</span>
              <h3>Pago #{selectedPago.idPago}</h3>
              <p>{pedido?.cliente || `Pedido #${selectedPago.idPedido}`}</p>
            </div>

            <button
              className="btn btn-sm btn-outline-danger"
              type="button"
              onClick={() => setSelectedPago(null)}
            >
              Cerrar
            </button>
          </div>

          <div className="admin-detail-grid">
            <div>
              <strong>Pedido</strong>
              <p>#{selectedPago.idPedido}</p>
            </div>

            <div>
              <strong>Monto pagado</strong>
              <p>S/ {Number(selectedPago.monto || 0).toFixed(2)}</p>
            </div>

            <div>
              <strong>Método</strong>
              <p>{selectedPago.metodoPago}</p>
            </div>

            <div>
              <strong>Tipo</strong>
              <p>{selectedPago.tipoPago}</p>
            </div>

            <div>
              <strong>Estado pedido</strong>
              <p>{pedido?.estadoPedido || 'No encontrado'}</p>
            </div>

            <div>
              <strong>Saldo pedido</strong>
              <p>S/ {Number(pedido?.saldoPendiente || 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="payment-admin-preview">
            <span className="badge-soft">Comprobante del cliente</span>

            {selectedPago.comprobante ? (
              selectedPago.comprobante.toLowerCase().endsWith('.pdf') ? (
                <a
                  className="btn btn-outline-dark"
                  href={`${API_BASE_URL}${selectedPago.comprobante}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <i className="bi bi-file-earmark-pdf"></i> Abrir PDF
                </a>
              ) : (
                <a
                  href={`${API_BASE_URL}${selectedPago.comprobante}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img src={`${API_BASE_URL}${selectedPago.comprobante}`} alt="Comprobante de pago" />
                  <span>Ver imagen completa</span>
                </a>
              )
            ) : (
              <p>No se adjuntó comprobante.</p>
            )}
          </div>

          <div className="admin-action-grid mt-3">
            {pedido && Number(pedido.saldoPendiente || 0) <= 0 && !comprobanteVenta && (
              <a className="btn btn-primary" href="/comprobantes">
                <i className="bi bi-receipt"></i> Ir a generar comprobante
              </a>
            )}

            {comprobanteVenta && (
              <span className="badge-soft">
                <i className="bi bi-receipt-cutoff"></i> {comprobanteVenta.numeroCompleto}
              </span>
            )}

            <button
              className="btn btn-outline-danger"
              type="button"
              onClick={() => remove(selectedPago.idPago)}
            >
              <i className="bi bi-trash"></i> Eliminar pago
            </button>
          </div>
        </div>
      </div>
    );
  };

  const title = role === 'admin' ? 'Supervisión de pagos' : 'Mis pagos';
  const subtitle = role === 'admin'
    ? 'Vista de control para revisar pagos recibidos, comprobantes adjuntos y saldos por pedido.'
    : 'Registra tu adelanto o pago final y consulta el historial de tus pagos.';

  if (role === 'admin') {
    return (
      <div className="fade-in pagos-page admin-management-page">
        <PageHeader
          icon="bi-cash-coin"
          title={title}
          subtitle={subtitle}
        />

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <div className="admin-stats-grid">
          <article className="report-card">
            <span>Total pagado</span>
            <strong>S/ {totalMostrado.toFixed(2)}</strong>
            <p>Pagos registrados.</p>
          </article>

          <article className="report-card">
            <span>Pagos recibidos</span>
            <strong>{pagosCliente.length}</strong>
            <p>Movimientos actuales.</p>
          </article>

          <article className="report-card">
            <span>Con comprobante</span>
            <strong>{pagosConArchivo}</strong>
            <p>Archivos adjuntos.</p>
          </article>

          <article className="report-card">
            <span>Pedidos con saldo</span>
            <strong>{pedidosConSaldo.length}</strong>
            <p>Pendientes de completar pago.</p>
          </article>
        </div>

        <div className="panel-card admin-list-panel">
          <div className="admin-list-header">
            <div>
              <h4>Pagos recibidos</h4>
              <p>Revisa los pagos enviados por clientes y valida sus comprobantes.</p>
            </div>

            <button className="btn btn-outline-dark" type="button" onClick={load}>
              <i className="bi bi-arrow-clockwise"></i> Actualizar
            </button>
          </div>

          <div className="admin-toolbar">
            <input
              className="form-control"
              placeholder="Buscar por pedido, cliente, método o estado..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <select
              className="form-select"
              value={filterMetodo}
              onChange={e => setFilterMetodo(e.target.value)}
            >
              <option value="todos">Todos los métodos</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </div>

          <div className="table-responsive admin-dark-table-wrap">
            <table className="table align-middle admin-dark-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Tipo</th>
                  <th>Pago</th>
                  <th>Boleta / Factura</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {pagosFiltrados.map(p => {
                  const comprobanteVenta = getComprobantePedido(p.idPedido);

                  return (
                    <tr key={p.idPago}>
                      <td>
                        <strong>{pedidoName(p.idPedido)}</strong>
                        <small>Pedido #{p.idPedido}</small>
                      </td>

                      <td>S/ {Number(p.monto || 0).toFixed(2)}</td>
                      <td>{p.metodoPago}</td>
                      <td>{p.tipoPago}</td>

                      <td>
                        {p.comprobante ? (
                          <span className="badge-soft">
                            <i className="bi bi-paperclip"></i> adjunto
                          </span>
                        ) : (
                          <span className="text-muted">Sin archivo</span>
                        )}
                      </td>

                      <td>
                        {comprobanteVenta ? (
                          <span className="badge-soft">
                            <i className="bi bi-receipt-cutoff"></i>{' '}
                            {comprobanteVenta.numeroCompleto}
                          </span>
                        ) : (
                          <span className="text-muted">Pendiente</span>
                        )}
                      </td>

                      <td>{new Date(p.fechaPago).toLocaleDateString()}</td>

                      <td>
                        <button
                          className="btn btn-sm btn-outline-dark"
                          type="button"
                          onClick={() => setSelectedPago(p)}
                        >
                          Revisar
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!pagosFiltrados.length && (
                  <tr>
                    <td colSpan="8">No hay pagos registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel-card admin-operational-note">
          <i className="bi bi-info-circle"></i>
          <div>
            <strong>Flujo recomendado</strong>
            <p>
              El cliente registra el pago con comprobante. El administrador revisa el archivo,
              confirma que el saldo esté correcto y luego genera boleta o factura desde el módulo de comprobantes.
            </p>
          </div>
        </div>

        <ModalPago />
      </div>
    );
  }

  return (
    <div className="fade-in pagos-page">
      <PageHeader
        icon="bi-cash-coin"
        title={title}
        subtitle={subtitle}
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="stats-grid compact">
        <article className="report-card">
          <span>Mis pagos registrados</span>
          <strong>S/ {totalMostrado.toFixed(2)}</strong>
          <p>Pagos enviados por el cliente.</p>
        </article>

        <article className="report-card">
          <span>Cantidad de pagos</span>
          <strong>{pagosCliente.length}</strong>
          <p>Historial actual.</p>
        </article>
      </div>

      <div className="payment-client-info panel-card">
        <span className="badge-soft">Flujo de pago</span>
        <h4>Primero el admin confirma tu pedido, luego registras tu adelanto</h4>
        <p>
          Cuando tu pedido esté confirmado, puedes registrar un adelanto o pago final
          usando Yape, Plin o transferencia. Adjunta tu comprobante para que MUBI lo valide.
        </p>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <form className="panel-card form-card" onSubmit={submit}>
            <h4>Enviar comprobante de pago</h4>

            <div className="payment-flow-info">
              <span>Flujo:</span>
              <strong>Pedido → Confirmación → Pago → Producción → Entrega</strong>
            </div>

            <label>Pedido</label>
            <select
              className="form-select"
              value={form.idPedido}
              onChange={e => setForm({ ...form, idPedido: e.target.value })}
              required
            >
              {pedidosParaPago.map(p => (
                <option key={p.idPedido} value={p.idPedido}>
                  #{p.idPedido} - {p.cliente} - saldo S/ {Number(p.saldoPendiente || 0).toFixed(2)}
                </option>
              ))}
            </select>

            {!pedidosParaPago.length && (
              <small className="helper-text">
                Aún no tienes pedidos confirmados para registrar pago.
              </small>
            )}

            {pedidoSeleccionado && (
              <div className="payment-order-summary">
                <div>
                  <span>Total</span>
                  <strong>S/ {Number(pedidoSeleccionado.montoTotal || 0).toFixed(2)}</strong>
                </div>

                <div>
                  <span>Saldo pendiente</span>
                  <strong>S/ {Number(pedidoSeleccionado.saldoPendiente || 0).toFixed(2)}</strong>
                </div>

                <div>
                  <span>Estado</span>
                  <strong>{pedidoSeleccionado.estadoPedido}</strong>
                </div>
              </div>
            )}

            <label>Monto</label>
            <input
              className="form-control"
              type="number"
              step="0.01"
              value={form.monto}
              onChange={e => setForm({ ...form, monto: e.target.value })}
              required
            />

            <label>Método</label>
            <select
              className="form-select"
              value={form.metodoPago}
              onChange={e => setForm({ ...form, metodoPago: e.target.value })}
            >
              <option>Yape</option>
              <option>Plin</option>
              <option value="transferencia">transferencia</option>
              <option value="efectivo">efectivo</option>
            </select>

            <label>Tipo</label>
            <select
              className="form-select"
              value={form.tipoPago}
              onChange={e => setForm({ ...form, tipoPago: e.target.value })}
            >
              <option value="adelanto">adelanto</option>
              <option value="pago_parcial">pago parcial</option>
              <option value="pago_final">pago final</option>
            </select>

            <label>Comprobante</label>
            <input
              className="form-control"
              type="file"
              accept="image/*,.pdf"
              onChange={handleComprobante}
            />

            <small className="helper-text">
              Sube una captura de Yape, Plin, transferencia o un PDF.
            </small>

            {previewComprobante && (
              <div className="payment-preview">
                <img src={previewComprobante} alt="Vista previa del comprobante" />
                <span>Comprobante seleccionado</span>
              </div>
            )}

            {archivoComprobante && !previewComprobante && (
              <div className="payment-file-selected">
                <i className="bi bi-file-earmark-pdf"></i>
                <span>{archivoComprobante.name}</span>
              </div>
            )}

            <button
              className="btn btn-primary w-100 mt-3"
              type="submit"
              disabled={!pedidosParaPago.length}
            >
              Enviar pago
            </button>
          </form>
        </div>

        <div className="col-lg-7">
          <div className="panel-card">
            <div className="section-actions">
              <h4>Mis pagos enviados</h4>

              <button className="btn btn-outline-dark" onClick={load}>
                Actualizar
              </button>
            </div>

            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Tipo</th>
                    <th>Comprobante pago</th>
                    <th>Boleta / Factura</th>
                    <th>Fecha</th>
                  </tr>
                </thead>

                <tbody>
                  {pagosCliente.map(p => (
                    <tr key={p.idPago}>
                      <td>{pedidoName(p.idPedido)}</td>
                      <td>S/ {Number(p.monto || 0).toFixed(2)}</td>
                      <td>{p.metodoPago}</td>
                      <td>{p.tipoPago}</td>

                      <td>
                        {p.comprobante ? (
                          <a
                            className="excel-download-btn"
                            href={`${API_BASE_URL}${p.comprobante}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <i className="bi bi-receipt"></i>
                            Ver pago
                          </a>
                        ) : (
                          <span className="text-muted">Sin comprobante</span>
                        )}
                      </td>

                      <td>
                        {getComprobantePedido(p.idPedido) ? (
                          <span className="badge-soft">
                            <i className="bi bi-receipt-cutoff"></i>{' '}
                            {getComprobantePedido(p.idPedido).numeroCompleto}
                          </span>
                        ) : (
                          <span className="text-muted">Pendiente</span>
                        )}
                      </td>

                      <td>{new Date(p.fechaPago).toLocaleDateString()}</td>
                    </tr>
                  ))}

                  {!pagosCliente.length && (
                    <tr>
                      <td colSpan="7">
                        No hay pagos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ModalPago />
    </div>
  );
}
