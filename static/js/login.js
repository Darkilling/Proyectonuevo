document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Obtener usuarios del localStorage o usar el admin por defecto
    let usuarios = JSON.parse(localStorage.getItem('users')) || {
        'admin': {
            password: 'admin123',
            type: 'admin',
            name: 'Administrador'
        }
    };

    // Mostrar/ocultar contraseña
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.textContent = type === 'password' ? '👁' : '👁‍🗨';
    });

    // Manejar el envío del formulario
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const userType = document.getElementById('userType').value;

        // Validar credenciales
        const user = usuarios[username];
        if (user && user.password === password && user.type === userType) {
            // Guardar información del usuario en sessionStorage
            const userData = {
                username: username,
                name: user.name,
                type: user.type,
                isAuthenticated: true
            };
            sessionStorage.setItem('userData', JSON.stringify(userData));
            
            // Redirigir al index
            window.location.href = 'index.html';
        } else {
            errorMessage.textContent = 'Usuario, contraseña o tipo de usuario incorrectos';
            loginForm.reset();
        }
    });

    // Verificar si ya hay una sesión activa
    const userData = sessionStorage.getItem('userData');
    if (userData) {
        const user = JSON.parse(userData);
        if (user.isAuthenticated) {
            window.location.href = 'index.html';
        }
    }
}); 