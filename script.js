const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';

const T_MOV = 'MOVIMIENTOS';
const T_PLAN = 'PLANIFICACION';
const T_TURB = 'TURBINAS';

const coordenadasTGN = {
    "LMR": [-35.1070, -66.8301], "PUE": [-37.5477, -67.7343], "COC": [-36.3663, -67.0747],
    "BEA": [-33.7947, -66.6455], "CHA": [-33.5766, -65.1026], "LCA": [-33.3240, -63.5604],
    "TIO": [-32.2904, -63.2817], "JER": [-32.8688, -61.0766], "PIC": [-23.4114, -64.3337],
    "LUM": [-25.2057, -64.9460], "DEA": [-30.3768, -64.3729], "LAV": [-27.9003, -64.8142],
    "CAN": [-26.1248, -65.1696], "BEL": [-32.6302, -62.2319], "LEO": [-32.6302, -62.2319],
    "BAL": [-33.1427, -62.3057], "SJA": [-38.0740, -69.0645]
};

let todosLosRegistros = [];
let diccionarioTurbinas = {}; 
let map, markersGroup;

const minDate = new Date("2020-01-01").getTime();
const maxDate = new Date("2032-01-01").getTime();
const totalRange = maxDate - minDate;
const viewportWidth = 1320; 

function init() {
    map = L.map('map', { zoomSnap: 0.5 }).setView([-34.6, -63.6], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'Ferro Mecánica' }).addTo(map);
    markersGroup = L.layerGroup().addTo(map);
    
    const hoyPos = ((new Date().getTime() - minDate) / totalRange) * viewportWidth + 160;
    const line = document.getElementById('today-line');
    if(line) line.style.left = hoyPos + 'px';

    cargarDatosMaestros();
}

async function cargarDatosMaestros() {
    const statusEl = document.getElementById('status');
    try {
        const [resMov, resPlan, resTurb] = await Promise.all([
            fetch(`https://api.airtable.com/v0/${BASE_ID}/${T_MOV}?cacheBuster=${Date.now()}`, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }),
            fetch(`https://api.airtable.com/v0/${BASE_ID}/${T_PLAN}?cacheBuster=${Date.now()}`, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }),
            fetch(`https://api.airtable.com/v0/${BASE_ID}/${T_TURB}?cacheBuster=${Date.now()}`, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } })
        ]);

        const dataMov = await resMov.json();
        const dataPlan = await resPlan.json();
        const dataTurb = await resTurb.json();

        diccionarioTurbinas = {};
        (dataTurb.records || []).forEach(t => {
            const f = t.fields;
            diccionarioTurbinas[t.id] = { snReal: f["S/N"] || "S/N", proxOHL: f["Próximo OHL"] || null, horas: f["Hrs Actual"] || "0", esMuleto: f["Muleto TGN?"] === true };
        });

        let registros = (dataMov.records || []).map(r => {
            const f = r.fields;
            const snRef = Array.isArray(f["S/N"]) ? f["S/N"][0] : null;
            const info = diccionarioTurbinas[snRef] || {};
            return { ut: String(f["UT"] || ""), sn: info.snReal || String(f["S/N"] || "S/N"), inicio: f["FECHA INICIO"], fin: f["FECHA FIN"], familia: String(f["FAMILIA"] || "").toUpperCase(), muleto: info.esMuleto || false, proxOHL: info.proxOHL || "S/D", horas: info.horas || "0" };
        });

        (dataPlan.records || []).forEach(p => {
            const f = p.fields;
            const utEvento = String(f["UT"] || "");
            const fechaSwap = f["FECHA MOVIMIENTO"];
            if(!fechaSwap) return;

            const fechaMillis = new Date(fechaSwap).getTime();
            const snEntra = f["S/N IN"] || "POR DEFINIR";
            const origenIn = String(f["ORIGEN IN"] || "").toUpperCase();
            const destinoOut = String(f["DESTINO OUT"] || "").toUpperCase();
            const plantaCode = utEvento.substring(0, 3);

            if (origenIn.includes("TDR")) {
                let rTDR = registros.find(r => r.sn === snEntra && r.ut.includes("-TDR"));
                if (rTDR) rTDR.fin = fechaSwap;
            }

            let historialUT = registros.filter(r => r.ut === utEvento);
            historialUT.sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
            let maquinaAnterior = historialUT.find(r => new Date(r.inicio).getTime() <= fechaMillis);

            if (maquinaAnterior) {
                maquinaAnterior.fin = fechaSwap;
                if (destinoOut.includes("OHL USA")) {
                    let fFinRepa = new Date(fechaSwap); fFinRepa.setMonth(fFinRepa.getMonth() + 6);
                    registros.push({ ut: "REPA USA", sn: maquinaAnterior.sn, inicio: fechaSwap, fin: fFinRepa.toISOString(), familia: maquinaAnterior.familia, muleto: false, horas: maquinaAnterior.horas, esRepa: true });
                    registros.push({ ut: `${plantaCode}-TDR`, sn: maquinaAnterior.sn, inicio: fFinRepa.toISOString(), fin: null, familia: maquinaAnterior.familia, muleto: true, horas: "0 (REPARADA)", proxOHL: "Disponible" });
                } else if (destinoOut.includes("TDR")) {
                    registros.push({ ut: `${plantaCode}-TDR`, sn: maquinaAnterior.sn, inicio: fechaSwap, fin: null, familia: maquinaAnterior.familia, muleto: true, horas: maquinaAnterior.horas, proxOHL: maquinaAnterior.proxOHL });
                }
            }
            // MÁQUINA PLANIFICADA: muleto es false si ya es una instalación operativa, solo es tdr si está EN EL TDR
            registros.push({ ut: utEvento, sn: snEntra, inicio: fechaSwap, fin: null, familia: String(f["FAMILIA"] || "").toUpperCase(), muleto: false, proxOHL: "Planificado", horas: "-", esPlan: true });
        });

        todosLosRegistros = registros;
        statusEl.innerText = `OK | ${todosLosRegistros.length} ITEMS`;
        dibujarMapa(todosLosRegistros.filter(r => !r.fin || new Date(r.fin).getTime() >= new Date().getTime()));
    } catch (e) { statusEl.innerText = "ERROR CARGA"; }
}

