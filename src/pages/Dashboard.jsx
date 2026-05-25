import { useEffect, useMemo, useState } from 'react';
import StatCard from '../components/StatCard.jsx';
import { api, endpoints } from '../services/api.js';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

const safeArray = (value) => Array.isArray(value) ? value : [];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5071/api';
const API_BASE_URL = API_URL.replace('/api', '');

const getImageUrl = (ruta) => {
  if (!ruta) return '';
  const value = String(ruta);
  if (value.startsWith('http')) return value;
  return `${API_BASE_URL}${value}`;
};

export default function Dashboard({ role, user }) {
  const [data, setData] = useState({
    productos: [],
    clientes: [],
    pedidos: [],
    pagos: [],
    materiales: []
  });

  const [error, setError] = useState('');
  const [ideaPedido, setIdeaPedido] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(endpoints.productos),
      api.get(endpoints.clientes),
      api.get(endpoints.pedidos),
      api.get(endpoints.pagos),
      api.get(endpoints.materiales)
    ])
      .then(([productos, clientes, pedidos, pagos, materiales]) =>
        setData({ productos, clientes, pedidos, pagos, materiales })
      )
      .catch((err) => setError(err.message));
  }, []);

  const productos = safeArray(data.productos);
  const clientes = safeArray(data.clientes);
  const pedidos = safeArray(data.pedidos);
  const pagos = safeArray(data.pagos);
  const materiales = safeArray(data.materiales);

  const totalPagos = useMemo(
    () => pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0),
    [pagos]
  );

  const stockBajo = useMemo(
    () => materiales.filter((m) => Number(m.stockActual) <= Number(m.stockMinimo)).length,
    [materiales]
  );

  const pendientes = pedidos.filter(
    (p) => String(p.estadoPedido).toLowerCase() === 'pendiente'
  ).length;

  const confirmados = pedidos.filter(
    (p) => String(p.estadoPedido).toLowerCase() === 'confirmado'
  ).length;

  const pagados = pedidos.filter(
    (p) => String(p.estadoPedido).toLowerCase() === 'pagado'
  ).length;

  const enProceso = pedidos.filter(
    (p) => String(p.estadoPedido).toLowerCase() === 'en_proceso'
  ).length;

  const entregados = pedidos.filter(
    (p) => String(p.estadoPedido).toLowerCase() === 'entregado'
  ).length;

  const productosDestacados = productos.slice(0, 8);

  const clienteActual = clientes.find(c =>
    Number(c.idUsuario) === Number(user?.idUsuario) ||
    String(c.correo || '').toLowerCase() === String(user?.correo || '').toLowerCase()
  );

  const pedidosCliente = clienteActual
    ? pedidos.filter(p => Number(p.idCliente) === Number(clienteActual.idCliente))
    : [];

  const pagosCliente = clienteActual
    ? pagos.filter(pg => pedidosCliente.some(p => Number(p.idPedido) === Number(pg.idPedido)))
    : [];

  const totalPagosCliente = pagosCliente.reduce((acc, p) => acc + Number(p.monto || 0), 0);
  const pedidosHoy = pedidos.filter(p => {
  const fecha = new Date(p.fechaPedido);
  const hoy = new Date();

  return (
    fecha.getDate() === hoy.getDate() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear()
  );
}).length;

  const ultimoPedido = pedidos[0];

  const ultimosPagos = pagos.slice(0, 5);

  const materialesBajos = materiales.filter(
    m => Number(m.stockActual) <= Number(m.stockMinimo)
  );

  const porcentajePedidosAtendidos = pedidos.length
    ? Math.round((entregados / pedidos.length) * 100)
    : 0;

  const ingresosPendientes = pedidos.reduce(
    (acc, p) => acc + Number(p.saldoPendiente || 0),
    0
  );
  const pedidosOrdenadosFIFO = [...pedidos].sort((a, b) => {
  const fechaA = new Date(a.fechaPedido || a.fechaRegistro || 0).getTime();
  const fechaB = new Date(b.fechaPedido || b.fechaRegistro || 0).getTime();
  return fechaA - fechaB;
  });
  const colaTrabajoFIFO = pedidosOrdenadosFIFO.filter(p => {
    const estado = String(p.estadoPedido || '').toLowerCase();
    return estado === 'pendiente' || estado === 'confirmado' || estado === 'pagado';
  });
  const siguientePedido = colaTrabajoFIFO[0];

  const estadoChartData = [
    { name: 'Pendientes', value: pendientes },
    { name: 'Confirmados', value: confirmados },
    { name: 'Pagados', value: pagados },
    { name: 'En proceso', value: enProceso },
    { name: 'Entregados', value: entregados }
  ].filter(item => item.value > 0);

  const ventasChartData = [
    { name: 'Pagos', value: Number(totalPagos || 0) },
    { name: 'Saldo pendiente', value: Number(ingresosPendientes || 0) }
  ];

  const COLORS = ['#59ff00', '#95ff77', '#00c853', '#ffc857', '#70d984'];


  const enviarIdeaPedido = () => {
    const texto = ideaPedido.trim();

    if (!texto) {
      alert('Describe cómo deseas tu polo para continuar.');
      return;
    }

    localStorage.setItem('ideaPedidoMubi', texto);
    window.location.href = user ? '/pedido-personalizado' : '/login';
  };

