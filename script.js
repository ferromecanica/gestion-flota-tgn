const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';

// Inicialización de Mapa
const map = L.map('map').setView([-34.6037, -58.3816], 5);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

// Configuración de escala de tiempo (4 años: 2024-2028)
const minDate = new Date("2024-01-01").getTime();
const maxDate = new Date("2028-01-01").getTime();
const totalRange = maxDate - minDate;

async function arrancar() {
    const statusEl = document.getElementById('debug-bar');
    try {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?sort%5B0%5D%5Bfield%5D=UT+Limpia`, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await response.json();
        
        if (data.records) {
            statusEl.innerText = "Sincronización completa. Filtrando registros actuales...";
            renderizar(data.records);
        }
    } catch (err) {
        statusEl.innerText = "Error de conexión.";
    }
}

function renderizar(records) {
    const container = document.getElementById('gantt');
    container.innerHTML = ''; 

    // 1. Filtrar solo los registros que NO tienen Fecha Fin (Plan Actual)
    const actuales = records.filter(r => !r.fields["Fecha Fin"]);

    actuales.forEach(r => {
        const f = r.fields;
        const ut = f["UT Limpia"] || "S/D";
        const sn = Array.isArray(f["Turbina"]) ? "Turbina ID" : (f["Turbina"] || "S/N"); 
        const esMuleto = f["Es Muleto"] === true;

        // Cálculos de posición para el Gantt
        const inicio = new Date(f["Fecha"] || "2024-01-01").getTime();
        const fin = new Date(f["Fecha Fin Visual"] || "2027-12-31").getTime();

        let leftPercent = ((inicio - minDate) / totalRange) * 100;
        let widthPercent = ((fin - inicio) / totalRange) * 100;

        // Ajustes de seguridad para el gráfico
        if (leftPercent < 0) leftPercent = 0;
        if (widthPercent <= 0) widthPercent = 5; // Mínimo visible

        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.innerHTML = `
            <div class="ut-label">${ut}</div>
            <div class="bar-box">
                <div class="bar ${esMuleto ? 'muleto-bar' : ''}" 
                     style="left: ${leftPercent}%; width: ${widthPercent}%;">
                    ${sn}
                </div>
            </div>
        `;
        container.appendChild(row);

        // Marcador en el mapa (Solo coordenadas genéricas por ahora)
        if (!f["Es Muleto"]) {
            L.circleMarker([-34.6, -58.4], {radius: 6, fillColor: '#E48A06', color: '#fff', weight: 1, fillOpacity: 0.8})
             .addTo(map).bindPopup(`<b>${ut}</b><br>${sn}`);
        }
    });
}

arrancar();
