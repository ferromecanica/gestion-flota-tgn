const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';
const VIEW_ID = 'viwSyMdWPCnP5lkKU';

// COORDENADAS CORREGIDAS
const coordenadasTGN = {
    "PUE": [-37.5835941, -68.4167814],
    "COC": [-31.3500000, -64.4333333],
    "LMR": [-25.2167000, -64.9167000],
    "BEA": [-33.7547000, -66.6436000],
    "CHA": [-33.3225000, -62.0358000],
    "LCA": [-33.4243000, -63.2956000],
    "TIO": [-31.3833000, -62.8333000],
    "JER": [-32.5500000, -62.1167000]
};

let todosLosRegistros = [];
let map, markersGroup;

const minDate = new Date("2022-01-01").getTime();
const maxDate = new Date("2032-01-01").getTime();
const totalRange = maxDate - minDate;
const viewportWidth = 3500; 

function init() {
    map = L.map('map').setView([-34.6037, -58.3816], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    markersGroup = L.layerGroup().addTo(map);
    
    // Línea de HOY
    const hoy = new Date().getTime();
    const hoyPos = ((hoy - minDate) / totalRange) * viewportWidth;
    document.getElementById('today-line').style.left = hoyPos + 'px';

    cargarDatos();
}

async function cargarDatos() {
    const statusEl = document.getElementById('status');
    try {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?view=${VIEW_ID}`);
        const data = await response.json();
        if (data.records) {
            todosLosRegistros = data.records;
            statusEl.innerText = `SISTEMA ONLINE: ${data.records.length} REGISTROS`;
            dibujarMapa(todosLosRegistros);
        }
    } catch (e) { statusEl.innerText = "ERROR API"; }
}

function showView(viewId, familia = null) {
    document.querySelectorAll('.page-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    document.getElementById(viewId).classList.add('active');

    if (viewId === 'gantt-view') {
        document.getElementById('gantt-title').innerText = `PLAN OHL | FAMILIA ${familia}`;
        const filtrados = todosLosRegistros.filter(r => r.fields["Familia"] === familia);
        dibujarGantt(filtrados);
        
        // Centrar scroll en HOY
        const hoy = new Date().getTime();
        const hoyPos = ((hoy - minDate) / totalRange) * viewportWidth;
        document.getElementById('gantt-wrapper').scrollLeft = hoyPos - 400;
    }
}

function dibujarMapa(registros) {
    markersGroup.clearLayers();
    registros.forEach(r => {
        const f = r.fields;
        const ut = f["UT Limpia"] || "S/D";
        const code = ut.substring(0, 3);
        const coords = coordenadasTGN[code];
        
        if (coords && !f["Fecha Fin"]) {
            const esMuleto = f["Es Muleto"] === true;
            L.circleMarker(coords, {
                radius: esMuleto ? 6 : 9, 
                fillColor: esMuleto ? "#555" : "#E48A06", 
                color: "#fff", weight: 1, fillOpacity: 0.9
            }).addTo(markersGroup).bindPopup(`<b>${ut}</b><br>T: ${f["Turbina Texto"]}<br>H: ${f["Horas Actuales"] || 0}`);
        }
    });
}

function dibujarGantt(registros) {
    const container = document.getElementById('gantt-rows');
    container.innerHTML = '';
    
    // Generar escala de años si está vacía
    const scale = document.getElementById('timeline-scale');
    if (scale.innerHTML.trim() === "") {
        for (let y = 2022; y <= 2031; y++) {
            scale.innerHTML += `<div class="year-block">${y}</div>`;
        }
    }

    registros.forEach(r => {
        const f = r.fields;
        const ut = f["UT Limpia"] || "S/D";
        const sn = f["Turbina Texto"] || "S/N";
        const esMuleto = f["Es Muleto"] === true;

        let start = f["Fecha"] ? new Date(f["Fecha"]).getTime() : minDate;
        let end = f["Fecha Fin Visual"] ? new Date(f["Fecha Fin Visual"]).getTime() : maxDate;
        
        start = Math.max(start, minDate);
        end = Math.min(end, maxDate);

        if (end > start) {
            const left = ((start - minDate) / totalRange) * viewportWidth;
            const width = ((end - start) / totalRange) * viewportWidth;
            const row = document.createElement('div');
            row.className = 'timeline-row';
            row.innerHTML = `<div class="ut-label">${ut}</div><div class="bar-box"><div class="bar ${esMuleto ? 'muleto' : ''}" style="left:${left}px; width:${width}px;">${sn}</div></div>`;
            container.appendChild(row);
        }
    });
}

window.onload = init;
