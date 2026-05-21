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
    localStorage.setItem(
      'ideaPedidoMubi',
      `Deseo pedir el producto "${p.nombre}" de la categoría ${p.categoria || 'MUBI'}.`
    );
    window.location.href = user ? '/pedido-personalizado' : '/login';
  };
  const imagenProducto = (p) => {
      return p.rutaImagenPrincipal ? `http://localhost:5071${p.rutaImagenPrincipal}` : '';
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
  <div className="fade-in admin-dashboard-page">
    {error && (
      <div className="alert alert-danger">
        No se pudo conectar al backend: {error}
      </div>
    )}

    <section className="admin-dashboard-hero">
      <div>
        <span className="badge-soft">Panel del dueño</span>
        <h1>Resumen general de MUBI</h1>
        <p>
          Controla pedidos, pagos, clientes, catálogo e inventario desde una sola vista.
          Esta pantalla ayuda a tomar decisiones rápidas para la operación diaria.
        </p>

        <div className="hero-actions">
          <a className="btn btn-primary" href="/pedidos">
            Revisar pedidos
          </a>

          <a className="btn btn-outline-dark" href="/pagos">
            Ver pagos
          </a>
        </div>
      </div>

      <div className="admin-hero-mini">
        <span>Atención de pedidos</span>
        <strong>{porcentajePedidosAtendidos}%</strong>
        <p>Pedidos entregados respecto al total registrado.</p>
      </div>
    </section>

    <div className="stats-grid">
      <StatCard
        icon="bi-cash-stack"
        label="Ingresos registrados"
        value={`S/ ${totalPagos.toFixed(2)}`}
        note="Pagos registrados en el sistema"
      />

      <StatCard
        icon="bi-hourglass-split"
        label="Pendientes"
        value={pendientes}
        note="Pedidos por revisar"
      />

      <StatCard
        icon="bi-truck"
        label="En proceso"
        value={enProceso}
        note="Pedidos en producción"
      />

      <StatCard
        icon="bi-exclamation-triangle"
        label="Stock bajo"
        value={stockBajo}
        note="Materiales que requieren atención"
      />
    </div>
    <div className="admin-data-grid mt-4">
      <section className="panel-card admin-chart-card">
        <div className="section-actions">
          <div>
            <span className="badge-soft">Estados</span>
            <h4>Distribución de pedidos</h4>
          </div>
        </div>

        <div className="chart-box">
          {estadoChartData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={estadoChartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {estadoChartData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted mb-0">No hay datos suficientes para mostrar el gráfico.</p>
          )}
        </div>
      </section>

      <section className="panel-card admin-chart-card">
        <div className="section-actions">
          <div>
            <span className="badge-soft">Finanzas</span>
            <h4>Pagos vs saldo pendiente</h4>
          </div>
        </div>

        <div className="chart-box">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ventasChartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#59ff00" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>

    <section className="panel-card fifo-board mt-4">
      <div className="section-actions">
        <div>
          <span className="badge-soft">FIFO</span>
          <h4>Cola de trabajo por llegada</h4>
          <p className="mb-0">
            Los pedidos se ordenan del más antiguo al más reciente para procesarlos de forma justa.
          </p>
        </div>

        <a className="btn btn-sm btn-primary" href="/pedidos">
          Ir a pedidos
        </a>
      </div>

      {siguientePedido ? (
        <article className="next-order-card">
          <div>
            <span>Siguiente pedido a procesar</span>
            <h3>Pedido #{siguientePedido.idPedido}</h3>
            <p>{siguientePedido.cliente || `Cliente #${siguientePedido.idCliente}`}</p>
          </div>

          <div>
            <strong>S/ {Number(siguientePedido.montoTotal || 0).toFixed(2)}</strong>
            <small>{new Date(siguientePedido.fechaPedido).toLocaleString()}</small>
          </div>
        </article>
      ) : (
        <div className="empty-state">
          <i className="bi bi-check-circle"></i>
          <h4>No hay pedidos pendientes en cola</h4>
          <p>La operación está al día.</p>
        </div>
      )}

      <div className="fifo-list">
        {colaTrabajoFIFO.slice(0, 8).map((p, index) => (
          <article className={`fifo-item ${index === 0 ? 'active' : ''}`} key={p.idPedido}>
            <div className="fifo-position">{index + 1}</div>

            <div>
              <strong>Pedido #{p.idPedido}</strong>
              <span>{p.cliente || `Cliente #${p.idCliente}`}</span>
            </div>

            <span className={`status-pill status-${String(p.estadoPedido).toLowerCase()}`}>
              {p.estadoPedido}
            </span>

            <small>{new Date(p.fechaPedido).toLocaleString()}</small>

            <strong>S/ {Number(p.montoTotal || 0).toFixed(2)}</strong>
          </article>
        ))}
      </div>
    </section>

    <div className="admin-kpi-grid">
      <article className="admin-kpi-card">
        <span>Pedidos de hoy</span>
        <strong>{pedidosHoy}</strong>
        <p>Pedidos registrados durante el día.</p>
      </article>

      <article className="admin-kpi-card">
        <span>Saldo pendiente</span>
        <strong>S/ {ingresosPendientes.toFixed(2)}</strong>
        <p>Dinero pendiente de pago.</p>
      </article>

      <article className="admin-kpi-card">
        <span>Clientes registrados</span>
        <strong>{clientes.length}</strong>
        <p>Base actual de clientes.</p>
      </article>

      <article className="admin-kpi-card">
        <span>Productos activos</span>
        <strong>{productos.length}</strong>
        <p>Catálogo disponible.</p>
      </article>
    </div>

    <div className="admin-alert-card mt-4">
      <div>
        <span className="badge-soft">Notificación admin</span>
        <h3>🔔 Tienes {pendientes} pedido(s) pendiente(s) por revisar</h3>
        <p>
          Revisa el diseño frontal/posterior, Excel de tallas, pagos y estado antes de iniciar producción.
        </p>
      </div>

      <a className="btn btn-primary" href="/pedidos">
        Ver pedidos
      </a>
    </div>

    <div className="order-status-grid mt-4">
      <div className="status-box">
        <span>Pendientes</span>
        <strong>{pendientes}</strong>
      </div>

      <div className="status-box">
        <span>Confirmados</span>
        <strong>{confirmados}</strong>
      </div>

      <div className="status-box">
        <span>Pagados</span>
        <strong>{pagados}</strong>
      </div>

      <div className="status-box">
        <span>En proceso</span>
        <strong>{enProceso}</strong>
      </div>

      <div className="status-box">
        <span>Entregados</span>
        <strong>{entregados}</strong>
      </div>
    </div>

    <div className="row g-4 mt-1">
      <div className="col-lg-7">
        <div className="panel-card">
          <div className="section-actions">
            <h4>Últimos pedidos</h4>
            <a className="btn btn-sm btn-outline-dark" href="/pedidos">
              Ver todos
            </a>
          </div>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Saldo</th>
                </tr>
              </thead>

              <tbody>
                {pedidos.slice(0, 5).map((p) => (
                  <tr key={p.idPedido}>
                    <td>{p.cliente || `Cliente #${p.idCliente}`}</td>
                    <td>
                      <span className="status-pill">{p.estadoPedido}</span>
                    </td>
                    <td>S/ {Number(p.montoTotal || 0).toFixed(2)}</td>
                    <td>S/ {Number(p.saldoPendiente || 0).toFixed(2)}</td>
                  </tr>
                ))}

                {!pedidos.length && (
                  <tr>
                    <td colSpan="4">No hay pedidos registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="col-lg-5">
        <div className="panel-card admin-priority-card">
          <span className="badge-soft">Prioridad de hoy</span>
          <h4>Qué debe revisar el dueño</h4>

          <ul className="check-list">
            <li>{pendientes} pedido(s) pendientes por confirmar</li>
            <li>S/ {ingresosPendientes.toFixed(2)} en saldo pendiente</li>
            <li>{stockBajo} material(es) con stock bajo</li>
            <li>Diseños y Excel adjuntos listos para producción</li>
          </ul>

          {ultimoPedido && (
            <div className="last-order-box">
              <span>Último pedido registrado</span>
              <strong>#{ultimoPedido.idPedido}</strong>
              <p>{ultimoPedido.cliente || `Cliente #${ultimoPedido.idCliente}`}</p>
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="row g-4 mt-1">
      <div className="col-lg-6">
        <div className="panel-card">
          <div className="section-actions">
            <h4>Últimos pagos</h4>
            <a className="btn btn-sm btn-outline-dark" href="/pagos">
              Ver pagos
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
              <p className="text-muted mb-0">No hay pagos registrados.</p>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-6">
        <div className="panel-card">
          <div className="section-actions">
            <h4>Materiales con stock bajo</h4>
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
              <p className="text-muted mb-0">No hay materiales con stock bajo.</p>
            )}
          </div>
        </div>
      </div>
    </div>

    <div className="admin-shortcuts mt-4">
      <a href="/pedidos">
        <i className="bi bi-clipboard-check"></i>
        <span>Pedidos</span>
      </a>

      <a href="/pagos">
        <i className="bi bi-cash-coin"></i>
        <span>Pagos</span>
      </a>

      <a href="/productos">
        <i className="bi bi-bag-heart"></i>
        <span>Productos</span>
      </a>

      <a href="/materiales">
        <i className="bi bi-box-seam"></i>
        <span>Inventario</span>
      </a>
    </div>
  </div>
);
}