let ventasChart, clientesChart, productosChart;

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

async function renderClientesChart(month) {
    const ctx = document.getElementById('clientesChart').getContext('2d');
    const year = new Date().getFullYear();
    const response = await fetch(`/api/clientes-mas-compras?month=${month}&year=${year}`);
    const clientesData = await response.json();

    console.log(`Datos de clientes para el mes ${month}:`, clientesData);

    if (!response.ok) {
        console.error('Error al obtener los datos de los clientes');
        return;
    }

    if (clientesChart) {
        clientesChart.destroy();
    }

    if (clientesData.length === 0) {
        clientesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Compras',
                    data: []
                }]
            },
            options: {
                scales: {
                    x: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        return;
    }

    clientesChart = new Chart(ctx, {
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

async function renderVentasChart(month) {
    const ctx = document.getElementById('ventasChart').getContext('2d');
    const year = new Date().getFullYear();
    const response = await fetch(`/api/ventas-registradas?month=${month}&year=${year}`);
    const ventasData = await response.json();

    console.log(`Datos de ventas para el mes ${month}:`, ventasData);

    if (!response.ok) {
        console.error('Error al obtener los datos de ventas');
        return;
    }

    if (ventasChart) {
        ventasChart.destroy();
    }

    if (ventasData.length === 0) {
        ventasChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Cantidad de productos vendidos',
                    data: []
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
        return;
    }

    ventasChart = new Chart(ctx, {
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

async function renderProductosChart(month) {
    const ctx = document.getElementById('productosChart').getContext('2d');
    const year = new Date().getFullYear();
    const response = await fetch(`/api/productos-mas-vendidos?month=${month}&year=${year}`);
    const productosData = await response.json();

    console.log(`Datos de productos para el mes ${month}:`, productosData);

    if (!response.ok) {
        console.error('Error al obtener los datos de productos');
        return;
    }

    if (productosChart) {
        productosChart.destroy();
    }

    if (productosData.length === 0) {
        productosChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    label: 'Cantidad Vendida',
                    data: []
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
        return;
    }

    productosChart = new Chart(ctx, {
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
}

function downloadCSV(data) {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Ventas Registradas\n";
    csvContent += ventasChart.data.labels.map((label, index) => `${label},${ventasChart.data.datasets[0].data[index]}`).join("\n");
    csvContent += "\n\nClientes que más compran\n";
    csvContent += clientesChart.data.labels.map((label, index) => `${label},${clientesChart.data.datasets[0].data[index]}`).join("\n");
    csvContent += "\n\nProductos más vendidos\n";
    csvContent += productosChart.data.labels.map((label, index) => `${label},${productosChart.data.datasets[0].data[index]}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "datos_dashboard.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function saveMonthSelection(month) {
    localStorage.setItem('selectedMonth', month);
}

function getSavedMonthSelection() {
    return localStorage.getItem('selectedMonth') || '01';
}

window.onload = function() {
    const savedMonth = getSavedMonthSelection();
    document.getElementById('monthSelector').value = savedMonth;

    verificarStockBajo();
    checkAuth();
    renderVentasChart(savedMonth);
    renderProductosChart(savedMonth);
    renderClientesChart(savedMonth);
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

document.getElementById('monthSelector').addEventListener('change', function() {
    const selectedMonth = this.value;
    saveMonthSelection(selectedMonth);

    renderVentasChart(selectedMonth);
    renderProductosChart(selectedMonth);
    renderClientesChart(selectedMonth);
});

document.getElementById('downloadCSV').addEventListener('click', function() {
    const ventasData = ventasChart.data.datasets[0].data.map((value, index) => ({
        label: ventasChart.data.labels[index],
        value
    }));

    const clientesData = clientesChart.data.datasets[0].data.map((value, index) => ({
        label: clientesChart.data.labels[index],
        value
    }));

    const productosData = productosChart.data.datasets[0].data.map((value, index) => ({
        label: productosChart.data.labels[index],
        value
    }));

    downloadCSV([...ventasData, ...clientesData, ...productosData]);
});
