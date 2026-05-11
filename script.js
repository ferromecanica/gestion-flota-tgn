const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';

// Diccionario de coordenadas para las plantas de TGN
const coordenadasTGN = {
    "Beazley": [-33.7547, -66.6436],
    "La Carlota": [-33.4243, -63.2956],
    "Pueblo Seco": [-37.5833, -68.4167],
    "Pichanal": [-23.3211, -64.2181],
    "Lumbreras": [-25.2167, -64.9167],
    "Lavalle": [-28.2000, -65.1167],
    "Tucumán": [-26.8241, -65.2226],
    "Bajo Hondo": [-38.8833, -62.0167],
    "Indio Rico": [-38.4833, -60.8833]
};

// Inicialización del Mapa
const map = L.map('map').setView([-34.6037, -58.3816], 5); // Centrado en Argentina

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

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
        }
    } catch (error) {
        console.error(error);
        document.getElementById('status').innerText = '❌ ERROR DE CONEXIÓN';
    }
}

function dibujarPines(records) {
    records.forEach(mov => {
        const ut = mov.fields["UT Limpia"]; // Asegurate que el nombre sea exacto
        const sn = mov.fields["Turbina"];   // El S/N de la turbina
        const esMuleto = mov.fields["Es Muleto?"]; // Checkbox de backup

        // Si la planta existe en nuestro diccionario y el movimiento es actual (sin Fecha Fin)
        if (coordenadasTGN[ut] && !mov.fields["Fecha Fin"]) {
            const colorPin = esMuleto ? "#9ca3af" : "#E48A06"; // Gris para muleto, naranja para operativa
            
            const marker = L.circleMarker(coordenadasTGN[ut], {
                radius: 8,
                fillColor: colorPin,
                color: "#fff",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);

            marker.bindPopup(`<b>Planta: ${ut}</b><br>Turbina: ${sn}`);
        }
    });
}

fetchFleetData();
