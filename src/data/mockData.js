export const categorias = [
  { id_categoria: 1, nombre_categoria: 'Polos sublimados', descripcion: 'Diseños personalizados a todo color' },
  { id_categoria: 2, nombre_categoria: 'Polos corporativos', descripcion: 'Para empresas, eventos y equipos' },
  { id_categoria: 3, nombre_categoria: 'Diseños especiales', descripcion: 'Pedidos únicos según solicitud del cliente' }
];

export const productos = [
  { id_producto: 1, nombre: 'Polo Sublimado Clásico', descripcion: 'Polo personalizado con diseño completo.', precio: 35, disponibilidad: 'Disponible', id_categoria: 1, imagen: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80' },
  { id_producto: 2, nombre: 'Polo Corporativo MUBI', descripcion: 'Ideal para negocios, promociones y equipos.', precio: 42, disponibilidad: 'Disponible', id_categoria: 2, imagen: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=80' },
  { id_producto: 3, nombre: 'Polo Diseño Gamer', descripcion: 'Personalización con diseño creativo.', precio: 48, disponibilidad: 'Bajo pedido', id_categoria: 3, imagen: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=80' }
];

export const clientes = [
  { id_cliente: 1, nombres: 'Carlos', apellidos: 'Ramírez', correo: 'carlos@email.com', telefono: '987654321', direccion: 'Pucallpa' },
  { id_cliente: 2, nombres: 'María', apellidos: 'Torres', correo: 'maria@email.com', telefono: '912345678', direccion: 'Yarinacocha' }
];

export const pedidos = [
  { id_pedido: 1, cliente: 'Carlos Ramírez', producto: 'Polo Sublimado Clásico', talla: 'M', color: 'Negro', cantidad: 2, estado_pedido: 'Pendiente', monto_total: 70, observaciones: 'Diseño con logo familiar' },
  { id_pedido: 2, cliente: 'María Torres', producto: 'Polo Corporativo MUBI', talla: 'L', color: 'Blanco', cantidad: 5, estado_pedido: 'En proceso', monto_total: 210, observaciones: 'Pedido para negocio' }
];

export const pagos = [
  { id_pago: 1, id_pedido: 1, cliente: 'Carlos Ramírez', monto: 35, metodo_pago: 'Yape', tipo_pago: 'Adelanto', saldo: 35 },
  { id_pago: 2, id_pedido: 2, cliente: 'María Torres', monto: 210, metodo_pago: 'Transferencia', tipo_pago: 'Pago final', saldo: 0 }
];

export const materiales = [
  { id_material: 1, nombre_material: 'Tela poliéster', stock_actual: 35, stock_minimo: 10, unidad_medida: 'metros', estado: 'Activo' },
  { id_material: 2, nombre_material: 'Tinta sublimación', stock_actual: 8, stock_minimo: 10, unidad_medida: 'botellas', estado: 'Stock bajo' },
  { id_material: 3, nombre_material: 'Papel sublimático', stock_actual: 50, stock_minimo: 20, unidad_medida: 'hojas', estado: 'Activo' }
];
