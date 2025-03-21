document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando página...');
    
    // Verificar autenticación
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    if (!userData.username) {
        console.log('Usuario no autenticado, redirigiendo a login');
        window.location.href = '/login';
        return;
    }

    // Mostrar nombre de usuario
    document.getElementById('userName').textContent = userData.username;

    // Obtener el rol del usuario (normalizamos el tipo/rol a 'comprador')
    const userRole = (userData.role || userData.type || '').toLowerCase();
    console.log('Rol de usuario:', userRole);
    
    // Mostrar secciones según el rol
    document.querySelectorAll('[data-role]').forEach(element => {
        const roleAttr = element.dataset.role.toLowerCase();
        // Permitir acceso si el rol coincide o si es 'compras' para 'comprador'
        if (roleAttr === userRole || (roleAttr === 'compras' && userRole === 'comprador')) {
            element.style.display = 'grid';
        }
    });

    // Si el usuario es comprador o tiene rol de compras, cargar datos específicos
    if (userRole === 'comprador' || userRole === 'compras') {
        cargarSolicitudesPendientes();
        cargarUltimasOC();
    }

    // Agregar manejadores de eventos para los botones de navegación
    document.querySelectorAll('button[data-href]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const pagina = button.getAttribute('data-href');
            window.location.href = pagina;
        });
    });

    // Agregar manejadores de eventos para los enlaces del sidebar
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            
            // Si es cerrar sesión, manejar de forma especial
            if (href === '/logout') {
                sessionStorage.removeItem('userData');
                window.location.href = '/login';
                return;
            }
            
            window.location.href = href;
        });
    });

    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const recentDocumentsList = document.getElementById('recentDocuments');
    const pendientesSPList = document.getElementById('pendientesSP');

    // Función para formatear la fecha
    function formatDate(dateString) {
        try {
        return new Date(dateString).toLocaleDateString('es-CL');
        } catch (e) {
            console.error('Error al formatear fecha:', e);
            return 'Fecha no disponible';
        }
    }

    // Función para crear un elemento de documento reciente
    function createDocumentItem(doc, canCreateOC = false) {
        console.log('Creando elemento para documento:', doc.id, doc.tipo, doc.numero);
        
        const item = document.createElement('div');
        item.className = 'document-item';
        
        // Verificar que los datos necesarios existen
        if (!doc.tipo || !doc.numero) {
            console.error('Documento con datos incompletos:', doc);
            return item; // Devolver un elemento vacío
        }
        
        // Determinar el título basado en el tipo de documento
        const titulo = doc.tipo === 'sp' ? 
            `Solicitud de ${doc.departamento || 'No especificado'}` : 
            `Orden de Compra - ${doc.proveedor || 'No especificado'}`;

        // Manejo seguro de la fecha
        let fechaFormateada = 'Fecha no disponible';
        try {
            if (doc.fecha) {
                fechaFormateada = formatDate(doc.fecha);
            }
        } catch (e) {
            console.error('Error al formatear fecha:', e);
        }

        // Manejo seguro del total
        let totalFormateado = '';
        try {
            if (doc.total !== null && doc.total !== undefined) {
                totalFormateado = `<p>Total: $${Number(doc.total).toLocaleString('es-CL')}</p>`;
            }
        } catch (e) {
            console.error('Error al formatear total:', e);
        }

        item.innerHTML = `
            <div class="document-info">
                <h4>${doc.tipo.toUpperCase()} - ${doc.numero}</h4>
                <p>${titulo}</p>
                <p>Fecha: ${fechaFormateada}</p>
                ${totalFormateado}
            </div>
            <span class="document-status status-${doc.estado || 'desconocido'}">
                ${doc.estado ? (doc.estado.charAt(0).toUpperCase() + doc.estado.slice(1)) : 'Desconocido'}
            </span>
            ${canCreateOC && doc.tipo === 'sp' && doc.estado === 'pendiente' ? 
                `<button class="btn btn-primary crear-oc" data-sp-id="${doc.id}">Crear OC</button>` : ''}
        `;

        // Si puede crear OC y es una SP pendiente, agregar evento para crear OC
        if (canCreateOC && doc.tipo === 'sp' && doc.estado === 'pendiente') {
            const crearOCBtn = item.querySelector('.crear-oc');
            if (crearOCBtn) {
                crearOCBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.href = `nueva-oc.html?sp_id=${doc.id}`;
                });
            }
        }

        // Agregar evento de clic para ver detalles
        item.addEventListener('click', () => {
            const url = doc.tipo === 'oc' ? `ver-oc.html?id=${doc.id}` : `aprobaciones.html?id=${doc.id}`;
            window.location.href = url;
        });

        return item;
    }

    // Función para cargar documentos desde la API
    async function cargarDocumentos() {
        try {
            console.log('Iniciando carga de documentos...');
            const response = await fetch('/api/documentos/todos');
            console.log('Respuesta recibida:', response.status);
            
            if (!response.ok) {
                console.error('Error en respuesta:', await response.text());
                throw new Error('Error al cargar documentos');
            }
            
            const documentos = await response.json();
            console.log('Documentos cargados:', documentos.length, documentos);
            
            // Limpiar listas
            if (recentDocumentsList) {
                recentDocumentsList.innerHTML = '';
            } else {
                console.error('No se encontró el elemento recentDocuments');
            }
            
            if (pendientesSPList) {
                pendientesSPList.innerHTML = '';
            }
            
            if (documentos.length === 0) {
                if (recentDocumentsList) {
                    recentDocumentsList.innerHTML = '<p>No hay documentos disponibles.</p>';
                }
                console.log('No hay documentos para mostrar');
                return;
            }
            
            // Ordenar documentos por fecha (más recientes primero)
            documentos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            
            // Si es usuario de compras o admin, mostrar las SP pendientes en una sección separada
            const canCreateOC = userRole === 'compras' || userRole === 'admin';
            const pendientesSPSection = document.getElementById('pendientesSPSection');
            
            if (canCreateOC && pendientesSPList) {
                const spPendientes = documentos.filter(doc => 
                    doc.tipo === 'sp' && doc.estado === 'pendiente'
                );
                
                if (pendientesSPSection) {
                    if (spPendientes.length > 0) {
                        pendientesSPSection.style.display = 'block';
                        spPendientes.forEach(doc => {
                            pendientesSPList.appendChild(createDocumentItem(doc, true));
                        });
                    } else {
                        pendientesSPSection.style.display = 'none';
                    }
                }
            }
            
            // Mostrar todos los documentos en la lista principal
            documentos.forEach(doc => {
                if (recentDocumentsList) {
                    recentDocumentsList.appendChild(createDocumentItem(doc, canCreateOC));
                }
            });
            
            console.log('Documentos mostrados correctamente');
        } catch (error) {
            console.error('Error en cargarDocumentos:', error);
            if (recentDocumentsList) {
                recentDocumentsList.innerHTML = '<p class="error-message">Error al cargar los documentos: ' + error.message + '</p>';
            }
        }
    }

    // Función para realizar la búsqueda
    async function realizarBusqueda() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const canCreateOC = userRole === 'compras' || userRole === 'admin';
        
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

    // Función para mostrar/ocultar acciones según el rol
    function actualizarInterfaz() {
        const userType = userRole;
        const actionCards = document.querySelectorAll('.action-cards');

        // Ocultar todas las secciones primero
        actionCards.forEach(card => {
            card.style.display = 'none';
        });

        // Mostrar las secciones correspondientes al rol del usuario
        if (userType === 'admin') {
            // Admin ve todas las acciones
            actionCards.forEach(card => {
                card.style.display = 'grid';
            });
        } else {
            // Otros usuarios ven solo sus acciones específicas
            const userCard = document.querySelector(`.action-cards[data-role="${userType}"]`);
            if (userCard) {
                userCard.style.display = 'grid';
            }
        }
    }

    // Actualizar la interfaz al cargar la página
    actualizarInterfaz();

    // Cargar documentos al iniciar
    cargarDocumentos();
});

