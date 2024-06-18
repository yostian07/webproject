document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.animate-slide-in').forEach((element, index) => {
        setTimeout(() => {
            element.style.opacity = 1;
            element.style.transform = 'scale(1)';
        }, index * 75); // Ajusta el retraso para rapidez y suavidad
    });
});

let datosReporte = [];

async function generarReporte(tipo) {
    try {
        const response = await fetch(`/generar-reporte?tipo=${tipo}`);
        const data = await response.json();
        if (response.ok) {
            datosReporte = data; // Guardar los datos para exportación
            mostrarDatosEnTabla(datosReporte);
            mostrarBotonExportar();
        } else {
            document.getElementById('resultado-reporte').innerHTML = `<p>Error: ${data.error}</p>`;
        }
    } catch (error) {
        document.getElementById('resultado-reporte').innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

function formatearFecha(fecha) {
    const opciones = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const date = new Date(fecha);
    // Ajuste de zona horaria local
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString('es-ES', opciones);
}

function mostrarDatosEnTabla(datos) {
    if (datos.length === 0) {
        document.getElementById('resultado-reporte').innerHTML = '<p>No hay datos disponibles.</p>';
        return;
    }

    const keys = Object.keys(datos[0]);
    const table = document.createElement('table');
    table.classList.add('table-auto', 'w-full', 'bg-white', 'shadow-md', 'rounded', 'tabla-reportes');

    // Crear cabecera
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    keys.forEach(key => {
        const th = document.createElement('th');
        th.classList.add('px-4', 'py-2', 'bg-gray-200', 'font-bold', 'uppercase', 'text-sm', 'text-gray-900', 'text-left'); // 'text-gray-900' para texto oscuro
        th.textContent = key;
        headerRow.appendChild(th);
    });

    // Crear cuerpo de la tabla
    const tbody = table.createTBody();
    datos.forEach(row => {
        const tr = tbody.insertRow();
        keys.forEach(key => {
            const td = tr.insertCell();
            td.classList.add('px-4', 'py-2', 'border-t', 'text-gray-900'); 
            if (key === 'FECHA') {
                td.textContent = formatearFecha(row[key]);
            } else {
                td.textContent = row[key];
            }
        });
    });

    // Añadir tabla al contenedor
    const resultadoDiv = document.getElementById('resultado-reporte');
    resultadoDiv.innerHTML = '';
    resultadoDiv.appendChild(table);
}

function mostrarBotonExportar() {
    const botonExportarDiv = document.getElementById('boton-exportar');
    botonExportarDiv.innerHTML = `<button class="bg-gray-900 text-white px-4 py-2 rounded" onclick="exportToCSV(datosReporte)">Exportar a CSV</button>`;
}

function exportToCSV(datos) {
    const keys = Object.keys(datos[0]);
    let csvContent = keys.join(',') + '\n';

    datos.forEach(row => {
        const values = keys.map(key => `"${row[key]}"`); // Envolviendo cada valor entre comillas para manejar comas en datos
        csvContent += values.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'reporte.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
