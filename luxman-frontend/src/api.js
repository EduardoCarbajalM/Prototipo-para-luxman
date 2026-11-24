// Dirección base del backend: VITE_API_URL si existe; si no, el mismo host de la página en el puerto 5294
export const URL_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5294`;

const CLAVE_TOKEN = 'luxman_admin_token';

export const guardarTokenAdmin = (token) => sessionStorage.setItem(CLAVE_TOKEN, token);
export const obtenerTokenAdmin = () => sessionStorage.getItem(CLAVE_TOKEN) || '';
export const borrarTokenAdmin = () => sessionStorage.removeItem(CLAVE_TOKEN);
