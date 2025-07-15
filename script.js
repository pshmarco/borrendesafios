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

    // --- Lógica del Botón de Tachar Ramos ---
    const toggleTacharModeButton = document.getElementById('toggleTacharMode');
    let tacharModeActive = false; // Estado inicial: modo de notas activado

    function updateTacharModeButton() {
        if (tacharModeActive) {
            toggleTacharModeButton.textContent = 'Desactivar Modo Edición';
            toggleTacharModeButton.classList.add('active-mode');
        } else {
            toggleTacharModeButton.textContent = 'Activar Modo Edición';
            toggleTacharModeButton.classList.remove('active-mode');
        }
    }

    toggleTacharModeButton.addEventListener('click', () => {
        tacharModeActive = !tacharModeActive;
        updateTacharModeButton();
        // Cierra la modal si está abierta al cambiar de modo
        gradeModal.style.display = 'none';
        currentRamoId = null;
    });

    updateTacharModeButton(); // Inicializa el texto del botón

    // Función para manejar el clic en modo "tachar"
    function handleTacharModeClick(ramoId) {
        const ramoElement = document.querySelector(`[data-id="${ramoId}"]`);
        if (!ramoElement) return;

        // Si el ramo está bloqueado por prerrequisitos, no se puede hacer clic en modo "tachar"
        if (ramoElement.classList.contains('bloqueado')) {
            alert(`No puedes modificar "${ramoElement.textContent}" aún. Faltan prerrequisitos.`);
            return;
        }

        if (ramoElement.classList.contains('aprobado')) {
            // Lógica para desaprobar (considerando prerrequisitos de otros ramos)
            let canUnapprove = true;
            approvedRamos.forEach(approvedRamoId => {
                if (ramoId !== approvedRamoId) {
                    const approvedRamoElement = document.querySelector(`[data-id="${approvedRamoId}"]`);
                    if (approvedRamoElement && getPrerequisites(approvedRamoElement).includes(ramoId)) {
                        canUnapprove = false;
                        alert(`No puedes desaprobar "${ramoElement.textContent}" porque es prerrequisito de un ramo que ya tienes aprobado.`);
                        return;
                    }
                }
            });

            if (canUnapprove) {
                approvedRamos.delete(ramoId);
                // También limpia las notas guardadas si se desaprueba
                if (savedRamoGrades[ramoId]) {
                    delete savedRamoGrades[ramoId];
                    localStorage.setItem('savedRamoGrades', JSON.stringify(savedRamoGrades));
                }
            }
        } else {
            // Lógica para aprobar
            approvedRamos.add(ramoId);
            // No se guardan notas ficticias, solo el estado de aprobado en este modo.
        }

        saveRamosState();
        updateRamosDisplay();
    }

    // Modificar listener para los ramos
    ramos.forEach(ramo => {
        ramo.addEventListener('click', (event) => {
            event.stopPropagation(); // Evitar que el click se propague a otros listeners del ramo
            const ramoId = ramo.dataset.id;

            // Primero, verifica si el ramo está bloqueado. Si lo está, no hace nada.
            if (ramo.classList.contains('bloqueado')) {
                // El CSS ya usa pointer-events: none; pero esto es una doble verificación.
                // alert(`No puedes interactuar con "${ramo.textContent}" aún. Faltan prerrequisitos.`);
                return;
            }

            if (tacharModeActive) {
                // En modo edición, todos los ramos son "tachables" (si sus prerrequisitos lo permiten)
                handleTacharModeClick(ramoId);
            } else {
                // En modo normal (notas), solo los ramos con la clase 'open-grade-modal' abren la modal.
                // Los ramos sin 'open-grade-modal' se gestionan con clic directo (tachar/destachar).
                if (ramo.classList.contains('open-grade-modal')) {
                    openGradeModal(ramoId);
                } else {
                    handleTacharModeClick(ramoId); // Reutiliza la misma lógica de toggle
                }
            }
        });
    });

    updateRamosDisplay(); // Cargar el estado inicial de la malla


    // --- Lógica de Modal de Calificaciones ---
    const gradeModal = document.getElementById('gradeModal');
    const closeModalButton = document.querySelector('.close-button');

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
            minApproval: 3.95,
            minEximicion: 5.45,
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
            minApproval: 3.95,
            minEximicion: 5.45,
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
        'introduccion-fisica-clasica': {
            minApproval: 3.95,
            minEximicion: 5.45,
            evaluations: [
                { name: 'Control 1', type: 'control' },
                { name: 'Control 2', type: 'control' },
                { name: 'Control 3', type: 'control' },
                { name: 'Ejercicios', type: 'ejercicios' }
            ],
            examenWeight: 0.40,
            controlsWeight: 0.60,
        },
        'algebra-lineal': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
        'calculo-diferencial-integral': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
        'introduccion-fisica-moderna': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
        'introduccion-programacion': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
        'calculo-varias-variables': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
        'ecuaciones-diferenciales-ordinarias': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
        'mecanica': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
        'metodos-experimentales': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
        'quimica': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
        'economia': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
        'calculo-avanzado-aplicaciones': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
        'electromagnetismo': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
        'modulo-interdisciplinario': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
        'termodinamica': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60,
        },
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
        finalGradeDisplaySpan.textContent = 'N/A';
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
        const hasWims = ramoConfig.hasOwnProperty('wimsWeight');
        const wimsSection = wimsGradeInput.parentElement;
        
        if (!hasWims) {
            wimsSection.style.display = 'none';
            wimsGradeInput.value = '';
        } else {
            wimsSection.style.display = 'flex'; // Asegura que se muestra con flex para alinear
            if (savedGrades.wims) {
                wimsGradeInput.value = savedGrades.wims;
            } else {
                wimsGradeInput.value = '';
            }
        }
        
        // Lógica para ocultar/mostrar los resultados de notas finales
        if (!hasWims) {
            finalGradeCombinedContainer.style.display = 'block';
            finalGradeNoWimsContainer.style.display = 'none';
            finalGradeWimsContainer.style.display = 'none';
        } else {
            finalGradeCombinedContainer.style.display = 'none';
            finalGradeNoWimsContainer.style.display = 'block';
            finalGradeWimsContainer.style.display = 'block';
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

    // Función principal para calcular notas, ahora se llama SÓLO al hacer clic en el botón
    calculateGradesButton.addEventListener('click', calculateGrades);

    function calculateGrades() {
        if (!currentRamoId) return;

        const ramoConfig = ramoGradeConfigs[currentRamoId];
        const grades = {};
        let averageForEximicion = null;
        let validEvaluationCount = 0;

        let sumControls = 0;
        let validControlsCount = 0;
        let sumEjercicios = 0;
        let validEjerciciosCount = 0;

        ramoConfig.evaluations.forEach((evalItem, index) => {
            const inputId = `${evalItem.type}${index + 1}`;
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                const grade = parseFloat(inputElement.value);
                if (!isNaN(grade) && grade >= 1.0 && grade <= 7.0) {
                    grades[inputId] = grade;
                    validEvaluationCount++;
                    if (evalItem.type === 'control') {
                        sumControls += grade;
                        validControlsCount++;
                    } else if (evalItem.type === 'ejercicios') {
                        sumEjercicios += grade;
                        validEjerciciosCount++;
                    }
                } else {
                    grades[inputId] = '';
                }
            }
        });

        let wimsGrade = NaN;
        if (ramoConfig.hasOwnProperty('wimsWeight')) {
            wimsGrade = parseFloat(wimsGradeInput.value);
            if (!isNaN(wimsGrade) && wimsGrade >= 1.0 && wimsGrade <= 7.0) {
                grades.wims = wimsGrade;
            } else {
                grades.wims = '';
            }
        } else {
            grades.wims = '';
        }

        const examenGrade = parseFloat(examenGradeInput.value);
        if (!isNaN(examenGrade) && examenGrade >= 1.0 && examenGrade <= 7.0) {
            grades.examen = examenGrade;
        } else {
            grades.examen = '';
        }

        let expectedControls = 0;
        let expectedEjercicios = 0;

        ramoConfig.evaluations.forEach(evalItem => {
            if (evalItem.type === 'control') {
                expectedControls++;
            } else if (evalItem.type === 'ejercicios') {
                expectedEjercicios++;
            }
        });

        if (expectedEjercicios > 0) {
            if (validControlsCount === expectedControls && validEjerciciosCount === expectedEjercicios) {
                averageForEximicion = roundToNearestDecimal((sumControls + sumEjercicios) / (expectedControls + expectedEjercicios));
            } else {
                averageForEximicion = null;
            }
        } else {
            if (validControlsCount === expectedControls) {
                averageForEximicion = roundToNearestDecimal(sumControls / validControlsCount);
            } else {
                averageForEximicion = null;
            }
        }
        avgControlsSpan.textContent = averageForEximicion !== null ? averageForEximicion.toFixed(1) : 'N/A';

        let finalGrade = null;
        let status = 'Pendiente';
        examenNeededP.textContent = '';
        wimsInfoP.textContent = '';

        const expectedEvaluationsCount = ramoConfig.evaluations.length;

        if (averageForEximicion !== null && validEvaluationCount === expectedEvaluationsCount) {
            if (averageForEximicion >= ramoConfig.minEximicion) {
                status = 'Eximido';
                finalGrade = averageForEximicion;

                if (!isNaN(examenGrade) && examenGrade > averageForEximicion) {
                    finalGrade = roundToNearestDecimal((averageForEximicion * ramoConfig.controlsWeight) + (examenGrade * ramoConfig.examenWeight));
                    wimsInfoP.textContent = 'Nota de examen reemplazó promedio por ser superior.';
                }

            } else {
                if (!isNaN(examenGrade)) {
                    finalGrade = roundToNearestDecimal((averageForEximicion * ramoConfig.controlsWeight) + (examenGrade * ramoConfig.examenWeight));
                } else {
                    const desiredFinal = ramoConfig.minApproval;
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

        let finalGradeWithWims = finalGrade;
        if (ramoConfig.hasOwnProperty('wimsWeight') && finalGrade !== null && !isNaN(wimsGrade) && wimsGrade >= ramoConfig.minApproval && finalGrade >= ramoConfig.minApproval) {
            const ponderadoWims = roundToNearestDecimal((finalGrade * (1 - ramoConfig.wimsWeight)) + (wimsGrade * ramoConfig.wimsWeight));
            finalGradeWithWims = Math.max(finalGrade, ponderadoWims);
            if (finalGradeWithWims > finalGrade) {
                wimsInfoP.textContent = `¡WIMS aplicado! Tu nota mejoró a ${finalGradeWithWims.toFixed(1)}.`;
            }
        } else if (ramoConfig.hasOwnProperty('wimsWeight') && finalGrade !== null && !isNaN(wimsGrade)) {
             if (wimsGrade < ramoConfig.minApproval && finalGrade >= ramoConfig.minApproval) {
                 wimsInfoP.textContent = `WIMS no aplica porque no lo tienes aprobado (requiere ${ramoConfig.minApproval.toFixed(1)}).`;
             } else if (wimsGrade >= ramoConfig.minApproval && finalGrade < ramoConfig.minApproval) {
                 wimsInfoP.textContent = `WIMS no aplica porque el ramo no está aprobado sin él (requiere ${ramoConfig.minApproval.toFixed(1)}).`;
             }
        } else if (!ramoConfig.hasOwnProperty('wimsWeight') && !isNaN(wimsGrade) && wimsGrade !== '') {
            wimsInfoP.textContent = 'WIMS no aplica para este ramo.';
        } else {
            wimsInfoP.textContent = '';
        }

        if (!ramoConfig.hasOwnProperty('wimsWeight')) {
            finalGradeDisplaySpan.textContent = finalGrade !== null ? finalGrade.toFixed(1) : 'N/A';
        } else {
            finalGradeDisplaySpan.textContent = 'N/A';
            finalGradeNoWimsSpan.textContent = finalGrade !== null ? finalGrade.toFixed(1) : 'N/A';
            finalGradeWimsSpan.textContent = finalGradeWithWims !== null && finalGradeWithWims !== finalGrade ? finalGradeWithWims.toFixed(1) : (finalGrade !== null ? finalGrade.toFixed(1) : 'N/A');
        }


        if (finalGradeWithWims !== null) {
            if (finalGradeWithWims >= ramoConfig.minApproval) {
                status = 'Aprobado';
                if (averageForEximicion !== null && averageForEximicion >= ramoConfig.minEximicion) {
                    if (isNaN(examenGrade) || examenGradeInput.value === '') {
                        status = 'Eximido';
                    } else if (!isNaN(examenGrade) && finalGradeWithWims >= ramoConfig.minApproval) {
                        if (finalGradeWithWims >= ramoConfig.minEximicion - 0.05) {
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

        savedRamoGrades[currentRamoId] = grades;
        localStorage.setItem('savedRamoGrades', JSON.stringify(savedRamoGrades));

        if (finalGradeWithWims !== null && finalGradeWithWims >= ramoConfig.minApproval) {
            approvedRamos.add(currentRamoId);
            document.querySelector(`[data-id="${currentRamoId}"]`).classList.add('aprobado');
        } else {
            approvedRamos.delete(currentRamoId);
            document.querySelector(`[data-id="${currentRamoId}"]`).classList.remove('aprobado');
        }
        saveRamosState();
        updateRamosDisplay();
    }
});
