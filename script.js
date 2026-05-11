const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';

const coordenadasTGN = {
    "LMR": [-35.10701111729368, -66.83017549362897],
    "PUE": [-37.54775316810032, -67.73435632628639],
    "COC": [-36.366345264914976, -67.07470531631624],
    "BEA": [-33.7947278563908, -66.64557971271866],
    "CHA": [-33.57661936089481, -65.10266988204269],
    "LCA": [-33.324082475333874, -63.56042741471796],
    "TIO": [-32.29040136421469, -63.2817489913925],
    "JER": [-32.86882501340949, -61.07660895126634],
    "PIC": [-23.411465030614657, -64.33378178052973],
    "LUM": [-25.205707746680435, -64.94601401301017],
    "DEA": [-30.37684306759464, -64.37296376071762],
    "LAV": [-27.90039152467719, -64.81423506635666],
    "CAN": [-26.124801522350516, -65.16969465161392],
    "BEL": [-32.63028523528489, -62.23192726118961],
    "LEO": [-32.63028523528489, -62.23192726118961],
    "BAL": [-33.14278380631091, -62.30572136301947],
    "SJA": [-38.07403648358134, -69.06459533583903]
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
            // FILTRO CRÍTICO: Solo registros sin Fecha Fin
            todosLosRegistros = data.records.filter(r => !r.fields["Fecha Fin"]);
            statusEl.innerText = `OK | ${todosLosRegistros.length} EQUIPOS`;
            dibujarMapa(todosLosRegistros);
        }
    } catch (e) { statusEl.innerText = "ERROR API"; }
}

function showView(viewId, familia = null) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(familia || 'MAPA')) btn.classList.add('active');
    });

    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active', 'hidden'));
    document.querySelectorAll('.page-view').forEach(v => { if(v.id !== viewId) v.classList.add('hidden'); });
    document.getElementById(viewId).classList.add('active');

    if (viewId === 'gantt-view') {
        document.getElementById('gantt-title').innerText = `PLAN OHL | ${familia}`;
        const filtrados = todosLosRegistros.filter(r => r.fields["Familia"] === familia);
        dibujarGantt(filtrados);
    }
}

function dibujarMapa(registros) {
    markersGroup.clearLayers();
    registros.forEach(r => {
        const f = r.fields;
        const ut = f["UT Limpia"] || "S/D";
        const code = ut.substring(0, 3);
        let coords = coordenadasTGN[code];
        
        if (coords) {
            // JITTER: Desplazamiento aleatorio para evitar superposición
            const lat = coords[0] + (Math.random() - 0.5) * 0.15;
            const lng = coords[1] + (Math.random() - 0.5) * 0.15;
            
            const esMuleto = f["Es Muleto"] === true;
            const color = esMuleto ? "#555" : (f["Familia"] === "T70" ? "#E48A06" : (f["Familia"] === "M100" ? "#1e40af" : "#0d9488"));

            L.circleMarker([lat, lng], {
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
        const familia = f["Familia"];

        let start = f["Fecha"] ? new Date(f["Fecha"]).getTime() : minDate;
        let end = f["Fecha Fin Visual"] ? new Date(f["Fecha Fin Visual"]).getTime() : maxDate;
        
        start = Math.max(start, minDate);
        end = Math.min(end, maxDate);

        if (end > start) {
            const left = ((start - minDate) / totalRange) * viewportWidth;
            const width = ((end - start) / totalRange) * viewportWidth;
            
            let famClass = familia === "M100" ? "bar-m100" : (familia === "T70" ? "bar-t70" : "bar-t60");

            const row = document.createElement('div');
            row.className = 'timeline-row';
            row.innerHTML = `<div class="ut-label">${ut}</div><div class="bar-box"><div class="bar ${famClass} ${esMuleto ? 'muleto' : ''}" style="left:${left}px; width:${width}px;">${sn}</div></div>`;
            container.appendChild(row);
        }
    });
}

window.onload = init;
