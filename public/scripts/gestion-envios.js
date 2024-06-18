document.getElementById('toggleFormButton').addEventListener('click', function() {
  document.getElementById('shipmentForm').classList.toggle('hidden');
  document.getElementById('searchSection').classList.toggle('hidden');
  resetForm();
});

document.getElementById('cancelEditButton').addEventListener('click', function() {
  resetForm();
  document.getElementById('shipmentForm').classList.add('hidden');
  document.getElementById('searchSection').classList.remove('hidden');
});

document.getElementById('cancelSearchButton').addEventListener('click', function() {
  resetForm();
  loadShipments();
  document.getElementById('cancelSearchButton').classList.add('hidden');
  document.getElementById('searchSection').classList.remove('hidden');
});

document.getElementById('closeReportButton').addEventListener('click', function() {
  document.getElementById('shipmentReportModal').style.display = 'none';
});

document.getElementById('closeReportModal').addEventListener('click', function() {
  document.getElementById('shipmentReportModal').style.display = 'none';
});

function resetForm() {
  document.getElementById('formTitle').innerText = 'Registrar Envío';
  document.getElementById('submitShipmentButton').innerText = 'Registrar Envío';
  document.getElementById('envioId').value = '';
  document.getElementById('cliente_documento').value = '';
  document.getElementById('cliente_nombre').value = '';
  document.getElementById('cliente_direccion').value = '';
  document.getElementById('cliente_telefono').value = '';
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
document.getElementById('shipmentForm').classList.add('hidden');
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
    const shipmentsTableBody = document.getElementById('shipmentsTableBody');
    shipmentsTableBody.innerHTML = '';

    shipments.forEach(shipment => {
      const total = shipment.PRECIO_TOTAL ? parseFloat(shipment.PRECIO_TOTAL) : parseFloat(shipment.COSTO_ENVIO);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="border px-4 py-2">${shipment.ENVIO_ID}</td>
        <td class="border px-4 py-2">${shipment.CLIENTE_DOCUMENTO}</td>
        <td class="border px-4 py-2">${shipment.CLIENTE_NOMBRE}</td>
        <td class="border px-4 py-2">${shipment.CLIENTE_DIRECCION}</td>
        <td class="border px-4 py-2">${shipment.CLIENTE_TELEFONO}</td>
        <td class="border px-4 py-2">${shipment.DIRECCION_DESTINO}</td>
        <td class="border px-4 py-2">${shipment.COSTO_ENVIO}</td>
        <td class="border px-4 py-2">${shipment.ESTADO_ENVIO}</td>
        <td class="border px-4 py-2">${total}</td>
        <td class="border px-4 py-2">
          <button class="bg-blue-500 text-white py-1 px-2 rounded edit-button" data-id="${shipment.ENVIO_ID}">Editar</button>
        </td>
      `;
      shipmentsTableBody.appendChild(row);
    });

    document.querySelectorAll('.edit-button').forEach(button => {
      button.addEventListener('click', async function() {
        const envioId = this.getAttribute('data-id');
        try {
          const response = await axios.get(`/shipments/${envioId}`);
          const shipment = response.data;

          document.getElementById('envioId').value = shipment.ENVIO_ID;
          document.getElementById('cliente_documento').value = shipment.CLIENTE_DOCUMENTO;
          document.getElementById('cliente_nombre').value = shipment.CLIENTE_NOMBRE;
          document.getElementById('cliente_direccion').value = shipment.CLIENTE_DIRECCION;
          document.getElementById('cliente_telefono').value = shipment.CLIENTE_TELEFONO;
          document.getElementById('direccion_destino').value = shipment.DIRECCION_DESTINO;
          document.getElementById('costo_envio').value = shipment.COSTO_ENVIO;
          document.getElementById('estado_envio').value = shipment.ESTADO_ENVIO;

          // Limpiar y rellenar los productos
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

          // Llamar a loadProducts para rellenar las opciones de productos en los selects
          await loadProducts();

          // Establecer el valor correcto en cada select
          const productSelects = productsContainer.querySelectorAll('select[name="producto_id[]"]');
          productSelects.forEach((select, index) => {
            select.value = shipment.PRODUCTOS[index].PRODUCTO_ID;
          });

          document.getElementById('formTitle').innerText = 'Editar Envío';
          document.getElementById('submitShipmentButton').innerText = 'Actualizar Envío';
          document.getElementById('clientForm').classList.remove('hidden');
          document.getElementById('shipmentForm').classList.remove('hidden');
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

    document.getElementById('reportEnvioId').innerText = shipment.ENVIO_ID;
    document.getElementById('reportClienteDocumento').innerText = shipment.CLIENTE_DOCUMENTO;
    document.getElementById('reportClienteNombre').innerText = shipment.CLIENTE_NOMBRE;
    document.getElementById('reportClienteDireccion').innerText = shipment.CLIENTE_DIRECCION;
    document.getElementById('reportClienteTelefono').innerText = shipment.CLIENTE_TELEFONO;
    document.getElementById('reportDireccionDestino').innerText = shipment.DIRECCION_DESTINO;
    document.getElementById('reportCostoEnvio').innerText = shipment.COSTO_ENVIO;
    document.getElementById('reportEstadoEnvio').innerText = shipment.ESTADO_ENVIO;
    const productosList = shipment.PRODUCTOS.map(product => `${product.NOMBRE} (Cantidad: ${product.CANTIDAD})`).join(', ');
    document.getElementById('reportProductos').innerText = productosList;

    document.getElementById('shipmentReportModal').style.display = 'block';
    document.getElementById('cancelSearchButton').classList.remove('hidden');
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error no se encontro el envío',
    });
  }
});

loadProducts();
loadShipments();