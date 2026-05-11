const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';
const VIEW_ID = 'viwSyMdWPCnP5lkKU'; // Tu vista "PLAN OHL"

const map = L.map('map').setView([-34.6037, -58.3816], 5);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

// Ventana de tiempo: 2026 a 2030
const minDate = new Date("2026-01-01").getTime();
const maxDate = new Date("2030-01-01").getTime();
const totalRange = maxDate - minDate;

async function cargarDatos() {
    const debugEl = document.getElementById('debug-bar');
    // Cache-buster para evitar datos viejos
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?view=${VIEW_ID}&cacheBuster=${Date.now()}`;
    
    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await response.json();
        
        if (data.records) {
            const campos = Object.keys(data.records[0].fields);
            debugEl.innerText = "Columnas detectadas: " + campos.join(" | ");
            document.getElementById('status').innerText = `CONECTADO: ${data.records.length} EQUIPOS EN VISTA`;
            
            renderizarGantt(data.records);
        }
    } catch (err) {
        debugEl.innerText = "Falla de conexión.";
    }
}

function renderizarGantt(registros) {
    const container = document.getElementById('gantt');
    container.innerHTML = ''; 

    registros.forEach(r => {
        const f = r.fields;
        
        // Prioridad: 1. Turbina Texto, 2. Turbina (limpiando el array si viene como link)
        let nombreTurbina = f["Turbina Texto"] || f["Turbina"] || "S/N";
        if (Array.isArray(nombreTurbina)) nombreTurbina = nombreTurbina[0];

        const ut = f["UT Limpia"] || "S/D";
        const fechaInicio = new Date(f["Fecha"] || "2026-01-01").getTime();
        const fechaFin = new Date(f["Fecha Fin Visual"] || "2028-01-01").getTime();

        // Calcular posición
        let left = ((fechaInicio - minDate) / totalRange) * 100;
        let width = ((fechaFin - fechaInicio) / totalRange) * 100;

        // Ajustes visuales
        if (left < 0) left = 0;
        if (left > 100) left = 95;
        if (width <= 0) width = 5;

        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.innerHTML = `
            <div class="ut-label">${ut}</div>
            <div class="bar-box">
                <div class="bar ${f["Es Muleto"] ? 'muleto-bar' : ''}" 
                     style="left: ${left}%; width: ${width}%;">
                    ${nombreTurbina}
                </div>
            </div>
        `;
        container.appendChild(row);
    });
}

cargarDatos();
