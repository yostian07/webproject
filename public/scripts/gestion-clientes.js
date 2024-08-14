document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('authToken');

    if (!token) {
        // Si no hay token, redirige al login
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/gestion-clientes.html', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            // Si no está autorizado, redirige al login
            window.location.href = 'index.html';
            return;
        }

        const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://57418ktj-3000.use2.devtunnels.ms';
        fetchClientes();

        const formCliente = document.getElementById('form-cliente');
        const formBuscar = document.getElementById('form-buscar');
        const searchInput = formBuscar.querySelector('input[name="search"]');
        const agregarBtn = document.getElementById('agregar-btn');
        const guardarBtn = document.getElementById('guardar-btn');
        const searchSpinner = document.getElementById('search-spinner');

        if (formBuscar) {
            formBuscar.addEventListener('submit', function(e) {
                e.preventDefault();
                searchSpinner.classList.remove('hidden');
                setTimeout(() => {
                    searchSpinner.classList.add('hidden');
                }, 1000);
            });
        }

        if (formCliente) {
            formCliente.addEventListener('submit', function(e) {
                e.preventDefault();
                if (validarFormulario()) {
                    procesarFormulario();
                }
            });

            guardarBtn.addEventListener('click', function() {
                if (validarFormulario()) {
                    procesarFormulario();
                }
            });
        }

        if (formBuscar) {
            formBuscar.addEventListener('submit', function(e) {
                e.preventDefault();
                buscarClientes();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', function() {
                buscarClientesEnTiempoReal(this.value);
            });
        }

        function validarFormulario() {
            const nombre = document.getElementById('nombre').value;
            const documentoIdentidad = document.getElementById('documento_identidad').value;
            const correoElectronico = document.getElementById('correo_electronico').value;
            const telefono = document.getElementById('telefono').value;

            const nombrePattern = /^[A-Za-z\s]+$/;
            const documentoIdentidadPattern = /^\d{9}$/;
            const telefonoPattern = /^\d+$/;

            if (!nombrePattern.test(nombre)) {
                Swal.fire('Error', 'El nombre no debe contener números.', 'error');
                return false;
            }

            if (!documentoIdentidadPattern.test(documentoIdentidad)) {
                Swal.fire('Error', 'El documento de identidad debe tener 9 dígitos.', 'error');
                return false;
            }

            if (!telefonoPattern.test(telefono)) {
                Swal.fire('Error', 'El teléfono solo debe contener números.', 'error');
                return false;
            }

            if (!correoElectronico.includes('@')) {
                Swal.fire('Error', 'El correo electrónico no es válido.', 'error');
                return false;
            }

            return true;
        }

        async function procesarFormulario() {
            const formData = new FormData(formCliente);
            const data = {};
            formData.forEach((value, key) => { data[key] = value; });
        
            const clienteId = document.getElementById('cliente_id').value;
            const url = clienteId ? `${apiBaseUrl}/clientes/${clienteId}` : `${apiBaseUrl}/clientes`;
            const method = clienteId ? 'PUT' : 'POST';
        
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });
        
                const result = await response.json();
        
                if (response.status === 400 && result.message) {
                    Swal.fire('Error', result.message, 'error');
                } else {
                    console.log('Cliente procesado:', result);
                    fetchClientes();
                    formCliente.reset();
                    agregarBtn.style.display = 'inline-block';
                    guardarBtn.style.display = 'none';
                }
            } catch (error) {
                console.error('Error al procesar cliente:', error);
                Swal.fire('Error', 'Hubo un problema al procesar el cliente.', 'error');
            }
        }

        async function fetchClientes() {
            try {
                const response = await fetch(`${apiBaseUrl}/clientes`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    mostrarClientes(data);
                } else {
                    console.error('No se encontraron clientes o los datos no son correctos.');
                }
            } catch (error) {
                console.error('Error al cargar clientes:', error);
            }
        }

        async function buscarClientesEnTiempoReal(searchValue) {
            try {
                const response = await fetch(`${apiBaseUrl}/clientes?search=${encodeURIComponent(searchValue)}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                mostrarClientes(data);
            } catch (error) {
                console.error('Error al buscar clientes:', error);
            }
        }

        function mostrarClientes(clientes) {
            const tbody = document.querySelector('#clientes-table tbody');
            if (tbody) {
                tbody.innerHTML = '';
                clientes.forEach((cliente, index) => {
                    let fila = document.createElement('tr');
                    fila.classList.add('transition-opacity', 'duration-500', 'opacity-0');
                    fila.innerHTML = `
                        <td class="border-b p-4">${cliente.id}</td>
                        <td class="border-b p-4">${cliente.nombre}</td>
                        <td class="border-b p-4">${cliente.documento_identidad}</td>
                        <td class="border-b p-4">${cliente.telefono}</td>
                        <td class="border-b p-4">${cliente.correo_electronico}</td>
                        <td class="border-b p-4">${cliente.direccion}</td>
                        <td class="border-b p-4">${cliente.estado}</td>
                        <td class="border-b p-4">
                            <button type="button" class="transition duration-300 ease-in-out text-white bg-gray-800 hover:bg-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2 me-2 mb-1 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700" onclick="editarCliente(${cliente.id})">Editar</button>
                            <button type="button" class="transition duration-300 ease-in-out text-white bg-gray-800 hover:bg-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2 me-2 mb-1 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700" onclick="eliminarCliente(${cliente.id})">Eliminar</button>
                        </td>
                    `;
                    tbody.appendChild(fila);
                    setTimeout(() => {
                        fila.classList.remove('opacity-0');
                        fila.classList.add('opacity-100');
                    }, index * 100);
                });
            } else {
                console.error('Tbody no encontrado.');
            }
        }

        window.eliminarCliente = async function(clienteId) {
            try {
                Swal.fire({
                    title: '¿Estás seguro?',
                    text: "¡No podrás revertir esto!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        const response = await fetch(`${apiBaseUrl}/clientes/${clienteId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        const data = await response.json();
                        console.log('Cliente eliminado:', data);
                        fetchClientes();
                        Swal.fire(
                            'Eliminado!',
                            'El cliente ha sido eliminado.',
                            'success'
                        );
                    }
                });
            } catch (error) {
                console.error('Error al eliminar cliente:', error);
                Swal.fire(
                    'Error!',
                    'Hubo un problema al eliminar el cliente.',
                    'error'
                );
            }
        };

        window.editarCliente = async function(clienteId) {
            try {
                const response = await fetch(`${apiBaseUrl}/clientes/${clienteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                document.getElementById('cliente_id').value = data.id;
                document.getElementById('nombre').value = data.nombre;
                document.getElementById('documento_identidad').value = data.documento_identidad;
                document.getElementById('telefono').value = data.telefono;
                document.getElementById('correo_electronico').value = data.correo_electronico; 
                document.getElementById('direccion').value = data.direccion; 
                document.getElementById('estado').value = data.estado; 

                agregarBtn.style.display = 'none';
                guardarBtn.style.display = 'inline-block';
            } catch (error) {
                console.error('Error al cargar detalles del cliente:', error);
            }
        };
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar la página. Por favor, inténtelo de nuevo más tarde.');
    }
});
