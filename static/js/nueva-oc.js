document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticación usando auth.js
    const user = auth.checkAuth();
    if (!user) return;

    // Verificar permisos (solo admin y compras pueden crear OC)
    if (!auth.checkPermissions(['admin', 'compras'])) return;

    const form = document.getElementById('ocForm');
    const itemsContainer = document.getElementById('items-container');
    const addItemButton = document.getElementById('addItem');
    const subtotalElement = document.getElementById('subtotal');
    const ivaElement = document.getElementById('iva');
    const totalElement = document.getElementById('total');
    let itemCount = 0;

    // Obtener ID de SP si existe
    const urlParams = new URLSearchParams(window.location.search);
    const spId = urlParams.get('sp_id');

    // Si hay una SP, cargar sus datos
    if (spId) {
        try {
            const response = await fetch(`/api/documentos/${spId}`);
            if (!response.ok) {
                throw new Error('Error al cargar la solicitud');
            }
            const sp = await response.json();
            
            // Mostrar información de la SP
            document.getElementById('spInfo').innerHTML = `
                <div class="sp-info">
                    <h3>Basado en Solicitud de Pedido: ${sp.numero}</h3>
                    <p>Solicitante: ${sp.solicitante}</p>
                    <p>Departamento: ${sp.departamento}</p>
                    <p>Fecha solicitud: ${new Date(sp.fecha).toLocaleDateString('es-CL')}</p>
                </div>
            `;

            // Establecer el número de SP en el campo correspondiente
            document.getElementById('numeroSP').value = sp.numero;

            // Pre-cargar los items de la SP
            itemsContainer.innerHTML = '';
            sp.items.forEach((item, index) => {
                const itemRow = createItemRow(index);
                itemsContainer.appendChild(itemRow);
                
                // Llenar los datos del item
                const inputs = itemRow.querySelectorAll('input');
                inputs[0].value = item.descripcion; // descripción
                inputs[1].value = item.cantidad;    // cantidad
                if (inputs[2]) {
                    inputs[2].value = item.precio || ''; // precio si existe
                }
            });
            itemCount = sp.items.length;
            
            // Actualizar totales
            calculateTotals();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar la solicitud de pedido');
            window.location.href = 'index.html';
        }
    }

    // Establecer la fecha actual como valor predeterminado
    document.getElementById('fechaEmision').valueAsDate = new Date();

    // Función para formatear moneda
    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP'
        }).format(amount);
    }

    // Función para parsear moneda
    function parseCurrency(str) {
        return parseFloat(str.replace(/[^\d,-]/g, '').replace(',', '.'));
    }

    // Función para calcular totales
    function calculateTotals() {
        const items = itemsContainer.querySelectorAll('.item-row');
        let subtotal = 0;

        items.forEach(item => {
            const cantidad = parseFloat(item.querySelector('input[name*="[cantidad]"]').value) || 0;
            const precio = parseFloat(item.querySelector('input[name*="[precio]"]').value) || 0;
            subtotal += cantidad * precio;
        });

        const iva = subtotal * 0.19;
        const total = subtotal + iva;

        subtotalElement.textContent = formatCurrency(subtotal);
        ivaElement.textContent = formatCurrency(iva);
        totalElement.textContent = formatCurrency(total);

        return { subtotal, iva, total };
    }

    // Función para crear una nueva fila de ítem
    function createItemRow(index) {
        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';
        itemRow.innerHTML = `
            <div class="form-group">
                <label>Descripción:</label>
                <input type="text" name="items[${index}][descripcion]" required>
            </div>
            <div class="form-group">
                <label>Cantidad:</label>
                <input type="number" name="items[${index}][cantidad]" min="1" required>
            </div>
            <div class="form-group">
                <label>Precio unitario:</label>
                <input type="number" name="items[${index}][precio]" min="0" step="0.01" required>
            </div>
            <button type="button" class="btn btn-danger remove-item">×</button>
        `;

        // Agregar listeners para calcular totales
        const inputs = itemRow.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('input', calculateTotals);
        });

        // Agregar el botón de eliminar
        const removeButton = itemRow.querySelector('.remove-item');
        removeButton.addEventListener('click', () => {
            itemRow.remove();
            updateItemIndexes();
            calculateTotals();
        });

        return itemRow;
    }

    // Función para actualizar los índices de los ítems
    function updateItemIndexes() {
        const items = itemsContainer.querySelectorAll('.item-row');
        items.forEach((item, index) => {
            const inputs = item.querySelectorAll('input');
            inputs.forEach(input => {
                const name = input.getAttribute('name');
                if (name) {
                    input.setAttribute('name', name.replace(/\d+/, index));
                }
            });
        });
    }

    // Validación del formato RUT
    const rutInput = document.getElementById('rut');
    rutInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\./g, '').replace('-', '');
        if (value.length > 1) {
            value = value.slice(0, -1) + '-' + value.slice(-1);
            const parts = value.split('-')[0].split('');
            for (let i = parts.length - 3; i > 0; i -= 3) {
                parts.splice(i, 0, '.');
            }
            value = parts.join('') + '-' + value.split('-')[1];
        }
        e.target.value = value;
    });

    // Event Listeners
    addItemButton.addEventListener('click', () => {
        const newItem = createItemRow(itemCount++);
        itemsContainer.appendChild(newItem);
        calculateTotals();
    });

    // Agregar el primer ítem automáticamente
    addItemButton.click();

    // Manejar el envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validar que haya al menos un ítem
        if (itemsContainer.children.length === 0) {
            alert('Debe agregar al menos un ítem a la orden');
            return;
        }

        const totales = calculateTotals();
        const formData = new FormData(form);
        const orden = {
            tipo: 'oc',
            numero: `OC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            proveedor: formData.get('proveedor'),
            rut: formData.get('rut'),
            fecha: formData.get('fechaEmision'),
            estado: 'pendiente',
            total: totales.total,
            items: [],
            solicitud_id: spId
        };

        // Recolectar los ítems
        const items = itemsContainer.querySelectorAll('.item-row');
        items.forEach((item, index) => {
            orden.items.push({
                descripcion: formData.get(`items[${index}][descripcion]`),
                cantidad: parseInt(formData.get(`items[${index}][cantidad]`)),
                precio: parseFloat(formData.get(`items[${index}][precio]`))
            });
        });

        try {
            const response = await fetch('/api/documentos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orden)
            });

            if (!response.ok) {
                throw new Error('Error al crear la orden');
            }

            const resultado = await response.json();
            alert('Orden de compra creada exitosamente');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error al crear la orden:', error);
            alert('Error al crear la orden. Por favor, intente nuevamente.');
        }
    });

    // Inicializar totales
    calculateTotals();
}); 