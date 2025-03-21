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

    // Manejar agregar material
    const addItemButton = document.getElementById('addItem');
    if (addItemButton) {
        addItemButton.addEventListener('click', function() {
            agregarMaterial();
        });
    }

    // Manejar adjuntar documento
    const btnAdjuntar = document.getElementById('btnAdjuntar');
    if (btnAdjuntar) {
        btnAdjuntar.addEventListener('click', adjuntarDocumento);
    }
});

// Variable para contar ítems
let itemCount = 0;

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
    const datosProveedor = document.getElementById('datosProveedor');

    if (!camposServicio || !camposMaterial) return;

    // Ocultar todos los campos específicos
    camposServicio.classList.add('hidden');
    camposMaterial.classList.add('hidden');
    
    // Mostrar/ocultar datos del proveedor
    if (tipo) {
        datosProveedor.classList.remove('hidden');
    } else {
        datosProveedor.classList.add('hidden');
    }

    // Mostrar campos según el tipo seleccionado
    if (tipo === 'servicio') {
        camposServicio.classList.remove('hidden');
        // Hacer campos de servicio requeridos
        const camposRequeridos = ['rutProveedor', 'nombreProveedor', 'jefeProyecto', 'descripcionServicio'];
        camposRequeridos.forEach(campo => {
            const input = document.getElementById(campo);
            if (input) input.required = true;
        });
    } else if (tipo === 'material') {
        camposMaterial.classList.remove('hidden');
        
        // Agregar primer material si no hay ninguno
        const itemsContainer = document.getElementById('items-container');
        if (itemsContainer && itemsContainer.children.length === 0) {
            agregarMaterial();
        }
    }
}

// Función para agregar un nuevo material
function agregarMaterial() {
    const itemsContainer = document.getElementById('items-container');
    if (!itemsContainer) return;

        const itemRow = document.createElement('div');
    itemRow.className = 'item-row bg-gray-50 p-4 rounded-lg relative';
        itemRow.innerHTML = `
        <button type="button" class="absolute top-2 right-2 text-red-500 hover:text-red-700" onclick="eliminarMaterial(this)">
            <i class="fas fa-times"></i>
        </button>
        <h3 class="text-md font-medium text-gray-700 mb-3">Material ${itemCount + 1}</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del Material</label>
                <input type="text" name="items[${itemCount}][descripcion]" required class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                <input type="number" name="items[${itemCount}][cantidad]" required min="1" class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                <input type="text" name="items[${itemCount}][unidad]" class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            </div>
        </div>
        <div class="mt-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea name="items[${itemCount}][detalle]" rows="2" class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea>
        </div>
    `;
    
    itemsContainer.appendChild(itemRow);
    itemCount++;
}

// Función para eliminar un material
window.eliminarMaterial = function(button) {
    const itemRow = button.closest('.item-row');
    itemRow.classList.add('opacity-0');
    setTimeout(() => {
            itemRow.remove();
        renumerarMateriales();
    }, 300);
};

