document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    if (!userData.username) {
        window.location.href = 'login.html';
        return;
    }

    // Actualizar nombre de usuario
    document.getElementById('userName').textContent = userData.username;

    // Variables globales
    let documentos = [];
    let documentosFiltrados = [];

    // Cargar documentos al iniciar
    cargarDocumentos();

    // Agregar evento de búsqueda en tiempo real
    document.getElementById('buscar').addEventListener('input', function(e) {
        aplicarFiltros();
    });

    // Evento para filtros de fecha y estado
    document.getElementById('estado').addEventListener('change', aplicarFiltros);
    document.getElementById('fechaDesde').addEventListener('change', aplicarFiltros);
    document.getElementById('fechaHasta').addEventListener('change', aplicarFiltros);

    // Evento para cerrar sesión
    document.getElementById('cerrarSesion').addEventListener('click', function() {
        sessionStorage.removeItem('userData');
        window.location.href = 'login.html';
    });

    // Función para cargar documentos
    async function cargarDocumentos() {
        try {
            console.log('Cargando documentos...');
            const response = await fetch('/api/documentos?tipo=oc');
            
            if (!response.ok) {
                throw new Error('Error al cargar documentos');
            }

            documentos = await response.json();
            documentosFiltrados = [...documentos];
            console.log('Documentos cargados:', documentos);
            console.log('Cantidad de documentos:', documentos.length);

            // Renderizar documentos
            renderizarDocumentos(documentosFiltrados);
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error al cargar los documentos');
        }
    }

    // Función para aplicar filtros
    function aplicarFiltros() {
        const busqueda = document.getElementById('buscar').value.toLowerCase();
        const estado = document.getElementById('estado').value;
        const fechaDesde = document.getElementById('fechaDesde').value;
        const fechaHasta = document.getElementById('fechaHasta').value;

        console.log('Aplicando filtros:', { busqueda, estado, fechaDesde, fechaHasta });

        documentosFiltrados = documentos.filter(doc => {
            // Filtro de búsqueda
            const cumpleBusqueda = !busqueda || 
                doc.numero.toLowerCase().includes(busqueda) ||
                doc.departamento?.toLowerCase().includes(busqueda) ||
                doc.solicitante?.toLowerCase().includes(busqueda);

            // Filtro de estado
            const cumpleEstado = estado === 'todos' || doc.estado === estado;

            // Filtro de fechas
            const fechaDoc = new Date(doc.fecha);
            const desde = fechaDesde ? new Date(fechaDesde) : null;
            const hasta = fechaHasta ? new Date(fechaHasta) : null;

            const cumpleFechaDesde = !desde || fechaDoc >= desde;
            const cumpleFechaHasta = !hasta || fechaDoc <= hasta;

            return cumpleBusqueda && cumpleEstado && cumpleFechaDesde && cumpleFechaHasta;
        });

        console.log('Documentos filtrados:', documentosFiltrados);
        renderizarDocumentos(documentosFiltrados);
    }

    // Función para renderizar documentos
    function renderizarDocumentos(docs) {
        console.log('Renderizando documentos:', docs);
        console.log('Cantidad de documentos a renderizar:', docs.length);

        const tbody = document.querySelector('#documentosTable');
        tbody.innerHTML = '';

        if (docs.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    No se encontraron órdenes de compra que coincidan con los filtros
                </td>
            `;
            tbody.appendChild(tr);
            return;
        }

        docs.forEach(doc => {
            console.log('Procesando documento:', doc);

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${doc.numero}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${doc.departamento || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${doc.solicitante || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatearFecha(doc.fecha)}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${getBadgeColor(doc.estado)} text-white">
                        ${doc.estado}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 ver-documento" data-id="${doc.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 editar-documento" data-id="${doc.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 eliminar-documento" data-id="${doc.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="bg-purple-600 text-white px-3 py-1 rounded-md hover:bg-purple-700 imprimir-documento" data-id="${doc.id}">
                        <i class="fas fa-print"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Agregar eventos a los botones
        document.querySelectorAll('.ver-documento').forEach(btn => {
            btn.addEventListener('click', () => verDocumento(btn.getAttribute('data-id')));
        });

        document.querySelectorAll('.editar-documento').forEach(btn => {
            btn.addEventListener('click', () => editarDocumento(btn.getAttribute('data-id')));
        });

        document.querySelectorAll('.eliminar-documento').forEach(btn => {
            btn.addEventListener('click', () => confirmarEliminacion(btn.getAttribute('data-id')));
        });

        document.querySelectorAll('.imprimir-documento').forEach(btn => {
            btn.addEventListener('click', () => imprimirDocumento(btn.getAttribute('data-id')));
        });
    }

    // Funciones para acciones CRUD
    function verDocumento(id) {
        window.location.href = `ver-oc.html?id=${id}`;
    }

    function editarDocumento(id) {
        window.location.href = `editar-oc.html?id=${id}`;
    }

    function confirmarEliminacion(id) {
        const modal = document.getElementById('deleteModal');
        modal.classList.remove('hidden');

        document.getElementById('confirmDelete').onclick = () => eliminarDocumento(id);
        document.getElementById('cancelDelete').onclick = () => {
            modal.classList.add('hidden');
        };
    }

    async function eliminarDocumento(id) {
        try {
            const response = await fetch(`/api/documentos/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error al eliminar la orden de compra');
            }

            document.getElementById('deleteModal').classList.add('hidden');
            mostrarMensaje('Orden de compra eliminada exitosamente', 'success');
            
            // Recargar documentos
            cargarDocumentos();
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error al eliminar la orden de compra: ' + error.message);
        }
    }

    function imprimirDocumento(id) {
        window.open(`imprimir-oc.html?id=${id}`, '_blank');
    }

    // Funciones auxiliares
    function formatearFecha(fecha) {
        if (!fecha) return '-';
        return new Date(fecha).toLocaleDateString('es-ES');
    }

    function getBadgeColor(estado) {
        const colores = {
            'pendiente': 'yellow-500',
            'emitida': 'blue-500',
            'aprobada': 'green-500',
            'rechazada': 'red-500',
            'completada': 'indigo-500'
        };
        return colores[estado] || 'gray-500';
    }

    function mostrarMensaje(mensaje, tipo) {
        const alertaDiv = document.createElement('div');
        alertaDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
            tipo === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white flex items-center space-x-2`;
        alertaDiv.innerHTML = `
            <span>${mensaje}</span>
            <button onclick="this.parentElement.remove()" class="ml-4">
                <i class="fas fa-times"></i>
            </button>
        `;
        document.body.appendChild(alertaDiv);
        setTimeout(() => alertaDiv.remove(), 3000);
    }

    function mostrarError(mensaje) {
        mostrarMensaje(mensaje, 'error');
    }

    // Exportar funciones para poder usarlas globalmente
    window.aplicarFiltros = aplicarFiltros;
}); 