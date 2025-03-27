document.addEventListener('DOMContentLoaded', function() {
    const usersList = document.getElementById('usersList');
    const addUserBtn = document.getElementById('addUserBtn');
    const userModal = document.getElementById('userModal');
    const closeBtn = document.querySelector('.close');
    const userForm = document.getElementById('userForm');
    const modalTitle = document.getElementById('modalTitle');
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    let users = [];
    let editingUserId = null;

    // Función para cargar usuarios desde la API
    async function cargarUsuarios() {
        try {
            // Verificar si el usuario está autenticado
            const response = await fetch('/api/protegido');
            if (!response.ok) {
                window.location.href = '/login.html';
                return;
            }

            // Obtener la lista de usuarios
            const usuariosResponse = await fetch('/api/usuarios');
            const data = await usuariosResponse.json();

            if (!usuariosResponse.ok) {
                if (usuariosResponse.status === 403) {
                    throw new Error('No tiene permisos para ver la lista de usuarios. Debe iniciar sesión como administrador.');
                } else if (usuariosResponse.status === 401) {
                    throw new Error('Debe iniciar sesión para ver la lista de usuarios.');
                } else {
                    throw new Error(data.error || 'Error al cargar usuarios');
                }
            }

            // Verificar si existe el contenedor de usuarios
            const usersList = document.getElementById('usersList');
            if (!usersList) {
                console.error('No se encontró el elemento usersList');
                return;
            }

            // Limpiar la lista actual
            usersList.innerHTML = '';

            // Agregar cada usuario a la lista
            data.forEach(usuario => {
                const userCard = document.createElement('div');
                userCard.className = 'bg-white rounded-lg shadow-md p-6 mb-4';
                userCard.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-xl font-semibold text-gray-800">${usuario.nombre} ${usuario.apellido}</h3>
                            <p class="text-gray-600">Usuario: ${usuario.username}</p>
                            <p class="text-gray-600">Email: ${usuario.email || 'No especificado'}</p>
                            <span class="inline-block px-2 py-1 text-sm font-semibold rounded-full ${
                                usuario.role === 'admin' ? 'bg-red-100 text-red-800' :
                                usuario.role === 'aprobador' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                            }">${usuario.role}</span>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="editarUsuario(${usuario.id})" class="text-indigo-600 hover:text-indigo-900">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="eliminarUsuario(${usuario.id})" class="text-red-600 hover:text-red-900">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                usersList.appendChild(userCard);
            });

        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            mostrarMensaje(error.message, 'error');
            
            // Mostrar mensaje en la lista si existe
            const usersList = document.getElementById('usersList');
            if (usersList) {
                usersList.innerHTML = `
                    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong class="font-bold">Error:</strong>
                        <span class="block sm:inline">${error.message}</span>
                    </div>
                `;
            }
        }
    }

    // Función para mostrar mensajes
    function mostrarMensaje(mensaje, tipo = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg ${
            tipo === 'success' ? 'bg-green-500 text-white' :
            tipo === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        alertDiv.textContent = mensaje;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }

    // Función para abrir el modal
    function openModal(title = 'Agregar Usuario') {
        modalTitle.textContent = title;
        userModal.classList.remove('hidden');
        editingUserId = null;
    }

    // Función para cerrar el modal
    function closeModal() {
        userModal.classList.add('hidden');
        userForm.reset();
        document.getElementById('username').readOnly = false;
        document.getElementById('password').required = true;
        document.getElementById('password').placeholder = 'Contraseña';
        editingUserId = null;
    }

    // Función para editar usuario
    function editUser(id) {
        const user = users.find(u => u.id === parseInt(id));
        if (!user) return;

        editingUserId = user.id;
        document.getElementById('username').value = user.username;
        document.getElementById('username').readOnly = true;
        document.getElementById('name').value = user.nombre;
        document.getElementById('apellido').value = user.apellido;
        document.getElementById('email').value = user.email || '';
        document.getElementById('userType').value = user.role;
        document.getElementById('password').required = false;
        document.getElementById('password').placeholder = 'Dejar en blanco para mantener la actual';
        openModal('Editar Usuario');
    }

    // Función para eliminar usuario
    async function deleteUser(id) {
        if (confirm('¿Está seguro que desea eliminar este usuario?')) {
            try {
                const response = await fetch(`/api/usuarios/${id}`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    throw new Error('Error al eliminar usuario');
                }
                mostrarMensaje('Usuario eliminado exitosamente', 'success');
                await cargarUsuarios();
            } catch (error) {
                console.error('Error:', error);
                mostrarMensaje('Error al eliminar usuario', 'error');
            }
        }
    }

    // Event Listeners
    addUserBtn.addEventListener('click', () => {
        document.getElementById('username').readOnly = false;
        document.getElementById('password').required = true;
        document.getElementById('password').placeholder = 'Contraseña';
        openModal();
    });

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    window.onclick = function(event) {
        if (event.target == userModal) {
            closeModal();
        }
    };

    userForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            nombre: document.getElementById('name').value,
            apellido: document.getElementById('apellido').value,
            email: document.getElementById('email').value,
            role: document.getElementById('userType').value
        };

        // Validar campos requeridos
        if (!formData.username || !formData.nombre || !formData.apellido || !formData.role) {
            mostrarMensaje('Por favor complete todos los campos requeridos', 'error');
            return;
        }

        // Si es edición y no se proporcionó contraseña, no la incluimos
        if (editingUserId && !formData.password) {
            delete formData.password;
        }

        try {
            const url = editingUserId ? `/api/usuarios/${editingUserId}` : '/api/usuarios';
            const method = editingUserId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Error al ${editingUserId ? 'actualizar' : 'crear'} usuario`);
            }

            mostrarMensaje(`Usuario ${editingUserId ? 'actualizado' : 'creado'} exitosamente`, 'success');
            closeModal();
            await cargarUsuarios();
        } catch (error) {
            console.error('Error:', error);
            mostrarMensaje(error.message || `Error al ${editingUserId ? 'actualizar' : 'crear'} usuario`, 'error');
        }
    });

    // Cargar usuarios al iniciar
    cargarUsuarios();
}); 