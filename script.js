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

    // --- Lógica del Botón de Modo Tachar ---
    const toggleTacharModeButton = document.getElementById('toggleTacharMode');
    let tacharModeActive = false; // Estado inicial: modo de notas

    function toggleRamoApproval(ramoId) {
        const ramoElement = document.querySelector(`[data-id="${ramoId}"]`);
        if (!ramoElement) return;

        if (approvedRamos.has(ramoId)) {
            // Intentar desaprobar: verificar si es prerrequisito de un ramo aprobado
            let canUnapprove = true;
            approvedRamos.forEach(approvedRamoId => {
                if (ramoId !== approvedRamoId) { // No verificar contra sí mismo
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
                // Si se desaprueba, también eliminar sus notas guardadas
                if (savedRamoGrades[ramoId]) {
                    delete savedRamoGrades[ramoId];
                    localStorage.setItem('savedRamoGrades', JSON.stringify(savedRamoGrades));
                }
            }
        } else if (!ramoElement.classList.contains('bloqueado')) {
            // Aprobar si no está bloqueado por prerrequisitos
            approvedRamos.add(ramoId);
        } else {
            alert(`No puedes tachar "${ramoElement.textContent}" aún. Faltan prerrequisitos.`);
            return; // No hacer nada si está bloqueado
        }
        saveRamosState();
        updateRamosDisplay();
    }

    toggleTacharModeButton.addEventListener('click', () => {
        tacharModeActive = !tacharModeActive;
        toggleTacharModeButton.textContent = `Modo Tachar: ${tacharModeActive ? 'Activado' : 'Desactivado'}`;
        
        // Cierra la modal si está abierta al cambiar de modo
        if (gradeModal.style.display === 'flex') {
            gradeModal.style.display = 'none';
            currentRamoId = null;
        }
        // Opcional: Podrías añadir alguna indicación visual en los ramos si el modo está activo
        // Por ejemplo, cambiar el cursor o añadir una clase CSS a todos los ramos.
    });

    // Un solo listener para todos los ramos para manejar ambos modos
    ramos.forEach(ramo => {
        ramo.addEventListener('click', (event) => {
            event.stopPropagation(); // Evitar que el click se propague
            const ramoId = ramo.dataset.id;

            if (tacharModeActive) {
                toggleRamoApproval(ramoId);
            } else {
                // Solo los ramos designados con 'open-grade-modal' abren la modal en modo normal
                if (ramo.classList.contains('open-grade-modal') && !ramo.classList.contains('bloqueado')) {
                    openGradeModal(ramoId);
                } else if (ramo.classList.contains('bloqueado')) {
                    alert(`No puedes ingresar notas para "${ramo.textContent}" aún. Faltan prerrequisitos.`);
                }
                // Si no es open-grade-modal y no es modo tachar, simplemente no hace nada al hacer clic
            }
        });
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
    // const openGradeModalRamos = document.querySelectorAll('.open-grade-modal'); // Ya no se usa directamente aquí

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
        'introduccion-fisica-clasica': { // Configuración para Física Clásica (3 controles + 1 ejercicios)
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
        },
        // --- Ramos con 3 Controles y Examen (sin WIMS) ---
        'algebra-lineal': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
        },
        'calculo-diferencial-integral': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
        },
        'introduccion-fisica-moderna': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
        },
        'introduccion-programacion': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
        },
        'calculo-varias-variables': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
        },
        'ecuaciones-diferenciales-ordinarias': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
        },
        'mecanica': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
        },
        'metodos-experimentales': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
        },
        'quimica': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
        },
        'economia': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
        },
        'calculo-avanzado-aplicaciones': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
        },
        'electromagnetismo': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
        },
        'modulo-interdisciplinario': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
        },
        'termodinamica': {
            minApproval: 3.95, minEximicion: 5.45,
            evaluations: [{ name: 'Control 1', type: 'control' }, { name: 'Control 2', type: 'control' }, { name: 'Control 3', type: 'control' }],
            examenWeight: 0.40, controlsWeight: 0.60
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
        const hasWims = ramoConfig.hasOwnProperty('wimsWeight');
        const wimsSection = wimsGradeInput.parentElement;
        
        if (!hasWims) {
            wimsSection.style.display = 'none'; // Oculta la sección de WIMS si el ramo no tiene wimsWeight
            wimsGradeInput.value = ''; // Limpia el valor por si acaso
        } else {
            wimsSection.style.display = 'block'; // Asegura que se muestra para ramos con WIMS
            if (savedGrades.wims) {
                wimsGradeInput.value = savedGrades.wims;
            } else {
                wimsGradeInput.value = '';
            }
        }
        
        // Lógica para ocultar/mostrar los resultados de notas finales
        if (!hasWims) { // Si el ramo no tiene WIMS, solo mostrar la nota final genérica
            finalGradeCombinedContainer.style.display = 'block';
            finalGradeNoWimsContainer.style.display = 'none';
            finalGradeWimsContainer.style.display = 'none';
        } else { // Si el ramo tiene WIMS, mostrar las dos versiones (con/sin WIMS)
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
        let averageForEximicion = null; // Promedio para decidir eximición (controles o controles+ejercicios)
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

        // Solo obtener y guardar WIMS si el ramo tiene wimsWeight en su configuración
        let wimsGrade = NaN; // Inicializar wimsGrade como NaN por defecto
        if (ramoConfig.hasOwnProperty('wimsWeight')) {
            wimsGrade = parseFloat(wimsGradeInput.value);
            if (!isNaN(wimsGrade) && wimsGrade >= 1.0 && wimsGrade <= 7.0) {
                grades.wims = wimsGrade;
            } else {
                grades.wims = '';
            }
        } else {
            grades.wims = ''; // Asegura que no se guarde WIMS para ramos sin wimsWeight
        }

        const examenGrade = parseFloat(examenGradeInput.value);
        if (!isNaN(examenGrade) && examenGrade >= 1.0 && examenGrade <= 7.0) {
            grades.examen = examenGrade;
        } else {
            grades.examen = '';
        }

        // --- Calcular promedio de evaluaciones según el ramo ---
        const expectedControls = ramoConfig.evaluations.filter(e => e.type === 'control').length;
        const expectedEjercicios = ramoConfig.evaluations.filter(e => e.type === 'ejercicios').length;

        if (currentRamoId === 'introduccion-fisica-clasica') {
            // Para Física Clásica, el promedio de eximición es (Controles + Ejercicios)
            if (validControlsCount === expectedControls && validEjerciciosCount === expectedEjercicios) {
                averageForEximicion = roundToNearestDecimal((sumControls + sumEjercicios) / (expectedControls + expectedEjercicios));
            } else {
                averageForEximicion = null;
            }
            avgControlsSpan.textContent = averageForEximicion !== null ? averageForEximicion.toFixed(1) : 'N/A';
        } else if (expectedControls === 3 && expectedEjercicios === 0) { // Ramos con solo 3 controles
            if (validControlsCount === 3) {
                averageForEximicion = roundToNearestDecimal(sumControls / 3);
            } else {
                averageForEximicion = null;
            }
            avgControlsSpan.textContent = averageForEximicion !== null ? averageForEximicion.toFixed(1) : 'N/A';
        } else if (expectedControls === 6 && expectedEjercicios === 0) { // Ramos con 6 controles (Cálculo, Álgebra)
            if (validControlsCount === 6) {
                averageForEximicion = roundToNearestDecimal(sumControls / 6);
            } else {
                averageForEximicion = null;
            }
            avgControlsSpan.textContent = averageForEximicion !== null ? averageForEximicion.toFixed(1) : 'N/A';
        } else {
             // Fallback genérico si hay otra configuración no esperada
            if (validEvaluationCount === ramoConfig.evaluations.length) {
                averageForEximicion = roundToNearestDecimal(sumControls / validControlsCount); // Asume solo controles si no hay ejercicios
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

        // Contar el total de evaluaciones esperadas
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

        // Aplicar lógica WIMS solo si el ramo tiene wimsWeight en su configuración
        let finalGradeWithWims = finalGrade;
        if (ramoConfig.hasOwnProperty('wimsWeight') && finalGrade !== null && !isNaN(wimsGrade) && wimsGrade >= ramoConfig.minApproval && finalGrade >= ramoConfig.minApproval) {
            // Si el ramo y WIMS están aprobados
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
            // Mensaje específico para ramos sin WIMS si se ingresó un WIMS (aunque el input esté oculto)
            wimsInfoP.textContent = 'WIMS no aplica para este ramo.';
        } else {
            wimsInfoP.textContent = ''; // Limpia el mensaje si no hay WIMS o no aplica
        }

        // Asignar los valores a los spans de resultados
        if (!ramoConfig.hasOwnProperty('wimsWeight')) { // Si el ramo no tiene WIMS
            finalGradeDisplaySpan.textContent = finalGrade !== null ? finalGrade.toFixed(1) : 'N/A';
        } else { // Si el ramo tiene WIMS
            finalGradeDisplaySpan.textContent = 'N/A'; // Oculta esta línea cuando se usan los de WIMS
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
