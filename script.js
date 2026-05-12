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
const viewportWidth = 1600; // El ancho útil de los años

function init() {
    map = L.map('map').setView([-34.6, -63.6], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    markersGroup = L.layerGroup().addTo(map);
    
    const hoy = new Date().getTime();
    // Sumamos 160 del ut-label para que la línea roja coincida con la escala
    const hoyPos = ((hoy - minDate) / totalRange) * viewportWidth + 160;
    const line = document.getElementById('today-line');
    if(line) line.style.left = hoyPos + 'px';

    cargarDatos();
}

async function cargarDatos(offset = '') {
    const statusEl = document.getElementById('status');
    const hoyMillis = new Date().getTime();
    
    try {
        const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?offset=${offset}`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await response.json();
        
        todosLosRegistros = [...todosLosRegistros, ...data.records];

        if (data.offset) {
            await cargarDatos(data.offset);
        } else {
            // Filtrar activos (sin fecha fin o fecha fin futura)
            const activos = todosLosRegistros.filter(r => {
                const fFin = r.fields["Fecha Fin Visual"] ? new Date(r.fields["Fecha Fin Visual"]).getTime() : Infinity;
                return fFin >= hoyMillis;
            });
            statusEl.innerText = `SISTEMA OK | ${activos.length} EQUIPOS`;
            dibujarMapa(activos);
        }
    } catch (e) { statusEl.innerText = "ERROR API"; }
}

function showView(viewId, familia = null) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(familia || 'MAPA')) btn.classList.add('active');
    });

    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    if (viewId === 'home-view') {
        setTimeout(() => map.invalidateSize(), 100);
    } else {
        document.getElementById('gantt-title').innerText = `PLAN OHL | ${familia}`;
        // Filtrar solo los movimientos activos de la familia
        const hoyMillis = new Date().getTime();
        const filtrados = todosLosRegistros.filter(r => {
            const fFin = r.fields["Fecha Fin Visual"] ? new Date(r.fields["Fecha Fin Visual"]).getTime() : Infinity;
            return String(r.fields["Familia"]).toUpperCase() === familia.toUpperCase() && fFin >= hoyMillis;
        });
        dibujarGantt(filtrados);
    }
}

function dibujarMapa(registros) {
    markersGroup.clearLayers();
    const conteo = {};

    registros.forEach(r => {
        const f = r.fields;
        const ut = String(f["UT Limpia"] || "");
        const code = ut.substring(0, 3);
        const coords = coordenadasTGN[code];
        
        if (coords) {
            if (!conteo[code]) conteo[code] = 0;
            // Jitter aumentado para que sea visible la superposición
            const shift = conteo[code] * 0.045; 
            conteo[code]++;

            const fam = String(f["Familia"] || "").toUpperCase();
            const esTdr = ut.includes("TDR") || f["Es Muleto"] === true;
            
            let color = "#E48A06";
            if (fam === "M100") color = "#1e40af";
            if (fam === "T60") color = "#0d9488";
            if (esTdr) color = "#555";

            L.circleMarker([coords[0] - shift, coords[1] + shift], {
                radius: 8, fillColor: color, color: "#fff", weight: 1, fillOpacity: 0.9
            }).addTo(markersGroup).bindPopup(`<b>${ut}</b><br>${f["Turbina Texto"]}<br>Familia: ${fam}`);
        }
    });
}

function dibujarGantt(registros) {
    const container = document.getElementById('gantt-rows');
    container.innerHTML = '';
    
    const scale = document.getElementById('timeline-scale');
    scale.innerHTML = ''; 
    for (let y = 2022; y <= 2031; y++) {
        scale.innerHTML += `<div class="year-block">${y}</div>`;
    }

    registros.forEach(r => {
        const f = r.fields;
        const ut = String(f["UT Limpia"] || "");
        const fam = String(f["Familia"] || "").toUpperCase();
        const esTdr = ut.includes("TDR") || f["Es Muleto"] === true;
        
        let colorClass = "bar-t70";
        if (fam === "M100") colorClass = "bar-m100";
        if (fam === "T60") colorClass = "bar-t60";

        let start = f["Fecha"] ? new Date(f["Fecha"]).getTime() : minDate;
        let end = f["Fecha Fin Visual"] ? new Date(f["Fecha Fin Visual"]).getTime() : maxDate;
        
        start = Math.max(start, minDate);
        end = Math.min(end, maxDate);

        if (end > start) {
            const left = ((start - minDate) / totalRange) * viewportWidth;
            const width = ((end - start) / totalRange) * viewportWidth;
            const row = document.createElement('div');
            row.className = 'timeline-row';
            row.innerHTML = `
                <div class="ut-label">${ut}</div>
                <div class="bar-box">
                    <div class="bar ${colorClass} ${esTdr ? 'tdr' : ''}" style="left:${left}px; width:${width}px;">
                        ${f["Turbina Texto"] || "S/N"}
                    </div>
                </div>`;
            container.appendChild(row);
        }
    });
}

window.onload = init;
