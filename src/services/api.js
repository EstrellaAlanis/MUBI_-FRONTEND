const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5071/api';

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    let message = `Error ${response.status}: ${response.statusText}`;

    try {
      const error = await response.json();
      message = error.detail || error.message || message;
    } catch (_) {}

    throw new Error(message);
  }

  if (response.status === 204) return null;

  return response.json();
}

export const api = {
  get: (endpoint) => request(endpoint),

  post: (endpoint, data) =>
    request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  put: (endpoint, data) =>
    request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (endpoint) =>
    request(endpoint, {
      method: 'DELETE'
    }),

  upload: async (endpoint, file, fieldName = 'archivo') => {
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      let message = `Error ${response.status}: ${response.statusText}`;

      try {
        const error = await response.json();
        message = error.detail || error.message || message;
      } catch (_) {}

      throw new Error(message);
    }

    return response.json();
  }
};

export const endpoints = {
  productos: '/Productos',
  categorias: '/Categorias',
  clientes: '/Clientes',
  pedidos: '/Pedidos',
  pagos: '/Pagos',
  materiales: '/Materiales',
  usuarios: '/Usuarios',
  contactos: '/Contactos'
};