// 3. Procesar PLANIFICACION (Búsqueda de máquina anterior corregida)
        (dataPlan.records || []).forEach(p => {
            const f = p.fields;
            const utEvento = String(f["UT"] || "");
            const fechaSwap = f["FECHA MOVIMIENTO"];
            const fechaSwapMillis = new Date(fechaSwap).getTime();
            const destinoOut = String(f["DESTINO OUT"] || "").trim().toUpperCase();

            // BUSQUEDA CORREGIDA: Si no tiene fin, la máquina SIEMPRE está activa para el futuro
            let maquinaAnterior = registros.find(r => {
                if (r.ut !== utEvento) return false;
                const fInicio = new Date(r.inicio).getTime();
                
                // Si la máquina no tiene fecha de fin, le ponemos el máximo posible 
                // para que el swap siempre la encuentre, aunque el OHL esté vencido.
                const fFin = r.fin ? new Date(r.fin).getTime() : maxDate;
                
                return fInicio <= fechaSwapMillis && fFin >= fechaSwapMillis;
            });

            if (maquinaAnterior) {
                maquinaAnterior.fin = fechaSwap; // Cortamos la barra justo en el movimiento

                if (destinoOut === "OHL USA") {
                    let fFinRepa = new Date(fechaSwap);
                    fFinRepa.setMonth(fFinRepa.getMonth() + 6);
                    registros.push({
                        ut: "REPA USA", 
                        sn: maquinaAnterior.sn, 
                        inicio: fechaSwap,
                        fin: fFinRepa.toISOString(), 
                        familia: maquinaAnterior.familia,
                        muleto: false, 
                        horas: maquinaAnterior.horas, 
                        esRepa: true
                    });
                }
            }

            // Nueva máquina planificada (Barra Azul Marino)
            registros.push({
                ut: utEvento, sn: f["S/N IN"] || "POR DEFINIR", inicio: fechaSwap,
                fin: null, familia: String(f["FAMILIA"] || "").trim().toUpperCase(),
                muleto: String(f["ORIGEN IN"] || "").trim().toUpperCase() === "TDR",
                proxOHL: "Planificado", horas: "-", esPlan: true
            });
        });
