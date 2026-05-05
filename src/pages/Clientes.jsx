import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

const emptyForm = { documentoIdentidad: '', nombres: '', apellidos: '', correo: '', telefono: '', direccion: '' };

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dniLoading, setDniLoading] = useState(false);

  const load = async () => setClientes(await api.get(endpoints.clientes));
  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  const filtered = useMemo(() => clientes.filter(c => `${c.documentoIdentidad || ''} ${c.nombres} ${c.apellidos} ${c.correo} ${c.telefono}`.toLowerCase().includes(search.toLowerCase())), [clientes, search]);

  const consultarDni = async () => {
    setError(''); setMessage('');
    const dni = form.documentoIdentidad.trim();
    if (!/^\d{8}$/.test(dni)) { setError('Ingrese un DNI válido de 8 dígitos.'); return; }
    setDniLoading(true);
    try {
      const data = await api.get(`${endpoints.clientes}/consultar-dni/${dni}`);
      if (data.encontrado) {
        setForm(prev => ({ ...prev, nombres: data.nombres, apellidos: data.apellidos }));
        setMessage(`Datos obtenidos desde consulta DNI: ${data.fuente}.`);
      } else {
        setMessage('DNI consultado, pero no se encontró en el modo demo. Puede completar manualmente.');
      }
    } catch (err) { setError(err.message); }
    finally { setDniLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    const payload = { ...form, documentoIdentidad: form.documentoIdentidad.trim() || null };
    try {
      if (editingId) await api.put(`${endpoints.clientes}/${editingId}`, payload); else await api.post(endpoints.clientes, payload);
      setMessage(editingId ? 'Cliente actualizado correctamente.' : 'Cliente creado correctamente.');
      setForm(emptyForm); setEditingId(null); await load();
    } catch (err) { setError(err.message); }
  };

  const edit = (c) => {
    setEditingId(c.idCliente);
    setForm({ documentoIdentidad: c.documentoIdentidad || '', nombres: c.nombres || '', apellidos: c.apellidos || '', correo: c.correo || '', telefono: c.telefono || '', direccion: c.direccion || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const remove = async (id) => { if (!confirm('¿Eliminar este cliente?')) return; try { await api.delete(`${endpoints.clientes}/${id}`); setMessage('Cliente eliminado.'); await load(); } catch (err) { setError(err.message); } };

  return (
    <div className="fade-in">
      <PageHeader icon="bi-people-fill" title="Gestión de clientes" subtitle="CRUD conectado al backend con documento de identidad y consulta DNI para autocompletar datos." />
      {error && <div className="alert alert-danger">{error}</div>}{message && <div className="alert alert-success">{message}</div>}
      <div className="row g-4">
        <div className="col-lg-4">
          <form className="panel-card form-card" onSubmit={submit}>
            <h4>{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h4>
            <label>DNI / Documento</label>
            <div className="input-action">
              <input className="form-control" maxLength="8" value={form.documentoIdentidad} onChange={e=>setForm({...form,documentoIdentidad:e.target.value.replace(/\D/g,'')})} placeholder="Ej. 71234567" />
              <button className="btn btn-outline-dark" type="button" onClick={consultarDni} disabled={dniLoading}>{dniLoading ? '...' : 'Buscar DNI'}</button>
            </div>
            <small className="helper-text">Modo demo listo para reemplazar por servicio SUNAT/RENIEC con token.</small>
            <label>Nombres</label><input className="form-control" value={form.nombres} onChange={e=>setForm({...form,nombres:e.target.value})} required />
            <label>Apellidos</label><input className="form-control" value={form.apellidos} onChange={e=>setForm({...form,apellidos:e.target.value})} required />
            <label>Correo</label><input className="form-control" type="email" value={form.correo} onChange={e=>setForm({...form,correo:e.target.value})} required />
            <label>Teléfono</label><input className="form-control" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} />
            <label>Dirección</label><input className="form-control" value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})} />
            <button className="btn btn-primary w-100 mt-3" type="submit"><i className="bi bi-save"></i> {editingId ? 'Actualizar' : 'Guardar cliente'}</button>
            {editingId && <button className="btn btn-outline-dark w-100 mt-2" type="button" onClick={()=>{setEditingId(null);setForm(emptyForm)}}>Cancelar</button>}
          </form>
        </div>
        <div className="col-lg-8"><div className="panel-card"><div className="section-actions"><input className="form-control" placeholder="Buscar por DNI, nombre, correo o teléfono..." value={search} onChange={e=>setSearch(e.target.value)} /><button className="btn btn-outline-dark" onClick={load}><i className="bi bi-arrow-clockwise"></i> Actualizar</button></div><div className="table-responsive"><table className="table align-middle"><thead><tr><th>ID</th><th>DNI</th><th>Nombres</th><th>Correo</th><th>Teléfono</th><th>Dirección</th><th>Acciones</th></tr></thead><tbody>{filtered.map(c=><tr key={c.idCliente}><td>{c.idCliente}</td><td>{c.documentoIdentidad || '-'}</td><td>{c.nombres} {c.apellidos}</td><td>{c.correo}</td><td>{c.telefono}</td><td>{c.direccion}</td><td><div className="table-actions"><button className="btn btn-sm btn-outline-dark" onClick={()=>edit(c)}>Editar</button><button className="btn btn-sm btn-outline-danger" onClick={()=>remove(c.idCliente)}>Eliminar</button></div></td></tr>)}</tbody></table></div></div></div>
      </div>
    </div>
  );
}
