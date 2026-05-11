const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';
const VIEW_ID = 'viwSyMdWPCnP5lkKU';

const coordenadasTGN = {
    "LCA": [-33.4243, -63.2956],
    "TIO": [-31.3833, -62.8333],
    "BEA": [-33.7547, -66.6436],
    "BEL": [-27.6500, -67.0333],
    "LUM": [-25.2167, -64.9167],
    "JER": [-32.5500, -62.1167],
    "LAV": [-28.2000, -65.1167],
    "PIC": [-23.3211, -64.2181],
    "PUE": [-37.5833, -68.4167],
    "CHA": [-34.7833, -59.8500],
    "COC": [-31.3500, -64.4333],
    "SJA": [-31.5375, -68.5364]
};

let map, markersGroup;
// Nueva ventana de tiempo: 2022 a 2032 (10 años)
const minDate = new Date("2022-01-01").getTime();
const maxDate = new Date("2032-01-01").getTime();
const totalRange = maxDate - minDate;
const viewportWidth = 3000; 

function init() {
    map = L.map('map').setView([-34.6037, -58.3816], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    markersGroup = L.layerGroup().addTo(map);
    cargarDatos();
}

async function cargarDatos() {
    try {
        const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?view=${VIEW_ID}`;
        const response = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
        const data = await response.json();
        if (data.records) {
            document.getElementById('status').innerText = `T70 CONECTADAS: ${data.records.length}`;
            dibujarTodo(data.records);
        }
    } catch (e) { document.getElementById('status').innerText = "ERROR API"; }
}

function dibujarTodo(registros) {
    const container = document.getElementById('gantt-rows');
    container.innerHTML = '';
    markersGroup.clearLayers();

    registros.forEach(r => {
        const f = r.fields;
        const ut = f["UT Limpia"] || "S/D";
        const sn = f["Turbina Texto"] || "S/N";
        const horas = f["Horas Actuales"] || "0";

        // --- LÓGICA DE GANTT (CON RECORTE) ---
        let rawInicio = f["Fecha"] ? new Date(f["Fecha"]).getTime() : minDate;
        let rawFin = f["Fecha Fin Visual"] ? new Date(f["Fecha Fin Visual"]).getTime() : maxDate;

        // "Morir" en los límites: si la fecha se sale del 2022-2032, la ajustamos al borde
        let fInicio = Math.max(rawInicio, minDate);
        let fFin = Math.min(rawFin, maxDate);

        if (fFin > fInicio) {
            let left = ((fInicio - minDate) / totalRange) * viewportWidth;
            let width = ((fFin - fInicio) / totalRange) * viewportWidth;

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

        // --- LÓGICA DE MAPA ---
        const prefijoUT = ut.substring(0, 3);
        const coords = coordenadasTGN[prefijoUT];

        if (coords && !f["Fecha Fin"]) {
            L.circleMarker(coords, {
                radius: 8, fillColor: "#E48A06", color: "#fff", weight: 1, fillOpacity: 0.8
            }).addTo(markersGroup).bindPopup(`
                <b>${ut}</b><br>
                Turbina: ${sn}<br>
                <b>Horas: ${horas} h</b>
            `);
        }
    });
}

window.onload = init;
