const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';

const coordenadasTGN = {
    "LMR": [-35.1070, -66.8301], "PUE": [-37.5477, -67.7343], "COC": [-36.3663, -67.0747],
    "BEA": [-33.7947, -66.6455], "CHA": [-33.5766, -65.1026], "LCA": [-33.3240, -63.5604],
    "TIO": [-32.2904, -63.2817], "JER": [-32.8688, -61.0766], "PIC": [-23.4114, -64.3337],
    "LUM": [-25.2057, -64.9460], "DEA": [-30.3768, -64.3729], "LAV": [-27.9003, -64.8142],
    "CAN": [-26.1248, -65.1696], "BEL": [-32.6302, -62.2319], "LEO": [-32.6302, -62.2319],
    "BAL": [-33.1427, -62.3057], "SJA": [-38.0740, -69.0645]
};

let todosLosRegistros = [];
let map, markersGroup;

const minDate = new Date("2022-01-01").getTime();
const maxDate = new Date("2032-01-01").getTime();
const totalRange = maxDate - minDate;
const viewportWidth = 1600; 

function init() {
    map = L.map('map').setView([-34.6, -63.6], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    markersGroup = L.layerGroup().addTo(map);
    
    const hoy = new Date().getTime();
    const hoyPos = ((hoy - minDate) / totalRange) * viewportWidth;
    document.getElementById('today-line').style.left = hoyPos + 'px';

    cargarDatos();
}

async function cargarDatos() {
    const statusEl = document.getElementById('status');
    try {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?cacheBuster=${Date.now()}`, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await response.json();
        if (data.records) {
            todosLosRegistros = data.records; // Guardamos TODO para el Gantt
            statusEl.innerText = `OK | ${todosLosRegistros.length} MOVIMIENTOS`;
            
            // Para el mapa, filtramos solo los activos
            const activos = todosLosRegistros.filter(r => !r.fields["Fecha Fin"]);
            dibujarMapa(activos);
        }
    } catch (e) { statusEl.innerText = "ERROR API"; }
}

function showView(viewId, familia = null) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(familia || 'MAPA')) btn.classList.add('active');
    });

    document.querySelectorAll('.page-view').forEach(v => v.classList.add('hidden'));
    const activeView = document.getElementById(viewId);
    activeView.classList.remove('hidden');
    activeView.classList.add('active');

    if (viewId === 'gantt-view') {
        document.getElementById('gantt-title').innerText = `PLAN OHL | ${familia}`;
        // Filtrado por familia (sin importar Fecha Fin)
        const filtrados = todosLosRegistros.filter(r => String(r.fields["Familia"]) === familia);
        dibujarGantt(filtrados);
    }
}

function dibujarMapa(registros) {
    markersGroup.clearLayers();
    const conteoPlantas = {};

    registros.forEach(r => {
        const f = r.fields;
        const ut = f["UT Limpia"] || "S/D";
        const code = ut.substring(0, 3);
        const coords = coordenadasTGN[code];
        
        if (coords) {
            // Lógica de desplazamiento para máquinas en la misma planta
            if (!conteoPlantas[code]) conteoPlantas[code] = 0;
            const offset = conteoPlantas[code] * 0.025; 
            conteoPlantas[code]++;

            const esMuleto = f["Es Muleto"] === true;
            const fam = String(f["Familia"]);
            
            let color = "#E48A06"; // Default T70
            if (fam === "M100") color = "#1e40af";
            if (fam === "T60") color = "#0d9488";
            if (esMuleto) color = "#555";

            L.circleMarker([coords[0] - offset, coords[1] + offset], {
                radius: 8, fillColor: color, color: "#fff", weight: 1, fillOpacity: 0.9
            }).addTo(markersGroup).bindPopup(`<b>${ut}</b><br>${f["Turbina Texto"]}<br>Horas: ${f["Horas Actuales"] || 0}`);
        }
    });
}

function dibujarGantt(registros) {
    const container = document.getElementById('gantt-rows');
    container.innerHTML = '';
    
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
        const fam = String(f["Familia"]);

        let start = f["Fecha"] ? new Date(f["Fecha"]).getTime() : minDate;
        let end = f["Fecha Fin Visual"] ? new Date(f["Fecha Fin Visual"]).getTime() : maxDate;
        
        start = Math.max(start, minDate);
        end = Math.min(end, maxDate);

        if (end > start) {
            const left = ((start - minDate) / totalRange) * viewportWidth;
            const width = ((end - start) / totalRange) * viewportWidth;
            
            let colorClass = "bar-t70";
            if (fam === "M100") colorClass = "bar-m100";
            if (fam === "T60") colorClass = "bar-t60";

            const row = document.createElement('div');
            row.className = 'timeline-row';
            row.innerHTML = `<div class="ut-label">${ut}</div><div class="bar-box"><div class="bar ${colorClass} ${esMuleto ? 'muleto' : ''}" style="left:${left}px; width:${width}px;">${sn}</div></div>`;
            container.appendChild(row);
        }
    });
}

window.onload = init;
