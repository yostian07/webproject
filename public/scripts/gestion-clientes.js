document.addEventListener('DOMContentLoaded', function() {
    let apiBaseUrl;
    if (window.location.hostname === 'localhost') {
        apiBaseUrl = 'http://localhost:3000';
    } else if (window.location.hostname === '57418ktj-3000.use2.devtunnels.ms') {
        apiBaseUrl = 'https://57418ktj-3000.use2.devtunnels.ms';
    } else {
        // Asume que cualquier otro hostname es tu aplicación desplegada en Heroku
        apiBaseUrl = `https://${window.location.hostname}`;
    }

    fetchClientes();

    const formCliente = document.getElementById('form-cliente');
    const formBuscar = document.getElementById('form-buscar');
    const agregarBtn = document.getElementById('agregar-btn');
    const guardarBtn = document.getElementById('guardar-btn');

    if (formCliente) {
        formCliente.addEventListener('submit', function(e) {
            e.preventDefault();
            procesarFormulario();
        });

        guardarBtn.addEventListener('click', function() {
            procesarFormulario();
        });
    }

    if (formBuscar) {
        formBuscar.addEventListener('submit', function(e) {
            e.preventDefault();
            buscarClientes();
        });
    }

    // Función para procesar el formulario
    function procesarFormulario() {
        const formData = new FormData(formCliente);
        const data = {};
        formData.forEach((value, key) => { data[key] = value; });

        const clienteId = document.getElementById('cliente_id').value;
        const url = clienteId ? `${apiBaseUrl}/clientes/${clienteId}` : `${apiBaseUrl}/clientes`;
        const method = clienteId ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Cliente procesado:', data);
            fetchClientes();
            formCliente.reset();
            agregarBtn.style.display = 'inline-block';
            guardarBtn.style.display = 'none';
        })
        .catch((error) => {
            console.error('Error al procesar cliente:', error);
        });
    }

    // Función para obtener y mostrar clientes
    function fetchClientes() {
        fetch(`${apiBaseUrl}/clientes`)
            .then(response => response.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    mostrarClientes(data);
                } else {
                    console.error('No se encontraron clientes o los datos no son correctos.');
                }
            })
            .catch(error => console.error('Error al cargar clientes:', error));
    }

    // Función para buscar clientes
    function buscarClientes() {
        const searchValue = formBuscar.querySelector('input[name="search"]').value;
        fetch(`${apiBaseUrl}/clientes?search=${encodeURIComponent(searchValue)}`)
            .then(response => response.json())
            .then(data => {
                if (data.length === 0) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Cliente no encontrado',
                        text: 'No se ha encontrado ningún cliente con los criterios de búsqueda proporcionados.',
                        confirmButtonText: 'Aceptar'
                    });
                } else {
                    mostrarClientes(data);
                }
            })
            .catch(error => {
                console.error('Error al buscar clientes:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Ocurrió un error al realizar la búsqueda de clientes. Por favor, inténtalo nuevamente.',
                    confirmButtonText: 'Aceptar'
                });
            });
    }

    // Función para mostrar los clientes en la tabla con animación
    function mostrarClientes(clientes) {
        const tbody = document.querySelector('#clientes-table tbody');
        if (tbody) {
            tbody.innerHTML = '';
            clientes.forEach((cliente, index) => {
                let fila = document.createElement('tr');
                fila.classList.add('hidden-row');
                fila.innerHTML = `
                    <td class="border-b p-4">${cliente.id}</td>
                    <td class="border-b p-4">${cliente.nombre}</td>
                    <td class="border-b p-4">${cliente.documento_identidad}</td>
                    <td class="border-b p-4">${cliente.telefono}</td>
                    <td class="border-b p-4">${cliente.correo_electronico}</td>
                    <td class="border-b p-4">${cliente.direccion}</td>
                    <td class="border-b p-4">${cliente.estado}</td>
                    <td class="border-b p-4">
                        <button type="button" class="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700" onclick="editarCliente(${cliente.id})">Editar</button>
<button type="button" class="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700" onclick="eliminarCliente(${cliente.id})">Eliminar</button>

                    </td>
                `;
                tbody.appendChild(fila);
                setTimeout(() => {
                    fila.classList.add('visible-row');
                    fila.classList.remove('hidden-row');
                }, index * 100);
            });
        } else {
            console.error('Tbody no encontrado.');
        }
    }

    window.eliminarCliente = function(clienteId) {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "¡No podrás revertir esto!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`${apiBaseUrl}/clientes/${clienteId}`, {
                    method: 'DELETE'
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Cliente eliminado:', data);
                    fetchClientes();
                    Swal.fire(
                        'Eliminado!',
                        'El cliente ha sido eliminado.',
                        'success'
                    );
                })
                .catch((error) => {
                    console.error('Error al eliminar cliente:', error);
                    Swal.fire(
                        'Error!',
                        'Hubo un problema al eliminar el cliente.',
                        'error'
                    );
                });
            }
        });
    };

    window.editarCliente = function(clienteId) {
        fetch(`${apiBaseUrl}/clientes/${clienteId}`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('cliente_id').value = data.id;
                document.getElementById('nombre').value = data.nombre;
                document.getElementById('documento_identidad').value = data.documento_identidad;
                document.getElementById('telefono').value = data.telefono;
                document.getElementById('correo_electronico').value = data.correo_electronico; // Correo Electrónico
                document.getElementById('direccion').value = data.direccion; // Dirección
                document.getElementById('estado').value = data.estado; // Estado

                agregarBtn.style.display = 'none';
                guardarBtn.style.display = 'inline-block';
            })
            .catch(error => console.error('Error al cargar detalles del cliente:', error));
    };
});