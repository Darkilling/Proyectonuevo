// Función para obtener las notificaciones
async function obtenerNotificaciones() {
    try {
        const response = await fetch('/api/notificaciones');
        if (!response.ok) {
            throw new Error('Error al obtener notificaciones');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

// Función para marcar una notificación como leída
async function marcarNotificacionLeida(notifId) {
    try {
        const response = await fetch(`/api/notificaciones/${notifId}/marcar-leida`, {
            method: 'POST'
        });
        if (!response.ok) {
            throw new Error('Error al marcar notificación como leída');
        }
        return true;
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

// Función para mostrar las notificaciones en el contenedor
function mostrarNotificaciones(notificaciones) {
    const container = document.getElementById('notificaciones-container');
    if (!container) return;

    if (!notificaciones || notificaciones.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                No hay notificaciones
            </div>
        `;
        return;
    }

    container.innerHTML = notificaciones.map(notif => `
        <div class="notificacion ${notif.leida ? 'bg-gray-50' : 'bg-white'} p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
             onclick="verDetalleNotificacion(${notif.documento_id})">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <p class="text-sm ${notif.leida ? 'text-gray-600' : 'text-gray-900'}">
                        ${notif.mensaje}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                        ${new Date(notif.fecha).toLocaleString('es-CL')}
                    </p>
                </div>
                ${!notif.leida ? `
                    <button onclick="event.stopPropagation(); marcarNotificacionLeida(${notif.id})"
                            class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Función para ver el detalle de un documento desde una notificación
function verDetalleNotificacion(documentoId) {
    showDocumentDetails(documentoId);
}

// Función para actualizar el contador de notificaciones
function actualizarContadorNotificaciones(notificaciones) {
    const contador = document.getElementById('notificaciones-contador');
    if (!contador) return;

    const noLeidas = notificaciones.filter(n => !n.leida).length;
    contador.textContent = noLeidas;
    contador.style.display = noLeidas > 0 ? 'block' : 'none';
}

// Función para inicializar las notificaciones
async function inicializarNotificaciones() {
    const notificaciones = await obtenerNotificaciones();
    mostrarNotificaciones(notificaciones);
    actualizarContadorNotificaciones(notificaciones);
}

// Actualizar notificaciones cada 30 segundos
setInterval(inicializarNotificaciones, 30000);

// Función para manejar el dropdown de notificaciones
function inicializarDropdownNotificaciones() {
    const btn = document.getElementById('notificaciones-btn');
    const dropdown = document.getElementById('notificaciones-dropdown');
    
    if (!btn || !dropdown) return;

    // Toggle dropdown al hacer clic en el botón
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    // Cerrar dropdown al presionar Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    });
}

// Inicializar el dropdown cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    inicializarNotificaciones();
    inicializarDropdownNotificaciones();
}); 