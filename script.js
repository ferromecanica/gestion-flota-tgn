// Configuración de Airtable
const AIRTABLE_TOKEN = 'patd4owksa2IM6d7C.bc0f7568f4f686a694b2c70cce2aa8952fced03db48ae8598ac7cd08c3a5810a'; 
const BASE_ID = 'app3Zwi0sqRk5cTgw';
const TABLE_ID = 'tblH7sZLmAYvRvFZT';

// Inicialización del Mapa de Argentina
const map = L.map('map').setView([-38.4161, -63.6167], 5); // Centrado en Argentina

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Función para conectar y traer datos
async function fetchFleetData() {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_TOKEN}`
            }
        });
        const data = await response.json();
        
        if (data.records) {
            document.getElementById('status').innerText = `✅ CONECTADO: ${data.records.length} REGISTROS`;
            console.log('Datos de la flota:', data.records);
            // Aquí empezaremos a dibujar los pines y las flechas en el próximo paso
        } else {
            document.getElementById('status').innerText = '❌ ERROR: SIN DATOS';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('status').innerText = '❌ ERROR DE CONEXIÓN';
    }
}

// Ejecución inicial
fetchFleetData();
