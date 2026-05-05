import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

const emptyForm = { nombre: '', apellido: '', correo: '', contrasena: 'Cliente123*', idRol: 2 };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => setUsuarios(await api.get(endpoints.usuarios));
  useEffect(() => { load().catch(err => setError(err.message)); }, []);

  const filtered = useMemo(() => usuarios.filter(u => `${u.nombre} ${u.apellido} ${u.correo} ${u.rol}`.toLowerCase().includes(search.toLowerCase())), [usuarios, search]);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    try {
      await api.post(endpoints.usuarios, { ...form, idRol: Number(form.idRol) });
      setMessage('Usuario creado correctamente.');
      setForm(emptyForm); await load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try { await api.delete(`${endpoints.usuarios}/${id}`); setMessage('Usuario eliminado.'); await load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="fade-in">
      <PageHeader icon="bi-person-gear" title="Gestión de usuarios" subtitle="Módulo exclusivo del administrador para crear cuentas con rol de administrador o cliente." />
      {error && <div className="alert alert-danger">{error}</div>}{message && <div className="alert alert-success">{message}</div>}
      <div className="row g-4">
        <div className="col-lg-4">
          <form className="panel-card form-card" onSubmit={submit}>
            <h4>Nuevo usuario</h4>
            <label>Nombre</label><input className="form-control" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required />
            <label>Apellido</label><input className="form-control" value={form.apellido} onChange={e=>setForm({...form,apellido:e.target.value})} required />
            <label>Correo</label><input className="form-control" type="email" value={form.correo} onChange={e=>setForm({...form,correo:e.target.value})} required />
            <label>Contraseña inicial</label><input className="form-control" value={form.contrasena} onChange={e=>setForm({...form,contrasena:e.target.value})} required />
            <label>Rol</label><select className="form-select" value={form.idRol} onChange={e=>setForm({...form,idRol:e.target.value})}><option value="1">Administrador</option><option value="2">Cliente</option></select>
            <button className="btn btn-primary w-100 mt-3" type="submit"><i className="bi bi-save"></i> Crear usuario</button>
          </form>
        </div>
        <div className="col-lg-8">
          <div className="panel-card">
            <div className="section-actions"><input className="form-control" placeholder="Buscar usuario..." value={search} onChange={e=>setSearch(e.target.value)} /><button className="btn btn-outline-dark" onClick={load}>Actualizar</button></div>
            <div className="table-responsive"><table className="table align-middle"><thead><tr><th>ID</th><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map(u=><tr key={u.idUsuario}><td>{u.idUsuario}</td><td>{u.nombre} {u.apellido}</td><td>{u.correo}</td><td><span className="status-pill">{u.rol || (u.idRol === 1 ? 'administrador' : 'cliente')}</span></td><td>{u.estado}</td><td><button className="btn btn-sm btn-outline-danger" onClick={()=>remove(u.idUsuario)}>Eliminar</button></td></tr>)}</tbody></table></div>
          </div>
        </div>
      </div>
    </div>
  );
}