// Función para cargar solicitudes pendientes
async function cargarSolicitudesPendientes() {
    try {
        const response = await fetch('/api/documentos?tipo=sp&estado=pendiente');
        if (!response.ok) throw new Error('Error al cargar solicitudes');
        const solicitudes = await response.json();
        
        const pendingCount = document.getElementById('pendingCount');
        if (pendingCount) {
            pendingCount.textContent = solicitudes.length;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Función para cargar últimas OC
async function cargarUltimasOC() {
    try {
        const response = await fetch('/api/documentos?tipo=oc&limit=5');
        if (!response.ok) throw new Error('Error al cargar OC');
        const ordenes = await response.json();
        
        const activityList = document.getElementById('activityList');
        if (activityList) {
            if (ordenes.length === 0) {
                activityList.innerHTML = '<p>No hay órdenes de compra recientes.</p>';
                return;
            }
            
            activityList.innerHTML = ordenes.map(oc => {
                const fechaFormateada = oc.fecha ? new Date(oc.fecha).toLocaleString() : 'Fecha no disponible';
                return `
                    <div class="activity-item">
                        <div class="activity-content">
                            <div class="activity-title">${oc.numero}</div>
                            <div class="activity-meta">
                                <span class="activity-user">${oc.solicitante || 'Usuario no especificado'}</span>
                                <span class="activity-date">${fechaFormateada}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error:', error);
        const activityList = document.getElementById('activityList');
        if (activityList) {
            activityList.innerHTML = '<p class="error-message">Error al cargar órdenes de compra</p>';
        }
    }
} 