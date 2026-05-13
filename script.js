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
let diccionarioTurbinas = {}; // Para guardar OHL y Muleto por S/N
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

        // 1. Crear diccionario de Turbinas (OHL y Muleto)
        diccionarioTurbinas = {};
        (dataTurb.records || []).forEach(t => {
            const f = t.fields;
            diccionarioTurbinas[String(f["S/N"]).trim()] = {
                proxOHL: f["Próximo OHL"] || null,
                esMuleto: f["Muleto TGN?"] === true || f["Muleto TGN?"] === "checked"
            };
        });

        // 2. Procesar Movimientos
        let registros = (dataMov.records || []).map(r => {
            const f = r.fields;
            const sn = String(f["S/N"] || f["Turbina Texto"] || "").trim();
            const infoExtra = diccionarioTurbinas[sn] || {};
            
            return {
                ut: String(f["UT"] || ""),
                sn: sn,
                inicio: f["FECHA INICIO"],
                fin: f["FECHA FIN"],
                familia: f["FAMILIA"],
                // Prioridad al dato de la tabla TURBINAS, si no al de MOVIMIENTOS
                muleto: infoExtra.esMuleto !== undefined ? infoExtra.esMuleto : (f["Es Muleto"] === true || f["Es Muleto"] === "1 checked out of 1"),
                proxOHL: infoExtra.proxOHL || "S/D"
            };
        });

        // 3. Procesar Planificación (Swaps)
        (dataPlan.records || []).forEach(p => {
            const f = p.fields;
            const utEvento = String(f["UT"] || "");
            registros.forEach(r => {
                if (r.ut === utEvento && !r.fin) r.fin = f["FECHA MOVIMIENTO"];
            });

            registros.push({
                ut: utEvento,
                sn: f["S/N IN"] || "POR DEFINIR",
                inicio: f["FECHA MOVIMIENTO"],
                fin: null,
                familia: f["FAMILIA"],
                muleto: f["DESTINO OUT"] === "TDR (Muleto)",
                proxOHL: "Planificado",
                esPlan: true
            });
        });

        todosLosRegistros = registros;
        statusEl.innerText = `SISTEMA OK | ${todosLosRegistros.length} ITEMS`;
        
        const hoy = new Date().getTime();
        const activos = todosLosRegistros.filter(r => !r.fin || new Date(r.fin).getTime() >= hoy);
        dibujarMapa(activos);

    } catch (e) { statusEl.innerText = "ERROR API"; console.error(e); }
}

function showView(viewId, familia = null) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(familia || 'MAPA')) btn.classList.add('active');
    });
    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active', 'hidden'));
    document.querySelectorAll('.page-view').forEach(v => { if(v.id !== viewId) v.classList.add('hidden'); });
    document.getElementById(viewId).classList.add('active');

    if (viewId === 'home-view') {
        setTimeout(() => map.invalidateSize(), 100);
    } else {
        document.getElementById('gantt-title').innerText = `PLAN OHL | ${familia}`;
        const filtrados = todosLosRegistros.filter(r => String(r.familia).toUpperCase() === familia.toUpperCase());
        dibujarGantt(filtrados);
    }
}

function dibujarMapa(registros) {
    markersGroup.clearLayers();
    const conteo = {};
    registros.forEach(r => {
        // FILTRO TDR: Si es ubicación TDR, solo mostrar si el Checkbox Muleto es verdadero
        if (r.ut.includes("TDR") && !r.muleto) return;

        const code = r.ut.substring(0, 3);
        const coords = coordenadasTGN[code];
        if (coords) {
            if (!conteo[code]) conteo[code] = 0;
            const shift = conteo[code] * 0.045; 
            conteo[code]++;
            const color = r.muleto ? "#555" : (r.familia === "M100" ? "#1e40af" : (r.familia === "T60" ? "#0d9488" : "#E48A06"));
            L.circleMarker([coords[0] - shift, coords[1] + shift], {
                radius: 8, fillColor: color, color: "#fff", weight: 1, fillOpacity: 0.9
            }).addTo(markersGroup).bindPopup(`<b>${r.ut}</b><br>SN: ${r.sn}`);
        }
    });
}

function dibujarGantt(registros) {
    const container = document.getElementById('gantt-rows');
    container.innerHTML = '';
    const hoyMillis = new Date().getTime();

    const grupos = {};
    registros.forEach(r => {
        // Solo mostramos en TDR si es Muleto confirmado
        if (r.ut.includes("TDR") && !r.muleto) return;
        
        if (!grupos[r.ut]) grupos[r.ut] = [];
        grupos[r.ut].push(r);
    });

    const uts = Object.keys(grupos).sort((a,b) => {
        const aT = a.includes("TDR") || grupos[a][0].muleto;
        const bT = b.includes("TDR") || grupos[b][0].muleto;
        return aT - bT;
    });

    const scale = document.getElementById('timeline-scale');
    scale.innerHTML = ''; 
    for (let y = 2020; y <= 2031; y++) {
        scale.innerHTML += `<div class="year-block">${y}</div>`;
    }

    uts.forEach(ut => {
        const row = document.createElement('div');
        row.className = 'timeline-row';
        let barrasHTML = '';
        
        grupos[ut].forEach(m => {
            let start = m.inicio ? new Date(m.inicio).getTime() : minDate;
            
            // LÓGICA DE CORTE POR OHL
            let end;
            if (m.fin) {
                end = new Date(m.fin).getTime();
            } else if (m.proxOHL && m.proxOHL !== "S/D" && m.proxOHL !== "Planificado") {
                end = new Date(m.proxOHL).getTime();
            } else {
                end = maxDate;
            }

            start = Math.max(start, minDate);
            end = Math.min(end, maxDate);

            if (end > start) {
                const left = ((start - minDate) / totalRange) * viewportWidth;
                const width = ((end - start) / totalRange) * viewportWidth;
                const esFuturo = m.esPlan || start > hoyMillis;
                const colorClass = m.familia === "M100" ? "bar-m100" : (m.familia === "T60" ? "bar-t60" : "bar-t70");
                
                let ohlTxt = m.proxOHL;
                if (ohlTxt && ohlTxt !== "S/D" && ohlTxt !== "Planificado") {
                    ohlTxt = new Date(ohlTxt).toLocaleDateString();
                }

                const tooltip = `SN: ${m.sn}\nInicio: ${m.inicio || 'Manual'}\nPróximo OHL: ${ohlTxt}`;

                barrasHTML += `<div class="bar ${colorClass} ${m.muleto || ut.includes('TDR') ? 'tdr' : ''} ${esFuturo ? 'bar-futura' : ''}" 
                                    style="left:${left}px; width:${width}px;" title="${tooltip}">
                                    ${m.sn}
                               </div>`;
            }
        });
        row.innerHTML = `<div class="ut-label">${ut}</div><div class="bar-box">${barrasHTML}</div>`;
        container.appendChild(row);
    });
}

window.onload = init;