function dibujarGantt(registros) {
    const container = document.getElementById('gantt-rows');
    const tooltip = document.getElementById('custom-tooltip');
    container.innerHTML = '';
    
    const scale = document.getElementById('timeline-scale'); scale.innerHTML = ''; 
    for (let y = 2020; y <= 2031; y++) scale.innerHTML += `<div class="year-block">${y}</div>`;

    const grupos = {};
    registros.forEach(r => {
        if (r.ut.includes("-TDR") && !r.muleto) return;
        if (!grupos[r.ut]) grupos[r.ut] = []; grupos[r.ut].push(r);
    });

    Object.keys(grupos).sort((a,b) => (a.includes("-TDR")) - (b.includes("-TDR"))).forEach(ut => {
        const row = document.createElement('div'); row.className = 'timeline-row';
        const label = document.createElement('div'); label.className = 'ut-label'; label.innerText = ut;
        row.appendChild(label);
        const barBox = document.createElement('div'); barBox.className = 'bar-box';

        grupos[ut].sort((a, b) => (new Date(a.inicio || minDate).getTime()) - (new Date(b.inicio || minDate).getTime()));

        let lanes = [];
        grupos[ut].forEach(m => {
            let start = m.inicio ? new Date(m.inicio).getTime() : minDate;
            let visualEnd = ut.includes("-TDR") ? (m.fin ? new Date(m.fin).getTime() : maxDate) : 
                (m.fin ? Math.min(new Date(m.fin).getTime(), (m.proxOHL && !["S/D", "Planificado", "Disponible"].includes(m.proxOHL)) ? new Date(m.proxOHL).getTime() : maxDate) : 
                ((m.proxOHL && !["S/D", "Planificado", "Disponible"].includes(m.proxOHL)) ? new Date(m.proxOHL).getTime() : maxDate));
            
            start = Math.max(start, minDate); visualEnd = Math.min(visualEnd, maxDate);

            if (visualEnd > start) {
                const left = ((start - minDate) / totalRange) * viewportWidth;
                const width = ((visualEnd - start) / totalRange) * viewportWidth;
                let laneIndex = 0;
                if (ut.includes("-TDR")) {
                    laneIndex = lanes.findIndex(laneEnd => laneEnd <= start);
                    if (laneIndex === -1) { laneIndex = lanes.length; lanes.push(visualEnd); } else { lanes[laneIndex] = visualEnd; }
                }

                let colorHex = "#E48A06";
                if (m.familia.includes("M100")) colorHex = "#1e40af";
                if (m.familia.includes("T60")) colorHex = "#0d9488";
                if (m.esPlan) colorHex = "#22c55e";

                const bar = document.createElement('div');
                bar.className = `bar ${m.muleto ? 'tdr' : ''} ${m.esPlan ? 'bar-futura' : ''} ${m.esRepa ? 'bar-repa' : ''}`;
                bar.setAttribute('data-sn', m.sn); // Para el rastreo
                if (width < 65) bar.classList.add('bar-short');
                
                if(m.familia.includes("M100")) bar.classList.add('bar-m100');
                if(m.familia.includes("T70")) bar.classList.add('bar-t70');
                if(m.familia.includes("T60")) bar.classList.add('bar-t60');
                
                bar.style.left = `${left}px`; bar.style.width = `${width}px`; 
                bar.style.top = `${11 + (laneIndex * 35)}px`;
                bar.innerHTML = `<span>${m.sn}</span>`;

                // --- EVENTOS ---
                bar.onclick = (e) => {
                    e.stopPropagation(); // Evita que el fondo resetee el tracking inmediatamente
                    highlightAsset(m.sn);
                };

                bar.onmouseenter = (e) => {
                    tooltip.style.display = 'block';
                    tooltip.style.borderColor = colorHex;
                    tooltip.innerHTML = `
                        <div class="tooltip-header" style="color:${colorHex};">S/N: ${m.sn}</div>
                        <div class="tooltip-row"><span class="tooltip-label">Horas:</span> <span class="tooltip-val">${m.horas}</span></div>
                        <div class="tooltip-row"><span class="tooltip-label">Próximo OHL:</span> <span class="tooltip-val">${formatMMYYYY(m.proxOHL)}</span></div>
                        <div class="tooltip-row"><span class="tooltip-label">Ubicación:</span> <span class="tooltip-val">${m.ut}</span></div>
                    `;
                };
                bar.onmousemove = (e) => { tooltip.style.left = (e.clientX + 15) + 'px'; tooltip.style.top = (e.clientY + 15) + 'px'; };
                bar.onmouseleave = () => tooltip.style.display = 'none';
                barBox.appendChild(bar);
            }
        });
        row.style.height = `${Math.max(52, 22 + (lanes.length * 35))}px`;
        row.appendChild(barBox); container.appendChild(row);
    });
}

