function dibujarGantt(registros) {
    const container = document.getElementById('gantt-rows');
    container.innerHTML = '';
    
    // 1. Agrupar movimientos por UT
    const gruposPorUT = {};
    registros.forEach(r => {
        const ut = String(r.fields["UT Limpia"] || "S/D");
        if (!gruposPorUT[ut]) gruposPorUT[ut] = [];
        gruposPorUT[ut].push(r);
    });

    // 2. Ordenar las UTs (Activas arriba, TDR abajo)
    const utsOrdenadas = Object.keys(gruposPorUT).sort((a, b) => {
        const aIsTdr = a.includes("TDR") || gruposPorUT[a][0].fields["Es Muleto"];
        const bIsTdr = b.includes("TDR") || gruposPorUT[b][0].fields["Es Muleto"];
        return aIsTdr - bIsTdr;
    });

    // 3. Dibujar una fila por UT y sus múltiples barras
    utsOrdenadas.forEach(ut => {
        const movimientos = gruposPorUT[ut];
        const row = document.createElement('div');
        row.className = 'timeline-row';
        
        let barrasHTML = '';
        movimientos.forEach(m => {
            const f = m.fields;
            const fam = String(f["Familia"] || "").toUpperCase();
            const esMuleto = f["Es Muleto"] === true;
            const hoyMillis = new Date().getTime();

            let start = f["Fecha"] ? new Date(f["Fecha"]).getTime() : minDate;
            let end = f["Fecha Fin Visual"] ? new Date(f["Fecha Fin Visual"]).getTime() : maxDate;
            
            // Lógica de estilo para el futuro
            const esFuturo = start > hoyMillis;
            const claseFuturo = esFuturo ? 'bar-futura' : '';

            let colorClass = "bar-t70";
            if (fam === "M100") colorClass = "bar-m100";
            if (fam === "T60") colorClass = "bar-t60";

            if (end > start) {
                const left = ((start - minDate) / totalRange) * viewportWidth;
                const width = ((end - start) / totalRange) * viewportWidth;
                const tooltip = `S/N: ${f["Turbina Texto"]}\nInicio: ${f["Fecha"]}\nFin: ${f["Fecha Fin Visual"]}\nHoras: ${f["Horas Actuales"] || 0}`;

                barrasHTML += `
                    <div class="bar ${colorClass} ${esMuleto ? 'muleto' : ''} ${claseFuturo}" 
                         style="left:${left}px; width:${width}px;"
                         title="${tooltip}">
                        ${f["Turbina Texto"] || "S/N"}
                    </div>`;
            }
        });

        row.innerHTML = `
            <div class="ut-label">${ut}</div>
            <div class="bar-box">${barrasHTML}</div>
        `;
        container.appendChild(row);
    });
}
