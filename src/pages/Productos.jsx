import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

const API_BASE_URL = 'http://localhost:5071';

const emptyForm = {
  nombre: '',
  descripcion: '',
  precio: '',
  disponibilidad: 'disponible',
  idCategoria: '',
  rutaImagenPrincipal: ''
};

export default function Productos({ role, user }) {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [archivoImagen, setArchivoImagen] = useState(null);
  const [previewImagen, setPreviewImagen] = useState('');

  const [productoModal, setProductoModal] = useState(null);
  const [productoAgregado, setProductoAgregado] = useState(null);
  const [opcionesPedido, setOpcionesPedido] = useState({
    talla: 'M',
    color: 'Negro',
    cantidad: 1,
    personalizados: [{ talla: 'M', nombre: '', numero: '' }]
  });

  const load = async () => {
    const [productosData, categoriasData] = await Promise.all([
      api.get(endpoints.productos),
      api.get(endpoints.categorias)
    ]);

    setProductos(Array.isArray(productosData) ? productosData : []);
    setCategorias(Array.isArray(categoriasData) ? categoriasData : []);

    if (!form.idCategoria && categoriasData[0]) {
      setForm((prev) => ({ ...prev, idCategoria: categoriasData[0].idCategoria }));
    }
  };

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    return productos.filter((p) => {
      const term = `${p.nombre} ${p.descripcion} ${p.categoria}`.toLowerCase();
      const matchSearch = term.includes(search.toLowerCase());
      const matchCategory = !filter || Number(p.idCategoria) === Number(filter);
      return matchSearch && matchCategory;
    });
  }, [productos, search, filter]);

  const handleImagen = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();

    if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
      setError('Solo se permiten imágenes JPG, PNG o WEBP.');
      e.target.value = '';
      return;
    }

    setError('');
    setArchivoImagen(file);
    setPreviewImagen(URL.createObjectURL(file));
  };

  const subirImagenProducto = async () => {
    if (!archivoImagen) return form.rutaImagenPrincipal || '';

    const uploaded = await api.upload(`${endpoints.productos}/upload-imagen`, archivoImagen);
    return uploaded.ruta || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const rutaImagenPrincipal = await subirImagenProducto();

      const payload = {
        ...form,
        precio: Number(form.precio),
        idCategoria: Number(form.idCategoria),
        disponibilidad: form.disponibilidad.toLowerCase(),
        rutaImagenPrincipal
      };

      if (editingId) {
        await api.put(`${endpoints.productos}/${editingId}`, payload);
      } else {
        await api.post(endpoints.productos, payload);
      }

      setMessage(editingId ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.');
      setForm({ ...emptyForm, idCategoria: categorias[0]?.idCategoria || '' });
      setEditingId(null);
      setArchivoImagen(null);
      setPreviewImagen('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const edit = (p) => {
    setEditingId(p.idProducto);
    setForm({
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      precio: p.precio || '',
      disponibilidad: p.disponibilidad || 'disponible',
      idCategoria: p.idCategoria || '',
      rutaImagenPrincipal: p.rutaImagenPrincipal || ''
    });

    setArchivoImagen(null);
    setPreviewImagen(p.rutaImagenPrincipal ? `${API_BASE_URL}${p.rutaImagenPrincipal}` : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ ...emptyForm, idCategoria: categorias[0]?.idCategoria || '' });
    setArchivoImagen(null);
    setPreviewImagen('');
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;

    try {
      await api.delete(`${endpoints.productos}/${id}`);
      setMessage('Producto eliminado.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const imagenProducto = (p) => {
    return p?.rutaImagenPrincipal ? `${API_BASE_URL}${p.rutaImagenPrincipal}` : '';
  };

  const abrirOpcionesProducto = (p) => {
    setProductoModal(p);
    setProductoAgregado(null);
    setOpcionesPedido({
      talla: 'M',
      color: 'Negro',
      cantidad: 1,
      personalizados: [{ talla: 'M', nombre: '', numero: '' }]
    });
  };

  const cerrarModalProducto = () => {
    setProductoModal(null);
    setProductoAgregado(null);
  };

  const actualizarFilaPersonalizada = (index, field, value) => {
    const filas = [...opcionesPedido.personalizados];

    filas[index] = {
      ...filas[index],
      [field]: value
    };

    const ultima = filas[filas.length - 1];
    const ultimaTieneDatos =
      String(ultima.talla || '').trim() !== '' ||
      String(ultima.nombre || '').trim() !== '' ||
      String(ultima.numero || '').trim() !== '';

    if (index === filas.length - 1 && ultimaTieneDatos) {
      filas.push({ talla: 'M', nombre: '', numero: '' });
    }

    setOpcionesPedido({
      ...opcionesPedido,
      personalizados: filas
    });
  };

  const agregarFilaPersonalizada = () => {
    setOpcionesPedido({
      ...opcionesPedido,
      personalizados: [
        ...opcionesPedido.personalizados,
        { talla: 'M', nombre: '', numero: '' }
      ]
    });
  };

  const eliminarFilaPersonalizada = (index) => {
    const filas = opcionesPedido.personalizados.filter((_, i) => i !== index);

    setOpcionesPedido({
      ...opcionesPedido,
      personalizados: filas.length
        ? filas
        : [{ talla: 'M', nombre: '', numero: '' }]
    });
  };

  const agregarAlCarrito = () => {
    if (!productoModal) return;

    const cart = JSON.parse(localStorage.getItem('mubiCart') || '[]');

    const item = {
      cartId: `${productoModal.idProducto}-${Date.now()}`,
      idProducto: productoModal.idProducto,
      nombre: productoModal.nombre,
      descripcion: productoModal.descripcion,
      categoria: productoModal.categoria,
      precio: Number(productoModal.precio || 0),
      imagen: imagenProducto(productoModal),
      talla: opcionesPedido.talla,
      color: opcionesPedido.color,
      cantidad: Number(opcionesPedido.cantidad || 1),
      personalizados: opcionesPedido.personalizados.filter(
        row =>
          String(row.talla || '').trim() !== '' ||
          String(row.nombre || '').trim() !== '' ||
          String(row.numero || '').trim() !== ''
      )
    };

    const nextCart = [...cart, item];

    localStorage.setItem('mubiCart', JSON.stringify(nextCart));
    window.dispatchEvent(new Event('mubi-cart-updated'));

    setProductoAgregado(item);

    setTimeout(() => {
      window.location.href = '/carrito';
    }, 900);
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="bi-bag-heart-fill"
        title={role === 'admin' ? 'Gestión de productos' : 'Catálogo MUBI'}
        subtitle={
          role === 'admin'
            ? 'Administra el catálogo: registra, edita, lista y elimina productos.'
            : 'Explora polos sublimados y personalizados. Puedes elegir un modelo y comprar sin registrarte hasta el final.'
        }
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {role !== 'admin' && (
        <section className="catalog-banner">
          <div>
            <span className="badge-soft">Catálogo público</span>
            <h2>Encuentra un diseño y personalízalo a tu estilo</h2>
            <p>
              Elige un producto, configura talla, color, cantidad y nombres o números.
              Luego revisa tu carrito antes de confirmar el pedido.
            </p>
          </div>

          <a href="/carrito" className="btn btn-primary">
            <i className="bi bi-cart3"></i> Ver carrito
          </a>
        </section>
      )}

      {role === 'admin' && (
        <form className="panel-card form-card module-form" onSubmit={handleSubmit}>
          <h4>{editingId ? 'Editar producto' : 'Nuevo producto'}</h4>

          <div className="form-grid">
            <div>
              <label>Nombre</label>
              <input
                className="form-control"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>

            <div>
              <label>Precio</label>
              <input
                className="form-control"
                type="number"
                step="0.01"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                required
              />
            </div>

            <div>
              <label>Categoría</label>
              <select
                className="form-select"
                value={form.idCategoria}
                onChange={(e) => setForm({ ...form, idCategoria: e.target.value })}
                required
              >
                {categorias.map((c) => (
                  <option key={c.idCategoria} value={c.idCategoria}>
                    {c.nombreCategoria}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Disponibilidad</label>
              <select
                className="form-select"
                value={form.disponibilidad}
                onChange={(e) => setForm({ ...form, disponibilidad: e.target.value })}
              >
                <option value="disponible">disponible</option>
                <option value="agotado">agotado</option>
                <option value="inactivo">inactivo</option>
              </select>
            </div>
          </div>

          <label>Imagen del producto</label>
          <input
            className="form-control"
            type="file"
            accept="image/*"
            onChange={handleImagen}
          />

          {previewImagen && (
            <div className="product-image-preview mt-3">
              <img src={previewImagen} alt="Vista previa del producto" />
              <small>
                {archivoImagen ? archivoImagen.name : 'Imagen actual del producto'}
              </small>
            </div>
          )}

          <label>Descripción</label>
          <textarea
            className="form-control"
            rows="2"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          ></textarea>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              <i className="bi bi-save"></i> {editingId ? 'Actualizar' : 'Guardar'}
            </button>

            {editingId && (
              <button
                className="btn btn-outline-dark"
                type="button"
                onClick={cancelEdit}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      <div className="search-access-box mt-4">
        <div className="search-main">
          <i className="bi bi-search"></i>
          <input
            className="form-control"
            placeholder="Buscar polos, anime, escolares, deportivos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.idCategoria} value={c.idCategoria}>
              {c.nombreCategoria}
            </option>
          ))}
        </select>

        {search && (
          <div className="search-suggestions">
            {filtered.slice(0, 5).map((p) => (
              <button
                key={p.idProducto}
                type="button"
                onClick={() => setSearch(p.nombre)}
              >
                <i className="bi bi-bag-heart"></i>
                <span>{p.nombre}</span>
                <small>{p.categoria || 'MUBI'}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="product-grid">
        {filtered.map((p, index) => {
          const img = imagenProducto(p);
          const disponible = String(p.disponibilidad || '').toLowerCase() === 'disponible';

          return (
            <article className="product-card product-card-premium" key={p.idProducto}>
              <div className={`product-art product-art-real art-${index % 4}`}>
                {img ? (
                  <img src={img} alt={p.nombre} />
                ) : (
                  <i className="bi bi-bag-heart"></i>
                )}
              </div>

              <div className="product-body">
                <div className="product-tags">
                  <span className="status-pill">{p.disponibilidad}</span>
                  <span className="category-pill">{p.categoria || 'MUBI'}</span>
                </div>

                <h3>{p.nombre}</h3>
                <p>{p.descripcion || 'Producto personalizable según el diseño del cliente.'}</p>

                <div className="product-footer">
                  <strong>S/ {Number(p.precio || 0).toFixed(2)}</strong>

                  {role === 'admin' ? (
                    <div className="table-actions">
                      <button
                        className="btn btn-sm btn-outline-dark"
                        type="button"
                        onClick={() => edit(p)}
                      >
                        Editar
                      </button>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        type="button"
                        onClick={() => remove(p.idProducto)}
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <div className="product-card-actions">
                      <button
                        className="btn btn-sm btn-outline-dark"
                        type="button"
                        onClick={() => abrirOpcionesProducto(p)}
                      >
                        Ver detalles
                      </button>

                      <button
                        className="btn btn-sm btn-primary"
                        type="button"
                        disabled={!disponible}
                        onClick={() => abrirOpcionesProducto(p)}
                      >
                        {disponible ? 'Comprar' : 'No disponible'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {!filtered.length && (
          <div className="panel-card empty-state">
            <i className="bi bi-search"></i>
            <h4>No se encontraron productos</h4>
            <p>Prueba buscando otra categoría o revisa el catálogo completo.</p>
          </div>
        )}
      </div>

      {productoModal && (
        <div className="product-modal-backdrop">
          <div className="product-option-modal">
            <button
              className="product-modal-close"
              type="button"
              onClick={cerrarModalProducto}
            >
              <i className="bi bi-x-lg"></i>
            </button>

            {productoAgregado ? (
              <div className="added-to-cart-modal">
                <i className="bi bi-check-circle-fill"></i>
                <h2>Producto añadido</h2>
                <p>{productoAgregado.nombre} fue agregado a tu carrito.</p>
                <strong>Redirigiendo al carrito...</strong>
              </div>
            ) : (
              <div className="product-option-layout">
                <div className="product-option-image">
                  {imagenProducto(productoModal) ? (
                    <img src={imagenProducto(productoModal)} alt={productoModal.nombre} />
                  ) : (
                    <i className="bi bi-bag-heart-fill"></i>
                  )}
                </div>

                <div className="product-option-content">
                  <span className="badge-soft">{productoModal.categoria || 'MUBI'}</span>
                  <h2>{productoModal.nombre}</h2>
                  <p>{productoModal.descripcion || 'Producto personalizable según tu diseño.'}</p>

                  <strong className="product-option-price">
                    S/ {Number(productoModal.precio || 0).toFixed(2)}
                  </strong>

                  <div className="option-group">
                    <label>Talla base</label>
                    <div className="option-buttons">
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(talla => (
                        <button
                          key={talla}
                          type="button"
                          className={opcionesPedido.talla === talla ? 'active' : ''}
                          onClick={() => setOpcionesPedido({ ...opcionesPedido, talla })}
                        >
                          {talla}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="option-group">
                    <label>Color base</label>
                    <input
                      className="form-control"
                      value={opcionesPedido.color}
                      onChange={e => setOpcionesPedido({ ...opcionesPedido, color: e.target.value })}
                      placeholder="Ejemplo: Negro, blanco, azul..."
                    />
                  </div>

                  <div className="option-group">
                    <label>Cantidad</label>
                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() =>
                          setOpcionesPedido({
                            ...opcionesPedido,
                            cantidad: Math.max(1, Number(opcionesPedido.cantidad) - 1)
                          })
                        }
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="1"
                        value={opcionesPedido.cantidad}
                        onChange={e =>
                          setOpcionesPedido({
                            ...opcionesPedido,
                            cantidad: Math.max(1, Number(e.target.value || 1))
                          })
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setOpcionesPedido({
                            ...opcionesPedido,
                            cantidad: Number(opcionesPedido.cantidad) + 1
                          })
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="option-group">
                    <div className="custom-rows-header">
                      <label>Personalización por prenda</label>
                      <button type="button" onClick={agregarFilaPersonalizada}>
                        <i className="bi bi-plus-circle"></i> Añadir más
                      </button>
                    </div>

                    <div className="custom-rows">
                      {opcionesPedido.personalizados.map((row, index) => (
                        <div className="custom-row" key={index}>
                          <select
                            value={row.talla}
                            onChange={e => actualizarFilaPersonalizada(index, 'talla', e.target.value)}
                          >
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(talla => (
                              <option key={talla} value={talla}>{talla}</option>
                            ))}
                          </select>

                          <input
                            value={row.nombre}
                            onChange={e => actualizarFilaPersonalizada(index, 'nombre', e.target.value)}
                            placeholder="Nombre"
                          />

                          <input
                            value={row.numero}
                            onChange={e => actualizarFilaPersonalizada(index, 'numero', e.target.value)}
                            placeholder="Número"
                          />

                          <button type="button" onClick={() => eliminarFilaPersonalizada(index)}>
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="product-option-summary">
                    <span>Total estimado</span>
                    <strong>
                      S/ {(Number(productoModal.precio || 0) * Number(opcionesPedido.cantidad || 1)).toFixed(2)}
                    </strong>
                  </div>

                  <div className="product-option-actions">
                    <button
                      className="btn btn-outline-dark"
                      type="button"
                      onClick={cerrarModalProducto}
                    >
                      Seguir viendo
                    </button>

                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={agregarAlCarrito}
                    >
                      Añadir al carrito
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
