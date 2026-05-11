const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';
const VIEW_ID = 'viwSyMdWPCnP5lkKU';

// Coordenadas de Plantas TGN (Ajustadas para matchear tus nombres)
const coordenadasTGN = {
    "LCA": [-33.4243, -63.2956], // La Carlota
    "TIO": [-31.3833, -62.8333], // Tío Pujio
    "BEA": [-33.7547, -66.6436], // Beazley
    "BEL": [-27.6500, -67.0333], // Belén
    "LUM": [-25.2167, -64.9167], // Lumbreras
    "JER": [-32.5500, -62.1167], // Jerónimo M.
    "LAV": [-28.2000, -65.1167], // Lavalle
    "PIC": [-23.3211, -64.2181], // Pichanal
    "PUE": [-37.5833, -68.4167]  // Pueblo Seco
};

let map, markersGroup;
const minDate = new Date("2026-01-01").getTime();
const maxDate = new Date("2030-01-01").getTime();
const totalRange = maxDate - minDate;
const viewportWidth = 2400; // Coincide con CSS

function init() {
    map = L.map('map').setView([-34.6037, -58.3816], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    markersGroup = L.layerGroup().addTo(map);
    cargarDatos();
}

async function cargarDatos() {
    const statusEl = document.getElementById('status');
    try {
        const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?view=${VIEW_ID}&cacheBuster=${Date.now()}`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await response.json();
        
        if (data.records) {
            statusEl.innerText = `✅ T70 CONECTADAS: ${data.records.length}`;
            dibujarTodo(data.records);
        }
    } catch (e) {
        statusEl.innerText = "❌ ERROR API";
    }
}

function dibujarTodo(registros) {
    const container = document.getElementById('gantt-rows');
    container.innerHTML = '';
    markersGroup.clearLayers();

    registros.forEach(r => {
        const f = r.fields;
        const ut = f["UT Limpia"] || "S/D";
        const sn = f["Turbina Texto"] || "S/N";
        
        // --- 1. LÓGICA DE FECHAS (BARRA DE GANTT) ---
        let fInicio = f["Fecha"] ? new Date(f["Fecha"]).getTime() : minDate;
        let fFin = f["Fecha Fin Visual"] ? new Date(f["Fecha Fin Visual"]).getTime() : null;
        
        let esIncompleto = false;
        if (!fFin) {
            // Si no hay fecha fin, le damos 1 año de duración para que sea visible
            fFin = fInicio + (86400000 * 365);
            esIncompleto = true;
        }

        let left = ((fInicio - minDate) / totalRange) * viewportWidth;
        let width = ((fFin - fInicio) / totalRange) * viewportWidth;

        // Ajustes para visualización
        if (left < 0) left = 0;
        if (width < 30) width = 100;

        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.innerHTML = `
            <div class="ut-label">${ut}</div>
            <div class="bar-box">
                <div class="bar ${esIncompleto ? 'bar-pending' : ''}" 
                     style="left: ${left}px; width: ${width}px;" 
                     title="Instalación: ${f["Fecha"] || 'S/D'}">
                    ${sn} ${esIncompleto ? ' (Verificar fechas)' : ''}
                </div>
            </div>
        `;
        container.appendChild(row);

        // --- 2. LÓGICA DE MAPA ---
        const prefijoUT = ut.substring(0, 3); // Toma "LCA", "BEA", etc.
        const coords = coordenadasTGN[prefijoUT];

        if (coords && !f["Fecha Fin"]) {
            L.circleMarker(coords, {
                radius: 8,
                fillColor: "#E48A06",
                color: "#fff",
                weight: 1,
                fillOpacity: 0.8
            }).addTo(markersGroup).bindPopup(`<b>${ut}</b><br>Turbina: ${sn}<br>Familia: ${f["Familia"]}`);
        }
    });
}

window.onload = init;
