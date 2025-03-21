// Variables globales
let nextItemId = 1;
let userData;
let items = [];

// Función para verificar si el usuario tiene sesión
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    if (!userData.username) {
        window.location.href = 'login.html';
        return;
    }
    
    // Actualizar nombre de usuario
    document.getElementById('userName').textContent = userData.username;
    document.getElementById('solicitante').value = userData.nombre ? `${userData.nombre} ${userData.apellido || ''}` : userData.username;
    
    // Generar número de OC
    generarNumeroOC();
    
    // Establecer fecha de emisión actual
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaEmision').value = hoy;
    
    // Agregar el primer item por defecto
    agregarItem();
    
    // Event listeners
    document.getElementById('agregarItem').addEventListener('click', agregarItem);
    document.getElementById('ordenCompraForm').addEventListener('submit', guardarOrden);
    document.getElementById('btnVolver').addEventListener('click', function() {
        window.location.href = 'ordenes-compra.html';
    });
    document.getElementById('cerrarSesion').addEventListener('click', function() {
        sessionStorage.removeItem('userData');
        window.location.href = 'login.html';
    });
    
    // Event delegation para eliminar ítems
    document.getElementById('itemsContainer').addEventListener('click', function(e) {
        if (e.target.classList.contains('eliminar-item') || e.target.parentElement.classList.contains('eliminar-item')) {
            const button = e.target.classList.contains('eliminar-item') ? e.target : e.target.parentElement;
            const itemRow = button.closest('.item-row');
            eliminarItem(itemRow);
        }
    });
    
    // Event delegation para calcular totales cuando se modifican valores
    document.getElementById('itemsContainer').addEventListener('input', function(e) {
        const target = e.target;
        if (target.classList.contains('item-cantidad') || 
            target.classList.contains('item-precio') || 
            target.classList.contains('item-descuento')) {
            const itemRow = target.closest('.item-row');
            calcularTotalItem(itemRow);
            calcularTotales();
                }
            });
        });

function generarNumeroOC() {
    // Generar un número de OC basado en la fecha y un número aleatorio
    const fecha = new Date();
    const year = fecha.getFullYear().toString().substring(2);
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const numeroOC = `OC${year}${month}-${random}`;
    document.getElementById('numeroOC').value = numeroOC;
}

function agregarItem() {
    const itemsContainer = document.getElementById('itemsContainer');
    const template = document.getElementById('itemTemplate').innerHTML;
    
    // Reemplazar el ID del ítem en el template
    const itemHtml = template.replaceAll('{itemId}', nextItemId);
    
    // Crear un elemento div para el nuevo ítem
    const itemDiv = document.createElement('div');
    itemDiv.innerHTML = itemHtml;
    
    // Agregar el elemento al contenedor
    itemsContainer.appendChild(itemDiv.firstElementChild);
    
    // Incrementar el contador de ID para el siguiente ítem
    nextItemId++;
    
    // Renumerar todos los ítems
    renumerarItems();
    
    // Calcular totales
    calcularTotales();
}

function eliminarItem(itemRow) {
    if (document.querySelectorAll('.item-row').length === 1) {
        mostrarError('Debe haber al menos un ítem en la orden');
        return;
    }
    
    itemRow.remove();
    
    // Renumerar todos los ítems
    renumerarItems();
    
    // Recalcular totales
    calcularTotales();
}

function renumerarItems() {
    const items = document.querySelectorAll('.item-row');
    items.forEach((item, index) => {
        item.querySelector('.item-number').textContent = index + 1;
    });
}

function calcularTotalItem(itemRow) {
    const cantidad = parseFloat(itemRow.querySelector('.item-cantidad').value) || 0;
    const precio = parseFloat(itemRow.querySelector('.item-precio').value) || 0;
    const descuentoPorcentaje = parseFloat(itemRow.querySelector('.item-descuento').value) || 0;
    
    const subtotal = cantidad * precio;
    const descuento = subtotal * (descuentoPorcentaje / 100);
    const total = subtotal - descuento;
    
    itemRow.querySelector('.item-total').value = formatearNumero(total);
}

