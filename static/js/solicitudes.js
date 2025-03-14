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

    // Función para cargar documentos
    async function cargarDocumentos() {
        try {
            console.log('Cargando documentos...');
            const response = await fetch('/api/documentos?tipo=sp');
            
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
                    No se encontraron documentos que coincidan con los filtros
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
                    <button onclick="editarDocumento(${doc.id})" class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="confirmarEliminacion(${doc.id})" class="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Función para eliminar documento
    async function eliminarDocumento(id) {
        try {
            const modal = document.getElementById('deleteModal');
            modal.classList.remove('hidden');

            document.getElementById('confirmDelete').onclick = async () => {
                const response = await fetch(`/api/documentos/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Error al eliminar el documento');
                }

                modal.classList.add('hidden');
                mostrarMensaje('Documento eliminado exitosamente', 'success');
                cargarDocumentos();
            };

            document.getElementById('cancelDelete').onclick = () => {
                modal.classList.add('hidden');
            };
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error al eliminar el documento');
        }
    }

    // Funciones auxiliares
    function formatearFecha(fecha) {
        if (!fecha) return '-';
        return new Date(fecha).toLocaleDateString('es-ES');
    }

    function getBadgeColor(estado) {
        const colores = {
            'pendiente': 'blue-600',
            'aprobado': 'green-600',
            'rechazado': 'red-600'
        };
        return colores[estado] || 'blue-600';
    }

    function mostrarMensaje(mensaje, tipo) {
        const alerta = document.createElement('div');
        alerta.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
            tipo === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white flex items-center space-x-2`;
        alerta.innerHTML = `
            <span>${mensaje}</span>
            <button onclick="this.parentElement.remove()" class="ml-4">
                <i class="fas fa-times"></i>
            </button>
        `;
        document.body.appendChild(alerta);
        setTimeout(() => alerta.remove(), 3000);
    }

    function mostrarError(mensaje) {
        mostrarMensaje(mensaje, 'error');
    }

    // Funciones globales
    window.editarDocumento = function(id) {
        window.location.href = `editar-sp.html?id=${id}`;
    };

    window.confirmarEliminacion = function(id) {
        eliminarDocumento(id);
    };

    window.aplicarFiltros = aplicarFiltros;
}); 