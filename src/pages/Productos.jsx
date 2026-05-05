import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

const emptyForm = { nombre: '', descripcion: '', precio: '', disponibilidad: 'disponible', idCategoria: '' };

export default function Productos({ role }) {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [productosData, categoriasData] = await Promise.all([api.get(endpoints.productos), api.get(endpoints.categorias)]);
    setProductos(productosData);
    setCategorias(categoriasData);
    if (!form.idCategoria && categoriasData[0]) setForm((prev) => ({ ...prev, idCategoria: categoriasData[0].idCategoria }));
  };

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  const filtered = useMemo(() => productos.filter(p => {
    const term = `${p.nombre} ${p.descripcion} ${p.categoria}`.toLowerCase();
    const matchSearch = term.includes(search.toLowerCase());
    const matchCategory = !filter || Number(p.idCategoria) === Number(filter);
    return matchSearch && matchCategory;
  }), [productos, search, filter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    const payload = { ...form, precio: Number(form.precio), idCategoria: Number(form.idCategoria), disponibilidad: form.disponibilidad.toLowerCase() };
    try {
      if (editingId) await api.put(`${endpoints.productos}/${editingId}`, payload); else await api.post(endpoints.productos, payload);
      setMessage(editingId ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.');
      setForm({ ...emptyForm, idCategoria: categorias[0]?.idCategoria || '' }); setEditingId(null); await load();
    } catch (err) { setError(err.message); }
  };

  const edit = (p) => { setEditingId(p.idProducto); setForm({ nombre: p.nombre || '', descripcion: p.descripcion || '', precio: p.precio || '', disponibilidad: p.disponibilidad || 'disponible', idCategoria: p.idCategoria || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const remove = async (id) => { if (!confirm('¿Eliminar este producto?')) return; try { await api.delete(`${endpoints.productos}/${id}`); setMessage('Producto eliminado.'); await load(); } catch (err) { setError(err.message); } };

  return (
    <div className="fade-in">
      <PageHeader icon="bi-bag-heart-fill" title={role === 'admin' ? 'Gestión de productos' : 'Catálogo de productos'} subtitle={role === 'admin' ? 'CRUD conectado al backend: registrar, editar, listar y eliminar productos.' : 'Elige polos personalizados por categoría.'} />
      {error && <div className="alert alert-danger">{error}</div>}{message && <div className="alert alert-success">{message}</div>}
      {role === 'admin' && <form className="panel-card form-card module-form" onSubmit={handleSubmit}>
        <h4>{editingId ? 'Editar producto' : 'Nuevo producto'}</h4>
        <div className="form-grid"><div><label>Nombre</label><input className="form-control" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required /></div><div><label>Precio</label><input className="form-control" type="number" step="0.01" value={form.precio} onChange={e=>setForm({...form,precio:e.target.value})} required /></div><div><label>Categoría</label><select className="form-select" value={form.idCategoria} onChange={e=>setForm({...form,idCategoria:e.target.value})} required>{categorias.map(c=><option key={c.idCategoria} value={c.idCategoria}>{c.nombreCategoria}</option>)}</select></div><div><label>Disponibilidad</label><select className="form-select" value={form.disponibilidad} onChange={e=>setForm({...form,disponibilidad:e.target.value})}><option value="disponible">disponible</option><option value="agotado">agotado</option><option value="inactivo">inactivo</option></select></div></div>
        <label>Descripción</label><textarea className="form-control" rows="2" value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})}></textarea>
        <div className="form-actions"><button className="btn btn-primary" type="submit"><i className="bi bi-save"></i> {editingId ? 'Actualizar' : 'Guardar'}</button>{editingId && <button className="btn btn-outline-dark" type="button" onClick={()=>{setEditingId(null);setForm(emptyForm)}}>Cancelar</button>}</div>
      </form>}
      <div className="filter-bar mt-4"><input className="form-control" placeholder="Buscar producto..." value={search} onChange={e=>setSearch(e.target.value)} /><select className="form-select" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Todas las categorías</option>{categorias.map(c=><option key={c.idCategoria} value={c.idCategoria}>{c.nombreCategoria}</option>)}</select></div>
      <div className="product-grid">{filtered.map((p,index)=><article className="product-card product-card-premium" key={p.idProducto}><div className={`product-art art-${index%4}`}><i className="bi bi-bag-heart"></i></div><div className="product-body"><span className="status-pill">{p.disponibilidad}</span><h3>{p.nombre}</h3><p>{p.descripcion}</p><small>{p.categoria}</small><div className="product-footer"><strong>S/ {Number(p.precio||0).toFixed(2)}</strong>{role==='admin'?<div className="table-actions"><button className="btn btn-sm btn-outline-dark" onClick={()=>edit(p)}>Editar</button><button className="btn btn-sm btn-outline-danger" onClick={()=>remove(p.idProducto)}>Eliminar</button></div>:<a href="/pedidos" className="btn btn-sm btn-primary">Pedir</a>}</div></div></article>)}</div>
    </div>
  );
}
