document.addEventListener('DOMContentLoaded', () => {
    // --- Lógica de la Malla Curricular ---
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
    
    // --- Lógica de Modal de Calificaciones ---
    const gradeModal = document.getElementById('gradeModal');
    const closeModalButton = document.querySelector('.close-button');
    const openGradeModalRamos = document.querySelectorAll('.open-grade-modal'); // Ramos que abren la modal

    const modalRamoTitle = document.getElementById('modalRamoTitle');
    const controlsContainer = document.getElementById('controlsContainer');
    const wimsGradeInput = document.getElementById('wimsGrade');
    const examenGradeInput = document.getElementById('examenGrade');
    const calculateGradesButton = document.getElementById('calculateGrades');

    const avgControlsSpan = document.getElementById('avgControls');
    
    // Elementos para la nota final genérica
    const finalGradeCombinedContainer = document.getElementById('finalGradeCombinedContainer');
    const finalGradeDisplaySpan = document.getElementById('finalGradeDisplay');

    // Elementos para las notas finales con/sin WIMS (visibilidad controlada)
    const finalGradeNoWimsContainer = document.getElementById('finalGradeNoWimsContainer'); 
    const finalGradeWimsContainer = document.getElementById('finalGradeWimsContainer');
    const finalGradeNoWimsSpan = document.getElementById('finalGradeNoWims');
    const finalGradeWimsSpan = document.getElementById('finalGradeWims');

    const ramoStatusSpan = document.getElementById('ramoStatus');
    const examenNeededP = document.getElementById('examenNeeded');
    const wimsInfoP = document.getElementById('wimsInfo');

    let currentRamoId = null; // Para saber qué ramo estamos editando

    // Objeto para almacenar la estructura de calificaciones de cada ramo
    const ramoGradeConfigs = {
        'introduccion-calculo': {
            minApproval: 3.95, // Ajustado a >= 3.95
            minEximicion: 5.45, // Ajustado a >= 5.45
            evaluations: [
                { name: 'Control 1', type: 'control' },
                { name: 'Control 2', type: 'control' },
                { name: 'Control 3', type: 'control' },
                { name: 'Control 4', type: 'control' },
                { name: 'Control 5', type: 'control' },
                { name: 'Control 6', type: 'control' }
            ],
            examenWeight: 0.40,
            controlsWeight: 0.60,
            wimsWeight: 0.10
        },
        'introduccion-algebra': {
            minApproval: 3.95, // Ajustado a >= 3.95
            minEximicion: 5.45, // Ajustado a >= 5.45
            evaluations: [
                { name: 'Control 1', type: 'control' },
                { name: 'Control 2', type: 'control' },
                { name: 'Control 3', type: 'control' },
                { name: 'Control 4', type: 'control' },
                { name: 'Control 5', type: 'control' },
                { name: 'Control 6', type: 'control' }
            ],
            examenWeight: 0.40,
            controlsWeight: 0.60,
            wimsWeight: 0.10
        },
        'introduccion-fisica-clasica': { // Nueva configuración para Física Clásica
            minApproval: 3.95, // >= 3.95 para aprobar
            minEximicion: 5.45, // >= 5.45 para eximir
            evaluations: [
                { name: 'Control 1', type: 'control' },
                { name: 'Control 2', type: 'control' },
                { name: 'Control 3', type: 'control' },
                { name: 'Ejercicios', type: 'ejercicios' } // Promedio de ejercicios
            ],
            examenWeight: 0.40,
            controlsWeight: 0.60, // Ponderación de (Controles + Ejercicios)
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
        finalGradeDisplaySpan.textContent = 'N/A'; // Limpiar el nuevo span
        finalGradeNoWimsSpan.textContent = 'N/A';
        finalGradeWimsSpan.textContent = 'N/A';
        ramoStatusSpan.textContent = 'N/A';
        examenNeededP.textContent = '';
        wimsInfoP.textContent = '';

        const ramoConfig = ramoGradeConfigs[ramoId];
        const savedGrades = savedRamoGrades[ramoId] || {};

        // Generar inputs basados en la configuración del ramo
        ramoConfig.evaluations.forEach((evalItem, index) => {
            const inputId = `${evalItem.type}${index + 1}`; // e.g., control1, ejercicios1
            const grade = savedGrades[inputId] || '';

            const controlDiv = document.createElement('div');
            controlDiv.classList.add('control-input');
            controlDiv.innerHTML = `
                <label for="${inputId}">${evalItem.name}:</label>
                <input type="number" id="${inputId}" min="1.0" max="7.0" step="0.1" value="${grade}">
            `;
            controlsContainer.appendChild(controlDiv);
        });

        // Lógica para ocultar/mostrar WIMS visualmente
        const isFisicaClasica = (ramoId === 'introduccion-fisica-clasica');
        const wimsSection = wimsGradeInput.parentElement;
        
        if (isFisicaClasica) {
            wimsSection.style.display = 'none'; // Oculta la sección de WIMS
            wimsGradeInput.value = ''; // Limpia el valor por si acaso
        } else {
            wimsSection.style.display = 'block'; // Asegura que se muestra para otros ramos
            if (savedGrades.wims) {
                wimsGradeInput.value = savedGrades.wims;
            } else {
                wimsGradeInput.value = '';
            }
        }
        
        // Lógica para ocultar/mostrar los resultados de notas finales
        if (isFisicaClasica) {
            finalGradeCombinedContainer.style.display = 'block'; // Mostrar solo la nota final genérica para Física Clásica
            finalGradeNoWimsContainer.style.display = 'none';   // Ocultar "sin WIMS"
            finalGradeWimsContainer.style.display = 'none';     // Ocultar "con WIMS"
        } else {
            finalGradeCombinedContainer.style.display = 'block'; // Asegura que se muestra también en otros ramos
            finalGradeNoWimsContainer.style.display = 'block'; // Mostrar "sin WIMS"
            finalGradeWimsContainer.style.display = 'block';   // Mostrar "con WIMS"
        }


        // Cargar nota Examen si existe
        if (savedGrades.examen) {
            examenGradeInput.value = savedGrades.examen;
        } else {
            examenGradeInput.value = '';
        }

        gradeModal.style.display = 'flex'; // Muestra la modal
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
        let averageForEximicion = null; // Promedio para decidir eximición (controles o controles+ejercicios)
        let totalEvaluations = ramoConfig.evaluations.length;
        let validEvaluationCount = 0;

        let sumControls = 0;
        let validControlsCount = 0;
        let sumEjercicios = 0;
        let validEjerciciosCount = 0; // Para Física Clásica

        ramoConfig.evaluations.forEach((evalItem, index) => {
            const inputId = `${evalItem.type}${index + 1}`;
            const inputElement = document.getElementById(inputId);
            if (inputElement) { // Asegurarse de que el input existe
                const grade = parseFloat(inputElement.value);
                if (!isNaN(grade) && grade >= 1.0 && grade <= 7.0) {
                    grades[inputId] = grade;
                    validEvaluationCount++; // Contar evaluaciones válidas para el promedio general
                    if (evalItem.type === 'control') {
                        sumControls += grade;
                        validControlsCount++;
                    } else if (evalItem.type === 'ejercicios') {
                        sumEjercicios += grade; // En este caso, solo 1 "Ejercicios"
                        validEjerciciosCount++;
                    }
                } else {
                    grades[inputId] = ''; // Guardar vacío si no es válida
                }
            }
        });

        // Solo obtener y guardar WIMS si el ramo no es Física Clásica
        let wimsGrade = NaN; // Inicializar wimsGrade como NaN por defecto
        if (currentRamoId !== 'introduccion-fisica-clasica') {
            wimsGrade = parseFloat(wimsGradeInput.value);
            if (!isNaN(wimsGrade) && wimsGrade >= 1.0 && wimsGrade <= 7.0) {
                grades.wims = wimsGrade;
            } else {
                grades.wims = '';
            }
        } else {
            grades.wims = ''; // Asegura que no se guarde WIMS para Física Clásica
        }

        const examenGrade = parseFloat(examenGradeInput.value);
        if (!isNaN(examenGrade) && examenGrade >= 1.0 && examenGrade <= 7.0) {
            grades.examen = examenGrade;
        } else {
            grades.examen = '';
        }

        // --- Calcular promedio de evaluaciones según el ramo ---
        if (currentRamoId === 'introduccion-fisica-clasica') {
            // Para Física Clásica, el promedio de eximición es (Controles + Ejercicios)
            if (validControlsCount === 3 && validEjerciciosCount === 1) { // 3 Controles y 1 Ejercicios
                averageForEximicion = roundToNearestDecimal((sumControls + sumEjercicios) / 4); // Promedio de los 4 elementos
            } else {
                averageForEximicion = null;
            }
            // Actualizar el texto del promedio de controles para reflejar "Controles + Ejercicios"
            avgControlsSpan.textContent = averageForEximicion !== null ? averageForEximicion.toFixed(1) : 'N/A';
        } else {
            // Para Cálculo y Álgebra, el promedio de eximición es solo el promedio de controles (6 controles)
            if (validControlsCount === 6) {
                averageForEximicion = roundToNearestDecimal(sumControls / validControlsCount);
            } else {
                averageForEximicion = null;
            }
            avgControlsSpan.textContent = averageForEximicion !== null ? averageForEximicion.toFixed(1) : 'N/A';
        }

        // --- Lógica de Cálculo Principal ---
        let finalGrade = null;
        let status = 'Pendiente';
        examenNeededP.textContent = ''; // Limpiar mensaje previo
        wimsInfoP.textContent = ''; // Limpiar mensaje previo

        // Contar el total de evaluaciones esperadas (3 controles + 1 ejercicios para Física Clásica, 6 controles para Cálculo/Álgebra)
        const expectedEvaluationsCount = ramoConfig.evaluations.length;

        if (averageForEximicion !== null && validEvaluationCount === expectedEvaluationsCount) {
            if (averageForEximicion >= ramoConfig.minEximicion) { // Condición de eximición: >= 5.45
                status = 'Eximido';
                finalGrade = averageForEximicion;

                // Si eximido, pero da el examen y le beneficia (Nota Examen > promedio eximición)
                if (!isNaN(examenGrade) && examenGrade > averageForEximicion) {
                    finalGrade = roundToNearestDecimal((averageForEximicion * ramoConfig.controlsWeight) + (examenGrade * ramoConfig.examenWeight));
                    wimsInfoP.textContent = 'Nota de examen reemplazó promedio por ser superior.';
                }

            } else {
                // No eximido, requiere examen
                if (!isNaN(examenGrade)) {
                    finalGrade = roundToNearestDecimal((averageForEximicion * ramoConfig.controlsWeight) + (examenGrade * ramoConfig.examenWeight));
                } else {
                    // Calcular nota necesaria en examen para aprobar
                    const desiredFinal = ramoConfig.minApproval; // Umbral de aprobación >= 3.95
                    const neededExamen = roundToNearestDecimal((desiredFinal - (averageForEximicion * ramoConfig.controlsWeight)) / ramoConfig.examenWeight);
                    if (neededExamen <= 7.0 && neededExamen >= 1.0) {
                        examenNeededP.textContent = `Necesitas un ${neededExamen.toFixed(1)} en el examen para aprobar.`;
                    } else if (neededExamen < 1.0) {
                         examenNeededP.textContent = `Necesitas menos de 1.0 en el examen para aprobar (¡vas muy bien!).`;
                    }
                    else {
                        examenNeededP.textContent = `Ya no puedes aprobar el ramo con tus notas actuales.`;
                    }
                }
            }
        } else if (validEvaluationCount < expectedEvaluationsCount) {
             status = 'Evaluaciones Incompletas';
             examenNeededP.textContent = `Faltan ${expectedEvaluationsCount - validEvaluationCount} evaluaciones para calcular promedio y estado final.`;
        }

        // Aplicar lógica WIMS solo si el ramo no es "Introducción a la Física Clásica"
        let finalGradeWithWims = finalGrade;
        if (currentRamoId !== 'introduccion-fisica-clasica' && finalGrade !== null && !isNaN(wimsGrade) && wimsGrade >= ramoConfig.minApproval && finalGrade >= ramoConfig.minApproval) {
            // Si el ramo y WIMS están aprobados
            const ponderadoWims = roundToNearestDecimal((finalGrade * (1 - ramoConfig.wimsWeight)) + (wimsGrade * ramoConfig.wimsWeight));
            finalGradeWithWims = Math.max(finalGrade, ponderadoWims);
            if (finalGradeWithWims > finalGrade) {
                wimsInfoP.textContent = `¡WIMS aplicado! Tu nota mejoró a ${finalGradeWithWims.toFixed(1)}.`;
            }
        } else if (currentRamoId !== 'introduccion-fisica-clasica' && finalGrade !== null && !isNaN(wimsGrade)) {
             if (wimsGrade < ramoConfig.minApproval && finalGrade >= ramoConfig.minApproval) {
                 wimsInfoP.textContent = `WIMS no aplica porque no lo tienes aprobado (requiere ${ramoConfig.minApproval.toFixed(1)}).`;
             } else if (wimsGrade >= ramoConfig.minApproval && finalGrade < ramoConfig.minApproval) {
                 wimsInfoP.textContent = `WIMS no aplica porque el ramo no está aprobado sin él (requiere ${ramoConfig.minApproval.toFixed(1)}).`;
             }
        } else if (currentRamoId === 'introduccion-fisica-clasica' && !isNaN(wimsGrade) && wimsGrade !== '') {
            // Mensaje específico para Física Clásica si se ingresó un WIMS
            wimsInfoP.textContent = 'WIMS no aplica para este ramo.';
        } else {
            wimsInfoP.textContent = ''; // Limpia el mensaje si no hay WIMS o no aplica
        }

        // Asignar los valores a los spans de resultados
        if (currentRamoId === 'introduccion-fisica-clasica') {
            finalGradeDisplaySpan.textContent = finalGrade !== null ? finalGrade.toFixed(1) : 'N/A';
            // Los otros spans de WIMS ya están ocultos por el openGradeModal
        } else {
            finalGradeDisplaySpan.textContent = 'N/A'; // Se oculta esta linea cuando se usa WIMS
            finalGradeNoWimsSpan.textContent = finalGrade !== null ? finalGrade.toFixed(1) : 'N/A';
            finalGradeWimsSpan.textContent = finalGradeWithWims !== null && finalGradeWithWims !== finalGrade ? finalGradeWithWims.toFixed(1) : (finalGrade !== null ? finalGrade.toFixed(1) : 'N/A');
        }


        // Actualizar estado final basado en la nota final (posiblemente con WIMS)
        if (finalGradeWithWims !== null) {
            if (finalGradeWithWims >= ramoConfig.minApproval) { // Condición de aprobación: >= 3.95
                status = 'Aprobado';
                // La lógica de "Eximido" se basa en el promedio de eximición inicial.
                if (averageForEximicion !== null && averageForEximicion >= ramoConfig.minEximicion) {
                    if (isNaN(examenGrade) || examenGradeInput.value === '') { // No hubo examen, o examen no válido
                        status = 'Eximido';
                    } else if (!isNaN(examenGrade) && finalGradeWithWims >= ramoConfig.minApproval) {
                        // Si hubo examen, y la nota final (con/sin WIMS) sigue siendo de eximición (o la original de controles)
                        if (finalGradeWithWims >= ramoConfig.minEximicion - 0.05) { // Un pequeño delta para floating point issues con eximición
                            status = 'Eximido';
                        } else if (finalGradeWithWims < ramoConfig.minEximicion && finalGradeWithWims >= ramoConfig.minApproval) {
                            status = 'Aprobado (eximido, pero nota final post-examen/WIMS no alcanza eximición)';
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
