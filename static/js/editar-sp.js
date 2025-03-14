document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    if (!userData.username) {
        window.location.href = 'login.html';
        return;
    }

    // Actualizar nombre de usuario
    document.getElementById('userName').textContent = userData.username;

    // Obtener el ID de la solicitud de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const solicitudId = urlParams.get('id');

    if (!solicitudId) {
        alert('No se encontró el ID de la solicitud');
        window.location.href = 'solicitudes.html';
        return;
    }

    // Cargar los datos de la solicitud
    cargarSolicitud(solicitudId);

    // Función para cargar los datos de la solicitud
    async function cargarSolicitud(id) {
        try {
            const response = await fetch(`/api/documentos/${id}`);
            if (!response.ok) {
                throw new Error('Error al cargar la solicitud');
            }
            const documento = await response.json();
            llenarFormulario(documento);
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar la solicitud');
            window.location.href = 'solicitudes.html';
        }
    }

    // Función para llenar el formulario con los datos de la solicitud
    function llenarFormulario(documento) {
        document.getElementById('numeroSP').value = documento.numero;
        document.getElementById('departamento').value = documento.departamento;
        document.getElementById('ceco').value = documento.ceco || '';
        document.getElementById('producto').value = documento.items[0]?.descripcion || '';
        document.getElementById('cantidad').value = documento.items[0]?.cantidad || '';
        document.getElementById('descripcion').value = documento.items[0]?.descripcion || '';
    }

    // Manejar el envío del formulario
    document.getElementById('editarSPForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            tipo: 'sp',
            numero: document.getElementById('numeroSP').value,
            departamento: document.getElementById('departamento').value,
            ceco: document.getElementById('ceco').value,
            items: [{
                descripcion: document.getElementById('producto').value,
                cantidad: document.getElementById('cantidad').value,
                unidad: 'unidad'
            }]
        };

        try {
            const response = await fetch(`/api/documentos/${solicitudId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Error al actualizar la solicitud');
            }

            alert('Solicitud actualizada correctamente');
            window.location.href = 'solicitudes.html';
        } catch (error) {
            console.error('Error:', error);
            alert('Error al actualizar la solicitud');
        }
    });
}); 