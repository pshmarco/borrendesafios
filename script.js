document.addEventListener('DOMContentLoaded', () => {
    // --- Lógica de la Malla Curricular (existente) ---
    const ramos = document.querySelectorAll('.ramo');
    const creditosAprobadosCountSpan = document.getElementById('creditosAprobadosCount');
    const totalCreditosSpan = document.getElementById('totalCreditos');
    const porcentajeAvanceSpan = document.getElementById('porcentajeAvance');
    const ramosAprobadosCountSpan = document.getElementById('ramosAprobadosCount');
    const totalRamosSpan = document.getElementById('totalRamos');

    let totalRamos = ramos.length;
    totalRamosSpan.textContent = totalRamos;

    let totalCreditos = 0;
    ramos.forEach(ramo => {
        const creditos = parseInt(ramo.dataset.creditos || '0');
        totalCreditos += creditos;
    });
    totalCreditosSpan.textContent = totalCreditos;

    function getPrerequisites(ramoElement) {
        const prereqString = ramoElement.dataset.prereq;
        return prereqString ? prereqString.split(',').map(id => id.trim()) : [];
    }

    function arePrerequisitesMet(ramoElement, approvedRamosSet) {
        const prereqs = getPrerequisites(ramoElement);
        if (prereqs.length === 0) {
            return true;
        }
        return prereqs.every(prereqId => approvedRamosSet.has(prereqId));
    }

    let approvedRamos = new Set(JSON.parse(localStorage.getItem('approvedRamos')) || []);

    function saveRamosState() {
        localStorage.setItem('approvedRamos', JSON.stringify(Array.from(approvedRamos)));
    }

    function updateRamosDisplay() {
        ramos.forEach(ramo => {
            const ramoId = ramo.dataset.id;
            const isApproved = approvedRamos.has(ramoId);

            ramo.classList.remove('aprobado', 'bloqueado');

            if (isApproved) {
                ramo.classList.add('aprobado');
            } else {
                if (!arePrerequisitesMet(ramo, approvedRamos)) {
                    ramo.classList.add('bloqueado');
                }
            }
        });
        updateProgress();
    }

    function updateProgress() {
        let currentApprovedCreditos = 0;
        let currentApprovedRamosCount = approvedRamos.size;

        approvedRamos.forEach(ramoId => {
            const ramoElement = document.querySelector(`[data-id="${ramoId}"]`);
            if (ramoElement) {
                currentApprovedCreditos += parseInt(ramoElement.dataset.creditos || '0');
            }
        });

        ramosAprobadosCountSpan.textContent = currentApprovedRamosCount;
        creditosAprobadosCountSpan.textContent = currentApprovedCreditos;
        
        const porcentaje = totalCreditos > 0 ? ((currentApprovedCreditos / totalCreditos) * 100).toFixed(1) : 0;
        porcentajeAvanceSpan.textContent = porcentaje;
    }

    // Listener para los ramos (los que NO abren la modal)
    ramos.forEach(ramo => {
        if (!ramo.classList.contains('open-grade-modal')) { // Solo ramos que no abren modal
            ramo.addEventListener('click', () => {
                const ramoId = ramo.dataset.id;
                
                if (ramo.classList.contains('aprobado')) {
                    let canUnapprove = true;
                    approvedRamos.forEach(approvedRamoId => {
                        if (ramoId !== approvedRamoId) {
                            const approvedRamoElement = document.querySelector(`[data-id="${approvedRamoId}"]`);
                            if (approvedRamoElement && getPrerequisites(approvedRamoElement).includes(ramoId)) {
                                canUnapprove = false;
                                alert(`No puedes desaprobar "${ramo.textContent}" porque es prerrequisito de un ramo que ya tienes aprobado.`);
                                return;
                            }
                        }
                    });

                    if (canUnapprove) {
                        approvedRamos.delete(ramoId);
                    }
                } else if (!ramo.classList.contains('bloqueado')) {
                    approvedRamos.add(ramoId);
                } else {
                    console.log(`No puedes tomar ${ramo.textContent} aún. Faltan prerrequisitos.`);
                    return;
                }

                saveRamosState();
                updateRamosDisplay();
            });
        }
    });

    updateRamosDisplay(); // Cargar el estado inicial de la malla


    // --- Lógica de Pestañas (SIMPLIFICADA: solo una pestaña 'Malla Curricular') ---
    const mallaTabContent = document.getElementById('malla');
    const mallaTabButton = document.querySelector('.tab-button[data-tab="malla"]');

    if (mallaTabContent && mallaTabButton) {
        mallaTabContent.classList.add('active');
        mallaTabButton.classList.add('active');
    }
    
    // --- Lógica de Modal de Calificaciones (REVISADA) ---
    const gradeModal = document.getElementById('gradeModal');
    const closeModalButton = document.querySelector('.close-button');
    const openGradeModalRamos = document.querySelectorAll('.open-grade-modal'); // Ramos que abren la modal

    const modalRamoTitle = document.getElementById('modalRamoTitle');
    const controlsContainer = document.getElementById('controlsContainer');
    const wimsGradeInput = document.getElementById('wimsGrade');
    const examenGradeInput = document.getElementById('examenGrade');
    const calculateGradesButton = document.getElementById('calculateGrades');

    const avgControlsSpan = document.getElementById('avgControls');
    const finalGradeNoWimsSpan = document.getElementById('finalGradeNoWims');
    const finalGradeWimsSpan = document.getElementById('finalGradeWims');
    const ramoStatusSpan = document.getElementById('ramoStatus');
    const examenNeededP = document.getElementById('examenNeeded');
    const wimsInfoP = document.getElementById('wimsInfo');

    let currentRamoId = null; // Para saber qué ramo estamos editando

    // Objeto para almacenar la estructura de calificaciones de cada ramo
    const ramoGradeConfigs = {
        'introduccion-calculo': {
            minApproval: 4.0,
            minEximicion: 5.5,
            evaluations: [
                { name: 'Control 1', weight: null },
                { name: 'Control 2', weight: null },
                { name: 'Control 3', weight: null },
                { name: 'Control 4', weight: null },
                { name: 'Control 5', weight: null },
                { name: 'Control 6', weight: null }
            ],
            examenWeight: 0.40,
            controlsWeight: 0.60,
            wimsWeight: 0.10
        },
        'introduccion-algebra': {
            minApproval: 3.95,
            minEximicion: 5.45,
            evaluations: [
                { name: 'Control 1', weight: null },
                { name: 'Control 2', weight: null },
                { name: 'Control 3', weight: null },
                { name: 'Control 4', weight: null },
                { name: 'Control 5', weight: null },
                { name: 'Control 6', weight: null }
            ],
            examenWeight: 0.40,
            controlsWeight: 0.60,
            wimsWeight: 0.10
        }
    };

    // Objeto para guardar las notas de los ramos en localStorage
    let savedRamoGrades = JSON.parse(localStorage.getItem('savedRamoGrades')) || {};

    // Función de redondeo al decimal más cercano
    function roundToNearestDecimal(num) {
        return Math.round(num * 10) / 10;
    }

    // Abre la modal con los datos del ramo seleccionado
    function openGradeModal(ramoId) {
        currentRamoId = ramoId;
        const ramoElement = document.querySelector(`[data-id="${ramoId}"]`);
        modalRamoTitle.textContent = ramoElement.textContent; // Muestra el nombre del ramo

        // Limpiar inputs y resultados anteriores
        controlsContainer.innerHTML = '';
        wimsGradeInput.value = '';
        examenGradeInput.value = '';
        avgControlsSpan.textContent = 'N/A';
        finalGradeNoWimsSpan.textContent = 'N/A';
        finalGradeWimsSpan.textContent = 'N/A';
        ramoStatusSpan.textContent = 'N/A';
        examenNeededP.textContent = '';
        wimsInfoP.textContent = '';


        const ramoConfig = ramoGradeConfigs[ramoId];
        const savedGrades = savedRamoGrades[ramoId] || {};

        // Generar inputs para los 6 controles
        for (let i = 1; i <= 6; i++) {
            const controlDiv = document.createElement('div');
            controlDiv.classList.add('control-input');
            controlDiv.innerHTML = `
                <label for="control${i}">Control ${i}:</label>
                <input type="number" id="control${i}" min="1.0" max="7.0" step="0.1" value="${savedGrades[`control${i}`] || ''}">
            `;
            controlsContainer.appendChild(controlDiv);
        }

        // Cargar nota WIMS si existe
        if (savedGrades.wims) {
            wimsGradeInput.value = savedGrades.wims;
        }
        // Cargar nota Examen si existe
        if (savedGrades.examen) {
            examenGradeInput.value = savedGrades.examen;
        }

        // Muestra la modal
        gradeModal.style.display = 'flex'; // <--- Asegura que la modal se muestra con flex
    }

    // Cierra la modal
    closeModalButton.addEventListener('click', () => {
        gradeModal.style.display = 'none';
        currentRamoId = null;
    });

    // Cierra la modal si se hace clic fuera de ella
    window.addEventListener('click', (event) => {
        if (event.target == gradeModal) {
            gradeModal.style.display = 'none';
            currentRamoId = null;
        }
    });

    // Añadir listeners a los ramos que abren la modal
    openGradeModalRamos.forEach(ramo => {
        ramo.addEventListener('click', (event) => {
            event.stopPropagation(); // Evitar que el click se propague a otros listeners del ramo
            if (!ramo.classList.contains('bloqueado')) {
                 openGradeModal(ramo.dataset.id);
            }
        });
    });

    // Función principal para calcular notas, ahora se llama SÓLO al hacer clic en el botón
    calculateGradesButton.addEventListener('click', calculateGrades);

    function calculateGrades() {
        if (!currentRamoId) return;

        const ramoConfig = ramoGradeConfigs[currentRamoId];
        const grades = {};
        let controlGrades = [];
        let sumControls = 0;
        let validControlsCount = 0;

        // Recolectar notas de controles
        for (let i = 1; i <= 6; i++) {
            const input = document.getElementById(`control${i}`);
            const grade = parseFloat(input.value);
            if (!isNaN(grade) && grade >= 1.0 && grade <= 7.0) {
                controlGrades.push(grade);
                sumControls += grade;
                validControlsCount++;
                grades[`control${i}`] = grade; // Guardar nota individual
            } else {
                 grades[`control${i}`] = ''; // Guardar vacío si no es válida
            }
        }

        const avgControls = validControlsCount > 0 ? roundToNearestDecimal(sumControls / validControlsCount) : null;
        avgControlsSpan.textContent = avgControls !== null ? avgControls.toFixed(1) : 'N/A';

        const wimsGrade = parseFloat(wimsGradeInput.value);
        if (!isNaN(wimsGrade) && wimsGrade >= 1.0 && wimsGrade <= 7.0) {
            grades.wims = wimsGrade;
        } else {
            grades.wims = '';
        }

        const examenGrade = parseFloat(examenGradeInput.value);
        if (!isNaN(examenGrade) && examenGrade >= 1.0 && examenGrade <= 7.0) {
            grades.examen = examenGrade;
        } else {
            grades.examen = '';
        }

        // --- Lógica de Cálculo Principal ---
        let finalGrade = null;
        let status = 'Pendiente';
        examenNeededP.textContent = ''; // Limpiar mensaje previo
        wimsInfoP.textContent = ''; // Limpiar mensaje previo

        if (avgControls !== null && validControlsCount === 6) { // Solo calculamos si hay los 6 controles
            if (avgControls >= ramoConfig.minEximicion) {
                // Condición de eximición
                status = 'Eximido';
                finalGrade = avgControls;

                if (!isNaN(examenGrade) && examenGrade > avgControls) {
                    // Si eximido, pero da el examen y le va mejor
                    finalGrade = roundToNearestDecimal((avgControls * ramoConfig.controlsWeight) + (examenGrade * ramoConfig.examenWeight));
                    wimsInfoP.textContent = 'Nota de examen reemplazó promedio controles por ser superior.';
                }

            } else {
                // No eximido, requiere examen
                if (!isNaN(examenGrade)) {
                    finalGrade = roundToNearestDecimal((avgControls * ramoConfig.controlsWeight) + (examenGrade * ramoConfig.examenWeight));
                } else {
                    // Calcular nota necesaria en examen para aprobar
                    const desiredFinal = ramoConfig.minApproval;
                    const neededExamen = roundToNearestDecimal((desiredFinal - (avgControls * ramoConfig.controlsWeight)) / ramoConfig.examenWeight);
                    if (neededExamen <= 7.0 && neededExamen >= 1.0) {
                        examenNeededP.textContent = `Necesitas un ${neededExamen.toFixed(1)} en el examen para aprobar.`;
                    } else if (neededExamen < 1.0) {
                         examenNeededP.textContent = `Necesitas menos de 1.0 en el examen para aprobar (¡vas muy bien!).`;
                    }
                    else {
                        examenNeededP.textContent = `Ya no puedes aprobar el ramo con tus notas actuales de controles.`;
                    }
                }
            }
        } else if (validControlsCount < 6) {
             status = 'Controles Incompletos';
             examenNeededP.textContent = `Faltan ${6 - validControlsCount} controles para calcular promedio y estado final.`;
        }

        // Aplicar lógica WIMS si el WIMS tiene nota y el ramo (sin WIMS) ya tiene una nota final
        let finalGradeWithWims = finalGrade;
        if (finalGrade !== null && !isNaN(wimsGrade) && wimsGrade >= ramoConfig.minApproval && finalGrade >= ramoConfig.minApproval) {
            // Si el ramo y WIMS están aprobados
            const ponderadoWims = roundToNearestDecimal((finalGrade * (1 - ramoConfig.wimsWeight)) + (wimsGrade * ramoConfig.wimsWeight));
            finalGradeWithWims = Math.max(finalGrade, ponderadoWims);
            if (finalGradeWithWims > finalGrade) {
                wimsInfoP.textContent = `¡WIMS aplicado! Tu nota mejoró a ${finalGradeWithWims.toFixed(1)}.`;
            }
        } else if (finalGrade !== null && !isNaN(wimsGrade)) {
             if (wimsGrade < ramoConfig.minApproval && finalGrade >= ramoConfig.minApproval) {
                 wimsInfoP.textContent = `WIMS no aplica porque no lo tienes aprobado (requiere ${ramoConfig.minApproval.toFixed(1)}).`;
             } else if (wimsGrade >= ramoConfig.minApproval && finalGrade < ramoConfig.minApproval) {
                 wimsInfoP.textContent = `WIMS no aplica porque el ramo no está aprobado sin él (requiere ${ramoConfig.minApproval.toFixed(1)}).`;
             }
        }
        
        finalGradeNoWimsSpan.textContent = finalGrade !== null ? finalGrade.toFixed(1) : 'N/A';
        finalGradeWimsSpan.textContent = finalGradeWithWims !== null && finalGradeWithWims !== finalGrade ? finalGradeWithWims.toFixed(1) : (finalGrade !== null ? finalGrade.toFixed(1) : 'N/A');

        // Actualizar estado final basado en la nota final (posiblemente con WIMS)
        if (finalGradeWithWims !== null) {
            if (finalGradeWithWims >= ramoConfig.minApproval) {
                status = 'Aprobado';
                if (avgControls !== null && avgControls >= ramoConfig.minEximicion) {
                    if (isNaN(examenGrade) || examenGradeInput.value === '') {
                        status = 'Eximido';
                    } else if (!isNaN(examenGrade) && finalGradeWithWims >= ramoConfig.minApproval) {
                        if (finalGradeWithWims >= ramoConfig.minEximicion || Math.abs(finalGradeWithWims - avgControls) < 0.05) {
                            status = 'Eximido';
                        } else if (finalGradeWithWims < ramoConfig.minEximicion && finalGradeWithWims >= ramoConfig.minApproval) {
                            status = 'Aprobado (eximido, pero nota final post-examen no alcanza eximición)';
                        }
                    }
                }
            } else {
                status = 'Reprobado';
            }
        }
        ramoStatusSpan.textContent = status;

        // --- Guardar notas para el ramo actual ---
        savedRamoGrades[currentRamoId] = grades;
        localStorage.setItem('savedRamoGrades', JSON.stringify(savedRamoGrades));

        // Marcar el ramo como aprobado en la malla si la nota final es >= nota de aprobación
        if (finalGradeWithWims !== null && finalGradeWithWims >= ramoConfig.minApproval) {
            approvedRamos.add(currentRamoId);
            document.querySelector(`[data-id="${currentRamoId}"]`).classList.add('aprobado');
        } else {
            approvedRamos.delete(currentRamoId);
            document.querySelector(`[data-id="${currentRamoId}"]`).classList.remove('aprobado');
        }
        saveRamosState(); // Guarda el estado de aprobación de la malla
        updateRamosDisplay(); // Actualiza los contadores y prerrequisitos
    }
});