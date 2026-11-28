// Dirección base del backend: VITE_API_URL si existe; si no, cadena vacía para rutas relativas (/api/...)
export const URL_BASE = import.meta.env.VITE_API_URL || '';

const CLAVE_SESION_DIRECTIVO = 'luxman_sesion_directivo';

export const guardarTokenAdmin = (token) => {
  localStorage.setItem(
    CLAVE_SESION_DIRECTIVO,
    JSON.stringify({
      autenticado: true,
      token,
      fecha_inicio: new Date().toISOString(),
    })
  );
};

export const obtenerTokenAdmin = () => {
  try {
    const crudo = localStorage.getItem(CLAVE_SESION_DIRECTIVO);
    if (!crudo) return '';
    const datos = JSON.parse(crudo);
    return datos?.token || '';
  } catch {
    return '';
  }
};

export const tieneSesionDirectivoActiva = () => {
  const token = obtenerTokenAdmin();
  return Boolean(token && token.length > 0);
};

export const borrarTokenAdmin = () => {
  localStorage.removeItem(CLAVE_SESION_DIRECTIVO);
  sessionStorage.removeItem('luxman_admin_token');
};
