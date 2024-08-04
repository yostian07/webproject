document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.animate-slide-in').forEach((element, index) => {
    setTimeout(() => {
      element.style.opacity = 1;
      element.style.transform = 'scale(1)';
    }, index * 75); // Escalonar animaciones con un retraso
  });

  // Establecer la fecha actual en el campo de fecha
  const dateInput = document.getElementById('date');
  const today = new Date();
  const todayString = today.getFullYear() + '-' + 
                      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(today.getDate()).padStart(2, '0');
  dateInput.value = todayString;
});

async function fetchProducts() {
  const response = await fetch('/get-products');
  const products = await response.json();
  return products;
}

function populateProductDetails(row, product) {
  row.querySelector('.description').value = product.DESCRIPCION;
  row.querySelector('.price').value = product.PRECIO;
  row.querySelector('.quantity').setAttribute('data-max', product.STOCK); // Agregar el stock máximo permitido
}

async function addProductRow() {
  const products = await fetchProducts();
  const table = document.getElementById('product-table');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td class="px-4 py-2">
      <select class="w-full border-2 border-gray-300 rounded product-select">
        <option value="">Seleccione un producto</option>
        ${products.map(product => `<option value="${product.PRODUCTO_ID}">${product.NOMBRE}</option>`).join('')}
      </select>
    </td>
    <td class="px-4 py-2"><input type="text" class="w-full border-2 border-gray-300 rounded description" readonly /></td>
    <td class="px-4 py-2 text-right"><input type="number" class="w-full border-2 border-gray-300 rounded quantity" /></td>
    <td class="px-4 py-2 text-right"><input type="number" class="w-full border-2 border-gray-300 rounded price" readonly /></td>
    <td class="px-4 py-2 text-center"><button class="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 transition duration-200 remove-product">Eliminar</button></td>
  `;
  table.appendChild(row);

  const productSelect = row.querySelector('.product-select');
  productSelect.addEventListener('change', function() {
    const selectedProductId = this.value;
    const selectedProduct = products.find(product => product.PRODUCTO_ID == selectedProductId);
    if (selectedProduct) {
      populateProductDetails(row, selectedProduct);
    }
  });

  const quantityInput = row.querySelector('.quantity');
  quantityInput.addEventListener('input', function() {
    const maxStock = parseInt(this.getAttribute('data-max'), 10);
    if (parseInt(this.value, 10) > maxStock) {
      Swal.fire({
        title: 'Error',
        text: 'La cantidad no puede ser mayor que el stock disponible',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
      this.value = maxStock;
    }
  });

  const removeButton = row.querySelector('.remove-product');
  removeButton.addEventListener('click', function() {
    row.remove();
  });
}

async function fetchClientData() {
  const documentValue = document.getElementById('document').value;
  if (documentValue) {
    try {
      const response = await fetch(`/get-client-data?document=${documentValue}`);
      if (response.ok) {
        const clientData = await response.json();
        if (clientData) {
          document.getElementById('name').value = clientData.name || '';
          document.getElementById('phone').value = clientData.phone || '';
          document.getElementById('address').value = clientData.address || '';
          document.getElementById('email').value = clientData.email || '';
        }
      } else {
        console.error('Error al obtener datos del cliente:', response.statusText);
      }
    } catch (error) {
      console.error('Error al obtener datos del cliente:', error);
    }
  }
}

async function submitSale() {
  const clientData = {
    name: document.getElementById('name').value,
    document: document.getElementById('document').value,
    phone: document.getElementById('phone').value,
    address: document.getElementById('address').value,
    email: document.getElementById('email').value
  };

  // Nombres descriptivos de los campos en español
  const fieldNames = {
    name: 'Nombre',
    document: 'Documento de identidad',
    phone: 'Teléfono',
    address: 'Dirección',
    email: 'Correo Electrónico'
  };

  // Validación de campos obligatorios
  for (const key in clientData) {
    if (!clientData[key]) {
      Swal.fire({
        title: 'Error',
        text: `El campo ${fieldNames[key]} es obligatorio`,
        icon: 'error',
        confirmButtonText: 'Ok'
      });
      return;
    }
  }

  const products = [];
  let valid = true;

  document.querySelectorAll('#product-table tr').forEach(row => {
    const cells = row.querySelectorAll('input, select');
    const quantity = parseInt(cells[2].value, 10);
    const maxStock = parseInt(cells[2].getAttribute('data-max'), 10);

    if (quantity > maxStock) {
      valid = false;
      Swal.fire({
        title: 'Error',
        text: `La cantidad del producto ${cells[0].options[cells[0].selectedIndex].text} no puede ser mayor que el stock disponible`,
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    }

    products.push({
      product_id: cells[0].value,
      description: cells[1].value,
      quantity: cells[2].value,
      price: cells[3].value
    });
  });

  if (!valid) {
    return; // Si alguna validación falla, no procede con el registro
  }

  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
  const saleDate = document.getElementById('date').value;
  const seller = document.getElementById('seller').value;

  const saleData = {
    client: clientData,
    products: products,
    payment: paymentMethod,
    date: saleDate,
    seller: seller
  };

  try {
    const response = await fetch('/register-sale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saleData)
    });
    const result = await response.json();
    if (response.ok) {
      Swal.fire({
        title: 'Venta registrada',
        text: result.message,
        icon: 'success',
        confirmButtonText: 'Ok'
      });
      window.open(result.fileUrl, '_blank'); // Abrir el PDF generado en una nueva pestaña
      resetSaleForm(); // Llamar a la función para restablecer el formulario
    } else {
      Swal.fire({
        title: 'Error',
        text: result.message,
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    }
  } catch (error) {
    Swal.fire({
      title: 'Error',
      text: 'Error al registrar la venta',
      icon: 'error',
      confirmButtonText: 'Ok'
    });
    console.error('Error:', error);
  }
}

function resetSaleForm() {
  document.getElementById('name').value = '';
  document.getElementById('document').value = '';
  document.getElementById('phone').value = '';
  document.getElementById('address').value = '';
  document.getElementById('email').value = '';
  document.getElementById('date').value = '';
  document.getElementById('seller').value = '';


  const productTable = document.getElementById('product-table');
  productTable.innerHTML = ''; // Esto eliminará todas las filas de la tabla de productos

  
  document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.checked = false;
  });

  // Establecer la fecha actual en el campo de fecha nuevamente
  const today = new Date();
  const todayString = today.getFullYear() + '-' + 
                      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(today.getDate()).padStart(2, '0');
  document.getElementById('date').value = todayString;
}

document.addEventListener('DOMContentLoaded', () => {
  fetchProducts(); // Pre-fetch productos
  document.getElementById('document').addEventListener('blur', fetchClientData); // Añadir evento para autocompletar datos del cliente
});
