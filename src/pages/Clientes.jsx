import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

const emptyEdit = {
  documentoIdentidad: '',
  nombres: '',
  apellidos: '',
  correo: '',
  telefono: '',
  direccion: '',
  referenciaDireccion: '',
  tipoCliente: 'persona',
  ruc: '',
  razonSocial: ''
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const data = await api.get(endpoints.clientes);
    setClientes(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load().catch(err => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    return clientes.filter(c => {
      const texto = `${c.documentoIdentidad || ''} ${c.nombres} ${c.apellidos} ${c.correo} ${c.telefono} ${c.direccion} ${c.ruc || ''} ${c.razonSocial || ''}`.toLowerCase();
      const matchSearch = texto.includes(search.toLowerCase());
      const tipo = String(c.tipoCliente || 'persona').toLowerCase();
      const matchTipo = filterTipo === 'todos' || tipo === filterTipo;

      return matchSearch && matchTipo;
    });
  }, [clientes, search, filterTipo]);

  const stats = useMemo(() => {
    const total = clientes.length;
    const persona = clientes.filter(c => String(c.tipoCliente || 'persona').toLowerCase() === 'persona').length;
    const empresa = clientes.filter(c => String(c.tipoCliente || '').toLowerCase() === 'empresa').length;
    const conDireccion = clientes.filter(c => c.direccion).length;

    return { total, persona, empresa, conDireccion };
  }, [clientes]);

  const startEdit = (c) => {
    setEditing(c);
    setEditForm({
      documentoIdentidad: c.documentoIdentidad || '',
      nombres: c.nombres || '',
      apellidos: c.apellidos || '',
      correo: c.correo || '',
      telefono: c.telefono || '',
      direccion: c.direccion || '',
      referenciaDireccion: c.referenciaDireccion || '',
      tipoCliente: c.tipoCliente || 'persona',
      ruc: c.ruc || '',
      razonSocial: c.razonSocial || ''
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      await api.put(`${endpoints.clientes}/${editing.idCliente}`, editForm);
      setMessage('Cliente actualizado correctamente.');
      setEditing(null);
      setEditForm(emptyEdit);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;

    try {
      await api.delete(`${endpoints.clientes}/${id}`);
      setMessage('Cliente eliminado.');
      await load();
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const ModalCliente = () => {
    if (!editing) return null;

    return (
      <div className="modal-backdrop-custom">
        <div className="pedido-modal admin-management-modal">
          <div className="pedido-modal-header">
            <div>
              <span className="badge-soft">Detalle del cliente</span>
              <h3>{editing.nombres} {editing.apellidos}</h3>
              <p>{editing.correo}</p>
            </div>

            <button
              className="btn btn-sm btn-outline-danger"
              type="button"
              onClick={() => setEditing(null)}
            >
              Cerrar
            </button>
          </div>

          <form onSubmit={saveEdit}>
            <div className="admin-detail-grid">
              <div>
                <strong>DNI / Documento</strong>
                <input
                  className="form-control"
                  value={editForm.documentoIdentidad}
                  onChange={e => setEditForm({ ...editForm, documentoIdentidad: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                />
              </div>

              <div>
                <strong>Teléfono</strong>
                <input
                  className="form-control"
                  value={editForm.telefono}
                  onChange={e => setEditForm({ ...editForm, telefono: e.target.value })}
                />
              </div>

              <div>
                <strong>Nombres</strong>
                <input
                  className="form-control"
                  value={editForm.nombres}
                  onChange={e => setEditForm({ ...editForm, nombres: e.target.value })}
                  required
                />
              </div>

              <div>
                <strong>Apellidos</strong>
                <input
                  className="form-control"
                  value={editForm.apellidos}
                  onChange={e => setEditForm({ ...editForm, apellidos: e.target.value })}
                  required
                />
              </div>

              <div>
                <strong>Correo</strong>
                <input
                  className="form-control"
                  type="email"
                  value={editForm.correo}
                  onChange={e => setEditForm({ ...editForm, correo: e.target.value })}
                  required
                />
              </div>

              <div>
                <strong>Tipo</strong>
                <select
                  className="form-select"
                  value={editForm.tipoCliente}
                  onChange={e => setEditForm({ ...editForm, tipoCliente: e.target.value })}
                >
                  <option value="persona">Persona natural</option>
                  <option value="empresa">Empresa</option>
                </select>
              </div>
            </div>

            <label>Dirección</label>
            <input
              className="form-control"
              value={editForm.direccion}
              onChange={e => setEditForm({ ...editForm, direccion: e.target.value })}
            />

            <label>Referencia</label>
            <input
              className="form-control"
              value={editForm.referenciaDireccion}
              onChange={e => setEditForm({ ...editForm, referenciaDireccion: e.target.value })}
            />

            {editForm.tipoCliente === 'empresa' && (
              <div className="admin-detail-grid mt-3">
                <div>
                  <strong>RUC</strong>
                  <input
                    className="form-control"
                    value={editForm.ruc}
                    onChange={e => setEditForm({ ...editForm, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                  />
                </div>

                <div>
                  <strong>Razón social</strong>
                  <input
                    className="form-control"
                    value={editForm.razonSocial}
                    onChange={e => setEditForm({ ...editForm, razonSocial: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="admin-action-grid mt-3">
              <button className="btn btn-primary" type="submit">
                <i className="bi bi-save"></i> Guardar cambios
              </button>

              <button
                className="btn btn-outline-danger"
                type="button"
                onClick={() => remove(editing.idCliente)}
              >
                <i className="bi bi-trash"></i> Eliminar cliente
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in admin-management-page">
      <PageHeader
        icon="bi-people-fill"
        title="Gestión de clientes"
        subtitle="Vista de seguimiento de clientes registrados desde la web, pedidos y checkout."
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="admin-stats-grid">
        <article className="report-card">
          <span>Total clientes</span>
          <strong>{stats.total}</strong>
          <p>Clientes registrados.</p>
        </article>

        <article className="report-card">
          <span>Personas</span>
          <strong>{stats.persona}</strong>
          <p>Boleta / consumidor final.</p>
        </article>

        <article className="report-card">
          <span>Empresas</span>
          <strong>{stats.empresa}</strong>
          <p>Clientes con factura.</p>
        </article>

        <article className="report-card">
          <span>Con dirección</span>
          <strong>{stats.conDireccion}</strong>
          <p>Datos de entrega completos.</p>
        </article>
      </div>

      <div className="panel-card admin-list-panel">
        <div className="admin-list-header">
          <div>
            <h4>Clientes registrados</h4>
            <p>Los clientes se crean desde registro, Google o al completar un pedido.</p>
          </div>

          <button className="btn btn-outline-dark" type="button" onClick={load}>
            <i className="bi bi-arrow-clockwise"></i> Actualizar
          </button>
        </div>

        <div className="admin-toolbar">
          <input
            className="form-control"
            placeholder="Buscar por DNI, nombre, correo, teléfono, RUC o dirección..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            className="form-select"
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="persona">Personas</option>
            <option value="empresa">Empresas</option>
          </select>
        </div>

        <div className="table-responsive admin-dark-table-wrap">
          <table className="table align-middle admin-dark-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Tipo</th>
                <th>Entrega</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(c => (
                <tr key={c.idCliente}>
                  <td>#{c.idCliente}</td>

                  <td>
                    <strong>{c.nombres} {c.apellidos}</strong>
                    <small>{c.documentoIdentidad ? `DNI: ${c.documentoIdentidad}` : 'DNI no registrado'}</small>
                  </td>

                  <td>
                    <strong>{c.correo}</strong>
                    <small>{c.telefono || 'Teléfono no registrado'}</small>
                  </td>

                  <td>
                    <span className="status-pill">
                      {c.tipoCliente || 'persona'}
                    </span>
                    {c.ruc && <small>RUC: {c.ruc}</small>}
                  </td>

                  <td>
                    <span>{c.direccion || 'Sin dirección'}</span>
                    {c.referenciaDireccion && <small>{c.referenciaDireccion}</small>}
                  </td>

                  <td>
                    <button
                      className="btn btn-sm btn-outline-dark"
                      type="button"
                      onClick={() => startEdit(c)}
                    >
                      Ver / Editar
                    </button>
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td colSpan="6">No se encontraron clientes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalCliente />
    </div>
  );
}