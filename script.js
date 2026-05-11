const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';

const coordenadasTGN = {
    "Beazley": [-33.7547, -66.6436],
    "La Carlota": [-33.4243, -63.2956],
    "Pueblo Seco": [-37.5833, -68.4167],
    "Pichanal": [-23.3211, -64.2181]
};

const map = L.map('map').setView([-34.6037, -58.3816], 5);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

async function fetchFleetData() {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await response.json();
        if (data.records) {
            document.getElementById('status').innerText = `✅ CONECTADO: ${data.records.length} REGISTROS`;
            dibujarPines(data.records);
            renderTimeline(data.records); // Esta es la función que llena el panel derecho
        }
    } catch (error) {
        document.getElementById('status').innerText = '❌ ERROR DE CONEXIÓN';
    }
}

function renderTimeline(records) {
    const ganttContainer = document.getElementById('gantt');
    ganttContainer.innerHTML = ''; // Limpiar antes de dibujar

    // Filtramos solo movimientos activos (sin Fecha Fin) para el Plan OHL
    const activos = records.filter(r => !r.fields["Fecha Fin"]);

    activos.forEach(mov => {
        const ut = mov.fields["UT Limpia"] || "S/D";
        const sn = mov.fields["Turbina"] || "S/N";
        const esMuleto = mov.fields["Es Muleto?"];

        // Crear la fila de la UT
        const row = document.createElement('div');
        row.className = 'timeline-row';
        
        row.innerHTML = `
            <div class="ut-name">${ut}</div>
            <div class="bar-container">
                <div class="turbine-bar ${esMuleto ? 'muleto-bar' : ''}" style="width: 80%; left: 5%;">
                    ${sn}
                </div>
            </div>
        `;
        ganttContainer.appendChild(row);
    });
}

function dibujarPines(records) {
    records.forEach(mov => {
        const ut = mov.fields["UT Limpia"];
        if (coordenadasTGN[ut] && !mov.fields["Fecha Fin"]) {
            L.circleMarker(coordenadasTGN[ut], {
                radius: 8, fillColor: "#E48A06", color: "#fff", weight: 1, fillOpacity: 0.8
            }).addTo(map).bindPopup(`<b>${ut}</b><br>${mov.fields["Turbina"]}`);
        }
    });
}

fetchFleetData();
