// Dirección base del backend: VITE_API_URL si existe; si no, cadena vacía para rutas relativas (/api/...)
export const URL_BASE = import.meta.env.VITE_API_URL || '';

const CLAVE_TOKEN = 'luxman_admin_token';

export const guardarTokenAdmin = (token) => sessionStorage.setItem(CLAVE_TOKEN, token);
export const obtenerTokenAdmin = () => sessionStorage.getItem(CLAVE_TOKEN) || '';
export const borrarTokenAdmin = () => sessionStorage.removeItem(CLAVE_TOKEN);
