import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import PageHeader from '../components/PageHeader.jsx';
import { api, endpoints } from '../services/api.js';

const API_BASE_URL = 'http://localhost:5071';

const emptyForm = {
  idCliente: '',
  idProducto: '',
  talla: 'M',
  color: 'Negro',
  cantidad: 1,
  tipoDiseno: 'Sublimado',
  ubicacionDiseno: 'Frente y espalda',
  descripcionDiseno: '',
  archivoDisenoFrente: '',
  archivoDisenoEspalda: '',
  archivoExcelTallas: '',
  estadoPedido: 'pendiente'
};

const TALLAS_DISPONIBLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const crearFilaTalla = (talla = 'M') => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  talla,
  nombre: '',
  numero: '',
  color: ''
});

const normalizarFilaPersonalizacion = (row, index) => ({
  id: row.id || `${index}-${Date.now()}`,
  talla: String(row.talla || row.Talla || row.TALLA || 'M').trim().toUpperCase(),
  nombre: String(row.nombre || row.Nombre || row.NOMBRE || '').trim(),
  numero: String(row.numero || row.Numero || row.Número || row.NUMERO || row.NÚMERO || '').trim(),
  color: String(row.color || row.Color || row.COLOR || '').trim()
});

export default function Pedidos({ role, user }) {
  const location = useLocation();
  const isCliente = role === 'cliente';
  const isPedidoPersonalizado = location.pathname === '/pedido-personalizado';

  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [comprobantes, setComprobantes] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const [previewFrente, setPreviewFrente] = useState('');
  const [previewEspalda, setPreviewEspalda] = useState('');

  const [archivoFrente, setArchivoFrente] = useState(null);
  const [archivoEspalda, setArchivoEspalda] = useState(null);
  const [archivoExcel, setArchivoExcel] = useState(null);
  const [excelPreview, setExcelPreview] = useState([]);
const [excelConfirmado, setExcelConfirmado] = useState(false);
  const [modoTallas, setModoTallas] = useState('manual');
  const [filasTallas, setFilasTallas] = useState([crearFilaTalla('M')]);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [checkoutPendiente, setCheckoutPendiente] = useState([]);
  const [checkoutDatos, setCheckoutDatos] = useState(null);

  const load = async () => {
    const [pedidosData, clientesData, productosData, comprobantesData] = await Promise.all([
      api.get(endpoints.pedidos),
      api.get(endpoints.clientes),
      api.get(endpoints.productos),
      api.get(endpoints.comprobantes)
    ]);

    setPedidos(Array.isArray(pedidosData) ? pedidosData : []);
    setClientes(Array.isArray(clientesData) ? clientesData : []);
    setProductos(Array.isArray(productosData) ? productosData : []);
    setComprobantes(Array.isArray(comprobantesData) ? comprobantesData : []);

    setForm(prev => ({
      ...prev,
      idCliente: prev.idCliente || clientesData[0]?.idCliente || '',
      idProducto: prev.idProducto || productosData[0]?.idProducto || ''
    }));
  };

  const crearResumenCheckout = (items) => {
  if (!Array.isArray(items) || !items.length) return '';

  return items.map((item, index) => {
    const personalizados = Array.isArray(item.personalizados)
      ? item.personalizados
          .filter(row => row.talla || row.nombre || row.numero)
          .map(row => `${row.talla || '-'} / ${row.nombre || 'Sin nombre'} / #${row.numero || '-'}${row.color ? ` / ${row.color}` : ''}`)
          .join(' | ')
      : 'Sin nombres o números personalizados';

    return `Producto ${index + 1}: ${item.cantidad} x ${item.nombre}. Talla base: ${item.talla}. Color: ${item.color}. Personalización: ${personalizados}.`;
  }).join('\n');
};

const crearResumenDatosCheckout = (datos) => {
  if (!datos) return '';

  return [
    'Datos de entrega y comprobante:',
    datos.telefono ? `Teléfono: ${datos.telefono}` : '',
    datos.direccion ? `Dirección: ${datos.direccion}` : '',
    datos.referenciaDireccion ? `Referencia: ${datos.referenciaDireccion}` : '',
    datos.tipoComprobante ? `Comprobante solicitado: ${datos.tipoComprobante}` : '',
    datos.tipoComprobante === 'boleta' && datos.documentoIdentidad ? `DNI: ${datos.documentoIdentidad}` : '',
    datos.tipoComprobante === 'factura' && datos.ruc ? `RUC: ${datos.ruc}` : '',
    datos.tipoComprobante === 'factura' && datos.razonSocial ? `Razón social: ${datos.razonSocial}` : ''
  ].filter(Boolean).join('\n');
};

const getFilasTallasValidas = () => {
  return filasTallas
    .map((row, index) => normalizarFilaPersonalizacion(row, index))
    .filter(row => row.talla || row.nombre || row.numero || row.color);
};

const getFilasAgrupadasPorTalla = () => {
  const rows = getFilasTallasValidas();

  return TALLAS_DISPONIBLES.map(talla => ({
    talla,
    filas: rows.filter(row => row.talla === talla)
  })).filter(group => group.filas.length > 0);
};

const totalManualTallas = getFilasTallasValidas().length;

const agregarFilaTalla = (talla = 'M') => {
  setFilasTallas(prev => [...prev, crearFilaTalla(talla)]);
};

const actualizarFilaTalla = (id, field, value) => {
  setFilasTallas(prev =>
    prev.map(row =>
      row.id === id
        ? { ...row, [field]: field === 'numero' ? value.replace(/\D/g, '').slice(0, 3) : value }
        : row
    )
  );
};

const eliminarFilaTalla = (id) => {
  setFilasTallas(prev => {
    const next = prev.filter(row => row.id !== id);
    return next.length ? next : [crearFilaTalla('M')];
  });
};

const cargarFilasDesdeExcel = (rows) => {
  const normalizadas = rows
    .map((row, index) => normalizarFilaPersonalizacion(row, index))
    .filter(row => row.talla || row.nombre || row.numero || row.color);

  if (normalizadas.length) {
    setFilasTallas(normalizadas);
    setModoTallas('excel');
    setForm(prev => ({ ...prev, cantidad: normalizadas.length }));
  }
};

const limpiarFilasManual = () => {
  setFilasTallas([crearFilaTalla('M')]);
  setModoTallas('manual');
  setExcelPreview([]);
  setExcelConfirmado(false);
  setArchivoExcel(null);
  setForm(prev => ({ ...prev, archivoExcelTallas: '', cantidad: 1 }));
};

const actualizarDatosClienteCheckout = async () => {
  if (!isCliente || !clienteActual || !checkoutDatos) return;

  const payload = {
    nombres: clienteActual.nombres || user?.nombre || '',
    apellidos: clienteActual.apellidos || user?.apellido || '',
    correo: clienteActual.correo || user?.correo || '',
    telefono: checkoutDatos.telefono || clienteActual.telefono || '',
    direccion: checkoutDatos.direccion || clienteActual.direccion || '',
    referenciaDireccion: checkoutDatos.referenciaDireccion || clienteActual.referenciaDireccion || '',
    documentoIdentidad: checkoutDatos.documentoIdentidad || clienteActual.documentoIdentidad || '',
    tipoCliente: checkoutDatos.tipoComprobante === 'factura' ? 'empresa' : 'persona',
    ruc: checkoutDatos.tipoComprobante === 'factura' ? checkoutDatos.ruc : (clienteActual.ruc || ''),
    razonSocial: checkoutDatos.tipoComprobante === 'factura' ? checkoutDatos.razonSocial : (clienteActual.razonSocial || '')
  };

  await api.put(`${endpoints.clientes}/${clienteActual.idCliente}`, payload);
};


  useEffect(() => {
  const ideaGuardada = localStorage.getItem('ideaPedidoMubi');
  const checkoutGuardado = localStorage.getItem('mubiCheckoutPendiente');
  const checkoutDatosGuardados = localStorage.getItem('mubiCheckoutDatos');

  let checkoutItems = [];
  let datosCheckout = null;

  try {
    checkoutItems = checkoutGuardado ? JSON.parse(checkoutGuardado) : [];
  } catch {
    checkoutItems = [];
  }

  try {
    datosCheckout = checkoutDatosGuardados ? JSON.parse(checkoutDatosGuardados) : null;
  } catch {
    datosCheckout = null;
  }

  if (datosCheckout) {
    setCheckoutDatos(datosCheckout);
  }

  if (checkoutItems.length) {
    setCheckoutPendiente(checkoutItems);

    const primerItem = checkoutItems[0];
    const totalCantidad = checkoutItems.reduce(
      (acc, item) => acc + Number(item.cantidad || 1),
      0
    );

    setForm(prev => ({
      ...prev,
      idProducto: primerItem.idProducto || prev.idProducto,
      talla: primerItem.talla || prev.talla,
      color: primerItem.color || prev.color,
      cantidad: totalCantidad,
      descripcionDiseno: crearResumenCheckout(checkoutItems)
    }));
  } else if (ideaGuardada) {
    setForm(prev => ({
      ...prev,
      descripcionDiseno: ideaGuardada
    }));
  }

  load().catch(err => setError(err.message));
}, []);

  const selectedProduct = productos.find(
    p => Number(p.idProducto) === Number(form.idProducto)
  );
  const checkoutTotal = checkoutPendiente.reduce(
  (acc, item) => acc + Number(item.precio || 0) * Number(item.cantidad || 1),
  0
);

  const total = checkoutPendiente.length
    ? checkoutTotal
    : Number(selectedProduct?.precio || 0) * Number(form.cantidad || 0);

  const checkoutDatosTexto = crearResumenDatosCheckout(checkoutDatos);

  const ordenarPorFechaAsc = (lista) => [...lista].sort((a, b) => {
    const fechaA = new Date(a.fechaPedido || a.fechaRegistro || 0).getTime();
    const fechaB = new Date(b.fechaPedido || b.fechaRegistro || 0).getTime();
    return fechaA - fechaB;
  });

  const ordenarPorFechaDesc = (lista) => [...lista].sort((a, b) => {
    const fechaA = new Date(a.fechaPedido || a.fechaRegistro || 0).getTime();
    const fechaB = new Date(b.fechaPedido || b.fechaRegistro || 0).getTime();
    return fechaB - fechaA;
  });

  const colaPendiente = ordenarPorFechaAsc(
    pedidos.filter(p => String(p.estadoPedido || '').toLowerCase() === 'pendiente')
  );

  const siguientePedido = colaPendiente[0] || null;
  const pedidosPendientes = colaPendiente.length;

  const pedidosConfirmados = pedidos.filter(
    p => String(p.estadoPedido || '').toLowerCase() === 'confirmado'
  ).length;

  const pedidosProduccion = pedidos.filter(
    p => String(p.estadoPedido || '').toLowerCase() === 'en_proceso'
  ).length;

  const pedidosEntregados = pedidos.filter(
    p => String(p.estadoPedido || '').toLowerCase() === 'entregado'
  ).length;

  const pedidosCancelados = pedidos.filter(
    p => String(p.estadoPedido || '').toLowerCase() === 'cancelado'
  ).length;

  const pedidosHistorial = ordenarPorFechaDesc(pedidos);

  const clienteActual = clientes.find(c =>
    Number(c.idUsuario) === Number(user?.idUsuario) ||
    String(c.correo || '').toLowerCase() === String(user?.correo || '').toLowerCase()
  );

  const pedidosCliente = isCliente && clienteActual
    ? pedidos.filter(p => Number(p.idCliente) === Number(clienteActual.idCliente))
    : pedidos;

  const handleArchivo = (e, lado) => {
    const file = e.target.files[0];
    if (!file) return;

    if (lado === 'frente') {
      setArchivoFrente(file);
      setForm({ ...form, archivoDisenoFrente: file.name });
      setPreviewFrente(URL.createObjectURL(file));
    }

    if (lado === 'espalda') {
      setArchivoEspalda(file);
      setForm({ ...form, archivoDisenoEspalda: file.name });
      setPreviewEspalda(URL.createObjectURL(file));
    }
  };
const descargarPlantillaExcel = () => {
  const instrucciones = [
    ['PLANTILLA MUBI - TALLAS, NOMBRES Y NÚMEROS'],
    ['Uso simple: una fila representa un polo. No borres los encabezados.'],
    ['Tallas permitidas: XS, S, M, L, XL, XXL, XXXL'],
    ['Si un polo no lleva nombre o número, deja esa celda vacía.'],
    ['Ejemplo: para 12 polos, registra 12 filas.']
  ];

  const data = [
    { Talla: 'S', Nombre: 'LUIS', Numero: '9', Color: 'Negro', Observacion: 'Delantero' },
    { Talla: 'S', Nombre: 'CARLOS', Numero: '10', Color: 'Negro', Observacion: 'Delantero' },
    { Talla: 'M', Nombre: 'AXEL', Numero: '7', Color: 'Blanco', Observacion: 'Capitán' },
    { Talla: 'L', Nombre: 'MIGUEL', Numero: '11', Color: 'Negro', Observacion: '' },
    { Talla: 'XL', Nombre: '', Numero: '', Color: 'Negro', Observacion: 'Sin nombre' }
  ];

  const workbook = XLSX.utils.book_new();

  const sheetInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones);
  sheetInstrucciones['!cols'] = [{ wch: 70 }];

  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: ['Talla', 'Nombre', 'Numero', 'Color', 'Observacion']
  });

  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 12 },
    { wch: 18 },
    { wch: 32 }
  ];

  XLSX.utils.book_append_sheet(workbook, sheetInstrucciones, 'Instrucciones');
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');

  XLSX.writeFile(workbook, 'plantilla_mubi_tallas_nombres_numeros.xlsx');
};
  const handleExcel = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const extension = file.name.split('.').pop().toLowerCase();

  if (!['xlsx', 'xls'].includes(extension)) {
    setError('Solo se permite subir archivos Excel .xlsx o .xls.');
    e.target.value = '';
    return;
  }

  setError('');
  setArchivoExcel(file);
  setExcelConfirmado(false);
  setForm({ ...form, archivoExcelTallas: file.name });

  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: ''
      });

      const normalizedRows = rows.map((row, index) => ({
        id: index + 1,
        talla: row.Talla || row.talla || row.TALLA || '',
        nombre: row.Nombre || row.nombre || row.NOMBRE || '',
        numero: row.Numero || row.Número || row.numero || row.NUMERO || row.NÚMERO || '',
        color: row.Color || row.color || row.COLOR || ''
      }));

      setExcelPreview(normalizedRows);
      cargarFilasDesdeExcel(normalizedRows);
    } catch {
      setError('No se pudo leer el Excel. Verifica que tenga columnas Talla, Nombre y Numero.');
      setExcelPreview([]);
      setExcelConfirmado(false);
    }
  };

  reader.readAsArrayBuffer(file);
};
const limpiarExcel = () => {
  setArchivoExcel(null);
  setExcelPreview([]);
  setExcelConfirmado(false);
  setModoTallas('manual');
  setForm({ ...form, archivoExcelTallas: '' });
};

  const subirImagen = async (archivo) => {
    if (!archivo) return '';

    const uploaded = await api.upload(`${endpoints.pedidos}/upload-diseno`, archivo);
    return uploaded.ruta || '';
  };

  const subirExcel = async (archivo) => {
    if (!archivo) return '';

    const uploaded = await api.upload(`${endpoints.pedidos}/subir-excel`, archivo);
    return uploaded.rutaExcelTallas || '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (archivoExcel && excelPreview.length > 0 && !excelConfirmado) {
        throw new Error('Primero confirma la vista previa del Excel antes de enviar el pedido.');
      }
      if (isCliente && !clienteActual) {
        throw new Error('No se encontró tu registro de cliente. Verifica que tu correo esté registrado como cliente.');
      }

      if (isCliente && checkoutDatos) {
        await actualizarDatosClienteCheckout();
      }

      const filasTallasValidas = getFilasTallasValidas();
      const resumenManualTallas = filasTallasValidas.length
        ? `Tallas, nombres y números:\n${filasTallasValidas
            .map((row, index) => `${index + 1}. ${row.talla || '-'} / ${row.nombre || 'Sin nombre'} / #${row.numero || '-'}${row.color ? ` / Color: ${row.color}` : ''}`)
            .join('\n')}`
        : '';

      const observacionesPedido = [form.descripcionDiseno, resumenManualTallas, checkoutDatosTexto]
        .filter(Boolean)
        .join('\n\n');

      const rutaFrente = await subirImagen(archivoFrente);
      const rutaEspalda = await subirImagen(archivoEspalda);
      const rutaExcelTallas = await subirExcel(archivoExcel);

      const archivos = [
        form.archivoDisenoFrente ? `Frente: ${form.archivoDisenoFrente}` : '',
        form.archivoDisenoEspalda ? `Espalda: ${form.archivoDisenoEspalda}` : '',
        form.archivoExcelTallas ? `Excel tallas/nombres/números: ${form.archivoExcelTallas}` : ''
      ].filter(Boolean).join(' | ');

      const payload = {
        idCliente: Number(isCliente ? clienteActual.idCliente : form.idCliente),
        estadoPedido: 'pendiente',
        observaciones: observacionesPedido,
        rutaExcelTallas: rutaExcelTallas,
        detalles: checkoutPendiente.length
          ? checkoutPendiente.map(item => ({
              idProducto: Number(item.idProducto),
              talla: item.talla || 'M',
              color: item.color || 'Negro',
              cantidad: Number(item.cantidad || item.bulkTotal || 1),
              precioUnitario: Number(item.precio || 0),
              descripcionDiseno: `Tipo: ${form.tipoDiseno}. Ubicación: ${form.ubicacionDiseno}. Detalle: ${observacionesPedido}. Archivos: ${archivos || 'Sin archivos adjuntos'}`,
              disenoPersonalizado: item.personalizados?.length
                ? item.personalizados
                    .filter(row => row.talla || row.nombre || row.numero)
                    .map(row => `${row.talla || '-'} / ${row.nombre || 'Sin nombre'} / #${row.numero || '-'}${row.color ? ` / ${row.color}` : ''}`)
                    .join(' | ')
                : (archivos || 'Diseño descrito por cliente'),
              rutaDisenoFrontal: rutaFrente,
              rutaDisenoPosterior: rutaEspalda
            }))
          : [
              {
                idProducto: Number(form.idProducto),
                talla: form.talla,
                color: form.color,
                cantidad: Number(filasTallasValidas.length || form.cantidad),
                precioUnitario: Number(selectedProduct?.precio || 0),
                descripcionDiseno: `Tipo: ${form.tipoDiseno}. Ubicación: ${form.ubicacionDiseno}. Detalle: ${observacionesPedido}. Archivos: ${archivos || 'Sin archivos adjuntos'}`,
                disenoPersonalizado: filasTallasValidas.length
                  ? filasTallasValidas.map(row => `${row.talla || '-'} / ${row.nombre || 'Sin nombre'} / #${row.numero || '-'}${row.color ? ` / ${row.color}` : ''}`).join(' | ')
                  : (archivos || (form.descripcionDiseno ? 'Diseño descrito por cliente' : 'Sin diseño')),
                rutaDisenoFrontal: rutaFrente,
                rutaDisenoPosterior: rutaEspalda
              }
            ]
      };

      await api.post(endpoints.pedidos, payload);

      setMessage('Pedido registrado correctamente. El administrador revisará tu pedido.');
      setForm({
        ...emptyForm,
        idCliente: clientes[0]?.idCliente || '',
        idProducto: productos[0]?.idProducto || ''
      });

      setPreviewFrente('');
      setPreviewEspalda('');
      setArchivoFrente(null);
      setArchivoEspalda(null);
      setArchivoExcel(null);
      setExcelPreview([]);
      setExcelConfirmado(false);

      localStorage.removeItem('ideaPedidoMubi');
      localStorage.removeItem('mubiCart');
      localStorage.removeItem('mubiCheckoutPendiente');
      localStorage.removeItem('mubiCheckoutDatos');
      window.dispatchEvent(new Event('mubi-cart-updated'));
      setCheckoutPendiente([]);
      await load();

      if (isCliente) {
        setTimeout(() => {
          window.location.href = '/pedidos';
        }, 900);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const updateEstado = async (pedido, estadoPedido) => {
    try {
      await api.put(`${endpoints.pedidos}/${pedido.idPedido}`, {
        estadoPedido,
        observaciones: pedido.observaciones || ''
      });

      setMessage('Estado actualizado.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar pedido?')) return;

    try {
      await api.delete(`${endpoints.pedidos}/${id}`);
      setMessage('Pedido eliminado.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };
const getComprobantePedido = (idPedido) => {
  return comprobantes.find(c =>
    Number(c.idPedido) === Number(idPedido) &&
    String(c.estado || '').toLowerCase() === 'emitido'
  );
};

const extraerDatoObservacion = (texto, etiqueta) => {
  const contenido = String(texto || '');
  const regex = new RegExp(`${etiqueta}:\\s*([^|\\n]+)`, 'i');
  const match = contenido.match(regex);
  return match ? match[1].trim() : '';
};

const getDatosCheckoutPedido = (pedido) => {
  const obs = pedido?.observaciones || '';

  return {
    telefono: extraerDatoObservacion(obs, 'Teléfono'),
    direccion: extraerDatoObservacion(obs, 'Dirección'),
    referencia: extraerDatoObservacion(obs, 'Referencia'),
    tipoComprobante: extraerDatoObservacion(obs, 'Comprobante'),
    dni: extraerDatoObservacion(obs, 'DNI'),
    ruc: extraerDatoObservacion(obs, 'RUC'),
    razonSocial: extraerDatoObservacion(obs, 'Razón social')
  };
};

const imprimirComprobante = (comprobante) => {
  if (!comprobante) return;

  const clienteNombre = comprobante.razonSocial || comprobante.cliente || 'Cliente';
  const documento = comprobante.ruc || comprobante.documentoIdentidad || 'Sin documento';

  const html = `
    <html>
      <head>
        <title>${comprobante.numeroCompleto}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
          .ticket { max-width: 760px; margin: auto; border: 1px solid #ddd; padding: 28px; border-radius: 16px; }
          .top { display: flex; justify-content: space-between; gap: 20px; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
          h1, h2, h3, p { margin: 0; }
          .brand h1 { font-size: 34px; }
          .box { border: 1px solid #111; border-radius: 12px; padding: 14px; text-align: center; min-width: 220px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 18px 0; }
          .field { background: #f5f5f5; padding: 12px; border-radius: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; }
          .totals { margin-top: 20px; margin-left: auto; width: 280px; }
          .totals div { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
          .total { font-weight: bold; font-size: 20px; }
          .footer { margin-top: 24px; font-size: 13px; color: #555; text-align: center; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="top">
            <div class="brand">
              <h1>MUBI</h1>
              <p>Polos sublimados y personalizados</p>
              <p>Pucallpa - Perú</p>
            </div>
            <div class="box">
              <h3>${String(comprobante.tipoComprobante).toUpperCase()}</h3>
              <h2>${comprobante.numeroCompleto}</h2>
              <p>Estado: ${comprobante.estado}</p>
            </div>
          </div>

          <div class="grid">
            <div class="field"><strong>Cliente:</strong><br/>${clienteNombre}</div>
            <div class="field"><strong>Documento:</strong><br/>${documento}</div>
            <div class="field"><strong>Fecha:</strong><br/>${new Date(comprobante.fechaEmision).toLocaleDateString()}</div>
            <div class="field"><strong>Pedido:</strong><br/>#${comprobante.idPedido}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Pedido personalizado MUBI #${comprobante.idPedido}</td>
                <td>S/ ${Number(comprobante.total || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <div><span>Subtotal</span><strong>S/ ${Number(comprobante.subtotal || 0).toFixed(2)}</strong></div>
            <div><span>IGV</span><strong>S/ ${Number(comprobante.igv || 0).toFixed(2)}</strong></div>
            <div class="total"><span>Total</span><strong>S/ ${Number(comprobante.total || 0).toFixed(2)}</strong></div>
          </div>

          <div class="footer">
            <p>${comprobante.observacion || 'Comprobante generado desde el sistema MUBI.'}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};
  const getEstadoInfo = (estado) => {
    const value = String(estado || 'pendiente').toLowerCase();

    const textos = {
      pendiente: {
        titulo: 'Pedido recibido',
        texto: 'Tu pedido fue registrado y está esperando revisión del administrador.'
      },
      confirmado: {
        titulo: 'Pedido confirmado',
        texto: 'El administrador revisó tu pedido y confirmó los detalles.'
      },
      pagado: {
        titulo: 'Pago registrado',
        texto: 'El pago fue registrado. El pedido está listo para producción.'
      },
      en_proceso: {
        titulo: 'En producción',
        texto: 'Tu pedido se encuentra en proceso de elaboración.'
      },
      entregado: {
        titulo: 'Pedido entregado',
        texto: 'Tu pedido fue entregado correctamente.'
      },
      cancelado: {
        titulo: 'Pedido cancelado',
        texto: 'Este pedido fue cancelado. Puedes comunicarte con MUBI para más información.'
      }
    };

    return textos[value] || textos.pendiente;
  };

  const TrackingPedido = ({ estado }) => {
    const pasos = ['pendiente', 'confirmado', 'pagado', 'en_proceso', 'entregado'];
    const estadoActual = String(estado || 'pendiente').toLowerCase();
    const indexActual = pasos.indexOf(estadoActual);

    if (estadoActual === 'cancelado') {
      return <div className="tracking-cancelado">Pedido cancelado</div>;
    }

    return (
      <div className="tracking-pedido">
        {pasos.map((paso, index) => (
          <div
            key={paso}
            className={`tracking-step ${index <= indexActual ? 'active' : ''}`}
          >
            <span>{index + 1}</span>
            <small>{paso.replace('_', ' ')}</small>
          </div>
        ))}
      </div>
    );
  };

  const FormularioPedido = ({ modoCliente = false }) => (
    <form className={`panel-card form-card ${modoCliente ? 'client-order-form' : ''}`} onSubmit={submit}>
      <div className="form-title-row">
        <div>
          <h4>{modoCliente ? 'Personaliza tu pedido' : 'Nuevo pedido'}</h4>
          {modoCliente && (
            <p>Completa solo lo necesario. El administrador revisará los detalles antes de confirmar.</p>
          )}
        </div>
      </div>
      {modoCliente && checkoutPendiente.length > 0 && (
        <div className="checkout-import-box">
          <i className="bi bi-cart-check"></i>
          <div>
            <strong>Pedido importado desde tu carrito</strong>
            <span>
              Se cargaron {checkoutPendiente.length} producto(s) con un total estimado de S/ {checkoutTotal.toFixed(2)}.
            </span>
          </div>
        </div>
      )}

      {modoCliente && checkoutDatos && (
        <div className="checkout-confirm-data-box">
          <i className="bi bi-truck"></i>
          <div>
            <strong>Datos de entrega y comprobante recibidos</strong>
            <span>{checkoutDatos.telefono} · {checkoutDatos.direccion}</span>
            <small>
              Comprobante: {checkoutDatos.tipoComprobante}
              {checkoutDatos.tipoComprobante === 'boleta' && checkoutDatos.documentoIdentidad
                ? ` · DNI: ${checkoutDatos.documentoIdentidad}`
                : ''}
              {checkoutDatos.tipoComprobante === 'factura' && checkoutDatos.ruc
                ? ` · RUC: ${checkoutDatos.ruc}`
                : ''}
            </small>
          </div>
        </div>
      )}
      {!modoCliente && (
        <>
          <label>Cliente</label>
          <select
            className="form-select"
            value={form.idCliente}
            onChange={e => setForm({ ...form, idCliente: e.target.value })}
            required
          >
            {clientes.map(c => (
              <option key={c.idCliente} value={c.idCliente}>
                {c.nombres} {c.apellidos}
              </option>
            ))}
          </select>
        </>
      )}

      {modoCliente && (
        <div className="client-form-note">
          <i className="bi bi-person-check"></i>
          <div>
            <strong>{clienteActual ? `${clienteActual.nombres} ${clienteActual.apellidos}` : user?.nombre || 'Cliente'}</strong>
            <span>Este pedido se registrará a tu nombre.</span>
          </div>
        </div>
      )}

      <label>Producto</label>
      <select
        className="form-select"
        value={form.idProducto}
        onChange={e => setForm({ ...form, idProducto: e.target.value })}
        required
      >
        {productos.map(p => (
          <option key={p.idProducto} value={p.idProducto}>
            {p.nombre} - S/ {Number(p.precio).toFixed(2)}
          </option>
        ))}
      </select>

      <section className="mubi-smart-size-card">
        <div className="smart-size-head">
          <div>
            <span className="badge-soft">Tallas, nombres y números</span>
            <h4>¿Qué irá en cada polo?</h4>
            <p>
              Agrega una fila por polo. Así el cliente no se pierde y el administrador recibe
              tallas agrupadas y listas para producción.
            </p>
          </div>

          <div className="smart-size-total">
            <span>Total prendas</span>
            <strong>{totalManualTallas || Number(form.cantidad || 1)}</strong>
          </div>
        </div>

        <div className="smart-mode-tabs">
          <button
            type="button"
            className={modoTallas === 'manual' ? 'active' : ''}
            onClick={() => setModoTallas('manual')}
          >
            <i className="bi bi-hand-index-thumb"></i>
            Completar aquí
          </button>

          <button
            type="button"
            className={modoTallas === 'excel' ? 'active' : ''}
            onClick={() => setModoTallas('excel')}
          >
            <i className="bi bi-file-earmark-excel"></i>
            Usar Excel
          </button>
        </div>

        {modoTallas === 'manual' && (
          <>
            <div className="size-chip-row">
              {TALLAS_DISPONIBLES.map(talla => (
                <button
                  key={talla}
                  type="button"
                  onClick={() => agregarFilaTalla(talla)}
                >
                  + {talla}
                </button>
              ))}
            </div>

            <div className="mobile-size-list">
              {filasTallas.map((row, index) => (
                <article className="mobile-size-card" key={row.id}>
                  <div className="mobile-size-title">
                    <strong>Polo #{index + 1}</strong>
                    <button type="button" onClick={() => eliminarFilaTalla(row.id)}>
                      Quitar
                    </button>
                  </div>

                  <div className="mobile-size-grid">
                    <div>
                      <label>Talla</label>
                      <select
                        className="form-select"
                        value={row.talla}
                        onChange={e => actualizarFilaTalla(row.id, 'talla', e.target.value)}
                      >
                        {TALLAS_DISPONIBLES.map(talla => (
                          <option key={talla}>{talla}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label>Número</label>
                      <input
                        className="form-control"
                        value={row.numero}
                        onChange={e => actualizarFilaTalla(row.id, 'numero', e.target.value)}
                        placeholder="10"
                        inputMode="numeric"
                      />
                    </div>

                    <div>
                      <label>Nombre</label>
                      <input
                        className="form-control"
                        value={row.nombre}
                        onChange={e => actualizarFilaTalla(row.id, 'nombre', e.target.value.toUpperCase())}
                        placeholder="Nombre"
                      />
                    </div>

                    <div>
                      <label>Color</label>
                      <input
                        className="form-control"
                        value={row.color}
                        onChange={e => actualizarFilaTalla(row.id, 'color', e.target.value)}
                        placeholder={form.color || 'Negro'}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {getFilasAgrupadasPorTalla().length > 0 && (
              <div className="size-group-summary">
                <strong>Resumen agrupado por talla</strong>

                <div>
                  {getFilasAgrupadasPorTalla().map(group => (
                    <span key={group.talla}>
                      {group.talla}: {group.filas.length}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn btn-outline-dark w-100 mt-2"
              type="button"
              onClick={limpiarFilasManual}
            >
              Reiniciar tallas
            </button>
          </>
        )}

        {modoTallas === 'excel' && (
          <div className="excel-upload-box excel-upload-box-pro">
            <div className="excel-upload-header">
              <div>
                <label>Plantilla Excel para pedidos grupales</label>
                <small>
                  Descárgala, completa una fila por polo y súbela aquí. Ideal para equipos,
                  promociones y colegios.
                </small>
              </div>

              <button
                className="btn btn-outline-dark btn-sm"
                type="button"
                onClick={descargarPlantillaExcel}
              >
                <i className="bi bi-download"></i> Descargar plantilla
              </button>
            </div>

            <input
              className="form-control"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcel}
            />

            {form.archivoExcelTallas && (
              <div className="mt-2 d-flex gap-2 flex-wrap align-items-center">
                <span className="badge-soft">
                  <i className="bi bi-file-earmark-excel"></i> {form.archivoExcelTallas}
                </span>

                <button
                  className="btn btn-sm btn-outline-danger"
                  type="button"
                  onClick={limpiarExcel}
                >
                  Limpiar
                </button>
              </div>
            )}

            {excelPreview.length > 0 && (
              <div className="excel-preview-box">
                <div className="excel-preview-header">
                  <div>
                    <strong>Vista previa agrupada</strong>
                    <span>{excelPreview.length} polo(s) detectado(s)</span>
                  </div>

                  <button
                    className={`btn btn-sm ${excelConfirmado ? 'btn-primary' : 'btn-outline-dark'}`}
                    type="button"
                    onClick={() => setExcelConfirmado(true)}
                  >
                    {excelConfirmado ? 'Datos confirmados' : 'Confirmar datos'}
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table align-middle excel-preview-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Talla</th>
                        <th>Nombre</th>
                        <th>Número</th>
                        <th>Color</th>
                      </tr>
                    </thead>

                    <tbody>
                      {excelPreview.map(row => (
                        <tr key={row.id}>
                          <td>{row.id}</td>
                          <td>{row.talla || '-'}</td>
                          <td>{row.nombre || '-'}</td>
                          <td>{row.numero || '-'}</td>
                          <td>{row.color || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!excelConfirmado && (
                  <small className="excel-warning">
                    Revisa los datos y presiona “Confirmar datos” antes de enviar el pedido.
                  </small>
                )}
              </div>
            )}
          </div>
        )}

        <div className="simple-form-grid mt-3">
          <div>
            <label>Color general</label>
            <input
              className="form-control"
              value={form.color}
              onChange={e => setForm({ ...form, color: e.target.value })}
              placeholder="Ejemplo: negro, blanco, azul..."
            />
          </div>

          <div>
            <label>Cantidad manual rápida</label>
            <input
              className="form-control"
              type="number"
              min="1"
              value={form.cantidad}
              onChange={e => setForm({ ...form, cantidad: e.target.value })}
            />
          </div>
        </div>
      </section>

      <div className="simple-form-grid">
        <div>
          <label>Tipo de acabado</label>
          <select
            className="form-select"
            value={form.tipoDiseno}
            onChange={e => setForm({ ...form, tipoDiseno: e.target.value })}
          >
            <option>Sublimado</option>
            <option>Vinil textil</option>
            <option>Bordado</option>
            <option>Estampado simple</option>
          </select>
        </div>

        <div>
          <label>¿Dónde irá el diseño?</label>
          <select
            className="form-select"
            value={form.ubicacionDiseno}
            onChange={e => setForm({ ...form, ubicacionDiseno: e.target.value })}
          >
            <option>Frente</option>
            <option>Espalda</option>
            <option>Pecho izquierdo</option>
            <option>Manga</option>
            <option>Frente y espalda</option>
          </select>
        </div>
      </div>

      <div className="client-upload-area">
        <div>
          <label>Diseño frontal</label>
          <input
            className="form-control"
            type="file"
            accept="image/*"
            onChange={e => handleArchivo(e, 'frente')}
          />

          {previewFrente && (
            <div className="design-preview mt-3">
              <span className="preview-label">Vista frontal</span>
              <img src={previewFrente} alt="Vista previa del diseño frontal" />
              <small>{form.archivoDisenoFrente}</small>
            </div>
          )}
        </div>

        <div>
          <label>Diseño posterior</label>
          <input
            className="form-control"
            type="file"
            accept="image/*"
            onChange={e => handleArchivo(e, 'espalda')}
          />

          {previewEspalda && (
            <div className="design-preview mt-3">
              <span className="preview-label">Vista posterior</span>
              <img src={previewEspalda} alt="Vista previa del diseño posterior" />
              <small>{form.archivoDisenoEspalda}</small>
            </div>
          )}
        </div>
      </div>

      <label>Cuéntanos cómo quieres tu polo</label>
      <textarea
        className="form-control"
        rows="3"
        value={form.descripcionDiseno}
        onChange={e => setForm({ ...form, descripcionDiseno: e.target.value })}
        placeholder="Ejemplo: logo al frente, nombre atrás, colores, frase, temática o referencia..."
      ></textarea>

      <div className="summary-box">
        Total estimado: <strong>S/ {total.toFixed(2)}</strong>
      </div>

      <button className="btn btn-primary w-100 mt-3" type="submit">
        {modoCliente ? 'Enviar pedido fácil para revisión' : 'Guardar pedido'}
      </button>
    </form>
  );

  const ModalDetalle = () => {
    if (!pedidoSeleccionado) return null;

    return (
      <div className="modal-backdrop-custom">
        <div className="pedido-modal">
          <div className="pedido-modal-header">
            <div>
              <span className="badge-soft">Detalle del pedido</span>
              <h3>Pedido #{pedidoSeleccionado.idPedido}</h3>
              <p>{pedidoSeleccionado.cliente || `Cliente #${pedidoSeleccionado.idCliente}`}</p>

              {pedidoSeleccionado.rutaExcelTallas && (
                <a
                  className="btn btn-sm btn-outline-dark excel-download-btn"
                  href={`${API_BASE_URL}${pedidoSeleccionado.rutaExcelTallas}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <i className="bi bi-file-earmark-excel"></i>
                  Descargar Excel de tallas
                </a>
              )}
            </div>

            <button
              className="btn btn-sm btn-outline-danger"
              type="button"
              onClick={() => setPedidoSeleccionado(null)}
            >
              Cerrar
            </button>
          </div>

          <TrackingPedido estado={pedidoSeleccionado.estadoPedido} />

          {(() => {
            const datos = getDatosCheckoutPedido(pedidoSeleccionado);
            const tieneEntrega = datos.telefono || datos.direccion || datos.referencia;
            const tieneComprobante = datos.tipoComprobante || datos.dni || datos.ruc || datos.razonSocial;

            return (
              <>
                <div className="pedido-detail-grid mt-3">
                  <div>
                    <strong>Estado</strong>
                    <p>{pedidoSeleccionado.estadoPedido}</p>
                  </div>

                  <div>
                    <strong>Total</strong>
                    <p>S/ {Number(pedidoSeleccionado.montoTotal || 0).toFixed(2)}</p>
                  </div>

                  <div>
                    <strong>Saldo</strong>
                    <p>S/ {Number(pedidoSeleccionado.saldoPendiente || 0).toFixed(2)}</p>
                  </div>

                  <div>
                    <strong>Cliente</strong>
                    <p>{pedidoSeleccionado.cliente || `Cliente #${pedidoSeleccionado.idCliente}`}</p>
                  </div>
                </div>

                {(tieneEntrega || tieneComprobante) && (
                  <div className="pedido-checkout-admin">
                    {tieneEntrega && (
                      <div className="pedido-checkout-card">
                        <span className="badge-soft">Datos de entrega</span>
                        <h4>Información del cliente</h4>

                        <div className="pedido-checkout-list">
                          <p><strong>Teléfono:</strong> {datos.telefono || 'No registrado'}</p>
                          <p><strong>Dirección:</strong> {datos.direccion || 'No registrada'}</p>
                          <p><strong>Referencia:</strong> {datos.referencia || 'No registrada'}</p>
                        </div>
                      </div>
                    )}

                    {tieneComprobante && (
                      <div className="pedido-checkout-card">
                        <span className="badge-soft">Comprobante solicitado</span>
                        <h4>{datos.tipoComprobante || 'No indicado'}</h4>

                        <div className="pedido-checkout-list">
                          {datos.tipoComprobante?.toLowerCase() === 'factura' ? (
                            <>
                              <p><strong>RUC:</strong> {datos.ruc || 'No registrado'}</p>
                              <p><strong>Razón social:</strong> {datos.razonSocial || 'No registrada'}</p>
                            </>
                          ) : (
                            <p><strong>DNI:</strong> {datos.dni || 'No registrado'}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pedido-observacion-box">
                  <strong>Observaciones generales</strong>
                  <p>{pedidoSeleccionado.observaciones || 'Sin observaciones'}</p>
                </div>
              </>
            );
          })()}

          {pedidoSeleccionado.detalles?.map((d, index) => (
            <div className="pedido-detail-card" key={index}>
              <h4>{d.producto || `Producto #${d.idProducto}`}</h4>

              <p>
                <strong>Talla:</strong> {d.talla} | <strong>Color:</strong> {d.color} | <strong>Cantidad:</strong> {d.cantidad}
              </p>

              <p>
                <strong>Diseño:</strong> {d.descripcionDiseno || 'Sin descripción'}
              </p>

              <div className="modal-design-grid">
                {d.rutaDisenoFrontal && (
                  <a href={`${API_BASE_URL}${d.rutaDisenoFrontal}`} target="_blank" rel="noreferrer">
                    <img src={`${API_BASE_URL}${d.rutaDisenoFrontal}`} alt="Diseño frontal" />
                    <span>Ver diseño frontal</span>
                  </a>
                )}

                {d.rutaDisenoPosterior && (
                  <a href={`${API_BASE_URL}${d.rutaDisenoPosterior}`} target="_blank" rel="noreferrer">
                    <img src={`${API_BASE_URL}${d.rutaDisenoPosterior}`} alt="Diseño posterior" />
                    <span>Ver diseño posterior</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isCliente && !isPedidoPersonalizado) {
    return (
      <div className="fade-in client-orders-page">
        <section className="client-orders-hero">
          <div>
            <span className="badge-soft">Área del cliente</span>
            <h2>Mis pedidos</h2>
            <p>
              Revisa el avance de tus pedidos, diseños enviados, pagos y estado de entrega.
            </p>
          </div>

          <Link className="btn btn-primary" to="/pedido-personalizado">
            <i className="bi bi-plus-circle"></i> Hacer nuevo pedido
          </Link>
        </section>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <div className="client-orders-grid">
          {pedidosCliente.map(p => {
            const estadoInfo = getEstadoInfo(p.estadoPedido);
            const comprobantePedido = getComprobantePedido(p.idPedido);

            return (
              <article className="client-order-card" key={p.idPedido}>
                <div className="client-order-top">
                  <div>
                    <span className="client-order-number">Pedido #{p.idPedido}</span>
                    <h3>{estadoInfo.titulo}</h3>
                    <p>{estadoInfo.texto}</p>
                  </div>

                  <span className={`status-pill status-${String(p.estadoPedido).toLowerCase()}`}>
                    {p.estadoPedido}
                  </span>
                </div>

                <div className="client-order-track">
                  <TrackingPedido estado={p.estadoPedido} />
                </div>

                <div className="client-order-summary">
                  <div>
                    <span>Total</span>
                    <strong>S/ {Number(p.montoTotal || 0).toFixed(2)}</strong>
                  </div>

                  <div>
                    <span>Saldo</span>
                    <strong>S/ {Number(p.saldoPendiente || 0).toFixed(2)}</strong>
                  </div>

                  <div>
                    <span>Cliente</span>
                    <strong>{p.cliente || `Cliente #${p.idCliente}`}</strong>
                  </div>
                </div>

                <div className="client-order-assets">
                  {p.rutaExcelTallas && (
                    <a
                      href={`${API_BASE_URL}${p.rutaExcelTallas}`}
                      target="_blank"
                      rel="noreferrer"
                      className="excel-download-btn"
                    >
                      <i className="bi bi-file-earmark-excel"></i>
                      Excel de tallas
                    </a>
                  )}

                  {p.detalles?.map((d, index) => (
                    <div key={index} className="d-flex gap-2 flex-wrap">
                      {d.rutaDisenoFrontal && (
                        <a
                          href={`${API_BASE_URL}${d.rutaDisenoFrontal}`}
                          target="_blank"
                          rel="noreferrer"
                          className="design-thumb"
                        >
                          <img src={`${API_BASE_URL}${d.rutaDisenoFrontal}`} alt="Diseño frontal" />
                          <span>Frente</span>
                        </a>
                      )}

                      {d.rutaDisenoPosterior && (
                        <a
                          href={`${API_BASE_URL}${d.rutaDisenoPosterior}`}
                          target="_blank"
                          rel="noreferrer"
                          className="design-thumb"
                        >
                          <img src={`${API_BASE_URL}${d.rutaDisenoPosterior}`} alt="Diseño posterior" />
                          <span>Espalda</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                <div className="client-order-actions">
                  <button
                    className="btn btn-outline-dark"
                    type="button"
                    onClick={() => setPedidoSeleccionado(p)}
                  >
                    Ver detalle
                  </button>

                  {comprobantePedido ? (
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => imprimirComprobante(comprobantePedido)}
                    >
                      <i className="bi bi-receipt"></i> Ver comprobante
                    </button>
                  ) : (
                    <span className="client-order-note">
                      {String(p.estadoPedido).toLowerCase() === 'pagado'
                        ? 'Comprobante pendiente de emisión'
                        : 'Comprobante disponible al finalizar el pago'}
                    </span>
                  )}
                </div>
              </article>
            );
          })}

          {!pedidosCliente.length && (
            <div className="empty-state panel-card">
              <i className="bi bi-bag-heart"></i>
              <h4>Aún no tienes pedidos</h4>
              <p>Cuando realices un pedido, podrás revisar aquí su avance.</p>

              <Link className="btn btn-primary" to="/pedido-personalizado">
                Hacer mi primer pedido
              </Link>
            </div>
          )}
        </div>

        <ModalDetalle />
      </div>
    );
  }

  if (isCliente && isPedidoPersonalizado) {
    return (
      <div className="fade-in client-create-order-page">
        <section className="client-orders-hero">
          <div>
            <span className="badge-soft">Pedido personalizado</span>
            <h2>Haz tu pedido en pocos pasos</h2>
            <p>
              Selecciona el producto, sube tus diseños y agrega una descripción clara.
              MUBI revisará la información antes de confirmar.
            </p>
          </div>

          <Link className="btn btn-outline-dark" to="/pedidos">
            Ver mis pedidos
          </Link>
        </section>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <div className="client-order-layout">
          <FormularioPedido modoCliente />

          <aside className="client-order-help panel-card">
            <h4>Consejos para enviar tu pedido</h4>

            <ul className="check-list">
              <li>Sube el diseño frontal si irá en la parte delantera.</li>
              <li>Sube el diseño posterior si llevará nombre, número o frase.</li>
              <li>Usa el Excel si tienes varias tallas, nombres o números.</li>
              <li>Describe colores, temática y detalles importantes.</li>
            </ul>
          </aside>
        </div>

        <ModalDetalle />
      </div>
    );
  }

  return (
    <div className="fade-in admin-management-page admin-orders-page">
      <PageHeader
        icon="bi-clipboard-check-fill"
        title="Cola operativa de pedidos"
        subtitle="Vista de despacho para revisar pedidos por orden de llegada, priorizar pendientes y actualizar estados."
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="admin-stats-grid">
        <article className="report-card">
          <span>Pedidos pendientes</span>
          <strong>{pedidosPendientes}</strong>
          <p>En cola de revisión.</p>
        </article>

        <article className="report-card">
          <span>Confirmados</span>
          <strong>{pedidosConfirmados}</strong>
          <p>Listos para pago o producción.</p>
        </article>

        <article className="report-card">
          <span>En producción</span>
          <strong>{pedidosProduccion}</strong>
          <p>Trabajos activos.</p>
        </article>

        <article className="report-card">
          <span>Entregados</span>
          <strong>{pedidosEntregados}</strong>
          <p>Pedidos finalizados.</p>
        </article>
      </div>

      {siguientePedido ? (
        <section className="next-order-card panel-card">
          <div className="next-order-main">
            <span className="badge-soft">Siguiente pedido FIFO</span>
            <h3>Pedido #{siguientePedido.idPedido}</h3>
            <p>
              Debe revisarse primero porque es el pedido pendiente más antiguo registrado en la cola.
            </p>

            <div className="next-order-meta">
              <div>
                <strong>Cliente</strong>
                <span>{siguientePedido.cliente || `Cliente #${siguientePedido.idCliente}`}</span>
              </div>

              <div>
                <strong>Total</strong>
                <span>S/ {Number(siguientePedido.montoTotal || 0).toFixed(2)}</span>
              </div>

              <div>
                <strong>Fecha</strong>
                <span>{siguientePedido.fechaPedido ? new Date(siguientePedido.fechaPedido).toLocaleString() : 'Sin fecha'}</span>
              </div>
            </div>
          </div>

          <div className="next-order-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setPedidoSeleccionado(siguientePedido)}
            >
              <i className="bi bi-eye"></i> Revisar ahora
            </button>

            <button
              className="btn btn-outline-dark"
              type="button"
              onClick={() => updateEstado(siguientePedido, 'confirmado')}
            >
              <i className="bi bi-check2-circle"></i> Confirmar pedido
            </button>
          </div>
        </section>
      ) : (
        <section className="next-order-card panel-card empty-next-order">
          <i className="bi bi-check2-circle"></i>
          <div>
            <span className="badge-soft">Cola limpia</span>
            <h3>No hay pedidos pendientes</h3>
            <p>Cuando un cliente confirme un pedido desde la web, aparecerá aquí automáticamente.</p>
          </div>
        </section>
      )}

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="panel-card admin-list-panel">
            <div className="admin-list-header">
              <div>
                <h4>Cola de trabajo FIFO</h4>
                <p>Ordenada del pedido más antiguo al más reciente.</p>
              </div>

              <button className="btn btn-outline-dark" type="button" onClick={load}>
                <i className="bi bi-arrow-clockwise"></i> Actualizar
              </button>
            </div>

            <div className="fifo-list">
              {colaPendiente.map((p, index) => (
                <article
                  key={p.idPedido}
                  className={`fifo-item ${index === 0 ? 'urgent' : ''}`}
                >
                  <div className="fifo-index">{index + 1}</div>

                  <div className="fifo-content">
                    <strong>Pedido #{p.idPedido}</strong>
                    <span>{p.cliente || `Cliente #${p.idCliente}`}</span>
                    <small>
                      {p.fechaPedido ? new Date(p.fechaPedido).toLocaleString() : 'Sin fecha'} · S/ {Number(p.montoTotal || 0).toFixed(2)}
                    </small>
                  </div>

                  <div className="fifo-actions">
                    {index === 0 && <span className="badge-soft">Siguiente</span>}
                    <button
                      className="btn btn-sm btn-outline-dark"
                      type="button"
                      onClick={() => setPedidoSeleccionado(p)}
                    >
                      Ver
                    </button>
                  </div>
                </article>
              ))}

              {!colaPendiente.length && (
                <div className="fifo-empty">
                  <i className="bi bi-inbox"></i>
                  <strong>No hay pedidos pendientes.</strong>
                  <span>La cola se llenará cuando lleguen nuevos pedidos.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="panel-card admin-list-panel">
            <div className="admin-list-header">
              <div>
                <h4>Historial operativo</h4>
                <p>Seguimiento general de pedidos, estados, pagos y diseños enviados.</p>
              </div>
            </div>

            <div className="table-responsive admin-dark-table-wrap">
              <table className="table align-middle admin-dark-table admin-orders-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Saldo</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {pedidosHistorial.map(p => (
                    <tr key={p.idPedido}>
                      <td>
                        <strong>#{p.idPedido}</strong>
                        <small>{p.fechaPedido ? new Date(p.fechaPedido).toLocaleDateString() : 'Sin fecha'}</small>

                        {p.rutaExcelTallas && (
                          <a
                            href={`${API_BASE_URL}${p.rutaExcelTallas}`}
                            target="_blank"
                            rel="noreferrer"
                            className="excel-download-btn mt-2"
                          >
                            <i className="bi bi-file-earmark-excel"></i>
                            Excel tallas
                          </a>
                        )}
                      </td>

                      <td>
                        <strong>{p.cliente || `Cliente #${p.idCliente}`}</strong>

                        {p.detalles?.some(d => d.rutaDisenoFrontal || d.rutaDisenoPosterior) && (
                          <small>Diseños adjuntos disponibles</small>
                        )}
                      </td>

                      <td>
                        <span className={`status-pill status-${String(p.estadoPedido || '').toLowerCase()}`}>
                          {p.estadoPedido}
                        </span>
                        <TrackingPedido estado={p.estadoPedido} />
                      </td>

                      <td>S/ {Number(p.montoTotal || 0).toFixed(2)}</td>
                      <td>S/ {Number(p.saldoPendiente || 0).toFixed(2)}</td>

                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-sm btn-outline-dark"
                            type="button"
                            onClick={() => setPedidoSeleccionado(p)}
                          >
                            Detalle
                          </button>

                          <select
                            className="form-select form-select-sm"
                            value={p.estadoPedido}
                            onChange={e => updateEstado(p, e.target.value)}
                          >
                            <option value="pendiente">pendiente</option>
                            <option value="confirmado">confirmado</option>
                            <option value="pagado">pagado</option>
                            <option value="en_proceso">en proceso</option>
                            <option value="entregado">entregado</option>
                            <option value="cancelado">cancelado</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!pedidosHistorial.length && (
                    <tr>
                      <td colSpan="6">No hay pedidos registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <ModalDetalle />
    </div>
  );
}
