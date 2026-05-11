const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';

const map = L.map('map').setView([-34.6037, -58.3816], 5);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

// Ventana de tiempo: Enero 2026 a Diciembre 2029
const minDate = new Date("2026-01-01").getTime();
const maxDate = new Date("2030-01-01").getTime();
const totalRange = maxDate - minDate;

async function iniciarSistema() {
    const debugEl = document.getElementById('debug-bar');
    try {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await response.json();
        
        if (data.records) {
            const campos = Object.keys(data.records[0].fields);
            debugEl.innerText = "Columnas: " + campos.join(" | ");
            
            // FILTRADO CRÍTICO: Solo registros sin Fecha Fin
            const registrosActivos = data.records.filter(r => !r.fields["Fecha Fin"]);
            
            document.getElementById('status').innerText = `CONECTADO: ${registrosActivos.length} UNIDADES ACTIVAS`;
            renderGantt(registrosActivos);
        }
    } catch (err) {
        debugEl.innerText = "Error cargando datos.";
    }
}

function renderGantt(registros) {
    const container = document.getElementById('gantt');
    container.innerHTML = ''; 

    registros.forEach(r => {
        const f = r.fields;
        
        // Intentamos leer el nombre de la turbina desde varios campos posibles
        let nombreTurbina = f["Turbina Texto"] || f["Turbina"] || "S/N";
        if (Array.isArray(nombreTurbina)) nombreTurbina = nombreTurbina[0];

        const ut = f["UT Limpia"] || "S/D";
        const fechaInicio = new Date(f["Fecha"] || "2026-01-01").getTime();
        const fechaFin = new Date(f["Fecha Fin Visual"] || "2028-01-01").getTime();

        // Calcular porcentajes para la barra
        let left = ((fechaInicio - minDate) / totalRange) * 100;
        let width = ((fechaFin - fechaInicio) / totalRange) * 100;

        // Limites visuales
        if (left < 0) left = 0;
        if (width < 2) width = 10; // Para que siempre se vea algo

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

iniciarSistema();