// Función para renumerar los materiales después de eliminar uno
function renumerarMateriales() {
    const items = document.querySelectorAll('.item-row');
    items.forEach((item, index) => {
        const title = item.querySelector('h3');
        if (title) {
            title.textContent = `Material ${index + 1}`;
        }
        
        // Actualizar nombres de los campos
        const inputs = item.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                const name = input.getAttribute('name');
                if (name) {
                input.setAttribute('name', name.replace(/items\[\d+\]/, `items[${index}]`));
                }
            });
        });
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
    documentoElement.className = 'documento-adjunto flex justify-between items-center p-2 bg-gray-100 rounded';
    documentoElement.innerHTML = `
        <div class="documento-info flex items-center">
            <i class="fas ${getIconoArchivo(file.type)} mr-2 text-blue-500"></i>
            <span class="text-sm">${file.name}</span>
        </div>
        <button onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700">
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
        if (!tipo) {
            mostrarError('Debe seleccionar un tipo de solicitud');
            return;
        }

        // Datos básicos de la solicitud
        const solicitud = {
            tipo: 'sp',
            numero: document.getElementById('numero').value,
            departamento: document.getElementById('departamento').value,
            fecha: new Date().toISOString().split('T')[0],
            estado: 'pendiente',
            proveedor: document.getElementById('nombreProveedor').value,
            rut: document.getElementById('rutProveedor').value,
            total: 0,
            items: []
        };

        // Fecha estimada de entrega
        if (document.getElementById('fechaEntrega').value) {
            solicitud.fecha_entrega = document.getElementById('fechaEntrega').value;
        }

        // Agregar datos específicos según el tipo
        if (tipo === 'servicio') {
            solicitud.jefe_proyecto = document.getElementById('jefeProyecto').value;
            solicitud.descripcion = document.getElementById('descripcionServicio').value;
            solicitud.condicion_pago = document.getElementById('condicionPago').value;
            solicitud.fecha_inicio_servicio = document.getElementById('fechaInicioServicio').value;
            solicitud.fecha_fin_servicio = document.getElementById('fechaFinServicio').value;
            
            // Recoger checklist
            solicitud.checklist = {
                especificaciones: document.getElementById('checklist1').checked,
                documentacion: document.getElementById('checklist2').checked,
                certificaciones: document.getElementById('checklist3').checked,
                inspeccion: document.getElementById('checklist4').checked
            };
            
            // Recoger servicios seleccionados
            solicitud.servicios = [];
            for (let i = 1; i <= 5; i++) {
                const servicioCheckbox = document.getElementById(`servicio${i}`);
                if (servicioCheckbox && servicioCheckbox.checked) {
                    solicitud.servicios.push(servicioCheckbox.nextElementSibling.textContent.trim());
                }
            }
            
            // Crear un solo ítem para el servicio
            const item = {
                descripcion: 'Servicio: ' + document.getElementById('descripcionServicio').value,
                cantidad: 1,
                unidad: 'Servicio',
                precio: 0
            };
            solicitud.items.push(item);
        } else if (tipo === 'material') {
            // Recoger todos los materiales
            const itemRows = document.querySelectorAll('.item-row');
            let total = 0;
            
            itemRows.forEach((row, index) => {
                const descripcion = row.querySelector(`input[name="items[${index}][descripcion]"]`).value;
                const cantidad = parseInt(row.querySelector(`input[name="items[${index}][cantidad]"]`).value, 10);
                const unidad = row.querySelector(`input[name="items[${index}][unidad]"]`).value || 'Unidad';
                const detalle = row.querySelector(`textarea[name="items[${index}][detalle]"]`).value;
                
                const item = {
                    descripcion: descripcion,
                    cantidad: cantidad,
                    unidad: unidad,
                    detalle: detalle,
                    precio: 0
                };
                
                solicitud.items.push(item);
            });
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
            window.location.href = '/solicitudes.html';
        }, 1500);
    } catch (error) {
        console.error('Error:', error);
        mostrarError(error.message || 'Error al guardar la solicitud. Por favor, intente nuevamente.');
    }
}

// Funciones auxiliares para mostrar mensajes
function mostrarMensaje(mensaje, tipo) {
    const alerta = document.createElement('div');
    alerta.className = `fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg ${tipo === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`;
    alerta.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${mensaje}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-auto">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(alerta);
    
    // Animación de entrada
    alerta.style.opacity = '0';
    alerta.style.transform = 'translateY(-20px)';
    alerta.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    setTimeout(() => {
        alerta.style.opacity = '1';
        alerta.style.transform = 'translateY(0)';
    }, 10);
    
    // Remover después de un tiempo
    setTimeout(() => {
        alerta.style.opacity = '0';
        alerta.style.transform = 'translateY(-20px)';
        setTimeout(() => alerta.remove(), 300);
    }, 5000);
}

function mostrarError(mensaje) {
    mostrarMensaje(mensaje, 'error');
} 