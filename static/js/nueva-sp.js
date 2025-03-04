document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación usando auth.js
    const user = auth.checkAuth();
    if (!user) return;

    // Verificar permisos (solo admin y operación pueden crear SP)
    if (!auth.checkPermissions(['admin', 'operacion'])) return;

    const form = document.getElementById('spForm');
    const itemsContainer = document.getElementById('items-container');
    const addItemButton = document.getElementById('addItem');
    let itemCount = 1;

    // Establecer la fecha actual como valor predeterminado
    document.getElementById('fecha').valueAsDate = new Date();

    // Autocompletar datos del usuario
    document.getElementById('solicitante').value = user.name;
    document.getElementById('departamento').value = user.type === 'admin' ? 'Administración' : 'Operaciones';

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
                <label>Unidad:</label>
                <select name="items[${index}][unidad]" required>
                    <option value="unidad">Unidad</option>
                    <option value="kg">Kilogramos</option>
                    <option value="lt">Litros</option>
                    <option value="mt">Metros</option>
                </select>
            </div>
            <button type="button" class="btn btn-danger remove-item">×</button>
        `;

        // Agregar el botón de eliminar
        const removeButton = itemRow.querySelector('.remove-item');
        removeButton.addEventListener('click', () => {
            itemRow.remove();
            updateItemIndexes();
        });

        return itemRow;
    }

    // Función para actualizar los índices de los ítems
    function updateItemIndexes() {
        const items = itemsContainer.querySelectorAll('.item-row');
        items.forEach((item, index) => {
            const inputs = item.querySelectorAll('input, select');
            inputs.forEach(input => {
                const name = input.getAttribute('name');
                if (name) {
                    input.setAttribute('name', name.replace(/\d+/, index));
                }
            });
        });
    }

    // Agregar nuevo ítem
    addItemButton.addEventListener('click', () => {
        const newItem = createItemRow(itemCount++);
        itemsContainer.appendChild(newItem);
    });

    // Agregar el primer ítem automáticamente si no hay ninguno
    if (itemsContainer.children.length === 0) {
        addItemButton.click();
    }

    // Manejar el envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validar que haya al menos un ítem
        if (itemsContainer.children.length === 0) {
            alert('Debe agregar al menos un ítem a la solicitud');
            return;
        }

        // Recolectar los datos del formulario
        const formData = new FormData(form);
        const solicitud = {
            tipo: 'sp',
            numero: `SP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            solicitante: formData.get('solicitante'),
            departamento: formData.get('departamento'),
            fecha: formData.get('fecha'),
            estado: 'pendiente',
            items: []
        };

        // Recolectar los ítems
        const items = itemsContainer.querySelectorAll('.item-row');
        items.forEach((item, index) => {
            solicitud.items.push({
                descripcion: formData.get(`items[${index}][descripcion]`),
                cantidad: parseInt(formData.get(`items[${index}][cantidad]`)),
                unidad: formData.get(`items[${index}][unidad]`)
            });
        });

        try {
            const response = await fetch('/api/documentos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(solicitud)
            });

            if (!response.ok) {
                throw new Error('Error al crear la solicitud');
            }

            const resultado = await response.json();
            alert('Solicitud de pedido creada exitosamente');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error al crear la solicitud:', error);
            alert('Error al crear la solicitud. Por favor, intente nuevamente.');
        }
    });
}); 