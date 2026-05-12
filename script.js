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
    // Hoy es 12/05/2026. Este cálculo lo pone exacto en la escala de 1600px + margen.
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
        const response = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
        const data = await response.json();
        todosLosRegistros = [...todosLosRegistros, ...data.records];

        if (data.offset) {
            await cargarDatos(data.offset);
        } else {
            // Mapa solo muestra lo que NO terminó todavía
            const activosMapa = todosLosRegistros.filter(r => {
                const fFin = r.fields["Fecha Fin Visual"] ? new Date(r.fields["Fecha Fin Visual"]).getTime() : Infinity;
                return fFin >= hoyMillis;
            });
            statusEl.innerText = `OK | ${activosMapa.length} ACTIVOS`;
            dibujarMapa(activosMapa);
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
        const hoyMillis = new Date().getTime();
        // Gantt muestra activos y futuros (descartamos pasados)
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
            const shift = conteo[code] * 0.055; 
            conteo[code]++;
            const fam = String(f["Familia"] || "").toUpperCase();
            const esMuleto = f["Es Muleto"] === true || ut.includes("TDR");
            let color = "#E48A06";
            if (fam === "M100") color = "#1e40af";
            if (fam === "T60") color = "#0d9488";
            if (esMuleto) color = "#555";
            L.circleMarker([coords[0] - shift, coords[1] + shift], {
                radius: 9, fillColor: color, color: "#fff", weight: 1, fillOpacity: 0.9
            }).addTo(markersGroup).bindPopup(`<b>${ut}</b><br>${f["Turbina Texto"]}<br>Hrs: ${f["Horas Actuales"] || 0}`);
        }
    });
}

function dibujarGantt(registros) {
    const container = document.getElementById('gantt-rows');
    container.innerHTML = '';
    const hoyMillis = new Date().getTime();

    // 1. Agrupar por UT para permitir movimientos futuros en la misma fila
    const grupos = {};
    registros.forEach(r => {
        const ut = String(r.fields["UT Limpia"] || "S/D");
        if (!grupos[ut]) grupos[ut] = [];
        grupos[ut].push(r);
    });

    // 2. Ordenar UTs (TDR/Muletos abajo)
    const utsOrdenadas = Object.keys(grupos).sort((a, b) => {
        const aTdr = a.includes("TDR") || grupos[a][0].fields["Es Muleto"] === true;
        const bTdr = b.includes("TDR") || grupos[b][0].fields["Es Muleto"] === true;
        return aTdr - bTdr;
    });

    // 3. Dibujar escala
    const scale = document.getElementById('timeline-scale');
    scale.innerHTML = ''; 
    for (let y = 2022; y <= 2031; y++) {
        scale.innerHTML += `<div class="year-block">${y}</div>`;
    }

    // 4. Inyectar barras
    utsOrdenadas.forEach(ut => {
        const row = document.createElement('div');
        row.className = 'timeline-row';
        let barrasHTML = '';
        
        grupos[ut].forEach(m => {
            const f = m.fields;
            const fam = String(f["Familia"] || "").toUpperCase();
            const esMuleto = f["Es Muleto"] === true || ut.includes("TDR");
            let start = f["Fecha"] ? new Date(f["Fecha"]).getTime() : minDate;
            let end = f["Fecha Fin Visual"] ? new Date(f["Fecha Fin Visual"]).getTime() : maxDate;
            
            start = Math.max(start, minDate);
            end = Math.min(end, maxDate);

            if (end > start) {
                const left = ((start - minDate) / totalRange) * viewportWidth;
                const width = ((end - start) / totalRange) * viewportWidth;
                const esFuturo = start > hoyMillis;
                const colorClass = fam === "M100" ? "bar-m100" : (fam === "T60" ? "bar-t60" : "bar-t70");
                const tooltip = `S/N: ${f["Turbina Texto"]}\nHoras: ${f["Horas Actuales"] || 0}\nProx OHL: ${f["Prox OHL"] || 'S/D'}`;

                barrasHTML += `
                    <div class="bar ${colorClass} ${esMuleto ? 'tdr' : ''} ${esFuturo ? 'bar-futura' : ''}" 
                         style="left:${left}px; width:${width}px;" title="${tooltip}">
                        ${f["Turbina Texto"] || "S/N"}
                    </div>`;
            }
        });
        row.innerHTML = `<div class="ut-label">${ut}</div><div class="bar-box">${barrasHTML}</div>`;
        container.appendChild(row);
    });
}

window.onload = init;
