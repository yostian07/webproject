document.addEventListener("DOMContentLoaded", function() {
  fetchCategorias();
  fetchProductos();
  fetchTransacciones();
});

async function fetchCategorias() {
  try {
      const response = await fetch('/categorias');
      if (!response.ok) throw new Error('Error al obtener categorías');
      const categorias = await response.json();

      const selectCategoria = document.getElementById('filtrar-categoria');
      selectCategoria.innerHTML = '<option value="">Todas las Categorías</option>'; // Clear existing options
      categorias.forEach(categoria => {
          const option = document.createElement('option');
          option.value = categoria;
          option.textContent = categoria;
          selectCategoria.appendChild(option);
      });
  } catch (error) {
      console.error('Error fetching categorias:', error);
  }
}

async function fetchProductos(search = '', categoria = '') {
  try {
      const response = await fetch(`/productos?search=${search}&categoria=${categoria}`);
      if (!response.ok) throw new Error('Error al obtener productos');
      const data = await response.json();

      if (!data || data.length === 0) {
          Swal.fire({
              title: 'Error',
              text: 'No se encontraron productos',
              icon: 'error',
              confirmButtonText: 'Ok'
          });
          return;
      }

      const tableBody = document.querySelector('#productos-table tbody');
      tableBody.innerHTML = '';
      data.forEach((producto, index) => {
          const precio = producto[3] !== null ? parseFloat(producto[3]).toLocaleString('es-CR', { style: 'currency', currency: 'CRC' }) : 'N/A';
          const row = document.createElement('tr');
          row.classList.add('border-b', 'dark:border-gray-400', 'transition-opacity', 'duration-500', 'opacity-0');
          row.innerHTML = `
              <td class="px-4 py-2">${producto[1]}</td>
              <td class="px-4 py-2">${producto[2]}</td>
              <td class="px-4 py-2">${precio}</td>
              <td class="px-4 py-2">${producto[4]}</td>
              <td class="px-4 py-2">${producto[5]}</td>
              <td class="px-4 py-2">
                  <div class="flex gap-2">
                      <button class="text-white transition duration-300 ease-in-out bg-gray-800 hover:bg-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2 me-2 mb-1 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700" onclick="mostrarFormularioEditar(${producto[0]})">Editar</button>
                      <button class="text-white transition duration-300 ease-in-out bg-gray-800 hover:bg-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2 me-2 mb-1 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700" onclick="eliminarProducto(${producto[0]})">Eliminar</button>
                  </div>
              </td>
          `;
          tableBody.appendChild(row);
          setTimeout(() => {
              row.classList.remove('opacity-0');
              row.classList.add('opacity-100');
          }, index * 100);
      });
  } catch (error) {
      console.error('Error fetching productos:', error);
      Swal.fire({
          title: 'Error',
          text: 'Hubo un problema al cargar los productos.',
          icon: 'error',
          confirmButtonText: 'Ok'
      });
  }
}

async function fetchTransacciones() {
  try {
      const response = await fetch('/transacciones');
      if (!response.ok) throw new Error('Error al obtener transacciones');
      const data = await response.json();

      // Ordenar las transacciones por fecha y hora en orden descendente
      data.sort((a, b) => new Date(b.FECHA) - new Date(a.FECHA));

      const tableBody = document.querySelector('#transacciones-table tbody');
      tableBody.innerHTML = '';
      data.forEach((transaccion, index) => {
          const row = document.createElement('tr');
          row.classList.add('border-b', 'dark:border-gray-400', 'transition-opacity', 'duration-500', 'opacity-0');
          row.innerHTML = `
              <td class="px-4 py-2">${transaccion.FECHA || 'Fecha no disponible'}</td>
              <td class="px-4 py-2">${transaccion.PRODUCTO || 'Producto no disponible'}</td>
              <td class="px-4 py-2">${transaccion.CANTIDAD || 'Cantidad no disponible'}</td>
              <td class="px-4 py-2">${transaccion.MOTIVO || 'Motivo no disponible'}</td>
          `;
          tableBody.appendChild(row);
          setTimeout(() => {
              row.classList.remove('opacity-0');
              row.classList.add('opacity-100');
          }, index * 100);
      });
  } catch (error) {
      console.error('Error fetching transacciones:', error);
      Swal.fire({
          title: 'Error',
          text: 'Hubo un problema al cargar las transacciones.',
          icon: 'error',
          confirmButtonText: 'Ok'
      });
  }
}

function buscarProducto() {
  const search = document.getElementById('buscar-producto').value;
  const categoria = document.getElementById('filtrar-categoria').value;
  fetchProductos(search, categoria);
}

