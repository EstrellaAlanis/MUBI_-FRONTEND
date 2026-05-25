import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const API_BASE_URL = API_URL.replace('/api', '');
const ORDER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const emptyForm = {
  nombre: '',
  descripcion: '',
  precio: '',
  disponibilidad: 'disponible',
  idCategoria: '',
  rutaImagenPrincipal: ''
};

const emptyOrderOptions = {
  step: 1,
  talla: 'M',
  color: 'Negro',
  cantidad: 1,
  modoCantidad: 'simple',
  tallasLote: {
    XS: 0,
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0
  },
  tipoPersonalizacion: 'diseno',
  textoPersonalizado: '',
  notas: '',
  disenoFrontal: null,
  disenoPosterior: null
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
  const [opcionesPedido, setOpcionesPedido] = useState(emptyOrderOptions);

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

  const totalCantidadModal = useMemo(() => {
    if (opcionesPedido.modoCantidad === 'lote') {
      return Object.values(opcionesPedido.tallasLote).reduce(
        (acc, value) => acc + Number(value || 0),
        0
      );
    }

    return Math.max(1, Number(opcionesPedido.cantidad || 1));
  }, [opcionesPedido]);

  const totalEstimadoModal = useMemo(() => {
    return Number(productoModal?.precio || 0) * Number(totalCantidadModal || 0);
  }, [productoModal, totalCantidadModal]);

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
    if (!p?.rutaImagenPrincipal) return '';

    const ruta = String(p.rutaImagenPrincipal);

    if (ruta.startsWith('http')) return ruta;

    return `${API_BASE_URL}${ruta}`;
  };

  const abrirOpcionesProducto = (p) => {
    setProductoModal(p);
    setProductoAgregado(null);
    setOpcionesPedido(emptyOrderOptions);
  };

  const cerrarModalProducto = () => {
    setProductoModal(null);
    setProductoAgregado(null);
    setOpcionesPedido(emptyOrderOptions);
  };

  const setStep = (step) => {
    setOpcionesPedido(prev => ({ ...prev, step }));
  };

  const nextStep = () => {
    if (opcionesPedido.step === 2 && totalCantidadModal <= 0) {
      setError('Selecciona al menos una prenda para continuar.');
      return;
    }

    setError('');
    setStep(Math.min(3, opcionesPedido.step + 1));
  };

  const prevStep = () => {
    setStep(Math.max(1, opcionesPedido.step - 1));
  };

  const actualizarTallaLote = (talla, value) => {
    const cantidad = Math.max(0, Number(value || 0));

    setOpcionesPedido(prev => ({
      ...prev,
      tallasLote: {
        ...prev.tallasLote,
        [talla]: cantidad
      }
    }));
  };

  const handleDisenoFile = (field, file) => {
    if (!file) {
      setOpcionesPedido(prev => ({ ...prev, [field]: null }));
      return;
    }

    const extension = file.name.split('.').pop().toLowerCase();

    if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extension)) {
      setError('Solo se permiten archivos JPG, PNG, WEBP o PDF para el diseño.');
      return;
    }

    setError('');
    setOpcionesPedido(prev => ({
      ...prev,
      [field]: {
        nombre: file.name,
        tipo: file.type || 'archivo'
      }
    }));
  };

  const getPersonalizadosCarrito = () => {
    if (opcionesPedido.modoCantidad === 'lote') {
      return Object.entries(opcionesPedido.tallasLote)
        .filter(([, cantidad]) => Number(cantidad) > 0)
        .map(([talla, cantidad]) => ({
          talla,
          nombre: `${cantidad} prenda(s)`,
          numero: ''
        }));
    }

    if (opcionesPedido.textoPersonalizado.trim()) {
      return [{
        talla: opcionesPedido.talla,
        nombre: opcionesPedido.textoPersonalizado.trim(),
        numero: ''
      }];
    }

    return [];
  };

  const agregarAlCarrito = () => {
    if (!productoModal) return;

    if (totalCantidadModal <= 0) {
      setError('Selecciona al menos una prenda para agregar al carrito.');
      return;
    }

    const cart = JSON.parse(localStorage.getItem('mubiCart') || '[]');

    const item = {
      cartId: `${productoModal.idProducto}-${Date.now()}`,
      idProducto: productoModal.idProducto,
      nombre: productoModal.nombre,
      descripcion: productoModal.descripcion,
      categoria: productoModal.categoria,
      precio: Number(productoModal.precio || 0),
      imagen: imagenProducto(productoModal),
      talla: opcionesPedido.modoCantidad === 'simple' ? opcionesPedido.talla : 'Pedido por lote',
      color: opcionesPedido.color,
      cantidad: Number(totalCantidadModal || 1),
      personalizados: getPersonalizadosCarrito(),
      modoCantidad: opcionesPedido.modoCantidad,
      tallasLote: opcionesPedido.tallasLote,
      tipoPersonalizacion: opcionesPedido.tipoPersonalizacion,
      textoPersonalizado: opcionesPedido.textoPersonalizado,
      notas: opcionesPedido.notas,
      disenoFrontal: opcionesPedido.disenoFrontal?.nombre || '',
      disenoPosterior: opcionesPedido.disenoPosterior?.nombre || '',
      descripcionDiseno: [
        opcionesPedido.textoPersonalizado ? `Texto: ${opcionesPedido.textoPersonalizado}` : '',
        opcionesPedido.disenoFrontal?.nombre ? `Diseño frontal: ${opcionesPedido.disenoFrontal.nombre}` : '',
        opcionesPedido.disenoPosterior?.nombre ? `Diseño posterior: ${opcionesPedido.disenoPosterior.nombre}` : '',
        opcionesPedido.notas ? `Notas: ${opcionesPedido.notas}` : ''
      ].filter(Boolean).join(' | ')
    };

    const nextCart = [...cart, item];

    localStorage.setItem('mubiCart', JSON.stringify(nextCart));
    window.dispatchEvent(new Event('mubi-cart-updated'));

    setProductoAgregado(item);

    setTimeout(() => {
      window.location.href = '/carrito';
    }, 900);
  };

  const renderCatalogHeader = () => (
    <section className="catalog-compact-header">
      <div className="catalog-compact-main">
        <div className="catalog-compact-title">
          <div className="catalog-compact-icon">
            <i className="bi bi-bag-heart-fill"></i>
          </div>

          <div>
            <span className="badge-soft">Catálogo público</span>
            <h1>Catálogo MUBI</h1>
            <p>Busca, elige y personaliza. El inicio de sesión se pedirá recién al confirmar.</p>
          </div>
        </div>

        <a href="/carrito" className="catalog-cart-mini">
          <i className="bi bi-cart3"></i>
          Ver carrito
        </a>
      </div>

      <div className="catalog-compact-tools">
        <div className="catalog-search-compact">
          <i className="bi bi-search"></i>
          <input
            className="form-control"
            placeholder="Buscar polos, anime, escolares, deportivos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select catalog-select-compact"
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
      </div>

      <div className="catalog-chip-row">
        <button
          type="button"
          className={!filter ? 'active' : ''}
          onClick={() => setFilter('')}
        >
          Todos
        </button>

        {categorias.slice(0, 7).map(c => (
          <button
            key={c.idCategoria}
            type="button"
            className={Number(filter) === Number(c.idCategoria) ? 'active' : ''}
            onClick={() => setFilter(String(c.idCategoria))}
          >
            {c.nombreCategoria}
          </button>
        ))}
      </div>

      <div className="catalog-results-line">
        <span>{filtered.length} producto(s) encontrados</span>
        <small>Productos visibles más arriba y filtros integrados.</small>
      </div>

      {search && (
        <div className="catalog-search-suggestions">
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
    </section>
  );

  const renderAdminSearch = () => (
    <div className="search-access-box mt-4">
      <div className="search-main">
        <i className="bi bi-search"></i>
        <input
          className="form-control"
          placeholder="Buscar producto..."
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
    </div>
  );

  const renderStepperContent = () => {
    if (!productoModal) return null;

    if (opcionesPedido.step === 1) {
      return (
        <div className="order-step-grid">
          <div className="order-product-preview">
            {imagenProducto(productoModal) ? (
              <img src={imagenProducto(productoModal)} alt={productoModal.nombre} />
            ) : (
              <i className="bi bi-bag-heart-fill"></i>
            )}
            <strong>{productoModal.nombre}</strong>
            <span>S/ {Number(productoModal.precio || 0).toFixed(2)}</span>
          </div>

          <div className="order-step-form">
            <div className="option-group compact">
              <label>Color base</label>
              <input
                className="form-control"
                value={opcionesPedido.color}
                onChange={e => setOpcionesPedido({ ...opcionesPedido, color: e.target.value })}
                placeholder="Ejemplo: Negro, blanco, azul..."
              />
            </div>

            <div className="option-group compact">
              <label>Tipo de personalización</label>
              <div className="order-choice-grid">
                {[
                  ['diseno', 'Subir diseño'],
                  ['texto', 'Solo texto'],
                  ['mixto', 'Diseño + texto']
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={opcionesPedido.tipoPersonalizacion === value ? 'active' : ''}
                    onClick={() => setOpcionesPedido({ ...opcionesPedido, tipoPersonalizacion: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="order-upload-grid">
              <label className="order-upload-box">
                <i className="bi bi-upload"></i>
                <span>Diseño frontal</span>
                <small>{opcionesPedido.disenoFrontal?.nombre || 'JPG, PNG, WEBP o PDF'}</small>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => handleDisenoFile('disenoFrontal', e.target.files[0])}
                />
              </label>

              <label className="order-upload-box">
                <i className="bi bi-upload"></i>
                <span>Diseño posterior</span>
                <small>{opcionesPedido.disenoPosterior?.nombre || 'Opcional'}</small>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => handleDisenoFile('disenoPosterior', e.target.files[0])}
                />
              </label>
            </div>

            <div className="option-group compact">
              <label>Texto o frase opcional</label>
              <input
                className="form-control"
                value={opcionesPedido.textoPersonalizado}
                onChange={e => setOpcionesPedido({ ...opcionesPedido, textoPersonalizado: e.target.value })}
                placeholder="Ejemplo: Promo 2026, nombre, número..."
              />
            </div>

            <div className="option-group compact">
              <label>Notas para el diseño</label>
              <textarea
                className="form-control"
                rows="2"
                value={opcionesPedido.notas}
                onChange={e => setOpcionesPedido({ ...opcionesPedido, notas: e.target.value })}
                placeholder="Ejemplo: quiero el diseño centrado y con acabado brillante..."
              ></textarea>
            </div>
          </div>
        </div>
      );
    }

    if (opcionesPedido.step === 2) {
      return (
        <div className="order-step-form full">
          <div className="order-mode-switch">
            <button
              type="button"
              className={opcionesPedido.modoCantidad === 'simple' ? 'active' : ''}
              onClick={() => setOpcionesPedido({ ...opcionesPedido, modoCantidad: 'simple' })}
            >
              <i className="bi bi-person"></i>
              Pedido simple
            </button>

            <button
              type="button"
              className={opcionesPedido.modoCantidad === 'lote' ? 'active' : ''}
              onClick={() => setOpcionesPedido({ ...opcionesPedido, modoCantidad: 'lote' })}
            >
              <i className="bi bi-people"></i>
              Pedido por lote
            </button>
          </div>

          {opcionesPedido.modoCantidad === 'simple' ? (
            <div className="order-simple-grid">
              <div className="option-group compact">
                <label>Talla</label>
                <div className="option-buttons compact-size-buttons">
                  {ORDER_SIZES.map(talla => (
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

              <div className="option-group compact">
                <label>Cantidad</label>
                <div className="quantity-control stepper-quantity">
                  <button
                    type="button"
                    onClick={() => setOpcionesPedido({
                      ...opcionesPedido,
                      cantidad: Math.max(1, Number(opcionesPedido.cantidad) - 1)
                    })}
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min="1"
                    value={opcionesPedido.cantidad}
                    onChange={e => setOpcionesPedido({
                      ...opcionesPedido,
                      cantidad: Math.max(1, Number(e.target.value || 1))
                    })}
                  />

                  <button
                    type="button"
                    onClick={() => setOpcionesPedido({
                      ...opcionesPedido,
                      cantidad: Number(opcionesPedido.cantidad) + 1
                    })}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bulk-size-table">
              <div className="bulk-size-head">
                <strong>Tabla rápida por tallas</strong>
                <span>Total: {totalCantidadModal} prenda(s)</span>
              </div>

              {ORDER_SIZES.map(talla => (
                <div className="bulk-size-row" key={talla}>
                  <span>{talla}</span>
                  <input
                    type="number"
                    min="0"
                    value={opcionesPedido.tallasLote[talla]}
                    onChange={e => actualizarTallaLote(talla, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="order-summary-step">
        <div className="order-summary-product">
          {imagenProducto(productoModal) ? (
            <img src={imagenProducto(productoModal)} alt={productoModal.nombre} />
          ) : (
            <i className="bi bi-bag-heart-fill"></i>
          )}

          <div>
            <span>{productoModal.categoria || 'MUBI'}</span>
            <h3>{productoModal.nombre}</h3>
            <p>{productoModal.descripcion || 'Producto personalizable según tu diseño.'}</p>
          </div>
        </div>

        <div className="order-summary-list">
          <div><span>Color</span><strong>{opcionesPedido.color}</strong></div>
          <div><span>Modo</span><strong>{opcionesPedido.modoCantidad === 'simple' ? 'Pedido simple' : 'Pedido por lote'}</strong></div>
          <div><span>Talla</span><strong>{opcionesPedido.modoCantidad === 'simple' ? opcionesPedido.talla : 'Varias tallas'}</strong></div>
          <div><span>Total prendas</span><strong>{totalCantidadModal}</strong></div>
          <div><span>Diseño frontal</span><strong>{opcionesPedido.disenoFrontal?.nombre || 'No adjunto'}</strong></div>
          <div><span>Diseño posterior</span><strong>{opcionesPedido.disenoPosterior?.nombre || 'No adjunto'}</strong></div>
        </div>

        {opcionesPedido.modoCantidad === 'lote' && (
          <div className="order-bulk-summary">
            {Object.entries(opcionesPedido.tallasLote)
              .filter(([, cantidad]) => Number(cantidad) > 0)
              .map(([talla, cantidad]) => (
                <span key={talla}>{talla}: {cantidad}</span>
              ))}
          </div>
        )}

        {opcionesPedido.textoPersonalizado && (
          <div className="order-note-preview">
            <strong>Texto:</strong> {opcionesPedido.textoPersonalizado}
          </div>
        )}

        {opcionesPedido.notas && (
          <div className="order-note-preview">
            <strong>Notas:</strong> {opcionesPedido.notas}
          </div>
        )}

        <div className="product-option-summary stepper-total">
          <span>Total estimado</span>
          <strong>S/ {totalEstimadoModal.toFixed(2)}</strong>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      {role === 'admin' ? (
        <PageHeader
          icon="bi-bag-heart-fill"
          title="Gestión de productos"
          subtitle="Administra el catálogo: registra, edita, lista y elimina productos."
        />
      ) : (
        renderCatalogHeader()
      )}

      {error && <div className="alert alert-danger catalog-alert-center">{error}</div>}
      {message && <div className="alert alert-success catalog-alert-center">{message}</div>}

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

      {role === 'admin' && renderAdminSearch()}

      <div className="product-grid catalog-product-grid-compact">
        {filtered.map((p, index) => {
          const img = imagenProducto(p);
          const disponible = String(p.disponibilidad || '').toLowerCase() === 'disponible';

          return (
            <article className="product-card product-card-premium catalog-card-compact" key={p.idProducto}>
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
                        Ver detalle
                      </button>

                      <button
                        className="btn btn-sm btn-primary"
                        type="button"
                        disabled={!disponible}
                        onClick={() => abrirOpcionesProducto(p)}
                      >
                        {disponible ? 'Pedir' : 'No disponible'}
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
        <div className="product-modal-backdrop order-stepper-backdrop">
          <div className="product-option-modal order-stepper-modal">
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
              <>
                <div className="order-stepper-header">
                  <span className="badge-soft">Pedido guiado</span>
                  <h2>Personaliza tu pedido</h2>
                  <p>Completa solo lo necesario. El administrador revisará los detalles antes de confirmar.</p>
                </div>

                <div className="order-stepper-progress">
                  {[
                    [1, 'Personalización'],
                    [2, 'Cantidades'],
                    [3, 'Resumen']
                  ].map(([step, label]) => (
                    <button
                      key={step}
                      type="button"
                      className={opcionesPedido.step === step ? 'active' : opcionesPedido.step > step ? 'done' : ''}
                      onClick={() => setStep(step)}
                    >
                      <span>{step}</span>
                      {label}
                    </button>
                  ))}
                </div>

                {renderStepperContent()}

                <div className="product-option-actions order-stepper-actions">
                  <button
                    className="btn btn-outline-dark"
                    type="button"
                    onClick={opcionesPedido.step === 1 ? cerrarModalProducto : prevStep}
                  >
                    {opcionesPedido.step === 1 ? 'Cancelar' : 'Atrás'}
                  </button>

                  {opcionesPedido.step < 3 ? (
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={nextStep}
                    >
                      Siguiente
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={agregarAlCarrito}
                    >
                      Agregar al carrito
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