function calcularTotales() {
    let subtotal = 0;
    let descuentoTotal = 0;
    
    // Calcular subtotal y descuento
    document.querySelectorAll('.item-row').forEach(item => {
        const cantidad = parseFloat(item.querySelector('.item-cantidad').value) || 0;
        const precio = parseFloat(item.querySelector('.item-precio').value) || 0;
        const descuentoPorcentaje = parseFloat(item.querySelector('.item-descuento').value) || 0;
        
        const itemSubtotal = cantidad * precio;
        const itemDescuento = itemSubtotal * (descuentoPorcentaje / 100);
        
        subtotal += itemSubtotal;
        descuentoTotal += itemDescuento;
    });
    
    // Calcular IVA y total
    const iva = (subtotal - descuentoTotal) * 0.19;
    const total = subtotal - descuentoTotal + iva;
    
    // Actualizar valores en la interfaz
    document.getElementById('subtotal').value = formatearNumero(subtotal);
    document.getElementById('descuento').value = formatearNumero(descuentoTotal);
    document.getElementById('iva').value = formatearNumero(iva);
    document.getElementById('total').value = formatearNumero(total);
}

async function guardarOrden(e) {
        e.preventDefault();

    // Validación básica del formulario
    const form = document.getElementById('ordenCompraForm');
    if (!form.checkValidity()) {
        // Mostrar mensajes de validación del navegador
        form.reportValidity();
            return;
        }

    // Construir objeto de orden de compra
        const orden = {
        tipo: 'oc',
        numero: document.getElementById('numeroOC').value,
        fecha_emision: document.getElementById('fechaEmision').value,
        fecha_termino: document.getElementById('fechaTermino').value,
        solicitante: document.getElementById('solicitante').value,
        condicion_pago: document.getElementById('condicionPago').value,
        departamento: document.getElementById('departamento').value,
        estado: 'emitida',
        proveedor: document.getElementById('proveedor').value,
        rut: document.getElementById('rut').value,
        contacto: document.getElementById('contacto').value,
        email: document.getElementById('email').value,
        telefono: document.getElementById('telefono').value,
        direccion: document.getElementById('direccion').value,
        subtotal: limpiarFormato(document.getElementById('subtotal').value),
        descuento: limpiarFormato(document.getElementById('descuento').value),
        iva: limpiarFormato(document.getElementById('iva').value),
        total: limpiarFormato(document.getElementById('total').value),
        items: []
    };
    
    // Agregar items
    document.querySelectorAll('.item-row').forEach((item, index) => {
        const itemData = {
            numero: index + 1,
            nombre: item.querySelector('.item-nombre').value,
            descripcion: item.querySelector('.item-descripcion').value,
            ceco: item.querySelector('.item-ceco').value,
            cantidad: parseFloat(item.querySelector('.item-cantidad').value) || 0,
            unidad: item.querySelector('.item-unidad').value,
            precio: parseFloat(item.querySelector('.item-precio').value) || 0,
            descuento_porcentaje: parseFloat(item.querySelector('.item-descuento').value) || 0,
            total: limpiarFormato(item.querySelector('.item-total').value)
        };
        
        orden.items.push(itemData);
    });
    
    console.log('Datos a enviar:', orden);
    
    try {
        // Enviar datos al servidor
        const response = await fetch('/api/documentos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Username': userData.username || 'admin' // Agregar el usuario actual en los headers
            },
            body: JSON.stringify(orden)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear la orden de compra');
        }
        
        const data = await response.json();
        mostrarMensaje('Orden de compra creada exitosamente', 'success');
        
        // Redireccionar después de un tiempo
        setTimeout(() => {
            window.location.href = 'ordenes-compra.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al crear la orden de compra: ' + error.message);
    }
}

function formatearNumero(numero) {
    return numero.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function limpiarFormato(valor) {
    if (typeof valor === 'string') {
        return parseFloat(valor.replace(/\./g, '').replace(',', '.'));
    }
    return valor;
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