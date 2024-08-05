document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault(); 
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
  
    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
  
        const result = await response.json();
  
        if (result.success) {
            // Guarda el token en el localStorage
            localStorage.setItem('authToken', result.accessToken);
            window.location.href = "dashboard.html";
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al iniciar sesión. Por favor, inténtelo de nuevo más tarde.');
    }
  });
  