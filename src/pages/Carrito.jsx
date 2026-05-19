import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const CART_KEY = 'mubiCart';

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

export default function Carrito({ user }) {
  const [cart, setCart] = useState(() => getCart());
  const [message, setMessage] = useState('');

  useEffect(() => {
    const update = () => setCart(getCart());

    window.addEventListener('mubi-cart-updated', update);
    window.addEventListener('storage', update);

    return () => {
      window.removeEventListener('mubi-cart-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

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
  };

  const confirmarCompra = () => {
    if (!cart.length) {
      setMessage('Agrega al menos un producto para continuar.');
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

    localStorage.setItem(
      'ideaPedidoMubi',
      `Pedido desde carrito:\n${resumen}\nTotal estimado: S/ ${total.toFixed(2)}`
    );

    localStorage.setItem('mubiCheckoutPendiente', JSON.stringify(cart));

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