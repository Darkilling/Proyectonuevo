document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    // Mostrar/ocultar contraseña
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.textContent = type === 'password' ? '👁' : '👁‍🗨';
    });
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const userType = document.getElementById('userType').value;
        
        if (!userType) {
            errorMessage.textContent = 'Por favor seleccione un tipo de usuario';
            return;
        }
        
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    usuario: username, 
                    password: password,
                    role: userType  // Enviamos el rol seleccionado
                })
            });

            if (!response.ok) {
                throw new Error('Credenciales inválidas');
            }
            
            const data = await response.json();
            
            // Verificar que el rol seleccionado coincide con el rol del usuario en la BD
            if (userType !== data.user.role) {
                errorMessage.textContent = 'El tipo de usuario seleccionado no corresponde con su rol';
                return;
            }
            
            // Guardar información del usuario en sessionStorage
            const userData = {
                username: username,
                name: data.user.nombre || username,
                type: userType,
                role: data.user.role,
                isAuthenticated: true
            };
            sessionStorage.setItem('userData', JSON.stringify(userData));
            
            // Redirigir al index según el rol
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