const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';
const VIEW_ID = 'viwSyMdWPCnP5lkKU';

const coordenadasTGN = {
    "PUE": [-37.5835941, -68.4167814],
    "COC": [-31.35, -64.4333333],
    "LMR": [-25.2167, -64.9167],
    "BEA": [-33.7547, -66.6436],
    "CHA": [-33.3225, -62.0358],
    "LCA": [-33.4243, -63.2956],
    "TIO": [-31.3833, -62.8333],
    "JER": [-32.55, -62.1167]
};

let todosLosRegistros = [];
let map, markersGroup;

const minDate = new Date("2022-01-01").getTime();
const maxDate = new Date("2032-01-01").getTime();
const totalRange = maxDate - minDate;
const viewportWidth = 3500; 

function init() {
    try {
        map = L.map('map').setView([-34.6037, -58.3816], 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
        markersGroup = L.layerGroup().addTo(map);
        
        const hoy = new Date().getTime();
        const hoyPos = ((hoy - minDate) / totalRange) * viewportWidth;
        const line = document.getElementById('today-line');
        if(line) line.style.left = hoyPos + 'px';
        
        const wrapper = document.getElementById('gantt-wrapper');
        if(wrapper) wrapper.scrollLeft = hoyPos - 400;

        cargarDatos();
    } catch(err) {
        document.getElementById('status').innerText = "ERROR INICIALIZACIÓN";
    }
}

async function cargarDatos() {
    const statusEl = document.getElementById('status');
    try {
        statusEl.innerText = "CONECTANDO...";
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?view=${VIEW_ID}&cacheBuster=${Date.now()}`, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        
        if(!response.ok) throw new Error("Airtable falló");
        
        const data = await response.json();
        if (data.records) {
            todosLosRegistros = data.records;
            statusEl.innerText = `CONECTADO: ${data.records.length}`;
            dibujarTodo(todosLosRegistros);
        }
    } catch (e) { 
        statusEl.innerText = "FALLO CONEXIÓN AIRTABLE";
        console.error(e);
    }
}

function filtrar(familia) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === familia);
    });
    const filtrados = (familia === 'TODAS') ? todosLosRegistros : todosLosRegistros.filter(r => r.fields["Familia"] === familia);
    dibujarTodo(filtrados);
}

function dibujarTodo(registros) {
    const container = document.getElementById('gantt-rows');
    if(!container) return;
    container.innerHTML = '';
    markersGroup.clearLayers();

    registros.forEach(r => {
        try {
            const f = r.fields;
            const ut = f["UT Limpia"] || "S/D";
            const sn = f["Turbina Texto"] || "S/N";
            const horas = f["Horas Actuales"] || "0";

            let fInicio = f["Fecha"] ? new Date(f["Fecha"]).getTime() : minDate;
            let fFin = f["Fecha Fin Visual"] ? new Date(f["Fecha Fin Visual"]).getTime() : maxDate;
            
            fInicio = Math.max(fInicio, minDate);
            fFin = Math.min(fFin, maxDate);

            if (fFin > fInicio) {
                const left = ((fInicio - minDate) / totalRange) * viewportWidth;
                const width = ((fFin - fInicio) / totalRange) * viewportWidth;
                const row = document.createElement('div');
                row.className = 'timeline-row';
                row.innerHTML = `<div class="ut-label">${ut}</div><div class="bar-box"><div class="bar" style="left: ${left}px; width: ${width}px;">${sn}</div></div>`;
                container.appendChild(row);
            }

            const prefijoUT = ut.substring(0, 3);
            const coords = coordenadasTGN[prefijoUT];
            if (coords && !f["Fecha Fin"]) {
                L.circleMarker(coords, {
                    radius: 8, fillColor: "#E48A06", color: "#fff", weight: 1, fillOpacity: 0.8
                }).addTo(markersGroup).bindPopup(`<b>${ut}</b><br>Turbina: ${sn}<br><b>Horas: ${horas} h</b>`);
            }
        } catch (err) { console.warn("Error en fila", err); }
    });
}

window.onload = init;