const searchSpinner = document.getElementById('search-spinner');
if (search) {
  search.addEventListener('submit', function(e) {
      e.preventDefault();
      // Mostrar el spinner
      searchSpinner.classList.remove('hidden');
      // Aquí puedes agregar tu lógica para buscar clientes

      // Simulación de búsqueda (ejemplo: usando setTimeout)
      setTimeout(() => {
          // Ocultar el spinner después de que la búsqueda se complete
          searchSpinner.classList.add('hidden');
      }, 1000); // Cambia el tiempo según tus necesidades
  }); 
}

function filtrarPorCategoria() {
  const categoria = document.getElementById('filtrar-categoria').value;
  fetchProductos('', categoria);
}

function mostrarFormularioAgregar() {
  document.getElementById('formulario-titulo').textContent = 'Agregar Producto';
  document.getElementById('producto-id').value = '';
  document.getElementById('producto-nombre').value = '';
  document.getElementById('producto-descripcion').value = '';
  document.getElementById('producto-precio').value = '';
  document.getElementById('producto-stock').value = '';
  document.getElementById('producto-categoria').value = '';
  document.getElementById('producto-stock-minimo').value = '';
  mostrarFormularioProducto();
}

function mostrarFormularioEditar(id) {
  fetch(`/productos?id=${id}`)
      .then(response => response.json())
      .then(data => {
          const producto = data[0];
          document.getElementById('formulario-titulo').textContent = 'Editar Producto';
          document.getElementById('producto-id').value = producto[0];
          document.getElementById('producto-nombre').value = producto[1];
          document.getElementById('producto-descripcion').value = producto[2];
          document.getElementById('producto-precio').value = producto[3];
          document.getElementById('producto-stock').value = producto[4];
          document.getElementById('producto-categoria').value = producto[5];
          document.getElementById('producto-stock-minimo').value = producto[6];
          mostrarFormularioProducto();
      })
      .catch(error => console.error('Error fetching producto:', error));
}

function mostrarFormularioProducto() {
  const form = document.getElementById('formulario-producto');
  form.classList.remove('hidden');
  form.classList.add('flex', 'justify-center', 'items-center');
}

function cerrarFormulario() {
  const form = document.getElementById('formulario-producto');
  form.classList.add('hidden');
  form.classList.remove('flex', 'justify-center', 'items-center');
}

async function guardarProducto() {
  const id = document.getElementById('producto-id').value;
  const nombre = document.getElementById('producto-nombre').value;
  const descripcion = document.getElementById('producto-descripcion').value;
  const precio = parseFloat(document.getElementById('producto-precio').value);
  const stock = parseInt(document.getElementById('producto-stock').value);
  const categoria = document.getElementById('producto-categoria').value;
  const stockMinimo = parseInt(document.getElementById('producto-stock-minimo').value);

  if (isNaN(precio) || isNaN(stock) || isNaN(stockMinimo)) {
      Swal.fire({
          title: 'Error',
          text: 'Precio, stock y stock mínimo deben ser números válidos',
          icon: 'error',
          confirmButtonText: 'Ok'
      });
      return;
  }

  const producto = {
      nombre,
      descripcion,
      precio,
      stock,
      categoria,
      stock_minimo: stockMinimo
  };

  try {
      let response;
      if (id) {
          response = await fetch(`/productos/${id}`, {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(producto)
          });
      } else {
          response = await fetch('/productos', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(producto)
          });
      }

      const data = await response.json();
      if (data.success) {
          cerrarFormulario();
          fetchProductos();
          fetchCategorias(); // Actualiza las categorías después de guardar
          Swal.fire({
              title: 'Éxito',
              text: id ? 'Producto actualizado correctamente' : 'Producto agregado correctamente',
              icon: 'success',
              confirmButtonText: 'Ok'
          });
      } else {
          Swal.fire({
              title: 'Error',
              text: id ? 'Error al actualizar el producto' : 'Error al agregar el producto',
              icon: 'error',
              confirmButtonText: 'Ok'
          });
      }
  } catch (error) {
      console.error('Error al guardar el producto:', error);
      Swal.fire({
          title: 'Error',
          text: 'Hubo un problema al guardar el producto',
          icon: 'error',
          confirmButtonText: 'Ok'
      });
  }
}

function eliminarProducto(id) {
  Swal.fire({
      title: '¿Estás seguro?',
      text: "¡No podrás revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar'
  }).then((result) => {
      if (result.isConfirmed) {
          fetch(`/productos/${id}`, {
              method: 'DELETE'
          })
          .then(response => response.json())
          .then(data => {
              if (data.success) {
                  fetchProductos();
                  Swal.fire(
                      'Eliminado!',
                      'El producto ha sido eliminado.',
                      'success'
                  );
              } else {
                  Swal.fire({
                      title: 'Error',
                      text: 'Error al eliminar el producto',
                      icon: 'error',
                      confirmButtonText: 'Ok'
                  });
              }
          })
          .catch(error => console.error('Error al eliminar el producto:', error));
      }
  });
}
