import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

const emptyForm = {
  idCliente: '',
  idProducto: '',
  talla: 'M',
  color: 'Negro',
  cantidad: 1,
  tipoDiseno: 'Sublimado',
  ubicacionDiseno: 'Frente',
  descripcionDiseno: '',
  archivoDiseno: '',
  estadoPedido: 'pendiente'
};

export default function Pedidos({ role }) {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [pedidosData, clientesData, productosData] = await Promise.all([
      api.get(endpoints.pedidos),
      api.get(endpoints.clientes),
      api.get(endpoints.productos)
    ]);

    setPedidos(pedidosData);
    setClientes(clientesData);
    setProductos(productosData);

    setForm(prev => ({
      ...prev,
      idCliente: prev.idCliente || clientesData[0]?.idCliente || '',
      idProducto: prev.idProducto || productosData[0]?.idProducto || ''
    }));
  };

  useEffect(() => {
    const ideaGuardada = localStorage.getItem('ideaPedidoMubi');

    if (ideaGuardada) {
      setForm((prev) => ({
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

  const handleArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setForm({ ...form, archivoDiseno: file.name });
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const payload = {
      idCliente: Number(form.idCliente),
      estadoPedido: 'pendiente',
      observaciones: form.descripcionDiseno,
      detalles: [
        {
          idProducto: Number(form.idProducto),
          talla: form.talla,
          color: form.color,
          cantidad: Number(form.cantidad),
          precioUnitario: Number(selectedProduct?.precio || 0),
          descripcionDiseno: `Tipo: ${form.tipoDiseno}. Ubicación: ${form.ubicacionDiseno}. Detalle: ${form.descripcionDiseno}`,
          disenoPersonalizado: form.archivoDiseno || (form.descripcionDiseno ? 'Diseño descrito por cliente' : 'Sin diseño')
        }
      ]
    };

    try {
      await api.post(endpoints.pedidos, payload);
      setMessage('Pedido registrado correctamente.');
      setForm({
        ...emptyForm,
        idCliente: clientes[0]?.idCliente || '',
        idProducto: productos[0]?.idProducto || ''
      });
      setPreview('');
      localStorage.removeItem('ideaPedidoMubi');
      await load();
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

  return (
    <div className="fade-in">
      <PageHeader
        icon="bi-clipboard-check-fill"
        title={role === 'admin' ? 'Gestión de pedidos' : 'Registrar pedido'}
        subtitle="Registro de pedidos personalizados con cliente, producto, talla, color, diseño y especificaciones."
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="row g-4">
        <div className="col-lg-4">
          <form className="panel-card form-card" onSubmit={submit}>
            <h4>Nuevo pedido</h4>

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
                <label>Talla</label>
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

            <label>Tipo de diseño</label>
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

            <label>Ubicación del diseño</label>
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

            <label>Enviar diseño o referencia</label>
            <input
              className="form-control"
              type="file"
              accept="image/*"
              onChange={handleArchivo}
            />

            {preview && (
              <div className="design-preview mt-3">
                <img src={preview} alt="Vista previa del diseño" />
                <small>{form.archivoDiseno}</small>
              </div>
            )}

            <label>Descripción del diseño</label>
            <textarea
              className="form-control"
              rows="3"
              value={form.descripcionDiseno}
              onChange={e => setForm({ ...form, descripcionDiseno: e.target.value })}
              placeholder="Ejemplo: logo al frente, nombre atrás, colores, frase o temática..."
            ></textarea>

            <div className="summary-box">
              Total estimado: <strong>S/ {total.toFixed(2)}</strong>
            </div>

            <button className="btn btn-primary w-100 mt-3" type="submit">
              Guardar pedido
            </button>
          </form>
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
                      <td>{p.cliente || `Cliente #${p.idCliente}`}</td>
                      <td>
                        <span className="status-pill">{p.estadoPedido}</span>
                      </td>
                      <td>S/ {Number(p.montoTotal || 0).toFixed(2)}</td>
                      <td>S/ {Number(p.saldoPendiente || 0).toFixed(2)}</td>
                      <td>
                        <div className="table-actions">
                          <select
                            className="form-select form-select-sm"
                            value={p.estadoPedido}
                            onChange={e => updateEstado(p, e.target.value)}
                          >
                            <option value="pendiente">pendiente</option>
                            <option value="confirmado">confirmado</option>
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
    </div>
  );
}