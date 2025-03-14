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
    let compras = [];
    let comprasFiltradas = [];

    // Cargar compras al iniciar
    cargarCompras();

    // Agregar evento de búsqueda en tiempo real
    document.getElementById('buscar').addEventListener('input', function(e) {
        aplicarFiltros();
    });

    // Función para cargar compras
    async function cargarCompras() {
        try {
            console.log('Cargando compras...');
            const response = await fetch('/api/compras');
            
            if (!response.ok) {
                throw new Error('Error al cargar compras');
            }

            compras = await response.json();
            comprasFiltradas = [...compras];
            console.log('Compras cargadas:', compras);
            console.log('Cantidad de compras:', compras.length);

            // Renderizar compras
            renderizarCompras(comprasFiltradas);
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error al cargar las compras');
        }
    }

    // Función para aplicar filtros
    function aplicarFiltros() {
        const busqueda = document.getElementById('buscar').value.toLowerCase();
        const estado = document.getElementById('estado').value;
        const fecha = document.getElementById('fecha').value;

        console.log('Aplicando filtros:', { busqueda, estado, fecha });

        comprasFiltradas = compras.filter(compra => {
            // Filtro de búsqueda
            const cumpleBusqueda = !busqueda || 
                compra.numero.toLowerCase().includes(busqueda) ||
                compra.proveedor?.toLowerCase().includes(busqueda) ||
                compra.descripcion?.toLowerCase().includes(busqueda);

            // Filtro de estado
            const cumpleEstado = estado === 'todos' || compra.estado === estado;

            // Filtro de fecha
            const fechaCompra = new Date(compra.fecha);
            const fechaFiltro = fecha ? new Date(fecha) : null;
            const cumpleFecha = !fechaFiltro || 
                fechaCompra.toDateString() === fechaFiltro.toDateString();

            return cumpleBusqueda && cumpleEstado && cumpleFecha;
        });

        console.log('Compras filtradas:', comprasFiltradas);
        renderizarCompras(comprasFiltradas);
    }

    // Función para renderizar compras
    function renderizarCompras(compras) {
        console.log('Renderizando compras:', compras);
        console.log('Cantidad de compras a renderizar:', compras.length);

        const tbody = document.querySelector('#comprasTable');
        tbody.innerHTML = '';

        if (compras.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    No se encontraron compras que coincidan con los filtros
                </td>
            `;
            tbody.appendChild(tr);
            return;
        }

        compras.forEach(compra => {
            console.log('Procesando compra:', compra);

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${compra.numero}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${compra.proveedor || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatearFecha(compra.fecha)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatearMoneda(compra.total)}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${getBadgeColor(compra.estado)} text-white">
                        ${compra.estado}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onclick="verDetalle(${compra.id})" class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button onclick="editarCompra(${compra.id})" class="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Funciones auxiliares
    function formatearFecha(fecha) {
        if (!fecha) return '-';
        return new Date(fecha).toLocaleDateString('es-ES');
    }

    function formatearMoneda(valor) {
        if (!valor) return '-';
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP'
        }).format(valor);
    }

    function getBadgeColor(estado) {
        const colores = {
            'pendiente': 'yellow-600',
            'en_proceso': 'blue-600',
            'completado': 'green-600',
            'cancelado': 'red-600'
        };
        return colores[estado] || 'gray-600';
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
    window.nuevaCompra = function() {
        window.location.href = 'nueva-compra.html';
    };

    window.verDetalle = function(id) {
        window.location.href = `ver-compra.html?id=${id}`;
    };

    window.editarCompra = function(id) {
        window.location.href = `editar-compra.html?id=${id}`;
    };

    window.aplicarFiltros = aplicarFiltros;
}); 