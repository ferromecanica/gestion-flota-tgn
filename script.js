const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';
const VIEW_ID = 'viwSyMdWPCnP5lkKU';

// Coordenadas TGN
const coordenadasTGN = {
    "Beazley": [-33.7547, -66.6436],
    "La Carlota": [-33.4243, -63.2956],
    "Rosario": [-32.9468, -60.6393],
    "Pichanal": [-23.3211, -64.2181],
    "Lumbreras": [-25.2167, -64.9167],
    "Tucumán": [-26.8241, -65.2226],
    "Lavalle": [-28.2000, -65.1167]
};

let todosLosRegistros = [];

// Inicializar Mapa
const map = L.map('map').setView([-34.6037, -58.3816], 5);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
let markersGroup = L.layerGroup().addTo(map);

// Escala de tiempo: 2026-2030 (4 años)
const minDate = new Date("2026-01-01").getTime();
const maxDate = new Date("2030-01-01").getTime();
const totalRange = maxDate - minDate;
const viewportWidth = 2000; // Coincide con CSS

async function cargarDatos() {
    try {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?view=${VIEW_ID}`);
        const data = await response.json();
        if (data.records) {
            todosLosRegistros = data.records;
            document.getElementById('status').innerText = `✅ DATOS: ${data.records.length}`;
            dibujarTodo(todosLosRegistros);
        }
    } catch (e) { document.getElementById('status').innerText = "❌ ERROR"; }
}

function filtrar(familia) {
    // Actualizar botones
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
        
        // 1. Dibujar Fila de Gantt
        const inicio = new Date(f["Fecha"] || "2026-01-01").getTime();
        const fin = new Date(f["Fecha Fin Visual"] || "2027-01-01").getTime();

        const left = ((inicio - minDate) / totalRange) * viewportWidth;
        const width = ((fin - inicio) / totalRange) * viewportWidth;

        if (width > 0) {
            const row = document.createElement('div');
            row.className = 'timeline-row';
            row.innerHTML = `
                <div class="ut-label">${ut}</div>
                <div class="bar-box">
                    <div class="bar" style="left: ${left}px; width: ${width}px;">${sn}</div>
                </div>
            `;
            container.appendChild(row);
        }

        // 2. Dibujar Pin en Mapa (Solo si no tiene Fecha Fin)
        if (!f["Fecha Fin"] && coordenadasTGN[ut]) {
            L.circleMarker(coordenadasTGN[ut], {
                radius: 8, fillColor: "#E48A06", color: "#fff", weight: 1, fillOpacity: 0.8
            }).addTo(markersGroup).bindPopup(`<b>${ut}</b><br>${sn}`);
        }
    });
}

cargarDatos();
