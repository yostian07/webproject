document.getElementById('toggleFormButton').addEventListener('click', function() {
  const modal = document.getElementById('shipmentFormModal');
  modal.classList.remove('pointer-events-none', 'opacity-0');
  modal.classList.add('opacity-100');
  document.getElementById('searchSection').classList.add('hidden');
  resetForm();
});

document.getElementById('closeFormModal').addEventListener('click', function() {
  const modal = document.getElementById('shipmentFormModal');
  modal.classList.add('pointer-events-none', 'opacity-0');
  modal.classList.remove('opacity-100');
  resetForm();
  document.getElementById('searchSection').classList.remove('hidden');
});

document.getElementById('cancelEditButton').addEventListener('click', function() {
  const modal = document.getElementById('shipmentFormModal');
  modal.classList.add('pointer-events-none', 'opacity-0');
  modal.classList.remove('opacity-100');
  resetForm();
  document.getElementById('searchSection').classList.remove('hidden');
});

document.getElementById('cancelSearchButton').addEventListener('click', function() {
  resetForm();
  loadShipments();
  document.getElementById('cancelSearchButton').classList.add('hidden');
  document.getElementById('searchSection').classList.remove('hidden');
});

document.getElementById('closeDetailButton').addEventListener('click', function() {
  const modal = document.getElementById('shipmentDetailModal');
  modal.classList.add('pointer-events-none', 'opacity-0');
  modal.classList.remove('opacity-100');
});

document.getElementById('closeDetailModal').addEventListener('click', function() {
  const modal = document.getElementById('shipmentDetailModal');
  modal.classList.add('pointer-events-none', 'opacity-0');
  modal.classList.remove('opacity-100');
});

function resetForm() {
  document.getElementById('formTitle').innerText = 'Registrar Envío';
  document.getElementById('submitShipmentButton').innerText = 'Registrar Envío';
  document.getElementById('envioId').value = '';
  document.getElementById('cliente_documento').value = '';
  document.getElementById('cliente_nombre').value = '';
  document.getElementById('cliente_direccion').value = '';
  document.getElementById('cliente_telefono').value = '';
  document.getElementById('cliente_correo').value = '';
  document.getElementById('direccion_destino').value = '';
  document.getElementById('costo_envio').value = '';
  document.getElementById('estado_envio').value = 'pendiente';
  document.getElementById('clientForm').classList.add('hidden');
  document.getElementById('productsContainer').innerHTML = '';
}

document.getElementById('loadClient').addEventListener('click', async function() {
  const docId = document.getElementById('cliente_documento').value;
  try {
    const response = await axios.get(`/get-client-by-doc/${docId}`);
    const client = response.data;

    document.getElementById('cliente_nombre').value = client.NOMBRE;
    document.getElementById('cliente_direccion').value = client.DIRECCION;
    document.getElementById('cliente_telefono').value = client.TELEFONO;
    document.getElementById('cliente_correo').value = client.CORREO_ELECTRONICO;

    document.getElementById('clientForm').classList.remove('hidden');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      document.getElementById('clientForm').classList.remove('hidden');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error cargando el cliente',
      });
    }
  }
});

document.getElementById('addProductButton').addEventListener('click', function() {
  const productContainer = document.createElement('div');
  productContainer.classList.add('product-item', 'flex', 'mb-2');
  productContainer.innerHTML = `
    <select name="producto_id[]" class="mt-1 block w-1/2 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
      <!-- Opciones de productos se llenarán dinámicamente -->
    </select>
    <input type="number" name="cantidad[]" class="mt-1 ml-2 block w-1/2 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Cantidad">
  `;
  document.getElementById('productsContainer').appendChild(productContainer);
  loadProducts();  // Llenar las opciones de productos
});

document.getElementById('shipmentForm').addEventListener('submit', async function(event) {
  event.preventDefault();

  const envioId = document.getElementById('envioId').value;
  const cliente_documento = document.getElementById('cliente_documento').value;
  const cliente_nombre = document.getElementById('cliente_nombre').value;
  const cliente_direccion = document.getElementById('cliente_direccion').value;
  const cliente_telefono = document.getElementById('cliente_telefono').value;
  const cliente_correo = document.getElementById('cliente_correo').value;
  const direccion_destino = document.getElementById('direccion_destino').value;
  const costo_envio = parseFloat(document.getElementById('costo_envio').value);
  const estado_envio = document.getElementById('estado_envio').value;

  const productos = Array.from(document.getElementsByName('producto_id[]')).map((select, index) => {
    return {
      producto_id: parseInt(select.value),
      cantidad: parseInt(document.getElementsByName('cantidad[]')[index].value)
    };
  });

  // Validación de datos
  if (isNaN(costo_envio)) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'El costo de envío debe ser un número válido',
    });
    return;
  }
  for (const producto of productos) {
    if (isNaN(producto.producto_id) || isNaN(producto.cantidad)) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'La cantidad y el ID del producto deben ser números válidos',
      });
      return;
    }
  }

  try {
    const data = {
      cliente_documento,
      cliente_nombre,
      cliente_direccion,
      cliente_telefono,
      cliente_correo,
      direccion_destino,
      costo_envio,
      estado_envio,
      productos
    };

    if (envioId) {
      await axios.put(`/shipments/${envioId}`, data);
      Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: 'Envío actualizado exitosamente',
      });
    } else {
      await axios.post('/register-shipment', data);
      Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: 'Envío registrado exitosamente',
      });
    }
    resetForm();
    const modal = document.getElementById('shipmentFormModal');
    modal.classList.add('pointer-events-none', 'opacity-0');
    modal.classList.remove('opacity-100');
    document.getElementById('searchSection').classList.remove('hidden');
    loadShipments();
  } catch (error) {
    console.error('Error registrando el envío:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error registrando el envío',
    });
  }
});

