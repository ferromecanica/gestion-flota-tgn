const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';
const VIEW_ID = 'viwSyMdWPCnP5lkKU';

const coordenadasTGN = {
    "Beazley": [-33.7547, -66.6436],
    "La Carlota": [-33.4243, -63.2956],
    "Rosario": [-32.9468, -60.6393],
    "Pichanal": [-23.3211, -64.2181],
    "Lumbreras": [-25.2167, -64.9167],
    "Tucumán": [-26.8241, -65.2226],
    "Lavalle": [-28.2000, -65.1167],
    "Pueblo Seco": [-37.5833, -68.4167],
    "Belén": [-27.6500, -67.0333],
    "Jerónimo": [-32.5500, -62.1167]
};

let todosLosRegistros = [];
let map, markersGroup;

// Inicialización
function init() {
    map = L.map('map').setView([-34.6037, -58.3816], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    markersGroup = L.layerGroup().addTo(map);
    cargarDatos();
}

const minDate = new Date("2026-01-01").getTime();
const maxDate = new Date("2030-01-01").getTime();
const totalRange = maxDate - minDate;
const viewportWidth = 2000;

async function cargarDatos() {
    const statusEl = document.getElementById('status');
    try {
        statusEl.innerText = "SINCRO...";
        const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?view=${VIEW_ID}&cacheBuster=${Date.now()}`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await response.json();
        
        if (data.records) {
            todosLosRegistros = data.records;
            statusEl.innerText = `✅ DATOS: ${data.records.length}`;
            dibujarTodo(todosLosRegistros);
        }
    } catch (e) {
        statusEl.innerText = "❌ ERROR API";
        console.error(e);
    }
}

function filtrar(familia) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === familia);
    });
    const filtrados = (familia === 'TODAS') 
        ? todosLosRegistros 
        : todosLosRegistros.filter(r => r.fields["Familia"] === familia);
    dibujarTodo(filtrados);
}

function dibujarTodo(registros) {
    const container = document.getElementById('gantt-rows');
    container.innerHTML = '';
    markersGroup.clearLayers();

    registros.forEach(r => {
        const f = r.fields;
        const ut = f["UT Limpia"] || "S/D";
        const sn = f["Turbina Texto"] || "S/N";
        
        // 1. GANTT
        const fInicio = f["Fecha"] ? new Date(f["Fecha"]).getTime() : minDate;
        const fFin = f["Fecha Fin Visual"] ? new Date(f["Fecha Fin Visual"]).getTime() : (fInicio + 86400000 * 365);

        let left = ((fInicio - minDate) / totalRange) * viewportWidth;
        let width = ((fFin - fInicio) / totalRange) * viewportWidth;

        // Limites para que no rompa el diseño
        if (left < 0) left = 0;
        if (width < 20) width = 80;

        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.innerHTML = `
            <div class="ut-label">${ut}</div>
            <div class="bar-box">
                <div class="bar" style="left: ${left}px; width: ${width}px;">${sn}</div>
            </div>
        `;
        container.appendChild(row);

        // 2. MAPA (Pines)
        const utLimpia = ut.split('-')[0]; // Intenta matchear el nombre base de la planta
        let coords = coordenadasTGN[ut] || coordenadasTGN[utLimpia];

        if (coords && !f["Fecha Fin"]) {
            L.circleMarker(coords, {
                radius: 7, fillColor: "#E48A06", color: "#fff", weight: 1, fillOpacity: 0.8
            }).addTo(markersGroup).bindPopup(`<b>${ut}</b><br>${sn}`);
        }
    });
}

// Arrancar cuando el DOM esté listo
window.onload = init;
