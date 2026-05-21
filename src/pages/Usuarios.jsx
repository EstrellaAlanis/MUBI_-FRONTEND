import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filterRol, setFilterRol] = useState('todos');

  const load = async () => {
    const data = await api.get(endpoints.usuarios);
    setUsuarios(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load().catch(err => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    return usuarios.filter(u => {
      const texto = `${u.nombre} ${u.apellido} ${u.correo} ${u.rol} ${u.estado}`.toLowerCase();
      const matchSearch = texto.includes(search.toLowerCase());
      const rol = String(u.rol || (u.idRol === 1 ? 'administrador' : 'cliente')).toLowerCase();
      const matchRol = filterRol === 'todos' || rol.includes(filterRol);

      return matchSearch && matchRol;
    });
  }, [usuarios, search, filterRol]);

  const stats = useMemo(() => {
    const total = usuarios.length;
    const admins = usuarios.filter(u => String(u.rol || '').toLowerCase().includes('admin') || Number(u.idRol) === 1).length;
    const clientes = usuarios.filter(u => String(u.rol || '').toLowerCase().includes('cliente') || Number(u.idRol) === 2).length;
    const activos = usuarios.filter(u => String(u.estado || '').toLowerCase() === 'activo').length;

    return { total, admins, clientes, activos };
  }, [usuarios]);

  const updateUser = async (u, changes) => {
    setError('');
    setMessage('');

    try {
      const rolTexto = String(u.rol || '').toLowerCase();
      const idRolActual = Number(u.idRol || (rolTexto.includes('admin') ? 1 : 2));

      await api.put(`${endpoints.usuarios}/${u.idUsuario}`, {
        nombre: u.nombre || '',
        apellido: u.apellido || '',
        estado: changes.estado ?? u.estado ?? 'activo',
        idRol: Number(changes.idRol ?? idRolActual)
      });

      setMessage('Usuario actualizado correctamente.');
      await load();
      setSelectedUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return;

    try {
      await api.delete(`${endpoints.usuarios}/${id}`);
      setMessage('Usuario eliminado.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const ModalUsuario = () => {
    if (!selectedUser) return null;

    const rolTexto = String(selectedUser.rol || '').toLowerCase();
    const idRol = Number(selectedUser.idRol || (rolTexto.includes('admin') ? 1 : 2));
    const estado = String(selectedUser.estado || 'activo').toLowerCase();

    return (
      <div className="modal-backdrop-custom">
        <div className="pedido-modal admin-management-modal">
          <div className="pedido-modal-header">
            <div>
              <span className="badge-soft">Detalle de usuario</span>
              <h3>{selectedUser.nombre} {selectedUser.apellido}</h3>
              <p>{selectedUser.correo}</p>
            </div>

            <button
              className="btn btn-sm btn-outline-danger"
              type="button"
              onClick={() => setSelectedUser(null)}
            >
              Cerrar
            </button>
          </div>

          <div className="admin-detail-grid">
            <div>
              <strong>ID</strong>
              <p>#{selectedUser.idUsuario}</p>
            </div>

            <div>
              <strong>Rol actual</strong>
              <p>{selectedUser.rol || (idRol === 1 ? 'administrador' : 'cliente')}</p>
            </div>

            <div>
              <strong>Estado</strong>
              <p>{selectedUser.estado || 'activo'}</p>
            </div>

            <div>
              <strong>Correo</strong>
              <p>{selectedUser.correo}</p>
            </div>
          </div>

          <div className="admin-action-grid">
            <button
              className="btn btn-outline-dark"
              type="button"
              onClick={() => updateUser(selectedUser, { estado: estado === 'activo' ? 'inactivo' : 'activo' })}
            >
              <i className="bi bi-power"></i>
              {estado === 'activo' ? 'Desactivar usuario' : 'Activar usuario'}
            </button>

            <button
              className="btn btn-outline-dark"
              type="button"
              onClick={() => updateUser(selectedUser, { idRol: idRol === 1 ? 2 : 1 })}
            >
              <i className="bi bi-person-badge"></i>
              Cambiar a {idRol === 1 ? 'cliente' : 'administrador'}
            </button>

            <button
              className="btn btn-outline-danger"
              type="button"
              onClick={() => remove(selectedUser.idUsuario)}
            >
              <i className="bi bi-trash"></i>
              Eliminar usuario
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in admin-management-page">
      <PageHeader
        icon="bi-person-gear"
        title="Gestión de usuarios"
        subtitle="Vista administrativa para supervisar cuentas, roles y estados. Los clientes se registran desde la web."
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="admin-stats-grid">
        <article className="report-card">
          <span>Total usuarios</span>
          <strong>{stats.total}</strong>
          <p>Cuentas registradas.</p>
        </article>

        <article className="report-card">
          <span>Clientes</span>
          <strong>{stats.clientes}</strong>
          <p>Usuarios compradores.</p>
        </article>

        <article className="report-card">
          <span>Administradores</span>
          <strong>{stats.admins}</strong>
          <p>Cuentas con privilegios.</p>
        </article>

        <article className="report-card">
          <span>Activos</span>
          <strong>{stats.activos}</strong>
          <p>Usuarios habilitados.</p>
        </article>
      </div>

      <div className="panel-card admin-list-panel">
        <div className="admin-list-header">
          <div>
            <h4>Usuarios registrados</h4>
            <p>Gestiona accesos sin crear cuentas manualmente desde el panel.</p>
          </div>

          <button className="btn btn-outline-dark" type="button" onClick={load}>
            <i className="bi bi-arrow-clockwise"></i> Actualizar
          </button>
        </div>

        <div className="admin-toolbar">
          <input
            className="form-control"
            placeholder="Buscar por nombre, correo, rol o estado..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            className="form-select"
            value={filterRol}
            onChange={e => setFilterRol(e.target.value)}
          >
            <option value="todos">Todos los roles</option>
            <option value="admin">Administradores</option>
            <option value="cliente">Clientes</option>
          </select>
        </div>

        <div className="table-responsive admin-dark-table-wrap">
          <table className="table align-middle admin-dark-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(u => (
                <tr key={u.idUsuario}>
                  <td>#{u.idUsuario}</td>
                  <td>
                    <strong>{u.nombre} {u.apellido}</strong>
                  </td>
                  <td>{u.correo}</td>
                  <td>
                    <span className="status-pill">
                      {u.rol || (u.idRol === 1 ? 'administrador' : 'cliente')}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill status-${String(u.estado || 'activo').toLowerCase()}`}>
                      {u.estado || 'activo'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-dark"
                      type="button"
                      onClick={() => setSelectedUser(u)}
                    >
                      Ver / Gestionar
                    </button>
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td colSpan="6">No se encontraron usuarios.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalUsuario />
    </div>
  );
}