async function loadProducts() {
  try {
    const response = await axios.get('/products');
    const products = response.data;
    const productSelects = document.querySelectorAll('select[name="producto_id[]"]');
    productSelects.forEach(select => {
      select.innerHTML = '';
      products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.PRODUCTO_ID;
        option.text = product.NOMBRE;
        select.appendChild(option);
      });
    });
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error cargando los productos',
    });
  }
}

async function loadShipments() {
  try {
    const response = await axios.get('/shipments');
    const shipments = response.data;
    const pendingShipmentsTableBody = document.getElementById('pendingShipmentsTableBody');
    const completedShipmentsTableBody = document.getElementById('completedShipmentsTableBody');
    pendingShipmentsTableBody.innerHTML = '';
    completedShipmentsTableBody.innerHTML = '';

    shipments.forEach((shipment, index) => {
      const row = document.createElement('tr');
      row.classList.add('transition-opacity', 'duration-500', 'opacity-0');
      if (shipment.ESTADO_ENVIO === 'pendiente') {
        row.innerHTML = `
          <td class="border px-4 py-2">${shipment.ENVIO_ID}</td>
          <td class="border px-4 py-2">${shipment.CLIENTE_NOMBRE}</td>
          <td class="border px-4 py-2 flex space-x-2">
            <button class="transition duration-300 ease-in-out text-white bg-gray-800 hover:bg-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2 me-2 mb-1 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700 view-button" data-id="${shipment.ENVIO_ID}">Ver</button>
            <button class="transition duration-300 ease-in-out text-white bg-gray-800 hover:bg-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2 me-2 mb-1 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700 edit-button" data-id="${shipment.ENVIO_ID}">Editar</button>
            <button class="transition duration-300 ease-in-out text-white bg-gray-800 hover:bg-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2 me-2 mb-1 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700 mark-done-button" data-id="${shipment.ENVIO_ID}">Hecho</button>
          </td>
        `;
        pendingShipmentsTableBody.appendChild(row);
      } else {
        row.innerHTML = `
          <td class="border px-4 py-2">${shipment.ENVIO_ID}</td>
          <td class="border px-4 py-2">${shipment.CLIENTE_NOMBRE}</td>
          <td class="border px-4 py-2 flex space-x-2">
            <button class="transition duration-300 ease-in-out text-white bg-gray-800 hover:bg-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2 me-2 mb-1 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700 view-button" data-id="${shipment.ENVIO_ID}">Ver</button>
          </td>
        `;
        completedShipmentsTableBody.appendChild(row);
      }
      setTimeout(() => {
        row.classList.remove('opacity-0');
        row.classList.add('opacity-100');
      }, index * 100);
    });

    document.querySelectorAll('.view-button').forEach(button => {
      button.addEventListener('click', async function() {
        const envioId = this.getAttribute('data-id');
        try {
          const response = await axios.get(`/shipments/${envioId}`);
          const shipment = response.data;

          const totalEnvio = shipment.COSTO_ENVIO + shipment.PRODUCTOS.reduce((total, product) => total + product.PRECIO * product.CANTIDAD, 0);

          document.getElementById('detailEnvioId').innerText = shipment.ENVIO_ID;
          document.getElementById('detailClienteDocumento').innerText = shipment.CLIENTE_DOCUMENTO;
          document.getElementById('detailClienteNombre').innerText = shipment.CLIENTE_NOMBRE;
          document.getElementById('detailClienteDireccion').innerText = shipment.CLIENTE_DIRECCION;
          document.getElementById('detailClienteTelefono').innerText = shipment.CLIENTE_TELEFONO;
          document.getElementById('detailDireccionDestino').innerText = shipment.DIRECCION_DESTINO;
          document.getElementById('detailCostoEnvio').innerText = shipment.COSTO_ENVIO;
          document.getElementById('detailEstadoEnvio').innerText = shipment.ESTADO_ENVIO;
          document.getElementById('detailTotalEnvio').innerText = totalEnvio;
          const productosList = shipment.PRODUCTOS.map(product => `${product.NOMBRE} (Cantidad: ${product.CANTIDAD})`).join(', ');
          document.getElementById('detailProductos').innerText = productosList;

          const modal = document.getElementById('shipmentDetailModal');
          modal.classList.remove('pointer-events-none', 'opacity-0');
          modal.classList.add('opacity-100');
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error cargando los detalles del envío',
          });
        }
      });
    });

    document.querySelectorAll('.edit-button').forEach(button => {
      button.addEventListener('click', async function() {
        const envioId = this.getAttribute('data-id');
        try {
          const response = await axios.get(`/shipments/${envioId}`);
          const shipment = response.data;

          document.getElementById('envioId').value = shipment.ENVIO_ID || '';
          document.getElementById('cliente_documento').value = shipment.CLIENTE_DOCUMENTO || '';
          document.getElementById('direccion_destino').value = shipment.DIRECCION_DESTINO || '';
          document.getElementById('costo_envio').value = shipment.COSTO_ENVIO || '';
          document.getElementById('estado_envio').value = shipment.ESTADO_ENVIO || 'pendiente';

          await loadClientData(shipment.CLIENTE_DOCUMENTO);

          const productsContainer = document.getElementById('productsContainer');
          productsContainer.innerHTML = '';
          shipment.PRODUCTOS.forEach(product => {
            const productContainer = document.createElement('div');
            productContainer.classList.add('product-item', 'flex', 'mb-2');
            productContainer.innerHTML = `
              <select name="producto_id[]" class="mt-1 block w-1/2 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <!-- Opciones de productos se llenarán dinámicamente -->
              </select>
              <input type="number" name="cantidad[]" class="mt-1 ml-2 block w-1/2 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Cantidad" value="${product.CANTIDAD}">
            `;
            productsContainer.appendChild(productContainer);
          });

          await loadProducts();

          const productSelects = productsContainer.querySelectorAll('select[name="producto_id[]"]');
          productSelects.forEach((select, index) => {
            select.value = shipment.PRODUCTOS[index].PRODUCTO_ID;
          });

          document.getElementById('formTitle').innerText = 'Editar Envío';
          document.getElementById('submitShipmentButton').innerText = 'Actualizar Envío';
          const modal = document.getElementById('shipmentFormModal');
          modal.classList.remove('pointer-events-none', 'opacity-0');
          modal.classList.add('opacity-100');
          document.getElementById('searchSection').classList.add('hidden');
        } catch (error) {
          console.error('Error cargando el envío:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error cargando el envío',
          });
        }
      });
    });

    document.querySelectorAll('.mark-done-button').forEach(button => {
      button.addEventListener('click', async function() {
        const envioId = this.getAttribute('data-id');
        try {
          await axios.put(`/shipments/${envioId}`, { estado_envio: 'hecho' });
          Swal.fire({
            icon: 'success',
            title: 'Éxito',
            text: 'Envío marcado como hecho',
          });
          loadShipments();
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error marcando el envío como hecho',
          });
        }
      });
    });
  } catch (error) {
    console.error('Error cargando los envíos:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error cargando los envíos',
    });
  }
}

