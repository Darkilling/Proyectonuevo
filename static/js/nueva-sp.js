document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    if (!userData.username) {
        window.location.href = '/login';
        return;
    }

    // Actualizar nombre de usuario
    document.getElementById('userName').textContent = userData.username;

    // Generar número de SP automático
    generarNumeroSP();

    // Manejar envío del formulario
    const spForm = document.getElementById('spForm');
    if (spForm) {
        spForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await guardarSolicitud();
        });
    }

    // Manejar cambio de tipo
    const tipoSelect = document.getElementById('tipo');
    if (tipoSelect) {
        tipoSelect.addEventListener('change', mostrarCamposTipo);
    }

    // Manejar adjuntar documento
    const btnAdjuntar = document.getElementById('btnAdjuntar');
    if (btnAdjuntar) {
        btnAdjuntar.addEventListener('click', adjuntarDocumento);
    }
});

// Función para generar número de SP automático
async function generarNumeroSP() {
    try {
        // Simulamos la generación del número por ahora
        const fecha = new Date();
        const año = fecha.getFullYear().toString().substr(-2);
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        const nuevoNumero = `SP${año}${mes}-${random}`;
        
        const numeroInput = document.getElementById('numero');
        if (numeroInput) {
            numeroInput.value = nuevoNumero;
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al generar el número de SP');
    }
}

// Función para mostrar campos según el tipo seleccionado
function mostrarCamposTipo() {
    const tipo = document.getElementById('tipo').value;
    const camposServicio = document.getElementById('camposServicio');
    const camposMaterial = document.getElementById('camposMaterial');

    if (!camposServicio || !camposMaterial) return;

    // Ocultar todos los campos
    camposServicio.classList.add('hidden');
    camposMaterial.classList.add('hidden');

    // Mostrar campos según el tipo seleccionado
    if (tipo === 'servicio') {
        camposServicio.classList.remove('hidden');
        // Hacer campos de servicio requeridos
        const camposRequeridos = ['rut', 'razonSocial', 'jefeProyecto'];
        camposRequeridos.forEach(campo => {
            const input = document.getElementById(campo);
            if (input) input.required = true;
        });
    } else if (tipo === 'material') {
        camposMaterial.classList.remove('hidden');
        // Hacer campos de material requeridos
        const camposRequeridos = ['nombreMaterial', 'cantidad', 'cecoMaterial', 'descripcion'];
        camposRequeridos.forEach(campo => {
            const input = document.getElementById(campo);
            if (input) input.required = true;
        });
    }
}

// Función para adjuntar documento
function adjuntarDocumento() {
    const input = document.getElementById('documento');
    if (!input || !input.files[0]) {
        mostrarError('Por favor seleccione un archivo');
        return;
    }

    const file = input.files[0];

    // Validar tipo de archivo
    const tiposPermitidos = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png'];
    if (!tiposPermitidos.includes(file.type)) {
        mostrarError('Tipo de archivo no permitido');
        return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
        mostrarError('El archivo no debe superar los 5MB');
            return;
        }

    // Mostrar documento adjunto
    const documentosAdjuntos = document.getElementById('documentosAdjuntos');
    if (!documentosAdjuntos) return;

    const documentoElement = document.createElement('div');
    documentoElement.className = 'documento-adjunto';
    documentoElement.innerHTML = `
        <div class="documento-info">
            <i class="fas ${getIconoArchivo(file.type)}"></i>
            <span>${file.name}</span>
        </div>
        <button onclick="this.parentElement.remove()" class="btn-eliminar">
            <i class="fas fa-times"></i>
        </button>
    `;
    documentosAdjuntos.appendChild(documentoElement);
    input.value = ''; // Limpiar input
}

// Función para obtener el ícono según el tipo de archivo
function getIconoArchivo(tipo) {
    switch (tipo) {
        case 'application/pdf':
            return 'fa-file-pdf';
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            return 'fa-file-excel';
        case 'image/jpeg':
        case 'image/png':
            return 'fa-file-image';
        default:
            return 'fa-file';
    }
}

// Función para guardar la solicitud
async function guardarSolicitud() {
    try {
        const tipo = document.getElementById('tipo').value;
        
        // Datos básicos de la solicitud
        const solicitud = {
            tipo: 'sp',
            numero: document.getElementById('numero').value,
            solicitante: document.getElementById('solicitante').value,
            departamento: document.getElementById('departamento').value,
            fecha: new Date().toISOString().split('T')[0],
            estado: 'pendiente',
            proveedor: document.getElementById('proveedor').value,
            rut: document.getElementById('rut').value,
            total: parseFloat(document.getElementById('total').value) || 0,
            items: []
        };

        // Agregar datos específicos según el tipo
        if (tipo === 'servicio') {
            solicitud.jefe_proyecto = document.getElementById('jefeProyecto').value;
        } else if (tipo === 'material') {
            const item = {
                descripcion: document.getElementById('nombreMaterial').value,
                cantidad: parseInt(document.getElementById('cantidad').value, 10),
                unidad: document.getElementById('unidad').value,
                precio: parseFloat(document.getElementById('precio').value) || 0
            };
            solicitud.items.push(item);
        }

        // Realizar la petición POST
        const response = await fetch('/api/documentos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(solicitud)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al guardar la solicitud');
        }

        const result = await response.json();
        mostrarMensaje('Solicitud guardada exitosamente', 'success');
        setTimeout(() => {
            window.location.href = '/ver-solicitudes.html';
        }, 1500);
    } catch (error) {
        console.error('Error:', error);
        mostrarError(error.message || 'Error al guardar la solicitud. Por favor, intente nuevamente.');
    }
}

// Funciones auxiliares para mostrar mensajes
function mostrarMensaje(mensaje, tipo) {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo === 'success' ? 'success' : 'danger'}`;
    alerta.innerHTML = `
        <div class="alert-content">
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${mensaje}</span>
        </div>
        <button onclick="this.parentElement.remove()" class="alert-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    document.body.appendChild(alerta);
    setTimeout(() => alerta.remove(), 3000);
}

function mostrarError(mensaje) {
    mostrarMensaje(mensaje, 'error');
} 