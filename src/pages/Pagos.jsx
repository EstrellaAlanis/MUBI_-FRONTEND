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
      ? pedidosCliente.filter(p => ['confirmado', 'pagado'].includes(String(p.estadoPedido).toLowerCase()) || Number(p.saldoPendiente || 0) > 0)
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

  const totalMostrado = useMemo(
    () => pagosCliente.reduce((acc, p) => acc + Number(p.monto || 0), 0),
    [pagosCliente]
  );

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
    } catch (err) {
      setError(err.message);
    }
  };

  const pedidoName = (id) => {
    const pedido = pedidos.find(p => Number(p.idPedido) === Number(id));
    return pedido?.cliente || `Pedido #${id}`;
  };
  const getComprobantePedido = (idPedido) => {
    return comprobantes.find(c =>
      Number(c.idPedido) === Number(idPedido) &&
      String(c.estado || '').toLowerCase() === 'emitido'
    );
  };
  const title = role === 'admin' ? 'Gestión de pagos' : 'Mis pagos';
  const subtitle = role === 'admin'
    ? 'Control de adelantos, pagos finales, métodos de pago y saldo pendiente.'
    : 'Registra tu adelanto o pago final y consulta el historial de tus pagos.';

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
          <span>{role === 'admin' ? 'Total pagado' : 'Mis pagos registrados'}</span>
          <strong>S/ {totalMostrado.toFixed(2)}</strong>
          <p>{role === 'admin' ? 'Registrado en backend.' : 'Pagos enviados por el cliente.'}</p>
        </article>

        <article className="report-card">
          <span>{role === 'admin' ? 'Pagos' : 'Cantidad de pagos'}</span>
          <strong>{pagosCliente.length}</strong>
          <p>Historial actual.</p>
        </article>
      </div>

      {role === 'cliente' && (
        <div className="payment-client-info panel-card">
          <span className="badge-soft">Flujo de pago</span>
          <h4>Primero el admin confirma tu pedido, luego registras tu adelanto</h4>
          <p>
            Cuando tu pedido esté confirmado, puedes registrar un adelanto o pago final
            usando Yape, Plin o transferencia. Adjunta tu comprobante para que MUBI lo valide.
          </p>
        </div>
      )}

      <div className="row g-4">
        <div className={role === 'admin' ? 'col-lg-4' : 'col-lg-5'}>
          <form className="panel-card form-card" onSubmit={submit}>
            <h4>{role === 'admin' ? 'Registrar pago' : 'Enviar comprobante de pago'}</h4>

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

            {role === 'cliente' && !pedidosParaPago.length && (
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
              disabled={role === 'cliente' && !pedidosParaPago.length}
            >
              {role === 'admin' ? 'Guardar pago' : 'Enviar pago'}
            </button>
          </form>
        </div>

        <div className={role === 'admin' ? 'col-lg-8' : 'col-lg-7'}>
          <div className="panel-card">
            <div className="section-actions">
              <h4>{role === 'admin' ? 'Historial de pagos' : 'Mis pagos enviados'}</h4>

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
                    {role === 'admin' && <th></th>}
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
                      {role === 'admin' && (
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => remove(p.idPago)}
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}

                  {!pagosCliente.length && (
                    <tr>
                      <td colSpan={role === 'admin' ? 8 : 7}>
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
    </div>
  );
}