document.getElementById('searchEnvioButton').addEventListener('click', async function() {
  const envioId = document.getElementById('searchEnvioId').value;
  try {
    const response = await axios.get(`/shipments/${envioId}`);
    const shipment = response.data;

    const totalEnvio = shipment.COSTO_ENVIO + shipment.PRODUCTOS.reduce((total, product) => total + product.PRECIO * product.CANTIDAD, 0);

    document.getElementById('detailEnvioId').innerText = shipment.ENVIO_ID;
    document.getElementById('detailClienteDocumento').innerText = shipment.CLIENTE_DOCUMENTO;
    document.getElementById('detailClienteNombre').innerText = shipment.CLIENTE_NOMBRE;
    document.getElementById('detailClienteDireccion').innerText = shipment.CLIENTE_DIRECCION;
    document.getElementById('detailClienteTelefono').innerText = shipment.CLIENTE_TELEFONO;
    document.getElementById('detailDireccionDestino').innerText = shipment.DIRECCION_DESTINO;
    document.getElementById('detailCostoEnvio').innerText = shipment.COSTO_ENVIO;
    document.getElementById('detailEstadoEnvio').innerText = shipment.ESTADO_ENVIO;
    document.getElementById('detailTotalEnvio').innerText = totalEnvio;
    const productosList = shipment.PRODUCTOS.map(product => `${product.NOMBRE} (Cantidad: ${product.CANTIDAD})`).join(', ');
    document.getElementById('detailProductos').innerText = productosList;

    const modal = document.getElementById('shipmentDetailModal');
    modal.classList.remove('pointer-events-none', 'opacity-0');
    modal.classList.add('opacity-100');
    document.getElementById('cancelSearchButton').classList.remove('hidden');
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se encontró el envío',
    });
  }
});

async function loadClientData(docId) {
  try {
    const response = await axios.get(`/get-client-by-doc/${docId}`);
    const client = response.data;

    document.getElementById('cliente_nombre').value = client.NOMBRE || '';
    document.getElementById('cliente_direccion').value = client.DIRECCION || '';
    document.getElementById('cliente_telefono').value = client.TELEFONO || '';
    document.getElementById('cliente_correo').value = client.CORREO_ELECTRONICO || '';

    document.getElementById('clientForm').classList.remove('hidden');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      document.getElementById('clientForm').classList.remove('hidden');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error cargando el cliente',
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadShipments();
});

loadProducts();
loadShipments();
