async function verificarStockBajo() {
    try {
        const response = await fetch('/verificar-stock-bajo');
        const data = await response.json();
        if (response.ok) {
            if (data.length > 0) {
                document.getElementById('notificaciones-badge').textContent = data.length;
                document.getElementById('notificaciones-badge').style.display = 'inline';
                document.getElementById('notificaciones-link').onclick = function() {
                    mostrarNotificaciones(data);
                };
            }
        } else {
            console.error('Error al verificar el stock: ', data.error);
        }
    } catch (error) {
        console.error('Error al verificar el stock: ', error);
    }
}

function mostrarNotificaciones(productos) {
    const modal = document.getElementById('notificaciones-modal');
    const lista = document.getElementById('notificaciones-list');
    lista.innerHTML = '';
    productos.forEach(producto => {
        const item = document.createElement('li');
        item.textContent = `Producto: ${producto.NOMBRE}, Stock: ${producto.STOCK}`;
        lista.appendChild(item);
    });
    modal.style.display = 'block';
}

async function renderClientesChart() {
    const ctx = document.getElementById('clientesChart').getContext('2d');
    const response = await fetch('/api/clientes-mas-compras');
    const clientesData = await response.json();

    if (!response.ok) {
        console.error('Error al obtener los datos de los clientes');
        return;
    }

    console.log(clientesData); // Log para verificar los datos recibidos

    if (!clientesData.length) {
        console.warn('No se encontraron datos de clientes');
        return;
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: clientesData.map(cliente => cliente.name),
            datasets: [{
                label: 'Compras',
                data: clientesData.map(cliente => cliente.totalPurchases),
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            const cliente = clientesData[tooltipItem.dataIndex];
                            return `${cliente.name} (Cédula: ${cliente.cedula}): ${cliente.totalPurchases}`;
                        }
                    }
                }
            }
        }
    });
}


window.onload = function() {
    verificarStockBajo();
    checkAuth();
    renderVentasChart();
    renderProductosChart();
    renderClientesChart();
};

document.getElementById('modal-close').onclick = function() {
    const modal = document.getElementById('notificaciones-modal');
    modal.style.display = 'none';
};

window.onclick = function(event) {
    const modal = document.getElementById('notificaciones-modal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('authToken');
    window.location.href = 'index.html';
});

function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'index.html';
    }
}

async function renderVentasChart() {
    const ctx = document.getElementById('ventasChart').getContext('2d');
    const response = await fetch('/api/ventas-registradas');
    const ventasData = await response.json();

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ventasData.map(venta => venta.date),
            datasets: [{
                label: 'Cantidad de productos vendidos',
                data: ventasData.map(venta => venta.totalQuantity),
                backgroundColor: 'rgba(229, 255, 0, 0.2)',
                borderColor: 'rgba(229, 255, 0, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function renderProductosChart() {
    const ctx = document.getElementById('productosChart').getContext('2d');
    const response = await fetch('/api/productos-mas-vendidos');
    const productosData = await response.json();

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: productosData.map(producto => producto.name),
            datasets: [{
                label: 'Cantidad Vendida',
                data: productosData.map(producto => producto.quantity),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            return tooltipItem.label + ': ' + tooltipItem.raw;
                        }
                    }
                }
            }
        }
    });

    document.getElementById('downloadCSV').addEventListener('click', function() {
        downloadCSV(productosData);
    });
}

function downloadCSV(data) {
    const csv = data.map(row => `${row.name},${row.quantity}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'productos_mas_vendidos.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
