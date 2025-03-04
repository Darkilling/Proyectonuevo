document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación usando auth.js
    const user = auth.checkAuth();
    if (!user) return;

    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const recentDocumentsList = document.getElementById('recentDocuments');
    const pendientesSPList = document.getElementById('pendientesSP');

    // Función para formatear la fecha
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-CL');
    }

    // Función para crear un elemento de documento reciente
    function createDocumentItem(doc, canCreateOC = false) {
        const item = document.createElement('div');
        item.className = 'document-item';
        
        // Determinar el título basado en el tipo de documento
        const titulo = doc.tipo === 'sp' ? 
            `Solicitud de ${doc.departamento}` : 
            `Orden de Compra - ${doc.proveedor}`;

        item.innerHTML = `
            <div class="document-info">
                <h4>${doc.tipo.toUpperCase()} - ${doc.numero}</h4>
                <p>${titulo}</p>
                <p>Fecha: ${formatDate(doc.fecha)}</p>
                ${doc.total ? `<p>Total: $${doc.total.toLocaleString('es-CL')}</p>` : ''}
            </div>
            <span class="document-status status-${doc.estado}">
                ${doc.estado.charAt(0).toUpperCase() + doc.estado.slice(1)}
            </span>
            ${canCreateOC && doc.tipo === 'sp' && doc.estado === 'pendiente' ? 
                `<button class="btn btn-primary crear-oc" data-sp-id="${doc.id}">Crear OC</button>` : ''}
        `;

        // Si puede crear OC y es una SP pendiente, agregar evento para crear OC
        if (canCreateOC && doc.tipo === 'sp' && doc.estado === 'pendiente') {
            const crearOCBtn = item.querySelector('.crear-oc');
            crearOCBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = `nueva-oc.html?sp_id=${doc.id}`;
            });
        }

        // Agregar evento de clic para ver detalles
        item.addEventListener('click', () => {
            window.location.href = `aprobaciones.html?id=${doc.id}`;
        });

        return item;
    }

    // Función para cargar documentos desde la API
    async function cargarDocumentos() {
        try {
            const response = await fetch('/api/documentos/todos');
            if (!response.ok) {
                throw new Error('Error al cargar documentos');
            }
            const documentos = await response.json();
            
            // Limpiar listas
            recentDocumentsList.innerHTML = '';
            if (pendientesSPList) {
                pendientesSPList.innerHTML = '';
            }
            
            // Ordenar documentos por fecha (más recientes primero)
            documentos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            
            // Si es usuario de compras o admin, mostrar las SP pendientes en una sección separada
            const canCreateOC = user.type === 'compras' || user.type === 'admin';
            if (canCreateOC && pendientesSPList) {
                const spPendientes = documentos.filter(doc => 
                    doc.tipo === 'sp' && doc.estado === 'pendiente'
                );
                
                if (spPendientes.length > 0) {
                    document.getElementById('pendientesSPSection').style.display = 'block';
                    spPendientes.forEach(doc => {
                        pendientesSPList.appendChild(createDocumentItem(doc, true));
                    });
                }
            }
            
            // Mostrar todos los documentos en la lista principal
            documentos.forEach(doc => {
                recentDocumentsList.appendChild(createDocumentItem(doc, canCreateOC));
            });
        } catch (error) {
            console.error('Error:', error);
            recentDocumentsList.innerHTML = '<p class="error-message">Error al cargar los documentos</p>';
        }
    }

    // Función para realizar la búsqueda
    async function realizarBusqueda() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const canCreateOC = user.type === 'compras' || user.type === 'admin';
        
        if (searchTerm) {
            try {
                const response = await fetch(`/api/documentos?q=${encodeURIComponent(searchTerm)}`);
                if (!response.ok) {
                    throw new Error('Error en la búsqueda');
                }
                const resultados = await response.json();
                
                // Limpiar y mostrar resultados
                recentDocumentsList.innerHTML = '';
                resultados.forEach(doc => {
                    recentDocumentsList.appendChild(createDocumentItem(doc, canCreateOC));
                });
            } catch (error) {
                console.error('Error:', error);
                recentDocumentsList.innerHTML = '<p class="error-message">Error al realizar la búsqueda</p>';
            }
        } else {
            // Si no hay término de búsqueda, cargar todos los documentos
            cargarDocumentos();
        }
    }

    // Event Listeners
    searchButton.addEventListener('click', realizarBusqueda);

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            realizarBusqueda();
        }
    });

    // Cargar documentos al iniciar
    cargarDocumentos();
}); 