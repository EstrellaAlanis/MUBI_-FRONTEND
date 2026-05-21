import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const CART_KEY = 'mubiCart';
const CHECKOUT_DATOS_KEY = 'mubiCheckoutDatos';

const getCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
};

const saveCart = (items) => {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('mubi-cart-updated'));
};

const emptyCheckoutData = {
  telefono: '',
  direccion: '',
  referenciaDireccion: '',
  tipoComprobante: 'boleta',
  documentoIdentidad: '',
  tipoCliente: 'persona',
  ruc: '',
  razonSocial: ''
};

export default function Carrito({ user }) {
  const [cart, setCart] = useState(() => getCart());
  const [message, setMessage] = useState('');
  const [checkoutData, setCheckoutData] = useState(() => {
    try {
      return {
        ...emptyCheckoutData,
        ...(JSON.parse(localStorage.getItem(CHECKOUT_DATOS_KEY)) || {})
      };
    } catch {
      return emptyCheckoutData;
    }
  });

  useEffect(() => {
    const update = () => setCart(getCart());

    window.addEventListener('mubi-cart-updated', update);
    window.addEventListener('storage', update);

    return () => {
      window.removeEventListener('mubi-cart-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(CHECKOUT_DATOS_KEY, JSON.stringify(checkoutData));
  }, [checkoutData]);

  const total = useMemo(() => {
    return cart.reduce(
      (acc, item) => acc + Number(item.precio || 0) * Number(item.cantidad || 1),
      0
    );
  }, [cart]);

  const totalPrendas = useMemo(() => {
    return cart.reduce((acc, item) => acc + Number(item.cantidad || 1), 0);
  }, [cart]);

  const updateQty = (cartId, cantidad) => {
    const items = cart.map(item =>
      item.cartId === cartId
        ? { ...item, cantidad: Math.max(1, Number(cantidad || 1)) }
        : item
    );

    setCart(items);
    saveCart(items);
  };

  const removeItem = (cartId) => {
    const items = cart.filter(item => item.cartId !== cartId);
    setCart(items);
    saveCart(items);
  };

  const limpiarCarrito = () => {
    if (!confirm('¿Vaciar todo el carrito?')) return;

    setCart([]);
    saveCart([]);
    localStorage.removeItem(CHECKOUT_DATOS_KEY);
    setCheckoutData(emptyCheckoutData);
  };

  const updateCheckoutData = (field, value) => {
    setCheckoutData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validarCheckout = () => {
    if (!checkoutData.telefono.trim()) {
      return 'Ingresa un teléfono para que MUBI pueda coordinar tu pedido.';
    }

    if (!checkoutData.direccion.trim()) {
      return 'Ingresa una dirección de entrega o referencia principal.';
    }

    if (checkoutData.tipoComprobante === 'boleta' && !checkoutData.documentoIdentidad.trim()) {
      return 'Ingresa tu DNI para preparar la boleta.';
    }

    if (checkoutData.tipoComprobante === 'factura') {
      if (!checkoutData.ruc.trim() || checkoutData.ruc.trim().length !== 11) {
        return 'Para factura, ingresa un RUC válido de 11 dígitos.';
      }

      if (!checkoutData.razonSocial.trim()) {
        return 'Para factura, ingresa la razón social.';
      }
    }

    return '';
  };

  const confirmarCompra = () => {
    if (!cart.length) {
      setMessage('Agrega al menos un producto para continuar.');
      return;
    }

    const checkoutError = validarCheckout();

    if (checkoutError) {
      setMessage(checkoutError);
      return;
    }

    const resumen = cart.map(item => {
      const filas = Array.isArray(item.personalizados)
        ? item.personalizados
            .filter(f => f.talla || f.nombre || f.numero)
            .map(f => `${f.talla || '-'} / ${f.nombre || '-'} / #${f.numero || '-'}`)
            .join(' | ')
        : 'Sin personalización por prenda';

      return `${item.cantidad} x ${item.nombre}. Color: ${item.color}. Talla base: ${item.talla}. Detalle: ${filas}`;
    }).join('\n');

    const datosEntrega = [
      `Teléfono: ${checkoutData.telefono}`,
      `Dirección: ${checkoutData.direccion}`,
      checkoutData.referenciaDireccion ? `Referencia: ${checkoutData.referenciaDireccion}` : '',
      `Comprobante: ${checkoutData.tipoComprobante}`,
      checkoutData.tipoComprobante === 'boleta' ? `DNI: ${checkoutData.documentoIdentidad}` : '',
      checkoutData.tipoComprobante === 'factura' ? `RUC: ${checkoutData.ruc}` : '',
      checkoutData.tipoComprobante === 'factura' ? `Razón social: ${checkoutData.razonSocial}` : ''
    ].filter(Boolean).join('\n');

    localStorage.setItem(
      'ideaPedidoMubi',
      `Pedido desde carrito:\n${resumen}\n\nDatos de entrega y comprobante:\n${datosEntrega}\n\nTotal estimado: S/ ${total.toFixed(2)}`
    );

    localStorage.setItem('mubiCheckoutPendiente', JSON.stringify(cart));
    localStorage.setItem('mubiCheckoutDatos', JSON.stringify(checkoutData));

    if (!user) {
      localStorage.setItem('redirectAfterLogin', '/pedido-personalizado');
      window.location.href = '/login';
      return;
    }

    window.location.href = '/pedido-personalizado';
  };

  return (
    <div className="cart-page fade-in">
      <section className="cart-hero">
        <div>
          <span className="badge-soft">Checkout MUBI</span>
          <h1>Revisa tu carrito</h1>
          <p>
            Verifica tus productos, cantidades y personalización. El inicio de sesión se pedirá
            recién al confirmar el pedido.
          </p>
        </div>

        <Link className="btn btn-glass" to="/productos">
          <i className="bi bi-arrow-left"></i> Seguir comprando
        </Link>
      </section>

      {message && <div className="alert alert-warning">{message}</div>}

      {!cart.length ? (
        <div className="panel-card empty-state">
          <i className="bi bi-cart-x"></i>
          <h4>Tu carrito está vacío</h4>
          <p>Explora el catálogo y agrega un producto para continuar.</p>

          <Link className="btn btn-primary" to="/productos">
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.map(item => (
              <article className="cart-item" key={item.cartId}>
                <div className="cart-item-img">
                  {item.imagen ? (
                    <img src={item.imagen} alt={item.nombre} />
                  ) : (
                    <i className="bi bi-bag-heart"></i>
                  )}
                </div>

                <div className="cart-item-info">
                  <span>{item.categoria || 'MUBI'}</span>
                  <h3>{item.nombre}</h3>
                  <p>{item.descripcion || 'Producto personalizado MUBI.'}</p>

                  <div className="cart-item-options">
                    <strong>Talla base: {item.talla || 'No indicada'}</strong>
                    <strong>Color: {item.color || 'No indicado'}</strong>
                  </div>

                  {Array.isArray(item.personalizados) && item.personalizados.filter(f => f.talla || f.nombre || f.numero).length > 0 && (
                    <div className="cart-custom-list">
                      <strong>Personalización por prenda:</strong>

                      {item.personalizados
                        .filter(f => f.talla || f.nombre || f.numero)
                        .map((fila, index) => (
                          <small key={index}>
                            Prenda {index + 1}: {fila.talla || '-'} / {fila.nombre || '-'} / #{fila.numero || '-'}
                          </small>
                        ))}
                    </div>
                  )}
                </div>

                <div className="cart-item-side">
                  <strong>S/ {Number(item.precio || 0).toFixed(2)}</strong>

                  <div className="cart-qty">
                    <button
                      type="button"
                      onClick={() => updateQty(item.cartId, Number(item.cantidad) - 1)}
                    >
                      -
                    </button>

                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={e => updateQty(item.cartId, e.target.value)}
                    />

                    <button
                      type="button"
                      onClick={() => updateQty(item.cartId, Number(item.cantidad) + 1)}
                    >
                      +
                    </button>
                  </div>

                  <button
                    className="btn btn-sm btn-outline-danger"
                    type="button"
                    onClick={() => removeItem(item.cartId)}
                  >
                    Quitar
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="cart-summary">
            <h3>Resumen del pedido</h3>

            <div>
              <span>Productos</span>
              <strong>{cart.length}</strong>
            </div>

            <div>
              <span>Total prendas</span>
              <strong>{totalPrendas}</strong>
            </div>

            <div>
              <span>Total estimado</span>
              <strong>S/ {total.toFixed(2)}</strong>
            </div>

            <p>
              El total puede ajustarse si el diseño requiere detalles adicionales.
              El administrador confirmará el monto final.
            </p>

            <div className="checkout-data-box">
              <h4>Datos para finalizar</h4>
              <small>Estos datos se piden al final, no al crear la cuenta.</small>

              <label>Teléfono</label>
              <input
                className="form-control"
                value={checkoutData.telefono}
                onChange={e => updateCheckoutData('telefono', e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="Ejemplo: 985632147"
              />

              <label>Dirección de entrega</label>
              <input
                className="form-control"
                value={checkoutData.direccion}
                onChange={e => updateCheckoutData('direccion', e.target.value)}
                placeholder="Dirección o zona de entrega"
              />

              <label>Referencia</label>
              <input
                className="form-control"
                value={checkoutData.referenciaDireccion}
                onChange={e => updateCheckoutData('referenciaDireccion', e.target.value)}
                placeholder="Frente al parque, casa verde..."
              />

              <label>Comprobante</label>
              <select
                className="form-select"
                value={checkoutData.tipoComprobante}
                onChange={e => updateCheckoutData('tipoComprobante', e.target.value)}
              >
                <option value="boleta">Boleta</option>
                <option value="factura">Factura</option>
              </select>

              {checkoutData.tipoComprobante === 'boleta' ? (
                <>
                  <label>DNI para boleta</label>
                  <input
                    className="form-control"
                    value={checkoutData.documentoIdentidad}
                    onChange={e => updateCheckoutData('documentoIdentidad', e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="8 dígitos"
                  />
                </>
              ) : (
                <div className="checkout-invoice-fields">
                  <label>RUC</label>
                  <input
                    className="form-control"
                    value={checkoutData.ruc}
                    onChange={e => updateCheckoutData('ruc', e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="11 dígitos"
                  />

                  <label>Razón social</label>
                  <input
                    className="form-control"
                    value={checkoutData.razonSocial}
                    onChange={e => updateCheckoutData('razonSocial', e.target.value)}
                    placeholder="Nombre legal de la empresa"
                  />
                </div>
              )}
            </div>

            <button className="btn btn-primary w-100" type="button" onClick={confirmarCompra}>
              {user ? 'Confirmar pedido' : 'Continuar e iniciar sesión'}
            </button>

            <button className="btn btn-outline-dark w-100 mt-2" type="button" onClick={limpiarCarrito}>
              Vaciar carrito
            </button>

            {!user && (
              <small>
                Puedes elegir productos sin cuenta. El inicio de sesión se solicita solo al confirmar.
              </small>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
