document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario es un aprobador o admin
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const isAprobador = userData.type === 'aprobador' || userData.type === 'admin';

    // Obtener elementos del DOM
    const modal = document.getElementById('documentModal');
    const closeModal = document.getElementById('closeModal');
    const aprobarBtn = document.getElementById('aprobarBtn');
    const rechazarBtn = document.getElementById('rechazarBtn');
    const cancelarBtn = document.getElementById('cancelarBtn');
    const aplicarFiltrosBtn = document.getElementById('aplicarFiltros');
    const exportarPDFBtn = document.getElementById('exportarPDFBtn');
    const limpiarFiltrosBtn = document.getElementById('limpiarFiltros');
    
    let documentoActual = null;

    // Función para obtener la lista de documentos
    async function obtenerDocumentos(filtros = {}) {
        try {
            // Construir URL con filtros
            const url = new URL('/api/documentos', window.location.origin);
            
            // Agregar filtros a la URL
            Object.entries(filtros).forEach(([key, value]) => {
                if (value) {
                    url.searchParams.append(key, value);
                }
            });

            // Realizar la petición
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error('Formato de respuesta inválido');
            }

            // Validar y formatear cada documento
            return data.map(doc => ({
                ...doc,
                fecha: doc.fecha ? new Date(doc.fecha) : new Date(),
                items: Array.isArray(doc.items) ? doc.items : [],
                aprobaciones: Array.isArray(doc.aprobaciones) ? doc.aprobaciones : [],
                total: parseFloat(doc.total) || 0,
                subtotal: parseFloat(doc.subtotal) || 0,
                descuento: parseFloat(doc.descuento) || 0,
                iva: parseFloat(doc.iva) || 0
            }));

        } catch (error) {
            console.error('Error al obtener documentos:', error);
            mostrarError('Error al cargar la lista de documentos');
            return [];
        }
    }

    // Función para obtener un documento específico
    async function obtenerDocumento(id) {
        try {
            const response = await fetch(`/api/documentos/${id}`);
            if (!response.ok) {
                throw new Error(`Error al obtener el documento: ${response.statusText}`);
            }
            
            const documento = await response.json();
            
            // Verificar si el solicitante existe, si no, asignar un valor por defecto
            if (!documento.solicitante) {
                documento.solicitante = "No especificado";
            }
            
            return documento;
        } catch (error) {
            console.error('Error al obtener documento:', error);
            throw error;
        }
    }

    // Función para aprobar un documento
    async function aprobarDocumento(accion) {
        try {
            if (!documentoActual || !documentoActual.id) {
                throw new Error('No hay documento seleccionado');
            }

            // Verificar que el documento esté en estado pendiente o emitida
            if (documentoActual.estado !== 'pendiente' && documentoActual.estado !== 'emitida') {
                mostrarMensaje(`No se puede ${accion === 'aprobado' ? 'aprobar' : 'rechazar'} el documento porque ya ha sido ${documentoActual.estado}`, 'warning');
                return;
            }

            const comentarios = document.getElementById('comentarios').value.trim();
            if (!comentarios && accion === 'rechazado') {
                mostrarMensaje('Debe ingresar un comentario para rechazar el documento', 'error');
                return;
            }

            mostrarCargando();
            
            const endpoint = accion === 'aprobado' ? 
                `/api/documentos/${documentoActual.id}/aprobar` : 
                `/api/documentos/${documentoActual.id}/rechazar`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comentarios })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Error al ${accion === 'aprobado' ? 'aprobar' : 'rechazar'} el documento`);
            }

            mostrarMensaje(
                accion === 'aprobado' ? 'Documento aprobado exitosamente' : 'Documento rechazado exitosamente',
                'success'
            );

            cerrarModal();
            await renderDocuments();
            if (typeof inicializarNotificaciones === 'function') {
                await inicializarNotificaciones();
            }

        } catch (error) {
            console.error('Error al procesar la aprobación:', error);
            mostrarMensaje(error.message || 'Error al procesar la aprobación', 'error');
        } finally {
            ocultarCargando();
        }
    }

    // Función para crear un elemento de documento en formato lista
    function createDocumentCard(doc) {
        const item = document.createElement('div');
        item.className = 'bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer';
        
        // Determinar el ícono y color según el tipo de documento
        const iconClass = doc.tipo === 'sp' ? 'fa-file-alt text-blue-600' : 'fa-shopping-cart text-green-600';
        const statusClass = {
            'pendiente': 'bg-yellow-100 text-yellow-800',
            'aprobado': 'bg-green-100 text-green-800',
            'rechazado': 'bg-red-100 text-red-800'
        }[doc.estado] || 'bg-yellow-100 text-yellow-800';

        item.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center ${doc.tipo === 'sp' ? 'bg-blue-100' : 'bg-green-100'}">
                        <i class="fas ${iconClass} text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">
                            ${doc.tipo === 'sp' ? 'Solicitud de Pedido' : 'Orden de Compra'} - ${doc.numero}
                        </h3>
                        <span class="inline-block px-2 py-1 text-xs font-medium rounded-full ${statusClass}">
                            ${capitalizeFirst(doc.estado)}
                        </span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm text-gray-600">
                        ${doc.tipo === 'sp' ? 'Solicitante' : 'Proveedor'}: ${doc.tipo === 'sp' ? doc.solicitante : doc.proveedor}
                    </div>
                    <div class="text-sm text-gray-600">
                        Fecha: ${formatDate(doc.fecha)}
                    </div>
                    ${doc.tipo === 'oc' ? `
                        <div class="text-sm font-medium text-green-600">
                            Total: ${formatCurrency(doc.total)}
                        </div>
                    ` : `
                        <div class="text-sm text-gray-600">
                            Departamento: ${doc.departamento || 'No especificado'}
                        </div>
                    `}
                </div>
            </div>
        `;

        // Agregar evento click para mostrar detalles
        item.addEventListener('click', () => {
            showDocumentDetails(doc.id);
        });

        return item;
    }

    // Función para generar el PDF
    function generarPDF(doc) {
        try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();

            // Configuración de colores corporativos
            const colorPrimario = [27, 94, 32];  // Verde oscuro
            const colorSecundario = [13, 71, 161];  // Azul oscuro
            const colorTexto = [255, 255, 255];  // Blanco
            const colorTextoNegro = [51, 51, 51];  // Negro para texto normal
            
            // Encabezado con gradiente
        pdf.setFillColor(...colorPrimario);
        pdf.rect(0, 0, pdf.internal.pageSize.width, 40, 'F');
        
            // Título
            pdf.setTextColor(...colorTexto);
        pdf.setFontSize(20);
        pdf.text(
            doc.tipo === 'sp' ? 'Solicitud de Pedido' : 'Orden de Compra',
                60,
            25
        );

        // Información del documento
            pdf.setTextColor(...colorTextoNegro);
        pdf.setFontSize(12);
        let y = 60;

        // Número de documento
        pdf.setFontSize(16);
        pdf.text(`${doc.tipo === 'sp' ? 'SP' : 'OC'} - ${doc.numero}`, 20, y);
        y += 20;

        // Información general
        pdf.setFontSize(12);
        const infoGeneral = [
            [`${doc.tipo === 'sp' ? 'Solicitante' : 'Proveedor'}:`, doc.tipo === 'sp' ? doc.solicitante : doc.proveedor],
            ['Fecha:', formatDate(doc.fecha)],
            doc.tipo === 'sp' ? 
                ['Departamento:', doc.departamento] : 
                ['RUT:', doc.rut]
        ];

        infoGeneral.forEach(([label, value]) => {
            pdf.text(`${label} ${value}`, 20, y);
            y += 10;
        });

        y += 10;

        // Tabla de ítems
        pdf.text('Ítems:', 20, y);
        y += 10;

        const headers = doc.tipo === 'sp' ?
            [['Descripción', 'Cantidad', 'Unidad']] :
            [['Descripción', 'Cantidad', 'Precio', 'Total']];

        const data = doc.items.map(item => 
            doc.tipo === 'sp' ?
                [item.descripcion, item.cantidad.toString(), item.unidad] :
                [
                    item.descripcion,
                    item.cantidad.toString(),
                    formatCurrency(item.precio),
                    formatCurrency(item.precio * item.cantidad)
                ]
        );

        pdf.autoTable({
            startY: y,
            head: headers,
            body: data,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 5
            },
            headStyles: {
                    fillColor: colorPrimario,
                    textColor: colorTexto
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
            }
        });

        y = pdf.lastAutoTable.finalY + 20;

        // Si es OC, agregar totales
        if (doc.tipo === 'oc') {
            const subtotal = doc.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
            const iva = subtotal * 0.19;
            const total = subtotal + iva;

            pdf.setFontSize(12);
            pdf.text(`Subtotal: ${formatCurrency(subtotal)}`, pdf.internal.pageSize.width - 80, y);
            pdf.text(`IVA (19%): ${formatCurrency(iva)}`, pdf.internal.pageSize.width - 80, y + 10);
            pdf.setFontSize(14);
            pdf.text(`Total: ${formatCurrency(total)}`, pdf.internal.pageSize.width - 80, y + 25);
        }

        // Estado y sello
        y = pdf.internal.pageSize.height - 60;
        pdf.setFontSize(16);
        const estado = doc.estado.toUpperCase();
        
            // Dibujar sello con colores corporativos
        pdf.setLineWidth(2);
            pdf.setDrawColor(...colorSecundario);
        pdf.circle(pdf.internal.pageSize.width - 60, y, 20);
            
            // Color del texto del estado según el estado
            const colorEstado = estado === 'APROBADO' ? colorPrimario :
                              estado === 'RECHAZADO' ? colorSecundario :
                              [249, 168, 37];  // Amarillo para pendiente
            
            pdf.setTextColor(...colorEstado);
        pdf.text(estado, pdf.internal.pageSize.width - 85, y + 5);

            // Pie de página
            pdf.setFontSize(10);
            pdf.setTextColor(...colorTextoNegro);
            pdf.text('Documento generado electrónicamente', 20, pdf.internal.pageSize.height - 20);
            pdf.text(new Date().toLocaleString('es-CL'), pdf.internal.pageSize.width - 20, pdf.internal.pageSize.height - 20, { align: 'right' });

        // Guardar el PDF
        pdf.save(`${doc.tipo.toUpperCase()}-${doc.numero}.pdf`);

        } catch (error) {
            console.error('Error al generar PDF:', error);
            mostrarError('Error al generar el PDF');
        }
    }

    // Función para mostrar los detalles del documento en el modal
    async function showDocumentDetails(documentId) {
        try {
            mostrarCargando();
            const documento = await obtenerDocumento(documentId);
            
            console.log('Documento obtenido:', documento);
            
            // Actualizar la variable global
            documentoActual = documento;
            
            // Verificar que existan todos los elementos antes de continuar
            const elementos = {
                title: document.getElementById('modalDocumentTitle'),
                date: document.getElementById('modalDocumentDate'),
                department: document.getElementById('modalDocumentDepartment'),
                requester: document.getElementById('modalDocumentRequester'),
                supplier: document.getElementById('modalDocumentSupplier'),
                total: document.getElementById('modalDocumentTotal'),
                itemsTable: document.getElementById('modalItemsTable'),
                approvalHistory: document.getElementById('modalApprovalHistory'),
                modal: document.getElementById('documentModal'),
                // Botones para aprobación
                aprobarBtn: document.getElementById('aprobarBtn'),
                rechazarBtn: document.getElementById('rechazarBtn')
            };
            
            // Verificar si algún elemento no existe
            const elementosFaltantes = Object.entries(elementos)
                .filter(([, elem]) => !elem)
                .map(([nombre]) => nombre);
                
            if (elementosFaltantes.length > 0) {
                throw new Error(`Faltan elementos en el DOM: ${elementosFaltantes.join(', ')}`);
            }
            
            // Rellenar los detalles en el modal
            elementos.title.textContent = `${documento.tipo.toUpperCase()} ${documento.numero}`;
            elementos.date.textContent = `Fecha: ${formatoFecha(documento.fecha)}`;
            elementos.department.textContent = `Departamento: ${documento.departamento || 'No especificado'}`;
            elementos.requester.textContent = `Solicitante: ${documento.solicitante || 'No especificado'}`;
            elementos.supplier.textContent = `Proveedor: ${documento.proveedor || 'No especificado'}`;
            elementos.total.textContent = `Total: $${formatoNumero(documento.total)}`;
            
            // Actualizar el estado visible del documento
            const estadoElement = document.createElement('div');
            estadoElement.className = `inline-block px-3 py-1 text-sm font-semibold rounded-full mt-2 ${
                documento.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                documento.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                documento.estado === 'rechazado' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
            }`;
            estadoElement.textContent = documento.estado.toUpperCase();
            
            // Limpiar cualquier estado anterior
            const estadoContainer = document.getElementById('documentStatus');
            if (estadoContainer) {
                estadoContainer.innerHTML = '';
                estadoContainer.appendChild(estadoElement);
            }
            
            // Deshabilitar botones si el documento no está pendiente ni emitido
            if (documento.estado !== 'pendiente' && documento.estado !== 'emitida') {
                if (elementos.aprobarBtn) {
                    elementos.aprobarBtn.disabled = true;
                    elementos.aprobarBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    elementos.aprobarBtn.title = `Este documento ya ha sido ${documento.estado}`;
                }
                
                if (elementos.rechazarBtn) {
                    elementos.rechazarBtn.disabled = true;
                    elementos.rechazarBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    elementos.rechazarBtn.title = `Este documento ya ha sido ${documento.estado}`;
                }
            } else {
                // Habilitar botones si el documento está pendiente o emitido
                if (elementos.aprobarBtn) {
                    elementos.aprobarBtn.disabled = false;
                    elementos.aprobarBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    elementos.aprobarBtn.title = '';
                }
                
                if (elementos.rechazarBtn) {
                    elementos.rechazarBtn.disabled = false;
                    elementos.rechazarBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    elementos.rechazarBtn.title = '';
                }
            }
            
            // Limpiar la tabla de items
            elementos.itemsTable.innerHTML = `
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
            `;
            
            // Agregar los items a la tabla
            if (documento.items && documento.items.length > 0) {
                documento.items.forEach((item, index) => {
                    const fila = document.createElement('tr');
                    fila.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${index + 1}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.descripcion}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatoNumero(item.cantidad)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$${formatoNumero(item.precio)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${formatoNumero(item.total || (item.precio * item.cantidad))}</td>
                    `;
                    elementos.itemsTable.appendChild(fila);
                });
            } else {
                const filaNoItems = document.createElement('tr');
                filaNoItems.innerHTML = `
                    <td colspan="5" class="px-6 py-4 text-center text-gray-500">No hay ítems disponibles</td>
                `;
                elementos.itemsTable.appendChild(filaNoItems);
            }
            
            // Mostrar el historial de aprobaciones
            elementos.approvalHistory.innerHTML = '';
            
            if (documento.aprobaciones && documento.aprobaciones.length > 0) {
                const listaHistorial = document.createElement('ul');
                listaHistorial.className = 'approval-history-list';
                
                documento.aprobaciones.forEach(aprobacion => {
                    const item = document.createElement('li');
                    const fechaFormateada = formatoFecha(aprobacion.fecha);
                    
                    item.className = `history-item ${aprobacion.accion === 'aprobado' ? 'approved' : 'rejected'}`;
                    item.innerHTML = `
                        <strong>${aprobacion.accion === 'aprobado' ? 'Aprobado' : 'Rechazado'}</strong> por ${aprobacion.usuario} el ${fechaFormateada}
                        ${aprobacion.comentarios ? `<p class="comments">Comentarios: ${aprobacion.comentarios}</p>` : ''}
                    `;
                    
                    listaHistorial.appendChild(item);
                });
                
                elementos.approvalHistory.appendChild(listaHistorial);
        } else {
                elementos.approvalHistory.innerHTML = '<p class="text-gray-500">No hay historial de aprobaciones</p>';
            }
            
            // Mostrar el modal
            elementos.modal.classList.add('active');
            elementos.modal.style.display = 'flex';
            
            console.log('Modal abierto correctamente, documento actual:', documentoActual);
            
            ocultarCargando();
        } catch (error) {
            console.error('Error al mostrar detalles:', error);
            mostrarMensaje('Error al cargar los detalles del documento: ' + error.message, 'error');
            ocultarCargando();
        }
    }

    // Funciones auxiliares
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-CL');
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP'
        }).format(amount);
    }

    function capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Función para inicializar event listeners
    function inicializarEventos() {
        try {
            // Obtener referencias a los elementos
            const modal = document.getElementById('documentModal');
            const closeModal = document.getElementById('closeModal');
            const aprobarBtn = document.getElementById('aprobarBtn');
            const rechazarBtn = document.getElementById('rechazarBtn');
            const cancelarBtn = document.getElementById('cancelarBtn');
            const exportarPDFBtn = document.getElementById('exportarPDFBtn');
            const aplicarFiltrosBtn = document.getElementById('aplicarFiltros');
            const limpiarFiltrosBtn = document.getElementById('limpiarFiltros');
            
            // Validar que existan los elementos necesarios
            if (!modal || !closeModal || !cancelarBtn || !aprobarBtn || !rechazarBtn || 
                !exportarPDFBtn || !aplicarFiltrosBtn || !limpiarFiltrosBtn) {
                console.warn('No se encontraron todos los elementos necesarios para los eventos');
            }

            // Event listeners para el modal
            if (closeModal) closeModal.addEventListener('click', cerrarModal);
            if (cancelarBtn) cancelarBtn.addEventListener('click', cerrarModal);

            // Event listeners para aprobación
            if (isAprobador) {
                if (aprobarBtn) {
                    aprobarBtn.addEventListener('click', function() {
                        console.log('Botón aprobar clickeado, documento actual:', documentoActual);
                        aprobarDocumento('aprobado');
                    });
                }
                
                if (rechazarBtn) {
                    rechazarBtn.addEventListener('click', function() {
                        console.log('Botón rechazar clickeado, documento actual:', documentoActual);
                        aprobarDocumento('rechazado');
                    });
                }
            } else {
                // Si no es aprobador, ocultar los botones de aprobar y rechazar
                if (aprobarBtn) aprobarBtn.style.display = 'none';
                if (rechazarBtn) rechazarBtn.style.display = 'none';
            }

            // Event listener para exportar PDF
            if (exportarPDFBtn) {
                exportarPDFBtn.addEventListener('click', function() {
                    if (documentoActual) {
                        generarPDF(documentoActual);
                    } else {
                        mostrarMensaje('No hay documento seleccionado para exportar', 'error');
                    }
                });
            }

            // Event listeners para filtros
            if (aplicarFiltrosBtn) aplicarFiltrosBtn.addEventListener('click', aplicarFiltros);
            if (limpiarFiltrosBtn) limpiarFiltrosBtn.addEventListener('click', limpiarFiltros);

            // Event listener para cerrar modal al hacer clic fuera
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        cerrarModal();
                    }
                });
            }

            // Event listener para tecla Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                    cerrarModal();
                }
            });

            // Inicializar la vista
            renderDocuments();

        } catch (error) {
            console.error('Error al inicializar eventos:', error);
            mostrarMensaje('Error al inicializar la página', 'error');
        }
    }

    // Inicializar eventos cuando el DOM esté listo
    inicializarEventos();

    // Función para renderizar los documentos
    async function renderDocuments() {
        try {
            const container = document.getElementById('documents-container');
            if (!container) {
                throw new Error('No se encontró el contenedor de documentos');
            }

            // Mostrar indicador de carga
            container.innerHTML = `
                <div class="flex justify-center items-center h-64">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            `;

            // Obtener documentos
            const documentos = await obtenerDocumentos();
            if (!documentos || documentos.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <i class="fas fa-inbox text-gray-400 text-4xl mb-4"></i>
                        <p class="text-gray-500 text-lg">No hay documentos para mostrar</p>
                    </div>
                `;
                return;
            }

            // Crear grid de documentos
            container.innerHTML = '';
            documentos.forEach(doc => {
                const card = createDocumentCard(doc);
                container.appendChild(card);
            });

        } catch (error) {
            console.error('Error al renderizar documentos:', error);
            mostrarError('Error al cargar los documentos');
            
            // Mostrar mensaje de error en el contenedor
            const container = document.getElementById('documents-container');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <i class="fas fa-exclamation-circle text-red-400 text-4xl mb-4"></i>
                        <p class="text-red-500 text-lg">Error al cargar los documentos</p>
                        <button onclick="renderDocuments()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                            Reintentar
                        </button>
                    </div>
                `;
            }
        }
    }

    // Función para mostrar mensajes al usuario
    function mostrarMensaje(mensaje, tipo = 'success') {
        try {
            const alertContainer = document.getElementById('alert-container');
            if (!alertContainer) {
                console.error('No se encontró el contenedor de alertas');
                return;
            }

            // Remover alertas anteriores
            const alertasAnteriores = alertContainer.querySelectorAll('.alert');
            alertasAnteriores.forEach(alerta => alerta.remove());

            // Crear nueva alerta
            const alerta = document.createElement('div');
            alerta.className = `alert alert-${tipo} fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md`;
            
            // Estilos según el tipo de mensaje
            const estilos = {
                success: 'bg-green-100 border border-green-400 text-green-700',
                error: 'bg-red-100 border border-red-400 text-red-700',
                warning: 'bg-yellow-100 border border-yellow-400 text-yellow-700',
                info: 'bg-blue-100 border border-blue-400 text-blue-700'
            };

            alerta.innerHTML = `
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        ${tipo === 'success' ? '<i class="fas fa-check-circle text-green-500"></i>' :
                          tipo === 'error' ? '<i class="fas fa-exclamation-circle text-red-500"></i>' :
                          tipo === 'warning' ? '<i class="fas fa-exclamation-triangle text-yellow-500"></i>' :
                          '<i class="fas fa-info-circle text-blue-500"></i>'}
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium">${mensaje}</p>
                    </div>
                    <div class="ml-auto pl-3">
                        <div class="-mx-1.5 -my-1.5">
                            <button class="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2">
                                <span class="sr-only">Cerrar</span>
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Agregar la alerta al contenedor
            alertContainer.appendChild(alerta);

            // Agregar evento para cerrar la alerta
            const closeButton = alerta.querySelector('button');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    alerta.remove();
                });
            }

            // Auto-remover después de 5 segundos
            setTimeout(() => {
                if (alerta.parentNode) {
                    alerta.remove();
                }
            }, 5000);

        } catch (error) {
            console.error('Error al mostrar mensaje:', error);
        }
    }

    // Función para mostrar errores
    function mostrarError(mensaje) {
        mostrarMensaje(mensaje, 'error');
    }

    // Función para aplicar filtros
    async function aplicarFiltros() {
        try {
            // Obtener valores de los filtros
        const tipoFiltro = document.getElementById('tipoDocumento').value;
        const estadoFiltro = document.getElementById('estado').value;
        const fechaDesde = document.getElementById('fechaDesde').value;
        const fechaHasta = document.getElementById('fechaHasta').value;

            // Validar fechas
            if (fechaDesde && fechaHasta && new Date(fechaDesde) > new Date(fechaHasta)) {
                mostrarError('La fecha inicial no puede ser mayor que la fecha final');
                return;
            }

            // Construir objeto de filtros
            const filtros = {};

            // Agregar filtros solo si tienen valor
            if (tipoFiltro !== 'todos') {
                filtros.tipo = tipoFiltro;
            }

            if (estadoFiltro !== 'todos') {
                filtros.estado = estadoFiltro;
            }

            if (fechaDesde) {
                filtros.fecha_desde = fechaDesde;
            }

            if (fechaHasta) {
                filtros.fecha_hasta = fechaHasta;
            }

            // Si el usuario es admin, mostrar todos los documentos
            if (userData.type === 'admin') {
                delete filtros.estado;
            }

            // Mostrar indicador de carga
            const container = document.getElementById('documents-container');
            if (container) {
                container.innerHTML = `
                    <div class="flex justify-center items-center h-64">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                `;
            }

            // Obtener documentos filtrados
        const documentos = await obtenerDocumentos(filtros);

            // Actualizar la vista
            if (container) {
                if (!documentos || documentos.length === 0) {
                    container.innerHTML = `
                        <div class="text-center py-12">
                            <i class="fas fa-search text-gray-400 text-4xl mb-4"></i>
                            <p class="text-gray-500 text-lg">No se encontraron documentos con los filtros seleccionados</p>
                        </div>
                    `;
                } else {
                    container.innerHTML = '';
                    documentos.forEach(doc => {
                        const card = createDocumentCard(doc);
                        container.appendChild(card);
                    });
                }
            }

        } catch (error) {
            console.error('Error al aplicar filtros:', error);
            mostrarError('Error al filtrar los documentos');
        }
    }

    // Función para limpiar filtros
    async function limpiarFiltros() {
        try {
            // Obtener elementos de los filtros
            const tipoSelect = document.getElementById('tipoDocumento');
            const estadoSelect = document.getElementById('estado');
            const fechaDesdeInput = document.getElementById('fechaDesde');
            const fechaHastaInput = document.getElementById('fechaHasta');

            // Validar que existan los elementos
            if (!tipoSelect || !estadoSelect || !fechaDesdeInput || !fechaHastaInput) {
                throw new Error('No se encontraron los elementos de filtro');
            }

            // Restablecer valores
            tipoSelect.value = 'todos';
            estadoSelect.value = 'todos';
            fechaDesdeInput.value = '';
            fechaHastaInput.value = '';

            // Mostrar indicador de carga
            const container = document.getElementById('documents-container');
            if (container) {
                container.innerHTML = `
                    <div class="flex justify-center items-center h-64">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                `;
            }

            // Obtener todos los documentos sin filtros
            const documentos = await obtenerDocumentos();

            // Actualizar la vista
            if (container) {
                if (!documentos || documentos.length === 0) {
                    container.innerHTML = `
                        <div class="text-center py-12">
                            <i class="fas fa-inbox text-gray-400 text-4xl mb-4"></i>
                            <p class="text-gray-500 text-lg">No hay documentos para mostrar</p>
                        </div>
                    `;
                } else {
                    container.innerHTML = '';
        documentos.forEach(doc => {
                        const card = createDocumentCard(doc);
                        container.appendChild(card);
                    });
                }
            }

            // Mostrar mensaje de éxito
            mostrarMensaje('Filtros limpiados exitosamente', 'success');

        } catch (error) {
            console.error('Error al limpiar filtros:', error);
            mostrarError('Error al limpiar los filtros');
        }
    }

    // Función para cerrar el modal
    function cerrarModal() {
        try {
            // Obtener el modal y el formulario
            const modal = document.getElementById('documentModal');
            const form = document.getElementById('approvalForm');
            const comentarios = document.getElementById('comentarios');

            // Validar que existan los elementos
            if (!modal) {
                console.error('No se encontró el elemento modal');
                return;
            }

            // Limpiar el formulario si existe
            if (form) form.reset();
            if (comentarios) comentarios.value = '';

            // Restaurar botones
            const aprobarButton = document.getElementById('aprobarBtn');
            const rechazarButton = document.getElementById('rechazarBtn');
            const cancelarButton = document.getElementById('cancelarBtn');
            
            if (aprobarButton) aprobarButton.disabled = false;
            if (rechazarButton) rechazarButton.disabled = false;
            if (cancelarButton) cancelarButton.disabled = false;

            // Cerrar el modal
            modal.classList.remove('active');
            modal.style.display = 'none';

            // Limpiar la referencia al documento actual
            documentoActual = null;

            console.log('Modal cerrado correctamente');

        } catch (error) {
            console.error('Error al cerrar el modal:', error);
            mostrarMensaje('Error al cerrar el modal', 'error');
        }
    }

    // Función para formatear fechas
    function formatoFecha(fechaStr) {
        if (!fechaStr) return 'No disponible';
        
        try {
            const fecha = new Date(fechaStr);
            return fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Error al formatear fecha:', error);
            return fechaStr;
        }
    }

    // Función para formatear números
    function formatoNumero(numero) {
        if (numero === null || numero === undefined) return '0';
        
        try {
            return Number(numero).toLocaleString('es-ES', {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
            });
        } catch (error) {
            console.error('Error al formatear número:', error);
            return numero;
        }
    }

    // Función para mostrar el indicador de carga
    function mostrarCargando() {
        const loaderElement = document.getElementById('loader') || crearElementoLoader();
        loaderElement.style.display = 'flex';
    }

    // Función para ocultar el indicador de carga
    function ocultarCargando() {
        const loaderElement = document.getElementById('loader');
        if (loaderElement) {
            loaderElement.style.display = 'none';
        }
    }

    // Función para crear el elemento loader si no existe
    function crearElementoLoader() {
        const loaderElement = document.createElement('div');
        loaderElement.id = 'loader';
        loaderElement.className = 'loader-overlay';
        loaderElement.innerHTML = '<div class="loader-spinner"></div>';
        loaderElement.style.display = 'none';
        document.body.appendChild(loaderElement);
        return loaderElement;
    }

    // Función para mostrar mensajes
    function mostrarMensaje(mensaje, tipo = 'info') {
        const mensajeElement = document.createElement('div');
        mensajeElement.className = `mensaje mensaje-${tipo}`;
        mensajeElement.textContent = mensaje;
        document.body.appendChild(mensajeElement);
        
        // Mostrar con animación
        setTimeout(() => {
            mensajeElement.classList.add('visible');
        }, 10);
        
        // Ocultar después de un tiempo
        setTimeout(() => {
            mensajeElement.classList.remove('visible');
            setTimeout(() => {
                mensajeElement.remove();
            }, 300);
        }, 3000);
    }
}); 