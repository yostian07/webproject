document.addEventListener("DOMContentLoaded", () => {
    const addProviderBtn = document.getElementById('add-provider-btn');
    const addProviderForm = document.getElementById('add-provider-form');
    const providerForm = document.getElementById('provider-form');
    const tbody = document.getElementById('proveedores-body');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const detailsDiv = document.getElementById('provider-details');
    const detailsContent = document.getElementById('provider-details-content');
    const closeDetailsBtn = document.getElementById('close-details-btn');

    addProviderBtn.addEventListener('click', () => {
        addProviderForm.classList.toggle('hidden');
    });

    providerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(providerForm);
        const data = {
            nombre: formData.get('nombre'),
            numero_ruc: formData.get('numero_ruc'),
            telefono: formData.get('telefono'),
            correo_electronico: formData.get('correo_electronico'),
            tipo_proveedor: formData.get('tipo_proveedor'),
            direccion: formData.get('direccion'),
            productos: formData.get('productos').split(',').map(p => p.trim()) 
        };

        const id = formData.get('proveedor_id');

        try {
            let response;
            if (id) {
                response = await fetch(`/api/proveedores/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                response = await fetch('/api/proveedores', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }

            if (response.ok) {
                Swal.fire('Éxito', 'Proveedor guardado con éxito', 'success');
                providerForm.reset();
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
            const response = await fetch(`/api/proveedores${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
            const providers = await response.json();
            tbody.innerHTML = '';
            providers.forEach(proveedor => {
                const tr = document.createElement('tr');
                tr.classList.add('border-b', 'transition-colors', 'hover:bg-muted/50', 'data-[state=selected]:bg-muted');
                tr.innerHTML = `
                    <td class="p-4 align-middle [&amp;:has([role=checkbox])]:pr-0 font-medium">${proveedor.NOMBRE || ''}</td>
                    <td class="p-4 align-middle [&amp;:has([role=checkbox])]:pr-0">${proveedor.TELEFONO || ''}</td>
                    <td class="p-4 align-middle [&amp;:has([role=checkbox])]:pr-0">
                        ${(proveedor.PRODUCTOS ? proveedor.PRODUCTOS.split(',').map(producto => `<span class="inline-block bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1 text-xs mr-2 mb-2">${producto}</span>`).join('') : '')}
                    </td>
                    <td class="p-4 align-middle [&amp;:has([role=checkbox])]:pr-0">${proveedor.NUMERO_RUC || ''}</td>
                    <td class="p-4 align-middle [&amp;:has([role=checkbox])]:pr-0">
                        <div class="flex gap-2">
                            <button class="editar-btn inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3" data-id="${proveedor.PROVEEDOR_ID}">Editar</button>
                            <button class="baja-btn inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3" data-id="${proveedor.PROVEEDOR_ID}">Dar de Baja</button>
                            <button class="ver-btn inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3" data-id="${proveedor.PROVEEDOR_ID}">Ver</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
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
                                method: 'DELETE'
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
            const response = await fetch(`/api/proveedores/${id}`);
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
                document.getElementById('add-provider-form').classList.remove('hidden');
                document.getElementById('provider-form-title').innerText = 'Editar Proveedor';
            }
        } catch (error) {
            console.error('Error fetching proveedor:', error);
            Swal.fire('Error', 'Hubo un problema al cargar los datos del proveedor.', 'error');
        }
    }

    async function mostrarDetallesProveedor(id) {
        try {
            const response = await fetch(`/api/proveedores/${id}`);
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
});

