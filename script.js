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
    map = L.map('map').setView([-34.6, -63.6], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    markersGroup = L.layerGroup().addTo(map);
    const hoy = new Date().getTime();
    const hoyPos = ((hoy - minDate) / totalRange) * viewportWidth + 160;
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
            diccionarioTurbinas[t.id] = {
                snReal: f["S/N"] || "S/N",
                proxOHL: f["Próximo OHL"] || null,
                horas: f["Hrs Actual"] || "0",
                esMuleto: f["Muleto TGN?"] === true || f["Muleto TGN?"] === "checked"
            };
        });

        let registros = (dataMov.records || []).map(r => {
            const f = r.fields;
            const snRef = Array.isArray(f["S/N"]) ? f["S/N"][0] : null;
            const info = diccionarioTurbinas[snRef] || {};
            return {
                ut: String(f["UT"] || ""),
                sn: info.snReal || String(f["S/N"] || "S/N"),
                inicio: f["FECHA INICIO"],
                fin: f["FECHA FIN"],
                familia: String(f["FAMILIA"] || "").trim().toUpperCase(),
                muleto: info.esMuleto || false,
                proxOHL: info.proxOHL || "S/D",
                horas: info.horas || "0"
            };
        });

        (dataPlan.records || []).forEach(p => {
            const f = p.fields;
            const utEvento = String(f["UT"] || "");
            const famPlan = String(f["FAMILIA"] || "").trim().toUpperCase();
            registros.forEach(r => { if (r.ut === utEvento && !r.fin) r.fin = f["FECHA MOVIMIENTO"]; });
            registros.push({
                ut: utEvento, sn: f["S/N IN"] || "POR DEFINIR", inicio: f["FECHA MOVIMIENTO"],
                fin: null, familia: famPlan, muleto: f["DESTINO OUT"] === "TDR (Muleto)",
                proxOHL: "Planificado", horas: "-", esPlan: true
            });
        });

        todosLosRegistros = registros;
        statusEl.innerText = `OK | ${todosLosRegistros.length} ITEMS`;
        const hoy = new Date().getTime();
        dibujarMapa(todosLosRegistros.filter(r => !r.fin || new Date(r.fin).getTime() >= hoy));
    } catch (e) { statusEl.innerText = "ERROR CARGA"; }
}

function formatMMYYYY(dateString) {
    if (!dateString || dateString === "S/D" || dateString === "Planificado") return dateString;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function showView(viewId, familia = null) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(familia || 'MAPA')) btn.classList.add('active');
    });
    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active', 'hidden'));
    document.getElementById(viewId).classList.add('active');
    if (viewId === 'home-view') setTimeout(() => map.invalidateSize(), 100);
    else dibujarGantt(todosLosRegistros.filter(r => r.familia === String(familia).toUpperCase()));
}

function dibujarMapa(registros) {
    markersGroup.clearLayers();
    const conteo = {};
    registros.forEach(r => {
        if (r.ut.includes("TDR") && !r.muleto) return;
        const code = r.ut.substring(0, 3);
        const coords = coordenadasTGN[code];
        if (coords) {
            if (!conteo[code]) conteo[code] = 0;
            const shift = conteo[code] * 0.045; conteo[code]++;
            let color = "#E48A06";
            if (r.familia === "M100") color = "#1e40af";
            if (r.familia === "T60") color = "#0d9488";
            if (r.muleto) color = "#555";
            L.circleMarker([coords[0] - shift, coords[1] + shift], { radius: 8, fillColor: color, color: "#fff", weight: 1, fillOpacity: 0.9 }).addTo(markersGroup).bindPopup(`<b>${r.ut}</b><br>SN: ${r.sn}`);
        }
    });
}

function dibujarGantt(registros) {
    const container = document.getElementById('gantt-rows');
    const tooltip = document.getElementById('custom-tooltip');
    container.innerHTML = '';
    const scale = document.getElementById('timeline-scale');
    scale.innerHTML = ''; 
    for (let y = 2020; y <= 2031; y++) scale.innerHTML += `<div class="year-block">${y}</div>`;

    const grupos = {};
    registros.forEach(r => {
        if (r.ut.includes("TDR") && !r.muleto) return;
        if (!grupos[r.ut]) grupos[r.ut] = [];
        grupos[r.ut].push(r);
    });

    const uts = Object.keys(grupos).sort((a,b) => (a.includes("TDR") || grupos[a][0].muleto) - (b.includes("TDR") || grupos[b][0].muleto));

    uts.forEach(ut => {
        const row = document.createElement('div');
        row.className = 'timeline-row';
        const label = document.createElement('div');
        label.className = 'ut-label';
        label.innerText = ut;
        row.appendChild(label);
        const barBox = document.createElement('div');
        barBox.className = 'bar-box';

        grupos[ut].forEach(m => {
            let start = m.inicio ? new Date(m.inicio).getTime() : minDate;
            let end = m.fin ? new Date(m.fin).getTime() : (m.proxOHL && m.proxOHL !== "S/D" && m.proxOHL !== "Planificado" ? new Date(m.proxOHL).getTime() : maxDate);
            start = Math.max(start, minDate);
            end = Math.min(end, maxDate);

            if (end > start) {
                const left = ((start - minDate) / totalRange) * viewportWidth;
                const width = ((end - start) / totalRange) * viewportWidth;
                
                let colorHex = "#E48A06";
                let colorClass = "bar-t70";
                if (m.familia === "M100") { colorClass = "bar-m100"; colorHex = "#1e40af"; }
                if (m.familia === "T60") { colorClass = "bar-t60"; colorHex = "#0d9488"; }
                if (m.muleto) colorHex = "#555";
                
                // SOBRESCRIBIR COLOR SI ES PLAN
                if (m.esPlan) { colorHex = "#888"; } 

                const bar = document.createElement('div');
                bar.className = `bar ${colorClass} ${m.muleto ? 'tdr' : ''} ${m.esPlan ? 'bar-futura' : ''}`;
                bar.style.left = `${left}px`;
                bar.style.width = `${width}px`;
                bar.innerText = m.sn;

                bar.onmouseenter = (e) => {
                    tooltip.style.borderColor = colorHex;
                    tooltip.innerHTML = `
                        <div class="tooltip-header" style="color:${colorHex}; border-bottom-color: ${colorHex}44;">S/N: ${m.sn}</div>
                        <div class="tooltip-row"><span class="tooltip-label">Horas Actuales:</span> <span class="tooltip-val">${m.horas} hrs</span></div>
                        <div class="tooltip-row"><span class="tooltip-label">Próximo OHL:</span> <span class="tooltip-val">${formatMMYYYY(m.proxOHL)}</span></div>
                        <div class="tooltip-row"><span class="tooltip-label">Ubicación:</span> <span class="tooltip-val">${m.ut}</span></div>
                    `;
                    tooltip.classList.add('visible');
                };
                bar.onmousemove = (e) => {
                    tooltip.style.left = (e.clientX + 15) + 'px';
                    tooltip.style.top = (e.clientY + 15) + 'px';
                };
                bar.onmouseleave = () => tooltip.classList.remove('visible');
                barBox.appendChild(bar);
            }
        });
        row.appendChild(barBox);
        container.appendChild(row);
    });
}
window.onload = init;
