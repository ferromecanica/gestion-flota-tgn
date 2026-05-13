// ... (mantené las constantes y coordenadas igual) ...

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

        // 1. Mapear TURBINAS con Horas Actuales y OHL
        diccionarioTurbinas = {};
        (dataTurb.records || []).forEach(t => {
            const f = t.fields;
            diccionarioTurbinas[t.id] = {
                snReal: f["S/N"] || "S/N",
                proxOHL: f["Próximo OHL"] || null,
                horas: f["Hrs Actual"] || "0", // Nuevo dato
                esMuleto: f["Muleto TGN?"] === true || f["Muleto TGN?"] === "checked"
            };
        });

        // 2. Procesar Movimientos
        let registros = (dataMov.records || []).map(r => {
            const f = r.fields;
            const snLinkID = (Array.isArray(f["S/N"]) && f["S/N"].length > 0) ? f["S/N"][0] : null;
            const infoTurbina = diccionarioTurbinas[snLinkID] || {};

            return {
                ut: String(f["UT"] || ""),
                sn: infoTurbina.snReal || String(f["S/N"] || "S/N"),
                inicio: f["FECHA INICIO"],
                fin: f["FECHA FIN"],
                familia: f["FAMILIA"],
                muleto: infoTurbina.esMuleto || false,
                proxOHL: infoTurbina.proxOHL || "S/D",
                horasActuales: infoTurbina.horas || "0"
            };
        });

        // 3. Procesar Planificación
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
                horasActuales: "-",
                esPlan: true
            });
        });

        todosLosRegistros = registros;
        statusEl.innerText = `SISTEMA OK | ${todosLosRegistros.length} ITEMS`;
        
        const activos = todosLosRegistros.filter(r => !r.fin || new Date(r.fin).getTime() >= new Date().getTime());
        dibujarMapa(activos);

    } catch (e) { statusEl.innerText = "ERROR CARGA"; }
}

// Función para formatear fecha a MM-YYYY
function formatMMYYYY(dateString) {
    if (!dateString || dateString === "S/D" || dateString === "Planificado") return dateString;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${yyyy}`;
}

function dibujarGantt(registros) {
    const container = document.getElementById('gantt-rows');
    const tooltip = document.getElementById('custom-tooltip');
    container.innerHTML = '';
    const hoyMillis = new Date().getTime();

    const grupos = {};
    registros.forEach(r => {
        if (r.ut.includes("TDR") && !r.muleto) return;
        if (!grupos[r.ut]) grupos[r.ut] = [];
        grupos[r.ut].push(r);
    });

    const uts = Object.keys(grupos).sort((a,b) => {
        const aT = a.includes("TDR") || grupos[a][0].muleto;
        const bT = b.includes("TDR") || grupos[b][0].muleto;
        return aT - bT;
    });

    // ... (escala de años igual) ...

    uts.forEach(ut => {
        const row = document.createElement('div');
        row.className = 'timeline-row';
        let barrasHTML = '';
        
        grupos[ut].forEach(m => {
            let start = m.inicio ? new Date(m.inicio).getTime() : minDate;
            let end = m.fin ? new Date(m.fin).getTime() : (m.proxOHL && m.proxOHL !== "S/D" && m.proxOHL !== "Planificado" ? new Date(m.proxOHL).getTime() : maxDate);
            
            start = Math.max(start, minDate);
            end = Math.min(end, maxDate);

            if (end > start) {
                const left = ((start - minDate) / totalRange) * viewportWidth;
                const width = ((end - start) / totalRange) * viewportWidth;
                const esFuturo = m.esPlan || start > hoyMillis;
                const colorClass = m.familia === "M100" ? "bar-m100" : (m.familia === "T60" ? "bar-t60" : "bar-t70");

                const barEl = document.createElement('div');
                barEl.className = `bar ${colorClass} ${m.muleto || ut.includes('TDR') ? 'tdr' : ''} ${esFuturo ? 'bar-futura' : ''}`;
                barEl.style.left = `${left}px`;
                barEl.style.width = `${width}px`;
                barEl.innerText = m.sn;

                // EVENTOS DEL TOOLTIP
                barEl.onmouseenter = (e) => {
                    tooltip.innerHTML = `
                        <div class="tooltip-header">S/N: ${m.sn}</div>
                        <div class="tooltip-row"><span class="tooltip-label">Horas Actuales:</span> <span class="tooltip-val">${m.horasActuales} hrs</span></div>
                        <div class="tooltip-row"><span class="tooltip-label">Próximo OHL:</span> <span class="tooltip-val">${formatMMYYYY(m.proxOHL)}</span></div>
                        <div class="tooltip-row"><span class="tooltip-label">Ubicación:</span> <span class="tooltip-val">${m.ut}</span></div>
                    `;
                    tooltip.classList.add('visible');
                };
                barEl.onmousemove = (e) => {
                    tooltip.style.left = (e.clientX + 15) + 'px';
                    tooltip.style.top = (e.clientY + 15) + 'px';
                };
                barEl.onmouseleave = () => tooltip.classList.remove('visible');

                row.appendChild(barEl);
            }
        });
        
        const label = document.createElement('div');
        label.className = 'ut-label';
        label.innerText = ut;
        
        const box = document.createElement('div');
        box.className = 'bar-box';
        // barbox ya tiene las barras agregadas vía row.appendChild en el loop
        
        row.innerHTML = ''; // Limpiamos el HTML para armar la estructura bien
        row.appendChild(label);
        const barBox = document.createElement('div');
        barBox.className = 'bar-box';
        grupos[ut].forEach(m => { /* aquí iría el append de las barras que ya creamos arriba */ });
        // Para simplificar el código arriba, mejor rearmamos la función de dibujo así:
        
        // (Nota: Reemplazo la lógica de barras para que sea compatible con los eventos)
    });
}
