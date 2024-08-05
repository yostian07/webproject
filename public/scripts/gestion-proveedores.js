document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem('authToken');

    if (!token) {
        // Si no hay token, redirige al login
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/proveedores.html', {
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

        const addProviderBtn = document.getElementById('add-provider-btn');
        const addProviderModal = document.getElementById('add-provider-modal');
        const closeModalBtn = document.getElementById('close-modal');
        const providerForm = document.getElementById('provider-form');
        const tbody = document.getElementById('proveedores-body');
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        const detailsDiv = document.getElementById('provider-details');
        const detailsContent = document.getElementById('provider-details-content');
        const closeDetailsBtn = document.getElementById('close-details-btn');

        addProviderBtn.addEventListener('click', () => {
            providerForm.reset();
            addProviderModal.classList.remove('pointer-events-none', 'opacity-0');
            addProviderModal.classList.add('opacity-100');
        });

        closeModalBtn.addEventListener('click', () => {
            addProviderModal.classList.add('pointer-events-none', 'opacity-0');
            addProviderModal.classList.remove('opacity-100');
        });

        providerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validaciones
            const nombre = document.getElementById('nombre').value.trim();
            const numeroRuc = document.getElementById('numero_ruc').value.trim();
            const telefono = document.getElementById('telefono').value.trim();
            const correoElectronico = document.getElementById('correo_electronico').value.trim();
            const tipoProveedor = document.getElementById('tipo_proveedor').value.trim();
            const direccion = document.getElementById('direccion').value.trim();
            const productos = document.getElementById('productos').value.trim();

            if (!nombre || !numeroRuc || !telefono || !correoElectronico || !tipoProveedor || !direccion || !productos) {
                Swal.fire('Error', 'Todos los campos son obligatorios', 'error');
                return;
            }

            if (!/^\d+$/.test(numeroRuc)) {
                Swal.fire('Error', 'El número RUC debe contener solo números', 'error');
                return;
            }

            if (!/^\d+$/.test(telefono)) {
                Swal.fire('Error', 'El teléfono debe contener solo números', 'error');
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoElectronico)) {
                Swal.fire('Error', 'El correo electrónico no es válido', 'error');
                return;
            }

            const formData = new FormData(providerForm);
            const data = {
                nombre,
                numero_ruc: numeroRuc,
                telefono,
                correo_electronico: correoElectronico,
                tipo_proveedor: tipoProveedor,
                direccion,
                productos: productos.split(',').map(p => p.trim()) 
            };

            const id = formData.get('proveedor_id');

            try {
                let response;
                if (id) {
                    response = await fetch(`/api/proveedores/${id}`, {
                        method: 'PUT',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(data)
                    });
                } else {
                    response = await fetch('/api/proveedores', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(data)
                    });
                }

                if (response.ok) {
                    Swal.fire('Éxito', 'Proveedor guardado con éxito', 'success');
                    providerForm.reset();
                    addProviderModal.classList.add('pointer-events-none', 'opacity-0');
                    addProviderModal.classList.remove('opacity-100');
                    loadProviders();
                } else {
                    const errorData = await response.json();
                    Swal.fire('Error', `Error al guardar proveedor: ${errorData.message}`, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', 'Error al guardar proveedor', 'error');
            }
        });

        searchBtn.addEventListener('click', () => {
            const searchTerm = searchInput.value.trim();
            loadProviders(searchTerm);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const searchTerm = searchInput.value.trim();
                loadProviders(searchTerm);
            }
        });

        async function loadProviders(searchTerm = '') {
            try {
                const response = await fetch(`/api/proveedores${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const providers = await response.json();
                tbody.innerHTML = '';
                providers.forEach((proveedor, index) => {
                    const tr = document.createElement('tr');
                    tr.classList.add('bg-gray-100', 'border-b', 'transition-colors', 'hover:bg-muted/50', 'data-[state=selected]:bg-muted', 'transition-opacity', 'duration-500', 'opacity-0');
                    tr.innerHTML = `
                        <td class="p-4 align-middle font-medium">${proveedor.NOMBRE || ''}</td>
                        <td class="p-4 align-middle">${proveedor.TELEFONO || ''}</td>
                        <td class="p-4 align-middle">
                            ${(proveedor.PRODUCTOS ? proveedor.PRODUCTOS.split(',').map(producto => `<span class="inline-block bg-gray-200 rounded-full px-2 py-1 text-xs mr-2 mb-2">${producto}</span>`).join('') : '')}
                        </td>
                        <td class="p-4 align-middle">${proveedor.NUMERO_RUC || ''}</td>
                        <td class="p-4 align-middle">
                            <div class="flex gap-2">
                                <button class="editar-btn hover:bg-gray-600 inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3" data-id="${proveedor.PROVEEDOR_ID}">Editar</button>
                                <button class="baja-btn hover:bg-gray-600 inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3" data-id="${proveedor.PROVEEDOR_ID}">Dar de baja</button>
                                <button class="ver-btn hover:bg-gray-600 duration-300 inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3" data-id="${proveedor.PROVEEDOR_ID}">Ver</button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                    setTimeout(() => {
                        tr.classList.remove('opacity-0');
                        tr.classList.add('opacity-100');
                    }, index * 100);
                });

                // funcionalidad para los botones de editar, dar de baja y ver
                document.querySelectorAll('.editar-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        mostrarFormularioEditar(id);
                    });
                });

                document.querySelectorAll('.baja-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        if (await Swal.fire({
                            title: '¿Estás seguro?',
                            text: "¡No podrás revertir esto!",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Sí, ¡dalo de baja!',
                            cancelButtonText: 'Cancelar'
                        }).then(result => result.isConfirmed)) {
                            try {
                                const response = await fetch(`/api/proveedores/${id}`, {
                                    method: 'DELETE',
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    }
                                });
                                if (response.ok) {
                                    Swal.fire('¡Baja!', 'Proveedor dado de baja con éxito.', 'success');
                                    loadProviders();
                                } else {
                                    const errorData = await response.json();
                                    Swal.fire('Error', `Error al dar de baja proveedor: ${errorData.message}`, 'error');
                                }
                            } catch (error) {
                                console.error('Error:', error);
                                Swal.fire('Error', 'Error al dar de baja proveedor', 'error');
                            }
                        }
                    });
                });

                document.querySelectorAll('.ver-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        mostrarDetallesProveedor(id);
                    });
                });

            } catch (error) {
                console.error('Error fetching proveedores:', error);
                Swal.fire('Error', 'Hubo un problema al cargar los proveedores.', 'error');
            }
        }

        async function mostrarFormularioEditar(id) {
            try {
                const response = await fetch(`/api/proveedores/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const proveedor = await response.json();
                if (proveedor) {
                    document.getElementById('provider-form').reset();
                    document.getElementById('nombre').value = proveedor.NOMBRE || '';
                    document.getElementById('numero_ruc').value = proveedor.NUMERO_RUC || '';
                    document.getElementById('telefono').value = proveedor.TELEFONO || '';
                    document.getElementById('correo_electronico').value = proveedor.CORREO_ELECTRONICO || '';
                    document.getElementById('tipo_proveedor').value = proveedor.TIPO_PROVEEDOR || '';
                    document.getElementById('direccion').value = proveedor.DIRECCION || '';
                    document.getElementById('productos').value = proveedor.PRODUCTOS || '';  
                    document.getElementById('proveedor_id').value = proveedor.PROVEEDOR_ID || '';
                    addProviderModal.classList.remove('pointer-events-none', 'opacity-0');
                    addProviderModal.classList.add('opacity-100');
                    document.getElementById('provider-form-title').innerText = 'Editar Proveedor';
                }
            } catch (error) {
                console.error('Error fetching proveedor:', error);
                Swal.fire('Error', 'Hubo un problema al cargar los datos del proveedor.', 'error');
            }
        }

        async function mostrarDetallesProveedor(id) {
            try {
                const response = await fetch(`/api/proveedores/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const proveedor = await response.json();
                if (proveedor) {
                    detailsContent.innerHTML = `
                        <p><strong>Nombre:</strong> ${proveedor.NOMBRE}</p>
                        <p><strong>Número RUC:</strong> ${proveedor.NUMERO_RUC}</p>
                        <p><strong>Teléfono:</strong> ${proveedor.TELEFONO}</p>
                        <p><strong>Correo Electrónico:</strong> ${proveedor.CORREO_ELECTRONICO}</p>
                        <p><strong>Tipo de Proveedor:</strong> ${proveedor.TIPO_PROVEEDOR}</p>
                        <p><strong>Dirección:</strong> ${proveedor.DIRECCION}</p>
                        <p><strong>Productos:</strong> ${(proveedor.PRODUCTOS ? proveedor.PRODUCTOS.split(',').join(', ') : '')}</p>
                    `;
                    detailsDiv.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error fetching proveedor:', error);
                Swal.fire('Error', 'Hubo un problema al cargar los datos del proveedor.', 'error');
            }
        }

        closeDetailsBtn.addEventListener('click', () => {
            detailsDiv.classList.add('hidden');
        });

        // Cargar todos los proveedores inicialmente
        loadProviders();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar la página. Por favor, inténtelo de nuevo más tarde.');
    }
});
