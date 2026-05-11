const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';

// Coordenadas fijas para probar el mapa
const coordenadasTGN = {
    "Beazley": [-33.7547, -66.6436],
    "La Carlota": [-33.4243, -63.2956],
    "Rosario": [-32.9468, -60.6393]
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
        
        if (data.records && data.records.length > 0) {
            const campos = Object.keys(data.records[0].fields);
            document.getElementById('debug-bar').innerText = "Columnas detectadas: " + campos.join(" | ");
            document.getElementById('status').innerText = `✅ DATOS: ${data.records.length}`;
            
            dibujarPines(data.records);
            renderTimeline(data.records);
        } else {
            document.getElementById('status').innerText = '⚠️ SIN DATOS';
        }
    } catch (error) {
        document.getElementById('status').innerText = '❌ ERROR';
    }
}

function renderTimeline(records) {
    const ganttContainer = document.getElementById('gantt');
    ganttContainer.innerHTML = ''; 

    // Tomamos los primeros 15 registros para ver si aparecen
    records.slice(0, 15).forEach(mov => {
        // Buscador flexible: intenta encontrar la columna de UT o Turbina
        const fields = mov.fields;
        const ut = fields["UT Limpia"] || fields["UT"] || fields["Ubicación"] || "S/D";
        const sn = fields["Turbina"] || fields["S/N"] || "S/N";

        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.innerHTML = `
            <div class="ut-name">${ut}</div>
            <div class="bar-container">
                <div class="turbine-bar" style="width: 80%; left: 5%;">
                    ${sn}
                </div>
            </div>
        `;
        ganttContainer.appendChild(row);
    });
}

function dibujarPines(records) {
    records.forEach(mov => {
        const ut = mov.fields["UT Limpia"] || mov.fields["UT"];
        if (ut && coordenadasTGN[ut]) {
            L.circleMarker(coordenadasTGN[ut], {
                radius: 8, fillColor: "#E48A06", color: "#fff", weight: 1, fillOpacity: 0.8
            }).addTo(map);
        }
    });
}

fetchFleetData();
