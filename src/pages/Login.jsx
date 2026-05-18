import { useState } from 'react';
import { api, endpoints } from '../services/api.js';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase.js';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const loginGoogle = async () => {
  try {
    setError('');
    setMessage('');

    const result = await signInWithPopup(auth, googleProvider);
    const googleUser = result.user;

    setRegistro(prev => ({
      ...prev,
      nombres: googleUser.displayName?.split(' ')[0] || '',
      apellidos: googleUser.displayName?.split(' ').slice(1).join(' ') || '',
      correo: googleUser.email || '',
      contrasena: 'Google123*'
    }));

    setModo('registro');
    setMessage('Gmail validado correctamente. Ahora completa tu DNI, teléfono y dirección para crear tu cuenta en MUBI.');
  } catch (err) {
    console.error(err);
    setError('No se pudo iniciar sesión con Google.');
  }
};
  const [modo, setModo] = useState('login');
  const [correo, setCorreo] = useState('admin@mubi.com');
  const [contrasena, setContrasena] = useState('Admin123*');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [registro, setRegistro] = useState({
  nombres: '',
  apellidos: '',
  correo: '',
  telefono: '',
  direccion: '',
  referenciaDireccion: '',
  tipoCliente: 'persona',
  ruc: '',
  razonSocial: '',
  documentoIdentidad: '',
  contrasena: ''
});

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
      // setMessage(`Bienvenido ${session.nombre}. Vista activada: ${session.role}.`);
      navigate('/');
    } catch (err) {
      setError('No se pudo validar con el backend. Verifica el correo, contraseña o el usuario en la BD.');
    }
  };

  const registrarCliente = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      await api.post(endpoints.clientes, {
      nombres: registro.nombres,
      apellidos: registro.apellidos,
      correo: registro.correo,
      telefono: registro.telefono,
      direccion: registro.direccion,
      referenciaDireccion: registro.referenciaDireccion,
      tipoCliente: registro.tipoCliente,
      ruc: registro.tipoCliente === 'empresa' ? registro.ruc : '',
      razonSocial: registro.tipoCliente === 'empresa' ? registro.razonSocial : '',
      documentoIdentidad: registro.documentoIdentidad,
      contrasena: registro.contrasena,
    });

      setMessage('Cuenta de cliente registrada correctamente. Ahora puedes iniciar sesión o continuar tu pedido.');
      setModo('login');
      setCorreo(registro.correo);
      setContrasena('');
    } catch (err) {
      setError('No se pudo registrar el cliente. Verifica los datos o revisa si el correo ya existe.');
    }
  };
  const consultarDni = async () => {
  setError('');
  setMessage('');

  try {
    if (!registro.documentoIdentidad || registro.documentoIdentidad.length !== 8) {
      setError('Ingresa un DNI válido de 8 dígitos.');
      return;
    }

    const data = await api.get(`${endpoints.clientes}/consultar-dni/${registro.documentoIdentidad}`);

    if (!data.encontrado) {
      setError('No se encontraron datos para ese DNI.');
      return;
    }

    setRegistro(prev => ({
      ...prev,
      nombres: data.nombres || prev.nombres,
      apellidos: data.apellidos || prev.apellidos
    }));

    setMessage('Datos del DNI cargados correctamente.');
  } catch (err) {
    setError('No se pudo consultar el DNI.');
  }
};

  const loginDemo = (role) => {
    const session = role === 'admin'
      ? { idUsuario: 1, nombre: 'Angel', apellido: 'Mananita', correo: 'admin@mubi.com', role: 'admin' }
      : { idUsuario: 2, nombre: 'Jackeline', apellido: 'Advíncula', correo: 'cliente1@mubi.com', role: 'cliente' };

    setCorreo(session.correo);
    setContrasena(role === 'admin' ? 'Admin123*' : 'Cliente123*');
    onLogin(session);
    // setError('');
    // setMessage(`Modo ${role} activado para demostración.`);
    navigate('/');
  };

  const loginGoogleDemo = () => {
    const session = {
      idUsuario: 0,
      nombre: 'Cliente Google',
      apellido: '',
      correo: 'cliente.google@gmail.com',
      role: 'cliente'
    };

    onLogin(session);
    // setError('');
    // setMessage('Ingreso con Gmail simulado. Más adelante se conecta con Firebase o Google OAuth.');
    navigate('/');
  };

  return (
    <div className="login-screen fade-in">
      <section className="login-brand-panel">
        <div className="login-logo-wrap">
          <div className="login-logo-icon">M</div>
          <div>
            <h1>MUBI</h1>
            <span>Custom Wear</span>
          </div>
        </div>

        <h2>Polos sublimados y personalizados para cada estilo.</h2>
        <p>
          Gestiona clientes, pedidos, pagos, diseños e inventario desde una sola
          plataforma web moderna.
        </p>

        <div className="login-benefits">
          <div>
            <i className="bi bi-bag-heart"></i>
            Catálogo visual
          </div>
          <div>
            <i className="bi bi-brush"></i>
            Envío de diseños
          </div>
          <div>
            <i className="bi bi-shield-check"></i>
            Acceso por roles
          </div>
        </div>
      </section>

      <section className="login-card-panel">
        <div className="login-card">
          <span className="badge-soft">
            {modo === 'login' ? 'Acceso seguro' : 'Registro de cliente'}
          </span>

          <h2>{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta cliente'}</h2>

          <p className="login-subtitle">
            {modo === 'login'
              ? 'Ingresa con tu cuenta para continuar con tus pedidos o administrar MUBI.'
              : 'Registra tus datos para poder realizar pedidos personalizados.'}
          </p>

          {error && <div className="alert alert-danger">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          {modo === 'login' ? (
            <form onSubmit={submit}>
              <label>Correo electrónico</label>
              <input
                className="form-control"
                type="email"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                required
              />

              <label>Contraseña</label>
              <input
                className="form-control"
                type="password"
                value={contrasena}
                onChange={e => setContrasena(e.target.value)}
                required
              />

              <button className="btn btn-primary w-100 mt-3" type="submit">
                <i className="bi bi-box-arrow-in-right"></i> Acceder
              </button>

              <button className="btn btn-google w-100 mt-3" type="button" onClick={loginGoogle}>
                <i className="bi bi-google"></i> Continuar con Gmail
              </button>
            </form>
          ) : (
            <form onSubmit={registrarCliente}>
              <div className="login-form-grid">
                <div>
                  <label>Nombres</label>
                  <input
                    className="form-control"
                    value={registro.nombres}
                    onChange={e => setRegistro({ ...registro, nombres: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label>Apellidos</label>
                  <input
                    className="form-control"
                    value={registro.apellidos}
                    onChange={e => setRegistro({ ...registro, apellidos: e.target.value })}
                    required
                  />
                </div>
              </div>

              <label>Correo electrónico</label>
              <input
                className="form-control"
                type="email"
                value={registro.correo}
                onChange={e => setRegistro({ ...registro, correo: e.target.value })}
                required
              />

              <div className="login-form-grid">
                <div>
                  <label>Teléfono</label>
                  <input
                    className="form-control"
                    value={registro.telefono}
                    onChange={e => setRegistro({ ...registro, telefono: e.target.value })}
                  />
                </div>

                <div>
                  <label>DNI</label>
                  <div className="input-action">
                    <input
                      className="form-control"
                      value={registro.documentoIdentidad}
                      maxLength="8"
                      onChange={e => setRegistro({
                        ...registro,
                        documentoIdentidad: e.target.value.replace(/\D/g, '')
                      })}
                    />
                    <button
                      className="btn btn-outline-dark"
                      type="button"
                      onClick={consultarDni}
                    >
                      Buscar
                    </button>
                  </div>
                </div>
              </div>

              <label>Dirección</label>
              <input
                className="form-control"
                value={registro.direccion}
                onChange={e => setRegistro({ ...registro, direccion: e.target.value })}
              />
              <label>Referencia de dirección</label>
                <input
                  className="form-control"
                  value={registro.referenciaDireccion}
                  onChange={e => setRegistro({ ...registro, referenciaDireccion: e.target.value })}
                  placeholder="Ejemplo: frente al parque, casa verde, segundo piso..."
                />

                <label>Tipo de cliente</label>
                <select
                  className="form-select"
                  value={registro.tipoCliente}
                  onChange={e => setRegistro({ ...registro, tipoCliente: e.target.value })}
                >
                  <option value="persona">Persona natural</option>
                  <option value="empresa">Empresa</option>
                </select>

                {registro.tipoCliente === 'empresa' && (
                  <>
                    <div className="login-form-grid">
                      <div>
                        <label>RUC</label>
                        <input
                          className="form-control"
                          value={registro.ruc}
                          maxLength="11"
                          onChange={e => setRegistro({
                            ...registro,
                            ruc: e.target.value.replace(/\D/g, '')
                          })}
                          placeholder="11 dígitos"
                        />
                      </div>

                      <div>
                        <label>Razón social</label>
                        <input
                          className="form-control"
                          value={registro.razonSocial}
                          onChange={e => setRegistro({ ...registro, razonSocial: e.target.value })}
                          placeholder="Nombre legal de la empresa"
                        />
                      </div>
                    </div>
                  </>
                )}
              <label>Contraseña</label>
              <input
                className="form-control"
                type="password"
                value={registro.contrasena}
                onChange={e => setRegistro({ ...registro, contrasena: e.target.value })}
                placeholder="Se conectará al login real más adelante"
              />

              <button className="btn btn-primary w-100 mt-3" type="submit">
                <i className="bi bi-person-plus"></i> Crear cuenta
              </button>
            </form>
          )}

          <div className="login-switch">
            {modo === 'login' ? (
              <>
                <span>¿No tienes cuenta?</span>
                <button type="button" onClick={() => setModo('registro')}>
                  Crear cuenta cliente
                </button>
              </>
            ) : (
              <>
                <span>¿Ya tienes cuenta?</span>
                <button type="button" onClick={() => setModo('login')}>
                  Iniciar sesión
                </button>
              </>
            )}
          </div>

          <div className="quick-login">
            <button className="btn btn-outline-dark" onClick={() => loginDemo('admin')}>
              <i className="bi bi-person-gear"></i> Demo admin
            </button>
            <button className="btn btn-outline-dark" onClick={() => loginDemo('cliente')}>
              <i className="bi bi-person-heart"></i> Demo cliente
            </button>
          </div>

          <Link className="guest-link" to="/">
            Continuar como invitado
          </Link>
        </div>
      </section>
    </div>
  );
}