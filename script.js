// 3. Procesar PLANIFICACION (Lógica de búsqueda por antecedente inmediato)
        (dataPlan.records || []).forEach(p => {
            const f = p.fields;
            const utEvento = String(f["UT"] || "");
            const fechaSwap = f["FECHA MOVIMIENTO"];
            const fechaSwapMillis = new Date(fechaSwap).getTime();
            const destinoOut = String(f["DESTINO OUT"] || "").trim().toUpperCase();

            // Buscamos todas las máquinas que pasaron por esa UT
            let historialUT = registros.filter(r => r.ut === utEvento);
            
            // Ordenamos por fecha de inicio para encontrar la "última" antes del swap
            historialUT.sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());

            // La máquina anterior es la primera que empezó ANTES de la fecha del swap
            let maquinaAnterior = historialUT.find(r => new Date(r.inicio).getTime() <= fechaSwapMillis);

            if (maquinaAnterior) {
                // Mantenemos visualmente que la barra termina en su Proximo OHL 
                // pero habilitamos la creación de la barra de reparación
                if (destinoOut === "OHL USA") {
                    let fFinRepa = new Date(fechaSwap);
                    fFinRepa.setMonth(fFinRepa.getMonth() + 6);
                    registros.push({
                        ut: "REPA USA", sn: maquinaAnterior.sn, inicio: fechaSwap,
                        fin: fFinRepa.toISOString(), familia: maquinaAnterior.familia,
                        muleto: false, horas: maquinaAnterior.horas, esRepa: true
                    });
                }
            }

            // Registro de la nueva máquina planificada
            registros.push({
                ut: utEvento, sn: f["S/N IN"] || "POR DEFINIR", inicio: fechaSwap,
                fin: null, familia: String(f["FAMILIA"] || "").trim().toUpperCase(),
                muleto: String(f["ORIGEN IN"] || "").trim().toUpperCase() === "TDR",
                proxOHL: "Planificado", horas: "-", esPlan: true
            });
        });
