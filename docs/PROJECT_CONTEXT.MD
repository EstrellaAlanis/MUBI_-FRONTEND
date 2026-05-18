# Frontend Context

## Descripción General

Frontend React para MUBI Textil Store. Su responsabilidad es entregar una experiencia web separada por roles: website público/cliente para catálogo, pedidos personalizados, seguimiento y pagos; panel administrador para gestión operativa de productos, clientes, pedidos, pagos, inventario, usuarios, contacto y reportes básicos.

## Stack Tecnológico

- Framework: React
- Bundler: Vite
- Lenguaje: JavaScript / JSX
- UI: Bootstrap, Bootstrap Icons, CSS personalizado en `src/styles/app.css`
- Estado global: No usa librería global; estado local con `useState`, `useEffect`, `useMemo`
- Formularios: Formularios controlados manuales
- HTTP: `fetch` encapsulado en `src/services/api.js`
- Routing: `react-router-dom`
- Autenticación: Login backend + Firebase Google Auth para precarga/registro; sesión guardada en `localStorage`
- Validaciones: Manuales en componentes; validación básica de campos, DNI y extensiones de archivos

## Arquitectura Frontend

Aplicación SPA organizada por páginas, componentes reutilizables y servicios. `App.jsx` define rutas, sesión, rol activo y protección básica de módulos administrativos. Las páginas consumen directamente el servicio `api.js`, manejan su propio estado, errores, formularios y recarga de datos.

## Estructura de Carpetas

- `src/App.jsx`: enrutamiento principal, sesión, layout por rol y protección admin.
- `src/main.jsx`: bootstrap de React, `BrowserRouter`, Bootstrap y CSS global.
- `src/pages`: pantallas funcionales del sistema.
- `src/components`: componentes reutilizables simples.
- `src/services`: cliente HTTP y configuración Firebase.
- `src/styles/app.css`: estilos globales, layouts admin/cliente, responsive, catálogo, pedidos, pagos y hero.
- `public/videos`: recursos públicos del hero/video.
- `.env.example`: variable `VITE_API_URL`.

## Rutas

- `/`: dashboard. Público/cliente muestra landing y flujo comercial; admin muestra indicadores operativos.
- `/login`: login, registro cliente y Google Auth.
- `/productos`: catálogo público/cliente y CRUD de productos para admin.
- `/clientes`: CRUD de clientes; restringido a admin.
- `/usuarios`: gestión de usuarios; restringido a admin.
- `/pedidos`: cliente ve seguimiento de pedidos; admin gestiona pedidos.
- `/pedido-personalizado`: formulario cliente para crear pedido personalizado.
- `/pagos`: cliente registra/consulta pagos; admin gestiona pagos.
- `/materiales`: inventario; restringido a admin.
- `/contacto`: formulario público/cliente; admin lista mensajes.
- `/reportes`: reportes básicos; restringido a admin.
- `*`: redirección a `/`.

## Layouts

- Layout admin: `Sidebar` lateral + `Topbar` administrativo + contenido con padding.
- Layout cliente/visitante: navbar superior tipo website (`Topbar`) sin sidebar, clase `website-mode`.
- `RequireAdmin`: wrapper simple que bloquea módulos si `user.role !== 'admin'`.
- No existe sistema de layouts separado; la selección ocurre por rol dentro de `App.jsx` y componentes.

## Estado Global

No hay Redux, Zustand ni Context API. El estado de sesión vive en `App.jsx` y se persiste en `localStorage` con clave `mubiUser`. Cada página maneja datos, loading implícito, mensajes y errores con estado local.

Estados/patrones importantes:
- `user` y `role` en `App.jsx`.
- Listas CRUD por página: productos, clientes, pedidos, pagos, materiales, usuarios.
- Formularios controlados con `emptyForm` por módulo.
- `localStorage.ideaPedidoMubi` guarda una idea de pedido al navegar desde catálogo/dashboard hacia pedido personalizado.

## Servicios/API

`src/services/api.js` centraliza llamadas HTTP.

- `API_URL`: `import.meta.env.VITE_API_URL || 'http://localhost:5071/api'`.
- Métodos: `get`, `post`, `put`, `delete`, `upload`.
- JSON: usa `Content-Type: application/json`.
- Uploads: usa `FormData` sin declarar `Content-Type` manualmente.
- Errores: si `response.ok` es falso, intenta leer `detail` o `message` del JSON y lanza `Error`.
- No hay interceptores, refresh token ni headers de autorización.

Endpoints frontend:
- `/Productos`
- `/Categorias`
- `/Clientes`
- `/Pedidos`
- `/Pagos`
- `/Materiales`
- `/Usuarios`
- `/Contactos`

Uploads usados:
- Productos: `/Productos/upload-imagen`
- Pedidos: `/Pedidos/upload-diseno`, `/Pedidos/subir-excel`
- Pagos: `/Pagos/upload-comprobante`

## Autenticación