const pedirProducto = (p) => {
  const imagen = getImageUrl(p?.rutaImagenPrincipal);

  const item = {
    cartId: `${p.idProducto}-base`,
    idProducto: p.idProducto,
    nombre: p.nombre,
    descripcion: p.descripcion || 'Producto personalizable según tu diseño.',
    categoria: p.categoria || 'MUBI',
    precio: Number(p.precio || 0),
    imagen,
    talla: 'M',
    color: 'Negro',
    cantidad: 1,
    personalizados: []
  };

  const cart = JSON.parse(localStorage.getItem('mubiCart') || '[]');

  const existe = cart.find(x =>
    Number(x.idProducto) === Number(item.idProducto) &&
    String(x.talla || 'M') === 'M' &&
    String(x.color || 'Negro').toLowerCase() === 'negro' &&
    (!Array.isArray(x.personalizados) || x.personalizados.length === 0)
  );

  const nextCart = existe
    ? cart.map(x =>
        x.cartId === existe.cartId
          ? { ...x, cantidad: Number(x.cantidad || 1) + 1 }
          : x
      )
    : [...cart, item];

  localStorage.setItem('mubiCart', JSON.stringify(nextCart));
  window.dispatchEvent(new Event('mubi-cart-updated'));

  localStorage.setItem(
    'ideaPedidoMubi',
    `Deseo pedir el producto "${p.nombre}" de la categoría ${p.categoria || 'MUBI'}.`
  );

  window.location.href = '/carrito';
};
  const imagenProducto = (p) => {
    return getImageUrl(p?.rutaImagenPrincipal);
  };

  if (role === 'cliente' && !user) {
    return (
      <div className="mubi-website fade-in">
        {error && (
          <div className="alert alert-warning">
            No se pudo conectar al backend: {error}
          </div>
        )}

        <section className="mubi-web-hero mubi-video-hero">
           <video
            className="mubi-hero-bg-video"
            src="public/videos/video_hero.mp4"
            autoPlay
            muted
            loop
            playsInline
          ></video>
          <div className="mubi-hero-overlay"></div>

          <div className="mubi-hero-content">
            <span className="mubi-kicker">MUBI TEXTIL STORE</span>

            <h1>Polos personalizados para colegios, equipos y eventos.</h1>

            <p>
              Explora modelos, elige una base y envía tu idea de forma sencilla.
              Nosotros revisamos tu pedido y te ayudamos con el diseño.
            </p>

            <div className="mubi-hero-actions">
              <a href="/productos" className="btn btn-primary">
                Ver catálogo
              </a>

              <a href="#pedido-rapido" className="btn btn-glass">
                Hacer pedido
              </a>
            </div>

            <div className="mubi-hero-points">
              <span><i className="bi bi-check-circle-fill"></i> Diseños personalizados</span>
              <span><i className="bi bi-check-circle-fill"></i> Escolares y deportivos</span>
              <span><i className="bi bi-check-circle-fill"></i> Atención rápida</span>
            </div>
          </div>

          {/* <div className="mubi-hero-card">
            <div className="shirt-preview">
              <i className="bi bi-tshirt"></i>
              <strong>Tu diseño aquí</strong>
              <span>Personaliza tu polo</span>
            </div>
          </div> */}
        </section>

        <section className="mubi-section mubi-commercial-section">
          <div className="mubi-section-title commercial-title">
            <span>Catálogo</span>
            <h2>Productos destacados</h2>
            <p>Modelos listos para personalizar. Elige, agrega al carrito y confirma tu pedido al final.</p>
          </div>

          <div className="commercial-strip">
            <article>
              <i className="bi bi-lightning-charge-fill"></i>
              <strong>Compra rápida</strong>
              <span>Carrito y checkout inmediato</span>
            </article>
            <article>
              <i className="bi bi-palette-fill"></i>
              <strong>Diseño personalizado</strong>
              <span>Nombres, números y tallas</span>
            </article>
          </div>

          <div className="mubi-product-showcase commercial-product-grid">
            {productosDestacados.map((p, index) => {
              const img = imagenProducto(p);
              const disponible = String(p.disponibilidad || '').toLowerCase() === 'disponible';

              return (
                <article className="mubi-product-card mubi-product-card-pro commercial-product-card" key={p.idProducto}>
                  <div className={`mubi-product-img ${img ? 'has-image' : ''} img-${index}`}>
                    <div className="commercial-card-badges">
                      <span>{index < 2 ? 'Más vendido' : disponible ? 'Disponible' : 'Agotado'}</span>
                    </div>

                    {img ? (
                      <img src={img} alt={p.nombre} />
                    ) : (
                      <i className="bi bi-bag-heart-fill"></i>
                    )}
                  </div>

                  <div className="mubi-product-info">
                    <span>{p.categoria || 'MUBI'}</span>
                    <h3>{p.nombre}</h3>
                    <p>{p.descripcion || 'Polo personalizable con diseño a elección del cliente.'}</p>

                    <div className="commercial-rating">
                      <i className="bi bi-star-fill"></i>
                      <i className="bi bi-star-fill"></i>
                      <i className="bi bi-star-fill"></i>
                      <i className="bi bi-star-fill"></i>
                      <i className="bi bi-star-half"></i>
                      <small>Personalizable</small>
                    </div>

                    <div>
                      <strong>S/ {Number(p.precio || 0).toFixed(2)}</strong>
                      <button className="btn btn-sm btn-primary" onClick={() => pedirProducto(p)}>
                        Pedir ahora
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {!productosDestacados.length && (
              <article className="mubi-product-card commercial-product-card">
                <div className="mubi-product-img">
                  <i className="bi bi-bag-heart-fill"></i>
                </div>

                <div className="mubi-product-info">
                  <span>MUBI</span>
                  <h3>Producto personalizable</h3>
                  <p>Agrega productos desde el panel administrador para mostrarlos aquí.</p>

                  <div>
                    <strong>S/ 0.00</strong>
                    <a className="btn btn-sm btn-primary" href="/productos">
                      Ver catálogo
                    </a>
                  </div>
                </div>
              </article>
            )}
          </div>

          <div className="commercial-more-actions">
            <a href="/productos" className="btn btn-primary">
              Ver catálogo completo
            </a>
            <a href="#pedido-rapido" className="btn btn-glass">
              Cotizar pedido especial
            </a>
          </div>
        </section>

        <section className="mubi-promo-grid">
          <article className="mubi-promo-card large">
            <span>Promociones y colegios</span>
            <h2>Pedidos por grupos, equipos y eventos.</h2>
            <p>Sube tu lista de tallas, nombres y números desde Excel o completa la personalización por filas.</p>
            <a href="/productos" className="btn btn-primary">Explorar diseños</a>
          </article>

          <article className="mubi-promo-card">
            <i className="bi bi-whatsapp"></i>
            <strong>Atención rápida</strong>
            <p>Consulta disponibilidad y seguimiento desde la web.</p>
          </article>

          <article className="mubi-promo-card">
            <i className="bi bi-credit-card-2-front"></i>
            <strong>Pagos flexibles</strong>
            <p>Adelantos, pagos parciales y saldo pendiente.</p>
          </article>
        </section>

        <section className="quick-order-card" id="pedido-rapido">
          <div>
            <span className="badge-soft">Pedido rápido</span>
            <h2>Cuéntanos qué deseas</h2>
            <p>
              Escribe el tipo de polo, cantidad, tallas, colores o temática.
              Luego podrás adjuntar el diseño frontal y posterior.
            </p>
          </div>

          <div className="quick-order-form">
            <textarea
              value={ideaPedido}
              onChange={(e) => setIdeaPedido(e.target.value)}
              placeholder="Ejemplo: 20 polos deportivos con nombres y números para campeonato..."
            />

            <button className="btn btn-primary" onClick={enviarIdeaPedido}>
              Continuar pedido
            </button>

            <small>
              Para confirmar el pedido se solicitará iniciar sesión o registrarse como cliente.
            </small>
          </div>
        </section>

        <footer className="mubi-footer mubi-footer-pro">
          <div className="footer-brand-block">
            <h2>MUBI</h2>
            <p>Polos sublimados y personalizados para promociones, equipos, colegios y eventos.</p>
            <div className="footer-socials">
              <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook">
                <i className="bi bi-facebook"></i>
              </a>
              <a href="https://www.instagram.com/mubi_textil?igsh=b3R1ZndhenJncTk3" target="_blank" rel="noreferrer" aria-label="Instagram">
                <i className="bi bi-instagram"></i>
              </a>
              <a href="https://www.tiktok.com/@mubi_textil?_r=1&_t=ZS-96Wt2VySz0X" target="_blank" rel="noreferrer" aria-label="TikTok">
                <i className="bi bi-tiktok"></i>
              </a>
              <a href="https://wa.me/51907530218" target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <i className="bi bi-whatsapp"></i>
              </a>
            </div>
          </div>

          <div>
            <strong>Enlaces rápidos</strong>
            <a href="/productos">Catálogo</a>
            <a href="/carrito">Carrito</a>
            <a href="#pedido-rapido">Pedido rápido</a>
            <a href="/contacto">Contacto</a>
          </div>

          <div>
            <strong>Atención</strong>
            <p><i className="bi bi-clock"></i> Lun - Sáb: 9:00 a.m. - 6:00 p.m.</p>
            <p><i className="bi bi-geo-alt"></i> Pucallpa, Perú</p>
          </div>

          <div>
            <strong>Pagos</strong>
            <p>Yape, Plin, transferencia y pagos parciales.</p>
            <div className="footer-payments">
              <span>Yape</span>
              <span>Plin</span>
              <span>Transferencia</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (role === 'cliente' && user) {
    return (
      <div className="mubi-client-home fade-in">
        {error && (
          <div className="alert alert-warning">
            No se pudo conectar al backend: {error}
          </div>
        )}

        <section className="mubi-client-hero">
          <div>
            <span className="mubi-kicker">ÁREA DEL CLIENTE</span>

            <h1>Hola, {user.nombre || 'cliente'}.</h1>

            <p>
              Desde aquí puedes hacer un nuevo pedido, revisar su estado y consultar tus pagos.
            </p>

            <div className="mubi-hero-actions">
              <a href="/pedido-personalizado" className="btn btn-primary">
                Hacer nuevo pedido
              </a>

              <a href="/productos" className="btn btn-glass">
                Ver catálogo
              </a>
            </div>
          </div>

          <div className="mubi-client-summary">
            <div>
              <span>Mis pedidos</span>
              <strong>{pedidosCliente.length}</strong>
            </div>

            <div>
              <span>Mis pagos</span>
              <strong>S/ {totalPagosCliente.toFixed(2)}</strong>
            </div>

            <div>
              <span>Atención</span>
              <strong>MUBI</strong>
            </div>
          </div>
        </section>

        <section className="mubi-section client-section-soft">
          <div className="mubi-section-title">
            <span>Accesos rápidos</span>
            <h2>¿Qué deseas hacer?</h2>
            <p>Opciones simples para continuar sin perder tiempo.</p>
          </div>

          <div className="client-action-grid">
            <a href="/pedido-personalizado" className="client-action-card">
              <i className="bi bi-plus-circle-fill"></i>
              <h3>Hacer pedido</h3>
              <p>Elige producto, sube diseño y envía tus especificaciones.</p>
            </a>

            <a href="/pedidos" className="client-action-card">
              <i className="bi bi-truck"></i>
              <h3>Mis pedidos</h3>
              <p>Revisa el estado y avance de tus pedidos.</p>
            </a>

            <a href="/pagos" className="client-action-card">
              <i className="bi bi-cash-coin"></i>
              <h3>Mis pagos</h3>
              <p>Consulta pagos registrados y saldo pendiente.</p>
            </a>
          </div>
        </section>

        <section className="mubi-section">
          <div className="mubi-section-title">
            <span>Catálogo</span>
            <h2>Productos recomendados</h2>
            <p>Modelos base para personalizar según tu promoción o equipo.</p>
          </div>

          <div className="mubi-product-showcase">
            {productos.slice(0, 3).map((p, index) => {
              const img = imagenProducto(p);

              return (
                <article className="mubi-product-card mubi-product-card-pro" key={p.idProducto}>
                  <div className={`mubi-product-img ${img ? 'has-image' : ''} img-${index}`}>
                    {img ? (
                      <img src={img} alt={p.nombre} />
                    ) : (
                      <i className="bi bi-stars"></i>
                    )}
                  </div>

                <div className="mubi-product-info">
                  <span>{p.categoria || 'MUBI'}</span>
                  <h3>{p.nombre}</h3>
                  <p>{p.descripcion || 'Producto personalizable según tu idea.'}</p>

                  <div>
                    <strong>S/ {Number(p.precio || 0).toFixed(2)}</strong>
                    <button className="btn btn-sm btn-primary" onClick={() => pedirProducto(p)}>
                      Pedir
                    </button>
                  </div>
                </div>
                  </article>
                  );
                })}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="fade-in admin-dashboard-page admin-control-dashboard">
      {error && (
        <div className="alert alert-danger">
          No se pudo conectar al backend: {error}
        </div>
      )}

      <section className="admin-control-hero">
        <div className="admin-control-hero-content">
          <span className="badge-soft">Centro de control MUBI</span>
          <h1>Resumen operativo del negocio</h1>
          <p>
            Revisa pedidos pendientes, pagos, ventas, clientes, stock y producción desde una sola pantalla.
            El objetivo es que el administrador tome decisiones rápidas sin entrar módulo por módulo.
          </p>

          <div className="admin-control-actions">
            <a className="btn btn-primary" href="/pedidos">
              <i className="bi bi-clipboard-check"></i> Atender cola FIFO
            </a>

            <a className="btn btn-outline-dark" href="/pagos">
              <i className="bi bi-cash-coin"></i> Revisar pagos
            </a>

            <a className="btn btn-outline-dark" href="/comprobantes">
              <i className="bi bi-receipt-cutoff"></i> Emitir comprobantes
            </a>
          </div>
        </div>

        <div className={`admin-next-order-preview ${siguientePedido ? 'active' : ''}`}>
          <span className="badge-soft">Siguiente atención</span>

          {siguientePedido ? (
            <>
              <strong>Pedido #{siguientePedido.idPedido}</strong>
              <p>{siguientePedido.cliente || `Cliente #${siguientePedido.idCliente}`}</p>
              <small>
                FIFO: pedido más antiguo pendiente de la cola operativa.
              </small>
              <a className="btn btn-primary w-100 mt-3" href="/pedidos">
                Revisar ahora
              </a>
            </>
          ) : (
            <>
              <i className="bi bi-check2-circle"></i>
              <strong>Sin cola pendiente</strong>
              <p>No hay pedidos esperando atención inmediata.</p>
            </>
          )}
        </div>
      </section>

      <section className="admin-kpi-grid admin-control-kpis">
        <article className="admin-kpi-card">
          <span>Pedidos totales</span>
          <strong>{pedidos.length}</strong>
          <p>{pedidosHoy} pedido(s) registrados hoy.</p>
        </article>

        <article className="admin-kpi-card priority">
          <span>Pendientes</span>
          <strong>{pendientes}</strong>
          <p>Requieren revisión del admin.</p>
        </article>

        <article className="admin-kpi-card">
          <span>Pagos registrados</span>
          <strong>S/ {totalPagos.toFixed(2)}</strong>
          <p>Ingresos registrados en pagos.</p>
        </article>

        <article className="admin-kpi-card">
          <span>Saldo pendiente</span>
          <strong>S/ {ingresosPendientes.toFixed(2)}</strong>
          <p>Importe por cobrar.</p>
        </article>

        <article className="admin-kpi-card">
          <span>Clientes</span>
          <strong>{clientes.length}</strong>
          <p>Base comercial registrada.</p>
        </article>

        <article className="admin-kpi-card">
          <span>Productos</span>
          <strong>{productos.length}</strong>
          <p>Catálogo disponible.</p>
        </article>

        <article className="admin-kpi-card warning">
          <span>Stock bajo</span>
          <strong>{stockBajo}</strong>
          <p>Materiales por reponer.</p>
        </article>

        <article className="admin-kpi-card success">
          <span>Atendidos</span>
          <strong>{porcentajePedidosAtendidos}%</strong>
          <p>Pedidos entregados del total.</p>
        </article>
      </section>

      <section className="admin-dashboard-grid">
        <article className="panel-card admin-chart-card">
          <div className="section-actions">
            <div>
              <span className="badge-soft">Estados</span>
              <h4>Estado general de pedidos</h4>
            </div>

            <a className="btn btn-sm btn-outline-dark" href="/pedidos">
              Ver pedidos
            </a>
          </div>

          <div className="admin-chart-box">
            {estadoChartData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={estadoChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={64}
                    outerRadius={98}
                    paddingAngle={4}
                  >
                    {estadoChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="admin-empty-chart">
                <i className="bi bi-pie-chart"></i>
                <span>No hay pedidos para graficar.</span>
              </div>
            )}
          </div>

          <div className="admin-status-legend">
            {estadoChartData.map((item, index) => (
              <div key={item.name}>
                <span style={{ background: COLORS[index % COLORS.length] }}></span>
                <strong>{item.name}</strong>
                <small>{item.value}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card admin-chart-card">
          <div className="section-actions">
            <div>
              <span className="badge-soft">Finanzas</span>
              <h4>Pagos vs saldo pendiente</h4>
            </div>

            <a className="btn btn-sm btn-outline-dark" href="/pagos">
              Ver pagos
            </a>
          </div>

          <div className="admin-chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ventasChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(89,255,0,.14)" />
                <XAxis dataKey="name" stroke="rgba(244,255,240,.68)" />
                <YAxis stroke="rgba(244,255,240,.68)" />
                <Tooltip />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#59ff00" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="admin-dashboard-grid secondary">
        <article className="panel-card admin-queue-card">
          <div className="section-actions">
            <div>
              <span className="badge-soft">FIFO</span>
              <h4>Cola de trabajo</h4>
            </div>

            <a className="btn btn-sm btn-outline-dark" href="/pedidos">
              Gestionar
            </a>
          </div>

          <div className="admin-queue-list">
            {colaTrabajoFIFO.slice(0, 5).map((p, index) => (
              <a className={`admin-queue-item ${index === 0 ? 'next' : ''}`} href="/pedidos" key={p.idPedido}>
                <span className="queue-number">{index + 1}</span>

                <div>
                  <strong>Pedido #{p.idPedido}</strong>
                  <small>{p.cliente || `Cliente #${p.idCliente}`}</small>
                </div>

                <em>{p.estadoPedido}</em>
              </a>
            ))}

            {!colaTrabajoFIFO.length && (
              <div className="admin-empty-state">
                <i className="bi bi-check2-circle"></i>
                <strong>No hay pedidos en cola</strong>
                <p>Cuando un cliente registre un pedido, aparecerá aquí.</p>
              </div>
            )}
          </div>
        </article>

        <article className="panel-card admin-priority-card">
          <div className="section-actions">
            <div>
              <span className="badge-soft">Prioridades</span>
              <h4>Qué debe revisar el dueño</h4>
            </div>
          </div>

          <ul className="admin-priority-list">
            <li className={pendientes > 0 ? 'danger' : ''}>
              <i className="bi bi-bell"></i>
              <span>{pendientes} pedido(s) pendientes por confirmar</span>
            </li>

            <li className={ingresosPendientes > 0 ? 'warning' : ''}>
              <i className="bi bi-wallet2"></i>
              <span>S/ {ingresosPendientes.toFixed(2)} en saldo pendiente</span>
            </li>

            <li className={stockBajo > 0 ? 'warning' : ''}>
              <i className="bi bi-box-seam"></i>
              <span>{stockBajo} material(es) con stock bajo</span>
            </li>

            <li>
              <i className="bi bi-file-earmark-spreadsheet"></i>
              <span>Revisar diseños y Excel adjuntos antes de producción</span>
            </li>
          </ul>

          {ultimoPedido && (
            <div className="last-order-box admin-last-order">
              <span>Último pedido registrado</span>
              <strong>#{ultimoPedido.idPedido}</strong>
              <p>{ultimoPedido.cliente || `Cliente #${ultimoPedido.idCliente}`}</p>
            </div>
          )}
        </article>
      </section>

      <section className="admin-dashboard-grid secondary">
        <article className="panel-card">
          <div className="section-actions">
            <div>
              <span className="badge-soft">Pagos</span>
              <h4>Últimos pagos registrados</h4>
            </div>

            <a className="btn btn-sm btn-outline-dark" href="/pagos">
              Supervisar pagos
            </a>
          </div>

          <div className="admin-payment-list">
            {ultimosPagos.map((p) => (
              <div className="admin-payment-item" key={p.idPago}>
                <div>
                  <strong>S/ {Number(p.monto || 0).toFixed(2)}</strong>
                  <span>{p.metodoPago || 'Método no definido'} · {p.tipoPago || 'Pago'}</span>
                </div>

                <small>Pedido #{p.idPedido}</small>
              </div>
            ))}

            {!ultimosPagos.length && (
              <div className="admin-empty-state compact">
                <i className="bi bi-cash-coin"></i>
                <span>No hay pagos registrados.</span>
              </div>
            )}
          </div>
        </article>

        <article className="panel-card">
          <div className="section-actions">
            <div>
              <span className="badge-soft">Inventario</span>
              <h4>Materiales con stock bajo</h4>
            </div>

            <a className="btn btn-sm btn-outline-dark" href="/materiales">
              Ver inventario
            </a>
          </div>

          <div className="admin-stock-list">
            {materialesBajos.slice(0, 5).map((m) => (
              <div className="admin-stock-item" key={m.idMaterial}>
                <div>
                  <strong>{m.nombreMaterial || m.nombre || `Material #${m.idMaterial}`}</strong>
                  <span>Stock actual: {m.stockActual} / mínimo: {m.stockMinimo}</span>
                </div>

                <i className="bi bi-exclamation-triangle"></i>
              </div>
            ))}

            {!materialesBajos.length && (
              <div className="admin-empty-state compact">
                <i className="bi bi-check2-circle"></i>
                <span>No hay materiales con stock bajo.</span>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="admin-shortcuts admin-control-shortcuts">
        <a href="/pedidos">
          <i className="bi bi-clipboard-check"></i>
          <span>Pedidos</span>
          <small>Cola operativa FIFO</small>
        </a>

        <a href="/pagos">
          <i className="bi bi-cash-coin"></i>
          <span>Pagos</span>
          <small>Supervisión de comprobantes</small>
        </a>

        <a href="/comprobantes">
          <i className="bi bi-receipt-cutoff"></i>
          <span>Comprobantes</span>
          <small>Boletas y facturas</small>
        </a>

        <a href="/materiales">
          <i className="bi bi-box-seam"></i>
          <span>Inventario</span>
          <small>Stock y materiales</small>
        </a>
      </section>
    </div>
  );
}