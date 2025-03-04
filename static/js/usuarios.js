document.addEventListener('DOMContentLoaded', function() {
    const usersList = document.getElementById('usersList');
    const addUserBtn = document.getElementById('addUserBtn');
    const userModal = document.getElementById('userModal');
    const closeBtn = document.querySelector('.close');
    const userForm = document.getElementById('userForm');
    const modalTitle = document.getElementById('modalTitle');
    const cancelBtn = document.getElementById('cancelBtn');
    
    let users = JSON.parse(localStorage.getItem('users')) || {
        'admin': {
            password: 'admin123',
            type: 'admin',
            name: 'Administrador'
        }
    };

    // Función para mostrar usuarios
    function displayUsers() {
        usersList.innerHTML = '';
        Object.entries(users).forEach(([username, userData]) => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            userCard.innerHTML = `
                <div class="user-info">
                    <h3>${userData.name}</h3>
                    <p>Usuario: ${username}</p>
                    <span class="user-type type-${userData.type}">${userData.type}</span>
                </div>
                <div class="user-actions">
                    ${username !== 'admin' ? `
                        <button class="btn btn-secondary edit-user" data-username="${username}">Editar</button>
                        <button class="btn btn-danger delete-user" data-username="${username}">Eliminar</button>
                    ` : ''}
                </div>
            `;
            usersList.appendChild(userCard);
        });

        // Agregar event listeners para editar y eliminar
        document.querySelectorAll('.edit-user').forEach(button => {
            button.addEventListener('click', () => editUser(button.dataset.username));
        });

        document.querySelectorAll('.delete-user').forEach(button => {
            button.addEventListener('click', () => deleteUser(button.dataset.username));
        });
    }

    // Función para abrir el modal
    function openModal(title = 'Agregar Usuario') {
        modalTitle.textContent = title;
        userModal.style.display = 'block';
    }

    // Función para cerrar el modal
    function closeModal() {
        userModal.style.display = 'none';
        userForm.reset();
        document.getElementById('username').readOnly = false;
        document.getElementById('password').required = true;
        document.getElementById('password').placeholder = 'Contraseña';
    }

    // Función para editar usuario
    function editUser(username) {
        const user = users[username];
        document.getElementById('username').value = username;
        document.getElementById('username').readOnly = true;
        document.getElementById('name').value = user.name;
        document.getElementById('userType').value = user.type;
        document.getElementById('password').required = false;
        document.getElementById('password').placeholder = 'Dejar en blanco para mantener la actual';
        openModal('Editar Usuario');
    }

    // Función para eliminar usuario
    function deleteUser(username) {
        if (confirm(`¿Está seguro que desea eliminar al usuario ${username}?`)) {
            delete users[username];
            localStorage.setItem('users', JSON.stringify(users));
            displayUsers();
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

    userForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const name = document.getElementById('name').value;
        const password = document.getElementById('password').value;
        const type = document.getElementById('userType').value;

        // Si es una edición y no se proporciona contraseña, mantener la existente
        if (users[username] && !password) {
            users[username] = {
                ...users[username],
                name,
                type
            };
        } else {
            users[username] = {
                password,
                name,
                type
            };
        }

        localStorage.setItem('users', JSON.stringify(users));
        closeModal();
        displayUsers();
    });

    // Mostrar usuarios al cargar la página
    displayUsers();
}); 