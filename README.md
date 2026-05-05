# Frontend MUBI - app-dsi5

Frontend en React + Vite para la plataforma web de gestión y comercialización de polos sublimados y personalizados MUBI.

## Ejecutar en VS Code

1. Abrir la carpeta `app-dsi5` en VS Code.
2. Abrir una terminal dentro de la carpeta.
3. Ejecutar:

```bash
npm install
npm run dev
```

4. Abrir la URL que muestre Vite, normalmente:

```bash
http://localhost:5173
```

## Conectar con backend

El frontend usa por defecto:

```bash
http://localhost:5071/api
```

Si tu backend corre en otro puerto, crea un archivo `.env` en la raíz y cambia:

```bash
VITE_API_URL=http://localhost:TU_PUERTO/api
```

Ejemplo si usas HTTPS:

```bash
VITE_API_URL=https://localhost:7071/api
```

## Módulos incluidos

- Inicio / Dashboard
- Login visual
- Catálogo de productos
- Gestión de clientes
- Gestión de pedidos personalizados
- Gestión de pagos
- Inventario de materiales
- Contacto
- Reportes básicos
