document.addEventListener("DOMContentLoaded", async function() {
    const token = localStorage.getItem('authToken');
  
    if (!token) {
      window.location.href = 'index.html';
      return;
    }
  
    try {
      const response = await fetch('http://localhost:3000/gestion-inventario.html', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (response.status === 401) {
        window.location.href = 'login.html';
        return;
      }
  
      fetchCategorias();
      fetchProductos();
      fetchTransacciones();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar la página. Por favor, inténtelo de nuevo más tarde.');
    }
  });
  
  async function fetchCategorias() {
    try {
      const response = await fetch('/categorias');
      if (!response.ok) throw new Error('Error al obtener categorías');
      const categorias = await response.json();
  
      const selectCategoria = document.getElementById('filtrar-categoria');
      selectCategoria.innerHTML = '<option value="">Todas las Categorías</option>';
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
      
      // Si no se encontró ningún producto, enviamos un mensaje específico
      if (!response.ok) throw new Error('Producto no encontrado');
      
      const data = await response.json();

      // Si la respuesta es válida pero no hay productos
      if (!data || data.length === 0) {
        Swal.fire({
          title: 'Producto no encontrado',
          text: 'No se encontraron productos que coincidan con los criterios de búsqueda.',
          icon: 'warning',
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
        text: error.message === 'Producto no encontrado' 
              ? 'No se encontraron productos que coincidan con los criterios de búsqueda.'
              : 'Hubo un problema al cargar los productos.',
        icon: error.message === 'Producto no encontrado' ? 'warning' : 'error',
        confirmButtonText: 'Ok'
      });
    }
}

  


async function fetchTransacciones(filters = {}) {
  try {
      const query = new URLSearchParams(filters).toString();
      const response = await fetch(`/transacciones?${query}`);
      
      // Verificar si la respuesta es un 404, lo que significa que no se encontraron transacciones
      if (response.status === 404) {
          Swal.fire({
              title: 'Sin resultados',
              text: 'No se encontraron transacciones con los filtros aplicados.',
              icon: 'info',
              confirmButtonText: 'Ok'
          });
          return;
      }

      if (!response.ok) throw new Error('Error al obtener transacciones');
      
      const data = await response.json();
      
      // Si no se encontraron transacciones, mostrar un mensaje específico
      if (!data || data.length === 0) {
          Swal.fire({
              title: 'Sin resultados',
              text: 'No se encontraron transacciones con los filtros aplicados.',
              icon: 'info',
              confirmButtonText: 'Ok'
          });
          return;
      }

      // Ordenar y mostrar transacciones
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
              <td class="px-4 py-2">${transaccion.TIPO || 'Tipo no disponible'}</td>
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


  
  function aplicarFiltros() {
    const fecha = document.getElementById('filtrar-fecha').value || null;
    const producto = document.getElementById('filtrar-producto').value || null;
    const tipo = document.getElementById('filtrar-tipo').value || null;
  
    const filters = {};
    if (fecha) filters.fecha = fecha;
    if (producto) filters.producto = producto;
    if (tipo) filters.tipo = tipo;
  
    fetchTransacciones(filters);
  }
  
  function limpiarFiltros() {
    document.getElementById('filtrar-fecha').value = '';
    document.getElementById('filtrar-producto').value = '';
    document.getElementById('filtrar-tipo').value = '';
  
    fetchTransacciones();
  }
  
  
  
  function buscarProducto() {
    const search = document.getElementById('buscar-producto').value;
    const categoria = document.getElementById('filtrar-categoria').value;
    fetchProductos(search, categoria);
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
        fetchCategorias();
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
  