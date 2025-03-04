// Verificar autenticación
function checkAuth() {
    const userData = sessionStorage.getItem('userData');
    if (!userData) {
        window.location.href = 'login.html';
        return null;
    }

    const user = JSON.parse(userData);
    if (!user.isAuthenticated) {
        window.location.href = 'login.html';
        return null;
    }

    return user;
}

// Verificar permisos específicos
function checkPermissions(allowedTypes) {
    const user = checkAuth();
    if (!user) return false;

    // El administrador tiene acceso a todo
    if (user.type === 'admin') return true;

    if (!allowedTypes.includes(user.type)) {
        alert('No tiene permisos para acceder a esta página');
        window.location.href = 'index.html';
        return false;
    }

    return true;
}

// Cerrar sesión
function logout() {
    sessionStorage.removeItem('userData');
    window.location.href = 'login.html';
}

// Actualizar interfaz con información del usuario
function updateUserInterface() {
    const user = checkAuth();
    if (!user) return;

    // Actualizar el nombre del usuario si existe el elemento
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = user.name;
    }

    // Mostrar/ocultar elementos según el tipo de usuario
    const elements = document.querySelectorAll('[data-role]');
    elements.forEach(element => {
        const allowedRoles = element.dataset.role.split(',');
        // El administrador puede ver todos los elementos
        if (user.type === 'admin' || allowedRoles.includes(user.type)) {
            element.style.display = '';
        } else {
            element.style.display = 'none';
        }
    });
}

// Exportar funciones
window.auth = {
    checkAuth,
    checkPermissions,
    logout,
    updateUserInterface
};