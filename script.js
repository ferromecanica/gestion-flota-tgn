// 1. CONFIGURACIÓN - REEMPLAZÁ TU TOKEN AQUÍ
const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';

// 2. DICCIONARIO DE COORDENADAS (Asegurate que coincidan con tus nombres en Airtable)
const coordenadasTGN = {
    "Beazley": [-33.7547, -66.6436],
    "La Carlota": [-33.4243, -63.2956],
    "Pueblo Seco": [-37.5833, -68.4167],
    "Pichanal": [-23.3211, -64.2181],
    "Rosario": [-32.9468, -60.6393]
};

// 3. INICIALIZAR MAPA
const map = L.map('map').setView([-34.6037, -58.3816], 5);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

// 4. FUNCIÓN AUXILIAR PARA LEER CAMPOS (Maneja texto o listas)
function getCampo(record, nombre) {
    const valor = record.fields[nombre];
    if (!valor) return null;
    return Array.isArray(valor) ? valor[0] : valor; // Si es un link, trae el primer elemento
}

async function fetchFleetData() {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?view=viwSyMdWPCnP5lkKU`; // Usamos tu vista específica
    
    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await response.json();
        
        if (data.records && data.records.length > 0) {
            document.getElementById('status').innerText = `✅ DATOS RECIBIDOS: ${data.records.length}`;
            
            // LOG DE DIAGNÓSTICO: Esto me dirá en la consola qué nombres de campos existen
            console.log("CAMPOS DETECTADOS EN TU AIRTABLE:", Object.keys(data.records[0].fields));
            console.log("EJEMPLO DE REGISTRO:", data.records[0]);

            dibujarPines(data.records);
            renderTimeline(data.records);
        } else {
            document.getElementById('status').innerText = '⚠️ CONECTADO PERO SIN REGISTROS';
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        document.getElementById('status').innerText = '❌ ERROR DE CONEXIÓN';
    }
}

function renderTimeline(records) {
    const ganttContainer = document.getElementById('gantt');
    ganttContainer.innerHTML = ''; 

    // Intentamos filtrar por registros sin Fecha Fin. 
    // Si no encuentra nada, mostrará los primeros 10 para probar visibilidad.
    let activos = records.filter(r => !r.fields["Fecha Fin"]);
    if (activos.length === 0) {
        console.warn("No se encontraron registros con 'Fecha Fin' vacía. Mostrando históricos para prueba.");
        activos = records.slice(0, 10); 
    }

    activos.forEach(mov => {
        const ut = getCampo(mov, "UT Limpia") || "Sin UT";
        const sn = getCampo(mov, "Turbina") || "S/N";
        const esMuleto = mov.fields["Es Muleto?"] === true;

        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.innerHTML = `
            <div class="ut-name">${ut}</div>
            <div class="bar-container">
                <div class="turbine-bar ${esMuleto ? 'muleto-bar' : ''}" style="width: 70%; left: 5%;">
                    ${sn}
                </div>
            </div>
        `;
        ganttContainer.appendChild(row);
    });
}

function dibujarPines(records) {
    records.forEach(mov => {
        const ut = getCampo(mov, "UT Limpia");
        const sn = getCampo(mov, "Turbina");
        const fechaFin = mov.fields["Fecha Fin"];

        if (ut && coordenadasTGN[ut] && !fechaFin) {
            L.circleMarker(coordenadasTGN[ut], {
                radius: 10,
                fillColor: "#E48A06",
                color: "#fff",
                weight: 2,
                fillOpacity: 0.9
            }).addTo(map).bindPopup(`<b>${ut}</b><br>Turbina: ${sn}`);
        }
    });
}

fetchFleetData();
