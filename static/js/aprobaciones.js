document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario es un aprobador o admin
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const isAprobador = userData.type === 'aprobador' || userData.type === 'admin';

    const documentList = document.querySelector('.document-list');
    const modal = document.getElementById('approvalModal');
    const closeModal = document.querySelector('.close-modal');
    const aprobarBtn = document.getElementById('aprobar');
    const rechazarBtn = document.getElementById('rechazar');
    const cancelarBtn = document.getElementById('cancelar');
    const aplicarFiltrosBtn = document.getElementById('aplicarFiltros');
    const exportarPDFBtn = document.getElementById('exportarPDF');
    
    let documentoActual = null;

    // Función para obtener documentos del backend
    async function obtenerDocumentos(filtros = {}) {
        try {
            const params = new URLSearchParams(filtros);
            const response = await fetch(`/api/documentos?${params}`);
            if (!response.ok) throw new Error('Error al obtener documentos');
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar los documentos');
            return [];
        }
    }

    // Función para obtener un documento específico
    async function obtenerDocumento(id) {
        try {
            const response = await fetch(`/api/documentos/${id}`);
            if (!response.ok) throw new Error('Error al obtener el documento');
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar el documento');
            return null;
        }
    }

    // Función para aprobar un documento
    async function aprobarDocumento(id, comentarios) {
        try {
            const response = await fetch(`/api/documentos/${id}/aprobar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usuario: userData.username,
                    comentarios: comentarios
                })
            });
            if (!response.ok) throw new Error('Error al aprobar el documento');
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al aprobar el documento');
            return null;
        }
    }

    // Función para rechazar un documento
    async function rechazarDocumento(id, comentarios) {
        try {
            const response = await fetch(`/api/documentos/${id}/rechazar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usuario: userData.username,
                    comentarios: comentarios
                })
            });
            if (!response.ok) throw new Error('Error al rechazar el documento');
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al rechazar el documento');
            return null;
        }
    }

    // Función para crear una tarjeta de documento
    function createDocumentCard(doc) {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.innerHTML = `
            <h3>${doc.tipo === 'sp' ? 'Solicitud de Pedido' : 'Orden de Compra'} - ${doc.numero}</h3>
            <div class="document-info">
                <p><strong>${doc.tipo === 'sp' ? 'Solicitante' : 'Proveedor'}:</strong> ${doc.tipo === 'sp' ? doc.solicitante : doc.proveedor}</p>
                <p><strong>Fecha:</strong> ${formatDate(doc.fecha)}</p>
                ${doc.tipo === 'oc' ? `<p><strong>Total:</strong> ${formatCurrency(doc.total)}</p>` : ''}
                <p><span class="document-status status-${doc.estado}">${capitalizeFirst(doc.estado)}</span></p>
            </div>
            <div class="document-actions">
                <button class="btn btn-primary btn-sm">Revisar</button>
            </div>
        `;

        // Agregar evento click para mostrar detalles
        card.addEventListener('click', () => showDocumentDetails(doc.id));
        return card;
    }

    // Función para generar el PDF
    function generarPDF(doc) {
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
        
        // Agregar logo
        const logo = new Image();
        logo.src = 'img/logo.png';
        pdf.addImage(logo, 'PNG', 20, 10, 30, 30);
        
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
        pdf.setTextColor(
            estado === 'APROBADO' ? ...colorPrimario :
            estado === 'RECHAZADO' ? ...colorSecundario :
            [249, 168, 37]  // Amarillo para pendiente
        );
        
        pdf.text(estado, pdf.internal.pageSize.width - 85, y + 5);

        // Pie de página
        pdf.setFontSize(10);
        pdf.setTextColor(...colorTextoNegro);
        pdf.text('Documento generado electrónicamente', 20, pdf.internal.pageSize.height - 20);
        pdf.text(new Date().toLocaleString('es-CL'), pdf.internal.pageSize.width - 20, pdf.internal.pageSize.height - 20, { align: 'right' });

        // Guardar el PDF
        pdf.save(`${doc.tipo.toUpperCase()}-${doc.numero}.pdf`);
    }

    // Función para mostrar los detalles del documento en el modal
    async function showDocumentDetails(id) {
        const doc = await obtenerDocumento(id);
        if (!doc) return;

        documentoActual = doc;
        const detailsContainer = modal.querySelector('.document-details');
        detailsContainer.innerHTML = `
            <h3>${doc.tipo === 'sp' ? 'Solicitud de Pedido' : 'Orden de Compra'} - ${doc.numero}</h3>
            <div class="details-grid">
                <p><strong>${doc.tipo === 'sp' ? 'Solicitante' : 'Proveedor'}:</strong> ${doc.tipo === 'sp' ? doc.solicitante : doc.proveedor}</p>
                <p><strong>Fecha:</strong> ${formatDate(doc.fecha)}</p>
                ${doc.tipo === 'sp' ? `<p><strong>Departamento:</strong> ${doc.departamento}</p>` : 
                                    `<p><strong>RUT:</strong> ${doc.rut}</p>`}
                <p><strong>Estado:</strong> <span class="document-status status-${doc.estado}">${capitalizeFirst(doc.estado)}</span></p>
            </div>
            <div class="items-table">
                <h4>Ítems</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Descripción</th>
                            <th>Cantidad</th>
                            ${doc.tipo === 'oc' ? '<th>Precio</th><th>Total</th>' : '<th>Unidad</th>'}
                        </tr>
                    </thead>
                    <tbody>
                        ${doc.items.map(item => `
                            <tr>
                                <td>${item.descripcion}</td>
                                <td>${item.cantidad}</td>
                                ${doc.tipo === 'oc' ? 
                                    `<td>${formatCurrency(item.precio)}</td>
                                     <td>${formatCurrency(item.precio * item.cantidad)}</td>` : 
                                    `<td>${item.unidad}</td>`}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${doc.aprobaciones && doc.aprobaciones.length > 0 ? `
                <div class="aprobaciones-section">
                    <h4>Historial de Aprobaciones</h4>
                    <div class="aprobaciones-list">
                        ${doc.aprobaciones.map(apr => `
                            <div class="aprobacion-item">
                                <p><strong>Usuario:</strong> ${apr.usuario}</p>
                                <p><strong>Fecha:</strong> ${formatDate(apr.fecha)}</p>
                                <p><strong>Acción:</strong> ${capitalizeFirst(apr.accion)}</p>
                                <p><strong>Comentarios:</strong> ${apr.comentarios}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        // Mostrar/ocultar formulario de aprobación según el rol y estado
        const approvalForm = modal.querySelector('.approval-form');
        if ((isAprobador && doc.estado === 'pendiente') || userData.type === 'admin') {
            approvalForm.style.display = 'block';
        } else {
            approvalForm.style.display = 'none';
        }

        modal.classList.add('active');
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

    // Event Listeners
    closeModal.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    cancelarBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Verificar si el usuario tiene permisos de aprobación (aprobador o admin)
    if (isAprobador) {
        aprobarBtn.addEventListener('click', async () => {
            const comentarios = document.getElementById('comentarios').value;
            if (!comentarios.trim()) {
                alert('Por favor, ingrese un comentario antes de aprobar.');
                return;
            }

            const resultado = await aprobarDocumento(documentoActual.id, comentarios);
            if (resultado) {
                alert('Documento aprobado exitosamente');
                modal.classList.remove('active');
                renderDocuments();
            }
        });

        rechazarBtn.addEventListener('click', async () => {
            const comentarios = document.getElementById('comentarios').value;
            if (!comentarios.trim()) {
                alert('Por favor, ingrese un comentario antes de rechazar.');
                return;
            }

            const resultado = await rechazarDocumento(documentoActual.id, comentarios);
            if (resultado) {
                alert('Documento rechazado exitosamente');
                modal.classList.remove('active');
                renderDocuments();
            }
        });
    }

    exportarPDFBtn.addEventListener('click', () => {
        if (documentoActual) {
            generarPDF(documentoActual);
        }
    });

    aplicarFiltrosBtn.addEventListener('click', renderDocuments);

    // Función para renderizar los documentos
    async function renderDocuments() {
        const tipoFiltro = document.getElementById('tipoDocumento').value;
        const estadoFiltro = document.getElementById('estado').value;
        const fechaDesde = document.getElementById('fechaDesde').value;
        const fechaHasta = document.getElementById('fechaHasta').value;

        const filtros = {
            estado: estadoFiltro
        };

        // Solo agregar el tipo si no es 'todos'
        if (tipoFiltro !== 'todos') {
            filtros.tipo = tipoFiltro;
        }

        // Agregar fechas si están definidas
        if (fechaDesde) {
            filtros.fecha_desde = fechaDesde;
        }
        if (fechaHasta) {
            filtros.fecha_hasta = fechaHasta;
        }

        // Si el usuario es admin, mostrar todos los documentos
        if (userData.type === 'admin') {
            delete filtros.estado; // Eliminar el filtro de estado para admin
        }

        const documentos = await obtenerDocumentos(filtros);
        documentList.innerHTML = '';

        if (documentos.length === 0) {
            documentList.innerHTML = '<p class="no-documents">No hay documentos que mostrar</p>';
            return;
        }

        documentos.forEach(doc => {
            const card = createDocumentCard(doc);
            documentList.appendChild(card);
        });
    }

    // Renderizar documentos al cargar la página
    renderDocuments();
}); 