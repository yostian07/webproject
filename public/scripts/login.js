document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault(); 
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Definir la URL base condicionalmente
    let apiBaseUrl;
    if (window.location.hostname === 'localhost') {
        apiBaseUrl = 'http://localhost:3000';
    } else {
        // Asume que cualquier otro hostname es tu aplicación desplegada en Heroku
        apiBaseUrl = `https://${window.location.hostname}`;
    }

    try {
        const response = await fetch(`${apiBaseUrl}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        console.log('Respuesta del servidor recibida');
        console.log('Resultado:', result);

        if (result.success) {
            // Guarda el token en el localStorage
            localStorage.setItem('authToken', result.token);
            window.location.href = "dashboard.html";
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al iniciar sesión. Por favor, inténtelo de nuevo más tarde.');
    }
});