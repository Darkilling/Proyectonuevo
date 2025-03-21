// Esta es una versión corregida de la función cargarDocumentos() en index.js
// El problema podría estar relacionado con cómo se manejan los datos recibidos de la API

async function cargarDocumentos() {
    const recentDocumentsList = document.getElementById('recentDocuments');
    const pendientesSPList = document.getElementById('pendientesSP');
    
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
        
        // Asumimos userRole para pruebas
        const userRole = 'admin'; // Para pruebas
        
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
            recentDocumentsList.innerHTML = '<p class="error-message">Error al cargar los documentos</p>';
        }
    }
}

// Función para crear un elemento de documento
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
            fechaFormateada = new Date(doc.fecha).toLocaleDateString('es-CL');
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
        window.location.href = `ver-oc.html?id=${doc.id}`;
    });

    return item;
}

// Guardar estas funciones para incluirlas en el archivo index.js original 