- Login principal: `POST /Usuarios/login`.
- Sesión frontend: objeto `{ idUsuario, nombre, apellido, correo, role }` guardado en `localStorage`.
- Logout: borra `mubiUser` y actualiza estado local.
- Registro cliente: `POST /Clientes` desde `Login.jsx`.
- Google Auth: `signInWithPopup` con Firebase; precarga datos en formulario de registro, no implementa federación completa con backend.
- Protección: solo en UI mediante `RequireAdmin`; no hay JWT ni refresh token en frontend.
- Login demo: existen funciones demo para admin/cliente en `Login.jsx`.

## Formularios y Validaciones

Sin librería de formularios. Validaciones manuales:
- DNI: longitud/formato de 8 dígitos en clientes/login.
- Montos/cantidades: conversión a `Number` antes de enviar.
- Archivos:
  - Producto: JPG/JPEG/PNG/WEBP.
  - Pedido diseños: imágenes.
  - Excel tallas: XLS/XLSX.
  - Comprobante pago: imagen o PDF.
- Errores visibles con alertas Bootstrap.

Patrón usado:
- `emptyForm`
- `form` con `useState`
- `submit` async con `try/catch`
- `message` y `error`
- `load()` para refrescar datos después de crear/editar/eliminar.

## Componentes Reutilizables

- `Topbar`: navbar website cliente/visitante y barra superior admin.
- `Sidebar`: menú lateral para admin; conserva listas de links cliente/visitante aunque actualmente solo se renderiza en admin.
- `PageHeader`: encabezado estándar de módulos.
- `StatCard`: tarjeta de métrica para dashboards/reportes.

## Hooks Personalizados

No existen hooks personalizados. Se usan hooks nativos de React: `useState`, `useEffect`, `useMemo`, `useLocation`, `useNavigate`.

## Manejo de Errores

- Manejo local por página con `try/catch`.
- `api.js` normaliza errores HTTP a `Error(message)`.
- Errores se muestran en UI con `alert alert-danger`.
- Mensajes exitosos se muestran con `alert alert-success`.
- No hay error boundary global ni logging frontend externo.

## Convenciones

- Componentes en PascalCase.
- Páginas en `src/pages` y componentes compartidos en `src/components`.
- Formularios por módulo con `emptyForm`.
- Nombres de propiedades alineados con DTOs del backend en camelCase.
- Rol esperado: `admin` o `cliente`.
- Navegación programática simple con `window.location.href` en algunos flujos y `useNavigate` en login.
- Recursos estáticos servidos desde `public` usando rutas absolutas (`/videos/...`).

## Dependencias Importantes

- `react`
- `react-dom`
- `react-router-dom`
- `vite`
- `@vitejs/plugin-react`
- `bootstrap`
- `bootstrap-icons`
- `firebase`

## Variables de Entorno

- `VITE_API_URL`: URL base del backend. Default local: `http://localhost:5071/api`.

## Estado Actual

Funciona actualmente:
- Website público con hero/video, catálogo, pedido rápido e inicio cliente.
- Navbar superior para cliente/visitante y sidebar admin.
- Login backend, sesión local y separación visual por rol.
- Registro de cliente y consulta DNI desde backend.
- Catálogo con imágenes subidas desde admin.
- CRUD admin para productos, clientes, usuarios, materiales, pedidos y pagos.
- Pedido personalizado con producto, talla, color, cantidad, diseño frontal/posterior y Excel de tallas.
- Cliente ve pedidos como seguimiento, sin CRUD administrativo.
- Admin revisa pedidos, cambia estados y accede a archivos.
- Pagos con comprobante para completar flujo de venta.
- Dashboard admin con KPIs: ingresos, pedidos, stock bajo, últimos pagos/pedidos.
- Reportes básicos y contacto.

## Problemas Conocidos

- Protección de rutas solo es visual/frontend; requiere autorización real en backend para producción.
- No hay JWT, refresh token ni manejo seguro de sesión.
- `localStorage` guarda sesión sin expiración.
- Google Auth no está integrado como autenticación final contra backend; solo precarga/registro.
- Filtros de cliente por nombre/correo pueden ser frágiles si el backend no devuelve relación exacta.
- Algunas acciones usan `window.location.href`, mezclado con React Router.
- No hay loading states globales ni skeletons.
- No hay tests automatizados.
- No hay validación formal con schema.
- Credenciales/config Firebase están en archivo fuente.

## Próximos Pasos

- Integrar autenticación real con JWT y roles desde backend.
- Proteger rutas y acciones por permisos reales.
- Reemplazar filtros por nombre con IDs de cliente/usuario confiables.
- Centralizar sesión en Context API o store liviano.
- Agregar interceptores/headers de autorización al cliente HTTP.
- Mejorar estados de carga y UX de errores.
- Formalizar validaciones con schema.
- Completar validación de pagos por admin si se requiere flujo de aprobación.
- Agregar tests básicos de componentes y servicios.
- Mover configuración Firebase a variables de entorno.