// FUNCIÓN DE RASTREO GERENCIAL
function highlightAsset(sn) {
    const rowsContainer = document.getElementById('gantt-rows');
    rowsContainer.classList.add('tracking-mode');
    
    document.querySelectorAll('.bar').forEach(b => {
        if (b.getAttribute('data-sn') === sn) {
            b.classList.add('highlighted');
        } else {
            b.classList.remove('highlighted');
        }
    });
}

function resetTracking() {
    const rowsContainer = document.getElementById('gantt-rows');
    if (rowsContainer) rowsContainer.classList.remove('tracking-mode');
    document.querySelectorAll('.bar').forEach(b => b.classList.remove('highlighted'));
}

function formatMMYYYY(dateString) {
    if (!dateString || ["S/D","Planificado","Disponible"].includes(dateString)) return dateString;
    const d = new Date(dateString); return isNaN(d.getTime()) ? dateString : `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function showView(viewId, familia = null) {
    document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('active'); if (btn.innerText.includes(familia || 'MAPA')) btn.classList.add('active'); });
    document.querySelectorAll('.page-view').forEach(v => { v.classList.remove('active'); v.classList.add('hidden'); });
    const target = document.getElementById(viewId);
    target.classList.add('active'); target.classList.remove('hidden');
    if (viewId === 'home-view') setTimeout(() => map.invalidateSize(), 200);
    else {
        document.getElementById('gantt-title').innerText = `PLAN OHL ${familia || ''}`;
        dibujarGantt(todosLosRegistros.filter(r => (familia ? r.familia.includes(familia) : true) || r.esRepa));
    }
}

function dibujarMapa(registros) {
    markersGroup.clearLayers();
    const conteo = {};
    registros.forEach(r => {
        if ((r.ut.includes("-TDR") || r.ut === "REPA USA") && !r.muleto && !r.esRepa) return;
        const code = r.ut.substring(0, 3);
        const coords = coordenadasTGN[code];
        if (coords) {
            if (!conteo[code]) conteo[code] = 0;
            const shift = conteo[code] * 0.045; conteo[code]++;
            let color = "#E48A06"; if (r.familia.includes("M100")) color = "#1e40af"; if (r.familia.includes("T60")) color = "#0d9488";
            const popupContent = `<div class="map-label-header" style="color:${color};"><span>${r.ut}</span><span style="font-size:10px; opacity:0.6;">S/N: ${r.sn}</span></div><div class="map-label-body"><div class="map-label-row"><span class="map-label-tag">Horas:</span><span class="map-label-val">${r.horas}</span></div><div class="map-label-row"><span class="map-label-tag">Próximo OHL:</span><span class="map-label-val">${formatMMYYYY(r.proxOHL)}</span></div></div>`;
            L.circleMarker([coords[0] - shift, coords[1] + shift], { radius: 9, fillColor: color, color: "#fff", weight: 2, fillOpacity: 0.9 }).addTo(markersGroup).bindPopup(popupContent, { maxWidth: 250 });
        }
    });
}
window.onload = init;
