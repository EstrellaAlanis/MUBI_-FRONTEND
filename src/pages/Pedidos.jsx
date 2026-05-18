import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

const API_BASE_URL = 'http://localhost:5071';

const emptyForm = {
  idCliente: '',
  idProducto: '',
  talla: 'M',
  color: 'Negro',
  cantidad: 1,
  tipoDiseno: 'Sublimado',
  ubicacionDiseno: 'Frente y espalda',
  descripcionDiseno: '',
  archivoDisenoFrente: '',
  archivoDisenoEspalda: '',
  archivoExcelTallas: '',
  estadoPedido: 'pendiente'
};

export default function Pedidos({ role, user }) {
  const location = useLocation();
  const isCliente = role === 'cliente';
  const isPedidoPersonalizado = location.pathname === '/pedido-personalizado';

  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const [previewFrente, setPreviewFrente] = useState('');
  const [previewEspalda, setPreviewEspalda] = useState('');

  const [archivoFrente, setArchivoFrente] = useState(null);
  const [archivoEspalda, setArchivoEspalda] = useState(null);
  const [archivoExcel, setArchivoExcel] = useState(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  const load = async () => {
    const [pedidosData, clientesData, productosData] = await Promise.all([
      api.get(endpoints.pedidos),
      api.get(endpoints.clientes),
      api.get(endpoints.productos)
    ]);

    setPedidos(Array.isArray(pedidosData) ? pedidosData : []);
    setClientes(Array.isArray(clientesData) ? clientesData : []);
    setProductos(Array.isArray(productosData) ? productosData : []);

    setForm(prev => ({
      ...prev,
      idCliente: prev.idCliente || clientesData[0]?.idCliente || '',
      idProducto: prev.idProducto || productosData[0]?.idProducto || ''
    }));
  };

  useEffect(() => {
    const ideaGuardada = localStorage.getItem('ideaPedidoMubi');

    if (ideaGuardada) {
      setForm(prev => ({
        ...prev,
        descripcionDiseno: ideaGuardada
      }));
    }

    load().catch(err => setError(err.message));
  }, []);

  const selectedProduct = productos.find(
    p => Number(p.idProducto) === Number(form.idProducto)
  );

  const total = Number(selectedProduct?.precio || 0) * Number(form.cantidad || 0);

  const pedidosPendientes = pedidos.filter(
    p => String(p.estadoPedido).toLowerCase() === 'pendiente'
  ).length;

  const clienteActual = clientes.find(c =>
    Number(c.idUsuario) === Number(user?.idUsuario) ||
    String(c.correo || '').toLowerCase() === String(user?.correo || '').toLowerCase()
  );

  const pedidosCliente = isCliente && clienteActual
    ? pedidos.filter(p => Number(p.idCliente) === Number(clienteActual.idCliente))
    : pedidos;

  const handleArchivo = (e, lado) => {
    const file = e.target.files[0];
    if (!file) return;

    if (lado === 'frente') {
      setArchivoFrente(file);
      setForm({ ...form, archivoDisenoFrente: file.name });
      setPreviewFrente(URL.createObjectURL(file));
    }

    if (lado === 'espalda') {
      setArchivoEspalda(file);
      setForm({ ...form, archivoDisenoEspalda: file.name });
      setPreviewEspalda(URL.createObjectURL(file));
    }
  };

  const handleExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();

    if (!['xlsx', 'xls'].includes(extension)) {
      setError('Solo se permite subir archivos Excel .xlsx o .xls.');
      e.target.value = '';
      return;
    }

    setError('');
    setArchivoExcel(file);
    setForm({ ...form, archivoExcelTallas: file.name });
  };

  const subirImagen = async (archivo) => {
    if (!archivo) return '';

    const uploaded = await api.upload(`${endpoints.pedidos}/upload-diseno`, archivo);
    return uploaded.ruta || '';
  };

  const subirExcel = async (archivo) => {
    if (!archivo) return '';

    const uploaded = await api.upload(`${endpoints.pedidos}/subir-excel`, archivo);
    return uploaded.rutaExcelTallas || '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (isCliente && !clienteActual) {
        throw new Error('No se encontró tu registro de cliente. Verifica que tu correo esté registrado como cliente.');
      }

      const rutaFrente = await subirImagen(archivoFrente);
      const rutaEspalda = await subirImagen(archivoEspalda);
      const rutaExcelTallas = await subirExcel(archivoExcel);

      const archivos = [
        form.archivoDisenoFrente ? `Frente: ${form.archivoDisenoFrente}` : '',
        form.archivoDisenoEspalda ? `Espalda: ${form.archivoDisenoEspalda}` : '',
        form.archivoExcelTallas ? `Excel tallas/nombres/números: ${form.archivoExcelTallas}` : ''
      ].filter(Boolean).join(' | ');

      const payload = {
        idCliente: Number(isCliente ? clienteActual.idCliente : form.idCliente),
        estadoPedido: 'pendiente',
        observaciones: form.descripcionDiseno,
        rutaExcelTallas: rutaExcelTallas,
        detalles: [
          {
            idProducto: Number(form.idProducto),
            talla: form.talla,
            color: form.color,
            cantidad: Number(form.cantidad),
            precioUnitario: Number(selectedProduct?.precio || 0),
            descripcionDiseno: `Tipo: ${form.tipoDiseno}. Ubicación: ${form.ubicacionDiseno}. Detalle: ${form.descripcionDiseno}. Archivos: ${archivos || 'Sin archivos adjuntos'}`,
            disenoPersonalizado: archivos || (form.descripcionDiseno ? 'Diseño descrito por cliente' : 'Sin diseño'),
            rutaDisenoFrontal: rutaFrente,
            rutaDisenoPosterior: rutaEspalda
          }
        ]
      };

      await api.post(endpoints.pedidos, payload);

      setMessage('Pedido registrado correctamente. El administrador revisará tu pedido.');
      setForm({
        ...emptyForm,
        idCliente: clientes[0]?.idCliente || '',
        idProducto: productos[0]?.idProducto || ''
      });

      setPreviewFrente('');
      setPreviewEspalda('');
      setArchivoFrente(null);
      setArchivoEspalda(null);
      setArchivoExcel(null);

      localStorage.removeItem('ideaPedidoMubi');
      await load();

      if (isCliente) {
        setTimeout(() => {
          window.location.href = '/pedidos';
        }, 900);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const updateEstado = async (pedido, estadoPedido) => {
    try {
      await api.put(`${endpoints.pedidos}/${pedido.idPedido}`, {
        estadoPedido,
        observaciones: pedido.observaciones || ''
      });

      setMessage('Estado actualizado.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar pedido?')) return;

    try {
      await api.delete(`${endpoints.pedidos}/${id}`);
      setMessage('Pedido eliminado.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const getEstadoInfo = (estado) => {
    const value = String(estado || 'pendiente').toLowerCase();

    const textos = {
      pendiente: {
        titulo: 'Pedido recibido',
        texto: 'Tu pedido fue registrado y está esperando revisión del administrador.'
      },
      confirmado: {
        titulo: 'Pedido confirmado',
        texto: 'El administrador revisó tu pedido y confirmó los detalles.'
      },
      pagado: {
        titulo: 'Pago registrado',
        texto: 'El pago fue registrado. El pedido está listo para producción.'
      },
      en_proceso: {
        titulo: 'En producción',
        texto: 'Tu pedido se encuentra en proceso de elaboración.'
      },
      entregado: {
        titulo: 'Pedido entregado',
        texto: 'Tu pedido fue entregado correctamente.'
      },
      cancelado: {
        titulo: 'Pedido cancelado',
        texto: 'Este pedido fue cancelado. Puedes comunicarte con MUBI para más información.'
      }
    };

    return textos[value] || textos.pendiente;
  };

  const TrackingPedido = ({ estado }) => {
    const pasos = ['pendiente', 'confirmado', 'pagado', 'en_proceso', 'entregado'];
    const estadoActual = String(estado || 'pendiente').toLowerCase();
    const indexActual = pasos.indexOf(estadoActual);

    if (estadoActual === 'cancelado') {
      return <div className="tracking-cancelado">Pedido cancelado</div>;
    }

    return (
      <div className="tracking-pedido">
        {pasos.map((paso, index) => (
          <div
            key={paso}
            className={`tracking-step ${index <= indexActual ? 'active' : ''}`}
          >
            <span>{index + 1}</span>
            <small>{paso.replace('_', ' ')}</small>
          </div>
        ))}
      </div>
    );
  };

  const FormularioPedido = ({ modoCliente = false }) => (
    <form className={`panel-card form-card ${modoCliente ? 'client-order-form' : ''}`} onSubmit={submit}>
      <div className="form-title-row">
        <div>
          <h4>{modoCliente ? 'Personaliza tu pedido' : 'Nuevo pedido'}</h4>
          {modoCliente && (
            <p>Completa solo lo necesario. El administrador revisará los detalles antes de confirmar.</p>
          )}
        </div>
      </div>

      {!modoCliente && (
        <>
          <label>Cliente</label>
          <select
            className="form-select"
            value={form.idCliente}
            onChange={e => setForm({ ...form, idCliente: e.target.value })}
            required
          >
            {clientes.map(c => (
              <option key={c.idCliente} value={c.idCliente}>
                {c.nombres} {c.apellidos}
              </option>
            ))}
          </select>
        </>
      )}

      {modoCliente && (
        <div className="client-form-note">
          <i className="bi bi-person-check"></i>
          <div>
            <strong>{clienteActual ? `${clienteActual.nombres} ${clienteActual.apellidos}` : user?.nombre || 'Cliente'}</strong>
            <span>Este pedido se registrará a tu nombre.</span>
          </div>
        </div>
      )}

      <label>Producto</label>
      <select
        className="form-select"
        value={form.idProducto}
        onChange={e => setForm({ ...form, idProducto: e.target.value })}
        required
      >
        {productos.map(p => (
          <option key={p.idProducto} value={p.idProducto}>
            {p.nombre} - S/ {Number(p.precio).toFixed(2)}
          </option>
        ))}
      </select>

      <div className="row g-2">
        <div className="col">
          <label>Talla base</label>
          <select
            className="form-select"
            value={form.talla}
            onChange={e => setForm({ ...form, talla: e.target.value })}
          >
            <option>XS</option>
            <option>S</option>
            <option>M</option>
            <option>L</option>
            <option>XL</option>
            <option>XXL</option>
            <option>XXXL</option>
          </select>
        </div>

        <div className="col">
          <label>Color</label>
          <input
            className="form-control"
            value={form.color}
            onChange={e => setForm({ ...form, color: e.target.value })}
            placeholder="Ejemplo: negro, blanco, azul..."
          />
        </div>
      </div>

      <label>Cantidad</label>
      <input
        className="form-control"
        type="number"
        min="1"
        value={form.cantidad}
        onChange={e => setForm({ ...form, cantidad: e.target.value })}
      />

      <div className="simple-form-grid">
        <div>
          <label>Tipo de acabado</label>
          <select
            className="form-select"
            value={form.tipoDiseno}
            onChange={e => setForm({ ...form, tipoDiseno: e.target.value })}
          >
            <option>Sublimado</option>
            <option>Vinil textil</option>
            <option>Bordado</option>
            <option>Estampado simple</option>
          </select>
        </div>

        <div>
          <label>¿Dónde irá el diseño?</label>
          <select
            className="form-select"
            value={form.ubicacionDiseno}
            onChange={e => setForm({ ...form, ubicacionDiseno: e.target.value })}
          >
            <option>Frente</option>
            <option>Espalda</option>
            <option>Pecho izquierdo</option>
            <option>Manga</option>
            <option>Frente y espalda</option>
          </select>
        </div>
      </div>

      <div className="client-upload-area">
        <div>
          <label>Diseño frontal</label>
          <input
            className="form-control"
            type="file"
            accept="image/*"
            onChange={e => handleArchivo(e, 'frente')}
          />

          {previewFrente && (
            <div className="design-preview mt-3">
              <span className="preview-label">Vista frontal</span>
              <img src={previewFrente} alt="Vista previa del diseño frontal" />
              <small>{form.archivoDisenoFrente}</small>
            </div>
          )}
        </div>

        <div>
          <label>Diseño posterior</label>
          <input
            className="form-control"
            type="file"
            accept="image/*"
            onChange={e => handleArchivo(e, 'espalda')}
          />

          {previewEspalda && (
            <div className="design-preview mt-3">
              <span className="preview-label">Vista posterior</span>
              <img src={previewEspalda} alt="Vista previa del diseño posterior" />
              <small>{form.archivoDisenoEspalda}</small>
            </div>
          )}
        </div>
      </div>

      <div className="excel-upload-box">
        <label>Excel de tallas, nombres y números</label>
        <input
          className="form-control"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleExcel}
        />

        <small>
          Opcional. Úsalo si tu pedido tiene varios nombres, tallas o números.
        </small>

        {form.archivoExcelTallas && (
          <div className="mt-2">
            <span className="badge-soft">
              <i className="bi bi-file-earmark-excel"></i> {form.archivoExcelTallas}
            </span>
          </div>
        )}
      </div>

      <label>Cuéntanos cómo quieres tu polo</label>
      <textarea
        className="form-control"
        rows="3"
        value={form.descripcionDiseno}
        onChange={e => setForm({ ...form, descripcionDiseno: e.target.value })}
        placeholder="Ejemplo: logo al frente, nombre atrás, colores, frase, temática o referencia..."
      ></textarea>

      <div className="summary-box">
        Total estimado: <strong>S/ {total.toFixed(2)}</strong>
      </div>

      <button className="btn btn-primary w-100 mt-3" type="submit">
        {modoCliente ? 'Enviar pedido para revisión' : 'Guardar pedido'}
      </button>
    </form>
  );

  const ModalDetalle = () => {
    if (!pedidoSeleccionado) return null;

    return (
      <div className="modal-backdrop-custom">
        <div className="pedido-modal">
          <div className="pedido-modal-header">
            <div>
              <span className="badge-soft">Detalle del pedido</span>
              <h3>Pedido #{pedidoSeleccionado.idPedido}</h3>
              <p>{pedidoSeleccionado.cliente || `Cliente #${pedidoSeleccionado.idCliente}`}</p>

              {pedidoSeleccionado.rutaExcelTallas && (
                <a
                  className="btn btn-sm btn-outline-dark excel-download-btn"
                  href={`${API_BASE_URL}${pedidoSeleccionado.rutaExcelTallas}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <i className="bi bi-file-earmark-excel"></i>
                  Descargar Excel de tallas
                </a>
              )}
            </div>

            <button
              className="btn btn-sm btn-outline-danger"
              type="button"
              onClick={() => setPedidoSeleccionado(null)}
            >
              Cerrar
            </button>
          </div>

          <TrackingPedido estado={pedidoSeleccionado.estadoPedido} />

          <div className="pedido-detail-grid mt-3">
            <div>
              <strong>Estado</strong>
              <p>{pedidoSeleccionado.estadoPedido}</p>
            </div>

            <div>
              <strong>Total</strong>
              <p>S/ {Number(pedidoSeleccionado.montoTotal || 0).toFixed(2)}</p>
            </div>

            <div>
              <strong>Saldo</strong>
              <p>S/ {Number(pedidoSeleccionado.saldoPendiente || 0).toFixed(2)}</p>
            </div>

            <div>
              <strong>Observaciones</strong>
              <p>{pedidoSeleccionado.observaciones || 'Sin observaciones'}</p>
            </div>
          </div>

          {pedidoSeleccionado.detalles?.map((d, index) => (
            <div className="pedido-detail-card" key={index}>
              <h4>{d.producto || `Producto #${d.idProducto}`}</h4>

              <p>
                <strong>Talla:</strong> {d.talla} | <strong>Color:</strong> {d.color} | <strong>Cantidad:</strong> {d.cantidad}
              </p>

              <p>
                <strong>Diseño:</strong> {d.descripcionDiseno || 'Sin descripción'}
              </p>

              <div className="modal-design-grid">
                {d.rutaDisenoFrontal && (
                  <a href={`${API_BASE_URL}${d.rutaDisenoFrontal}`} target="_blank" rel="noreferrer">
                    <img src={`${API_BASE_URL}${d.rutaDisenoFrontal}`} alt="Diseño frontal" />
                    <span>Ver diseño frontal</span>
                  </a>
                )}

                {d.rutaDisenoPosterior && (
                  <a href={`${API_BASE_URL}${d.rutaDisenoPosterior}`} target="_blank" rel="noreferrer">
                    <img src={`${API_BASE_URL}${d.rutaDisenoPosterior}`} alt="Diseño posterior" />
                    <span>Ver diseño posterior</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isCliente && !isPedidoPersonalizado) {
    return (
      <div className="fade-in client-orders-page">
        <section className="client-orders-hero">
          <div>
            <span className="badge-soft">Área del cliente</span>
            <h2>Mis pedidos</h2>
            <p>
              Revisa el avance de tus pedidos, diseños enviados, pagos y estado de entrega.
            </p>
          </div>

          <Link className="btn btn-primary" to="/pedido-personalizado">
            <i className="bi bi-plus-circle"></i> Hacer nuevo pedido
          </Link>
        </section>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <div className="client-orders-grid">
          {pedidosCliente.map(p => {
            const estadoInfo = getEstadoInfo(p.estadoPedido);

            return (
              <article className="client-order-card" key={p.idPedido}>
                <div className="client-order-top">
                  <div>
                    <span className="client-order-number">Pedido #{p.idPedido}</span>
                    <h3>{estadoInfo.titulo}</h3>
                    <p>{estadoInfo.texto}</p>
                  </div>

                  <span className={`status-pill status-${String(p.estadoPedido).toLowerCase()}`}>
                    {p.estadoPedido}
                  </span>
                </div>

                <div className="client-order-track">
                  <TrackingPedido estado={p.estadoPedido} />
                </div>

                <div className="client-order-summary">
                  <div>
                    <span>Total</span>
                    <strong>S/ {Number(p.montoTotal || 0).toFixed(2)}</strong>
                  </div>

                  <div>
                    <span>Saldo</span>
                    <strong>S/ {Number(p.saldoPendiente || 0).toFixed(2)}</strong>
                  </div>

                  <div>
                    <span>Cliente</span>
                    <strong>{p.cliente || `Cliente #${p.idCliente}`}</strong>
                  </div>
                </div>

                <div className="client-order-assets">
                  {p.rutaExcelTallas && (
                    <a
                      href={`${API_BASE_URL}${p.rutaExcelTallas}`}
                      target="_blank"
                      rel="noreferrer"
                      className="excel-download-btn"
                    >
                      <i className="bi bi-file-earmark-excel"></i>
                      Excel de tallas
                    </a>
                  )}

                  {p.detalles?.map((d, index) => (
                    <div key={index} className="d-flex gap-2 flex-wrap">
                      {d.rutaDisenoFrontal && (
                        <a
                          href={`${API_BASE_URL}${d.rutaDisenoFrontal}`}
                          target="_blank"
                          rel="noreferrer"
                          className="design-thumb"
                        >
                          <img src={`${API_BASE_URL}${d.rutaDisenoFrontal}`} alt="Diseño frontal" />
                          <span>Frente</span>
                        </a>
                      )}

                      {d.rutaDisenoPosterior && (
                        <a
                          href={`${API_BASE_URL}${d.rutaDisenoPosterior}`}
                          target="_blank"
                          rel="noreferrer"
                          className="design-thumb"
                        >
                          <img src={`${API_BASE_URL}${d.rutaDisenoPosterior}`} alt="Diseño posterior" />
                          <span>Espalda</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                <div className="client-order-actions">
                  <button
                    className="btn btn-outline-dark"
                    type="button"
                    onClick={() => setPedidoSeleccionado(p)}
                  >
                    Ver detalle
                  </button>
                </div>
              </article>
            );
          })}

          {!pedidosCliente.length && (
            <div className="empty-state panel-card">
              <i className="bi bi-bag-heart"></i>
              <h4>Aún no tienes pedidos</h4>
              <p>Cuando realices un pedido, podrás revisar aquí su avance.</p>

              <Link className="btn btn-primary" to="/pedido-personalizado">
                Hacer mi primer pedido
              </Link>
            </div>
          )}
        </div>

        <ModalDetalle />
      </div>
    );
  }

  if (isCliente && isPedidoPersonalizado) {
    return (
      <div className="fade-in client-create-order-page">
        <section className="client-orders-hero">
          <div>
            <span className="badge-soft">Pedido personalizado</span>
            <h2>Haz tu pedido en pocos pasos</h2>
            <p>
              Selecciona el producto, sube tus diseños y agrega una descripción clara.
              MUBI revisará la información antes de confirmar.
            </p>
          </div>

          <Link className="btn btn-outline-dark" to="/pedidos">
            Ver mis pedidos
          </Link>
        </section>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <div className="client-order-layout">
          <FormularioPedido modoCliente />

          <aside className="client-order-help panel-card">
            <h4>Consejos para enviar tu pedido</h4>

            <ul className="check-list">
              <li>Sube el diseño frontal si irá en la parte delantera.</li>
              <li>Sube el diseño posterior si llevará nombre, número o frase.</li>
              <li>Usa el Excel si tienes varias tallas, nombres o números.</li>
              <li>Describe colores, temática y detalles importantes.</li>
            </ul>
          </aside>
        </div>

        <ModalDetalle />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader
        icon="bi-clipboard-check-fill"
        title="Gestión de pedidos"
        subtitle="Registro de pedidos personalizados con cliente, producto, talla, color, diseño y especificaciones."
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {pedidosPendientes > 0 && (
        <div className="alert alert-warning">
          🔔 Tienes {pedidosPendientes} pedido(s) pendiente(s) por revisar.
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-4">
          <FormularioPedido />
        </div>

        <div className="col-lg-8">
          <div className="panel-card">
            <div className="section-actions">
              <h4>Pedidos registrados</h4>

              <button className="btn btn-outline-dark" onClick={load}>
                Actualizar
              </button>
            </div>

            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Saldo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {pedidos.map(p => (
                    <tr key={p.idPedido}>
                      <td>#{p.idPedido}</td>

                      <td>
                        <strong>{p.cliente || `Cliente #${p.idCliente}`}</strong>

                        {p.rutaExcelTallas && (
                          <div className="mt-2">
                            <a
                              href={`${API_BASE_URL}${p.rutaExcelTallas}`}
                              target="_blank"
                              rel="noreferrer"
                              className="excel-download-btn"
                            >
                              <i className="bi bi-file-earmark-excel"></i>
                              Excel tallas
                            </a>
                          </div>
                        )}

                        {p.detalles?.map((d, index) => (
                          <div key={index} className="mt-2 d-flex gap-2 flex-wrap">
                            {d.rutaDisenoFrontal && (
                              <a
                                href={`${API_BASE_URL}${d.rutaDisenoFrontal}`}
                                target="_blank"
                                rel="noreferrer"
                                className="design-thumb"
                              >
                                <img
                                  src={`${API_BASE_URL}${d.rutaDisenoFrontal}`}
                                  alt="Diseño frontal"
                                />
                                <span>Frente</span>
                              </a>
                            )}

                            {d.rutaDisenoPosterior && (
                              <a
                                href={`${API_BASE_URL}${d.rutaDisenoPosterior}`}
                                target="_blank"
                                rel="noreferrer"
                                className="design-thumb"
                              >
                                <img
                                  src={`${API_BASE_URL}${d.rutaDisenoPosterior}`}
                                  alt="Diseño posterior"
                                />
                                <span>Espalda</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </td>

                      <td>
                        <span className="status-pill">{p.estadoPedido}</span>
                        <TrackingPedido estado={p.estadoPedido} />

                        {p.estadoPedido === 'pendiente' && (
                          <span className="badge-soft ms-2">Nuevo</span>
                        )}
                      </td>

                      <td>S/ {Number(p.montoTotal || 0).toFixed(2)}</td>
                      <td>S/ {Number(p.saldoPendiente || 0).toFixed(2)}</td>

                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-sm btn-outline-dark"
                            type="button"
                            onClick={() => setPedidoSeleccionado(p)}
                          >
                            Ver detalle
                          </button>

                          <select
                            className="form-select form-select-sm"
                            value={p.estadoPedido}
                            onChange={e => updateEstado(p, e.target.value)}
                          >
                            <option value="pendiente">pendiente</option>
                            <option value="confirmado">confirmado</option>
                            <option value="pagado">pagado</option>
                            <option value="en_proceso">en proceso</option>
                            <option value="entregado">entregado</option>
                            <option value="cancelado">cancelado</option>
                          </select>

                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => remove(p.idPedido)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!pedidos.length && (
                    <tr>
                      <td colSpan="6">No hay pedidos registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ModalDetalle />
    </div>
  );
}