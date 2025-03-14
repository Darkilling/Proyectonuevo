document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Mostrar/ocultar contraseña
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.textContent = type === 'password' ? '👁' : '👁‍🗨';
    });

    // Manejar el envío del formulario
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const userType = document.getElementById('userType').value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ usuario: username, password: password })
            });

            if (!response.ok) {
                throw new Error('Credenciales inválidas');
            }

            const data = await response.json();
            // Guardar información del usuario en sessionStorage
            const userData = {
                username: username,
                name: username, // Puedes ajustar esto según la respuesta del servidor
                type: userType,
                isAuthenticated: true
            };
            sessionStorage.setItem('userData', JSON.stringify(userData));
            
            // Redirigir al index
            window.location.href = 'index.html';
        } catch (error) {
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