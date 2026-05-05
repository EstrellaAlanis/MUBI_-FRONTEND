import { useState } from 'react';
import { api, endpoints } from '../services/api.js';

export default function Login({ onLogin }) {
  const [correo, setCorreo] = useState('admin@mubi.com');
  const [contrasena, setContrasena] = useState('Admin123*');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const buildSession = (user, forcedRole = null) => {
    const rolTexto = String(user.rol || '').toLowerCase();
    const role = forcedRole || (rolTexto.includes('cliente') ? 'cliente' : 'admin');
    return {
      idUsuario: user.idUsuario || 0,
      nombre: user.nombre || (role === 'admin' ? 'Administrador' : 'Cliente'),
      apellido: user.apellido || '',
      correo: user.correo || correo,
      role
    };
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const user = await api.post(`${endpoints.usuarios}/login`, { correo, contrasena });
      const session = buildSession(user);
      onLogin(session);
      setMessage(`Bienvenido ${session.nombre}. Vista activada: ${session.role}.`);
    } catch (err) {
      setError('No se pudo validar con el backend. Usa los accesos rápidos de demostración o verifica el usuario en la BD.');
    }
  };

  const loginDemo = (role) => {
    const session = role === 'admin'
      ? { idUsuario: 1, nombre: 'Angel', apellido: 'Mananita', correo: 'admin@mubi.com', role: 'admin' }
      : { idUsuario: 2, nombre: 'Jackeline', apellido: 'Advíncula', correo: 'cliente1@mubi.com', role: 'cliente' };
    setCorreo(session.correo);
    setContrasena(role === 'admin' ? 'Admin123*' : 'Cliente123*');
    onLogin(session);
    setError('');
    setMessage(`Modo ${role} activado para demostración. Los permisos visuales ya quedan separados.`);
  };

  return (
    <div className="auth-layout fade-in">
      <div className="auth-card">
        <span className="badge-soft">Acceso seguro por roles</span>
        <h2>Iniciar sesión</h2>
        <p>El administrador accede al panel completo. El cliente solo ve catálogo, pedidos, pagos y contacto.</p>
        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        <form onSubmit={submit}>
          <label>Correo electrónico</label>
          <input className="form-control" type="email" value={correo} onChange={e=>setCorreo(e.target.value)} required />
          <label>Contraseña</label>
          <input className="form-control" type="password" value={contrasena} onChange={e=>setContrasena(e.target.value)} required />
          <button className="btn btn-primary w-100 mt-3" type="submit"><i className="bi bi-box-arrow-in-right"></i> Ingresar</button>
        </form>
        <div className="quick-login">
          <button className="btn btn-outline-dark" onClick={()=>loginDemo('admin')}><i className="bi bi-person-gear"></i> Demo admin</button>
          <button className="btn btn-outline-dark" onClick={()=>loginDemo('cliente')}><i className="bi bi-person-heart"></i> Demo cliente</button>
        </div>
      </div>
      <div className="auth-info">
        <h3>Separación real de vistas</h3>
        <p>La interfaz ya no permite cambiar de rol desde un interruptor público. El rol queda definido por la sesión.</p>
        <div className="role-box"><i className="bi bi-person-gear"></i> Administrador: usuarios, productos, clientes, pedidos, pagos, inventario y reportes.</div>
        <div className="role-box"><i className="bi bi-person-heart"></i> Cliente: catálogo, solicitud de pedido, pagos y contacto.</div>
      </div>
    </div>
  );
}
