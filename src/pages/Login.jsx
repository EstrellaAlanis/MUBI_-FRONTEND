import { useState } from 'react';
import { api, endpoints } from '../services/api.js';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase.js';

export default function Login({ onLogin }) {
  const navigate = useNavigate();

  const navigateAfterLogin = () => {
    const redirect = localStorage.getItem('redirectAfterLogin') || '/';
    localStorage.removeItem('redirectAfterLogin');
    navigate(redirect);
  };

  const [modo, setModo] = useState('login');

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [codigoLogin, setCodigoLogin] = useState('');
  const [codigoLoginEnviado, setCodigoLoginEnviado] = useState(false);

  const [googlePendiente, setGooglePendiente] = useState(null);
  const [codigoGoogle, setCodigoGoogle] = useState('');
  const [codigoGoogleEnviado, setCodigoGoogleEnviado] = useState(false);

  const [codigoRegistro, setCodigoRegistro] = useState('');
  const [codigoRegistroEnviado, setCodigoRegistroEnviado] = useState(false);
  const [registroVerificado, setRegistroVerificado] = useState(false);

  const [recuperacionCorreo, setRecuperacionCorreo] = useState('');
  const [recuperacionCodigo, setRecuperacionCodigo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [codigoRecuperacionEnviado, setCodigoRecuperacionEnviado] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Procesando solicitud');

  const [registro, setRegistro] = useState({
    nombres: '',
    apellidos: '',
    correo: '',
    contrasena: ''
  });

  const buildSession = (user, forcedRole = null) => {
    const data = user?.usuario || user;
    const rolTexto = String(data?.rol || data?.role || '').toLowerCase();

    const role = forcedRole || (rolTexto.includes('cliente') ? 'cliente' : 'admin');

    return {
      idUsuario: data?.idUsuario || 0,
      nombre: data?.nombre || data?.nombres || (role === 'admin' ? 'Administrador' : 'Cliente'),
      apellido: data?.apellido || data?.apellidos || '',
      correo: data?.correo || correo,
      role,
      token: data?.token || user?.token || ''
    };
  };

  const resetMessages = () => {
    setError('');
    setMessage('');
  };


  const validarContrasenaSegura = (value) => {
    if (!value) return 'La contraseña es obligatoria.';
    if (value.length < 8 || value.length > 20) return 'La contraseña debe tener entre 8 y 20 caracteres.';
    if (!/[A-Z]/.test(value)) return 'La contraseña debe incluir al menos una mayúscula.';
    if (!/[a-z]/.test(value)) return 'La contraseña debe incluir al menos una minúscula.';
    if (!/[0-9]/.test(value)) return 'La contraseña debe incluir al menos un número.';
    if (!/[^a-zA-Z0-9]/.test(value)) return 'La contraseña debe incluir al menos un carácter especial.';
    return '';
  };

  const abrirRecuperacion = () => {
    const correoBase = correo || registro.correo || '';
    cambiarModo('recuperacion');
    setRecuperacionCorreo(correoBase);
  };

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    resetMessages();

    setCodigoLogin('');
    setCodigoLoginEnviado(false);

    setCodigoGoogle('');
    setCodigoGoogleEnviado(false);
    setGooglePendiente(null);

    setCodigoRegistro('');
    setCodigoRegistroEnviado(false);
    setRegistroVerificado(false);

    setRecuperacionCorreo('');
    setRecuperacionCodigo('');
    setNuevaContrasena('');
    setCodigoRecuperacionEnviado(false);
  };

  const enviarCodigoLogin = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!correo || !contrasena) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    setLoadingText('Enviando código de acceso');
    setLoading(true);

    try {
      await api.post(`${endpoints.usuarios}/login/enviar-codigo`, {
        correo,
        contrasena
      });

      setCodigoLoginEnviado(true);
      setMessage('Código enviado a tu correo. Revísalo e ingrésalo para continuar.');
    } catch (err) {
      setError(err.message || 'No se pudo enviar el código. Verifica correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const verificarCodigoLogin = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!codigoLogin || codigoLogin.length !== 6) {
      setError('Ingresa el código de 6 dígitos.');
      return;
    }

    setLoadingText('Validando código de acceso');
    setLoading(true);

    try {
      const user = await api.post(`${endpoints.usuarios}/login/verificar-codigo`, {
        correo,
        codigo: codigoLogin
      });

      const session = buildSession(user);
      onLogin(session);
      navigateAfterLogin();
    } catch (err) {
      setError(err.message || 'Código inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  const iniciarGoogleConCodigo = async () => {
    resetMessages();
    setLoadingText('Validando cuenta de Google');
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;

      const correoGoogle = googleUser.email || '';

      if (!correoGoogle) {
        throw new Error('Google no devolvió un correo válido.');
      }

      const partesNombre = (googleUser.displayName || 'Cliente MUBI').trim().split(' ');
      const nombres = partesNombre.slice(0, 2).join(' ') || 'Cliente';
      const apellidos = partesNombre.slice(2).join(' ') || '';

      setLoadingText('Enviando código a tu Gmail');

      await api.post(`${endpoints.usuarios}/google/enviar-codigo`, {
        correo: correoGoogle
      });

      setGooglePendiente({
        correo: correoGoogle,
        nombres,
        apellidos
      });

      setCodigoGoogle('');
      setCodigoGoogleEnviado(true);
      setMessage(`Google validó tu cuenta. Ahora ingresa el código enviado a ${correoGoogle}.`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo continuar con Google.');
    } finally {
      setLoading(false);
    }
  };

  const verificarCodigoGoogle = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!googlePendiente?.correo) {
      setError('Primero valida tu cuenta de Google.');
      return;
    }

    if (!codigoGoogle || codigoGoogle.length !== 6) {
      setError('Ingresa el código de 6 dígitos enviado a tu Gmail.');
      return;
    }

    setLoadingText('Validando código de Google');
    setLoading(true);

    try {
      const user = await api.post(`${endpoints.usuarios}/google/verificar-codigo`, {
        correo: googlePendiente.correo,
        codigo: codigoGoogle
      });

      const session = buildSession(user, 'cliente');

      onLogin({
        ...session,
        nombre: session.nombre || googlePendiente.nombres,
        apellido: session.apellido || googlePendiente.apellidos,
        correo: googlePendiente.correo,
        role: 'cliente'
      });

      navigateAfterLogin();
    } catch (err) {
      setError(err.message || 'Código inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  const enviarCodigoRegistro = async () => {
    resetMessages();

    if (!registro.correo) {
      setError('Primero ingresa un correo válido.');
      return;
    }

    setLoadingText('Enviando código de registro');
    setLoading(true);

    try {
      await api.post(`${endpoints.usuarios}/registro/enviar-codigo`, {
        correo: registro.correo
      });

      setCodigoRegistroEnviado(true);
      setRegistroVerificado(false);
      setMessage('Código enviado al correo. Verifica tu correo antes de crear la cuenta.');
    } catch (err) {
      setError(err.message || 'No se pudo enviar el código de registro.');
    } finally {
      setLoading(false);
    }
  };

  const verificarCodigoRegistro = async () => {
    resetMessages();

    if (!registro.correo || !codigoRegistro) {
      setError('Ingresa el correo y el código recibido.');
      return;
    }

    if (codigoRegistro.length !== 6) {
      setError('El código debe tener 6 dígitos.');
      return;
    }

    setLoadingText('Verificando correo de registro');
    setLoading(true);

    try {
      await api.post(`${endpoints.usuarios}/registro/verificar-codigo`, {
        correo: registro.correo,
        codigo: codigoRegistro
      });

      setRegistroVerificado(true);
      setMessage('Correo verificado correctamente. Ahora completa tus datos básicos.');
    } catch (err) {
      setError(err.message || 'Código inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  const registrarCliente = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!registroVerificado) {
      setError('Primero verifica tu correo con el código enviado.');
      return;
    }

    if (!registro.nombres || !registro.apellidos || !registro.contrasena) {
      setError('Completa nombres, apellidos y contraseña.');
      return;
    }

    const errorContrasena = validarContrasenaSegura(registro.contrasena);

    if (errorContrasena) {
      setError(errorContrasena);
      return;
    }

    setLoadingText('Creando cuenta cliente');
    setLoading(true);

    try {
      await api.post(endpoints.clientes, {
        nombres: registro.nombres,
        apellidos: registro.apellidos,
        correo: registro.correo,
        telefono: '',
        direccion: '',
        referenciaDireccion: '',
        tipoCliente: 'persona',
        ruc: '',
        razonSocial: '',
        documentoIdentidad: '',
        contrasena: registro.contrasena
      });

      setMessage('Cuenta registrada correctamente. Ahora inicia sesión con correo, contraseña y código.');
      setModo('login');
      setCorreo(registro.correo);
      setContrasena('');
      setCodigoLogin('');
      setCodigoLoginEnviado(false);
    } catch (err) {
      setError(err.message || 'No se pudo registrar el cliente. Verifica si el correo ya existe.');
    } finally {
      setLoading(false);
    }
  };

  const enviarCodigoRecuperacion = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!recuperacionCorreo) {
      setError('Ingresa tu correo para recuperar la contraseña.');
      return;
    }

    setLoadingText('Enviando código de recuperación');
    setLoading(true);

    try {
      await api.post(`${endpoints.usuarios}/recuperar/enviar-codigo`, {
        correo: recuperacionCorreo
      });

      setCodigoRecuperacionEnviado(true);
      setMessage('Código de recuperación enviado. Revisa tu correo.');
    } catch (err) {
      setError(err.message || 'No se pudo enviar el código de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  const restablecerContrasena = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!recuperacionCorreo || !recuperacionCodigo || !nuevaContrasena) {
      setError('Completa correo, código y nueva contraseña.');
      return;
    }

    if (recuperacionCodigo.length !== 6) {
      setError('El código debe tener 6 dígitos.');
      return;
    }

    const errorContrasena = validarContrasenaSegura(nuevaContrasena);

    if (errorContrasena) {
      setError(errorContrasena);
      return;
    }

    setLoadingText('Actualizando contraseña');
    setLoading(true);

    try {
      const user = await api.post(`${endpoints.usuarios}/recuperar/restablecer`, {
        correo: recuperacionCorreo,
        codigo: recuperacionCodigo,
        nuevaContrasena
      });

      const session = buildSession(user, null);
      onLogin(session);
      navigateAfterLogin();
    } catch (err) {
      setError(err.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const renderLogin = () => {
    if (codigoGoogleEnviado && googlePendiente) {
      return (
        <form onSubmit={verificarCodigoGoogle}>
          <div className="otp-info-box google-otp-box">
            <i className="bi bi-google"></i>
            <div>
              <strong>Google validó tu cuenta</strong>
              <span>Ahora confirma el código enviado a {googlePendiente.correo}.</span>
            </div>
          </div>

          <label>Código de verificación</label>
          <input
            className="form-control otp-input"
            value={codigoGoogle}
            onChange={e => setCodigoGoogle(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Ejemplo: 123456"
            maxLength="6"
            required
          />

          <button className="btn btn-primary w-100 mt-3" type="submit" disabled={loading}>
            <i className="bi bi-shield-check"></i>
            {loading ? 'Verificando...' : 'Verificar e ingresar'}
          </button>

          <button
            className="btn btn-outline-dark w-100 mt-2"
            type="button"
            onClick={() => {
              setCodigoGoogleEnviado(false);
              setGooglePendiente(null);
              setCodigoGoogle('');
              setMessage('');
            }}
            disabled={loading}
          >
            Cambiar cuenta de Google
          </button>
        </form>
      );
    }

    if (!codigoLoginEnviado) {
      return (
        <form onSubmit={enviarCodigoLogin}>
          <label>Correo electrónico</label>
          <input
            className="form-control"
            type="email"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            placeholder="Ingresa tu correo"
            required
          />

          <label>Contraseña</label>
          <input
            className="form-control"
            type="password"
            maxLength="20"
            value={contrasena}
            onChange={e => setContrasena(e.target.value)}
            placeholder="Ingresa tu contraseña"
            required
          />
          <small className="login-oauth-note">Máximo 20 caracteres.</small>

          <button className="btn btn-primary w-100 mt-3" type="submit" disabled={loading}>
            <i className="bi bi-send-check"></i>
            {loading ? 'Enviando...' : 'Enviar código al correo'}
          </button>

          <button
            className="forgot-password-link"
            type="button"
            onClick={abrirRecuperacion}
            disabled={loading}
          >
            ¿Olvidaste tu contraseña?
          </button>

          <button
            className="btn btn-google w-100 mt-3"
            type="button"
            onClick={iniciarGoogleConCodigo}
            disabled={loading}
          >
            <i className="bi bi-google"></i>
            {loading ? 'Validando...' : 'Continuar con Google'}
          </button>
        </form>
      );
    }

    return (
      <form onSubmit={verificarCodigoLogin}>
        <div className="otp-info-box">
          <i className="bi bi-envelope-check"></i>
          <div>
            <strong>Código enviado</strong>
            <span>Revisa el correo {correo} e ingresa el código de 6 dígitos.</span>
          </div>
        </div>

        <label>Código de verificación</label>
        <input
          className="form-control otp-input"
          value={codigoLogin}
          onChange={e => setCodigoLogin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Ejemplo: 123456"
          maxLength="6"
          required
        />

        <button className="btn btn-primary w-100 mt-3" type="submit" disabled={loading}>
          <i className="bi bi-shield-check"></i>
          {loading ? 'Verificando...' : 'Verificar e ingresar'}
        </button>

        <button
          className="btn btn-outline-dark w-100 mt-2"
          type="button"
          onClick={() => {
            setCodigoLoginEnviado(false);
            setCodigoLogin('');
            setMessage('');
          }}
          disabled={loading}
        >
          Cambiar correo o contraseña
        </button>
      </form>
    );
  };

  const renderRegistro = () => (
    <form onSubmit={registrarCliente}>
      <div className="otp-register-box">
        <label>Correo electrónico</label>
        <div className="input-action">
          <input
            className="form-control"
            type="email"
            value={registro.correo}
            onChange={e => {
              setRegistro({ ...registro, correo: e.target.value });
              setCodigoRegistroEnviado(false);
              setRegistroVerificado(false);
              setCodigoRegistro('');
            }}
            required
          />

          <button
            className="btn btn-outline-dark"
            type="button"
            onClick={enviarCodigoRegistro}
            disabled={loading || !registro.correo}
          >
            Enviar código
          </button>
        </div>

        {codigoRegistroEnviado && !registroVerificado && (
          <>
            <label>Código recibido</label>
            <div className="input-action">
              <input
                className="form-control otp-input"
                value={codigoRegistro}
                onChange={e => setCodigoRegistro(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 dígitos"
                maxLength="6"
              />

              <button
                className="btn btn-primary"
                type="button"
                onClick={verificarCodigoRegistro}
                disabled={loading || codigoRegistro.length !== 6}
              >
                Verificar
              </button>
            </div>
          </>
        )}

        {registroVerificado && (
          <div className="otp-verified-box">
            <i className="bi bi-check-circle-fill"></i>
            Correo verificado correctamente.
          </div>
        )}
      </div>

      <fieldset disabled={!registroVerificado} className={!registroVerificado ? 'disabled-register-fields' : ''}>
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

        <label>Contraseña</label>
        <input
          className="form-control"
          type="password"
          maxLength="20"
          value={registro.contrasena}
          onChange={e => setRegistro({ ...registro, contrasena: e.target.value })}
          placeholder="Crea una contraseña segura"
          required
        />
        <small className="login-oauth-note">Debe tener 8 a 20 caracteres, mayúscula, minúscula, número y carácter especial.</small>

        <small className="login-oauth-note">
          Tu teléfono, dirección y datos para boleta/factura se pedirán cuando confirmes un pedido.
        </small>

        <button className="btn btn-primary w-100 mt-3" type="submit" disabled={loading || !registroVerificado}>
          <i className="bi bi-person-plus"></i>
          {loading ? 'Creando...' : 'Crear cuenta'}
        </button>
      </fieldset>
    </form>
  );

  const renderRecuperacion = () => (
    <form onSubmit={codigoRecuperacionEnviado ? restablecerContrasena : enviarCodigoRecuperacion}>
      <div className="otp-info-box">
        <i className="bi bi-key-fill"></i>
        <div>
          <strong>Recuperación de contraseña</strong>
          <span>Te enviaremos un código; después cambiarás tu contraseña y entrarás directo.</span>
        </div>
      </div>

      <label>Correo electrónico</label>
      <input
        className="form-control"
        type="email"
        value={recuperacionCorreo}
        onChange={e => {
          setRecuperacionCorreo(e.target.value);
          setCodigoRecuperacionEnviado(false);
          setRecuperacionCodigo('');
          setNuevaContrasena('');
        }}
        placeholder="Ingresa tu correo registrado"
        required
      />

      {codigoRecuperacionEnviado && (
        <>
          <label>Código recibido</label>
          <input
            className="form-control otp-input"
            value={recuperacionCodigo}
            onChange={e => setRecuperacionCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Código de 6 dígitos"
            maxLength="6"
            required
          />

          <label>Nueva contraseña</label>
          <input
            className="form-control"
            type="password"
            maxLength="20"
            value={nuevaContrasena}
            onChange={e => setNuevaContrasena(e.target.value)}
            placeholder="Nueva contraseña"
            required
          />
          <small className="login-oauth-note">Debe tener 8 a 20 caracteres, mayúscula, minúscula, número y carácter especial.</small>
        </>
      )}

      <button className="btn btn-primary w-100 mt-3" type="submit" disabled={loading}>
        <i className="bi bi-shield-check"></i>
        {loading
          ? 'Procesando...'
          : codigoRecuperacionEnviado
            ? 'Cambiar contraseña'
            : 'Enviar código de recuperación'}
      </button>

      {codigoRecuperacionEnviado && (
        <button
          className="btn btn-outline-dark w-100 mt-2"
          type="button"
          onClick={enviarCodigoRecuperacion}
          disabled={loading}
        >
          Reenviar código
        </button>
      )}
    </form>
  );

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
          Accede de forma segura con correo, contraseña y código de verificación.
          También puedes validar tu Gmail con Google y confirmar el código enviado por MUBI.
        </p>

        <div className="login-benefits">
          <div><i className="bi bi-google"></i> Google</div>
          <div><i className="bi bi-shield-lock"></i> Acceso seguro</div>
          <div><i className="bi bi-bag-heart"></i> Pedidos personalizados</div>
        </div>
      </section>

      <section className="login-card-panel">
        <div className="login-card">
          <span className="badge-soft">
            {modo === 'login'
              ? 'Acceso con verificación'
              : modo === 'registro'
                ? 'Registro rápido'
                : 'Recuperación segura'}
          </span>

          <h2>
            {modo === 'login'
              ? 'Iniciar sesión'
              : modo === 'registro'
                ? 'Crear cuenta cliente'
                : 'Recuperar contraseña'}
          </h2>

          <p className="login-subtitle">
            {modo === 'login'
              ? 'Usa correo y contraseña, o valida tu cuenta con Google y confirma el código enviado por MUBI.'
              : modo === 'registro'
                ? 'Verifica tu correo y completa solo tus datos básicos. Los datos de entrega se pedirán al hacer un pedido.'
                : 'Ingresa tu correo, confirma el código recibido y crea una nueva contraseña. Al finalizar entrarás directo sin otro código.'}
          </p>

          {error && <div className="alert alert-danger">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          {modo === 'login' && renderLogin()}
          {modo === 'registro' && renderRegistro()}
          {modo === 'recuperacion' && renderRecuperacion()}

          <div className="login-switch">
            {modo === 'login' ? (
              <>
                <span>¿No tienes cuenta?</span>
                <button type="button" onClick={() => cambiarModo('registro')}>
                  Crear cuenta cliente
                </button>
              </>
            ) : (
              <>
                <span>¿Ya tienes cuenta?</span>
                <button type="button" onClick={() => cambiarModo('login')}>
                  Iniciar sesión
                </button>
              </>
            )}
          </div>

          <Link className="guest-link" to="/">
            Continuar como invitado
          </Link>
        </div>
      </section>

      {loading && (
        <div className="auth-loading-backdrop">
          <div className="auth-loading-modal">
            <div className="auth-loading-spinner"></div>
            <h3>{loadingText}</h3>
            <p>Estamos validando la información. Por favor espera unos segundos.</p>
          </div>
        </div>
      )}
    </div>
  );
}
