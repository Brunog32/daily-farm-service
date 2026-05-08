import ExcelJS from 'exceljs';
import { CHECKLIST_SECTIONS } from '../constants/checklists';

/**
 * Genera un archivo XLSX robusto con múltiples hojas desde los datos del service.
 * Asegura que todas las secciones del sistema estén presentes como hojas, incluso si están vacías.
 * 
 * @param {Object} serviceData - Datos completos del service.
 * @param {Array} allChecklists - (Opcional) Listado de plantillas desde la base de datos.
 * @param {String} resolvedOperatorName - (Opcional) Nombre del operador ya resuelto (ej. nombre completo).
 */
/**
 * Genera el archivo workbook instanciado de ExcelJS
 * @param {Object} serviceData
 * @param {Array} allChecklists
 * @param {String} resolvedOperatorName
 * @returns {Workbook}
 */
const generateServiceWorkbook = (serviceData, allChecklists = null, resolvedOperatorName = null, tamboSpecs = null) => {
    const workbook = new ExcelJS.Workbook();
    const summarySheet = workbook.addWorksheet('RESUMEN GENERAL');

    const displayOperator = resolvedOperatorName || serviceData.operator;

    // Determinar el set de secciones a exportar. 
    // Si se pasan las de la BD se usan esas, de lo contrario las constantes.
    let sectionsToExport = [];
    if (allChecklists && allChecklists.length > 0) {
        sectionsToExport = allChecklists;
    } else {
        sectionsToExport = [
            ...CHECKLIST_SECTIONS.PRE_SERVICE.map(s => ({ ...s, group: 'PRE_SERVICE' })),
            ...CHECKLIST_SECTIONS.FIELD_SERVICE.map(s => ({ ...s, group: 'FIELD_SERVICE' })),
            ...CHECKLIST_SECTIONS.URGENCIAS.map(s => ({ ...s, group: 'URGENCIAS' }))
        ];
    }

    // Símbolos de estado
    const getStatusSymbol = (val) => {
        if (val === 'ok') return { text: 'V', color: 'FF10B981' };
        if (val === 'fail') return { text: 'X', color: 'FFEF4444' };
        if (val === 'na') return { text: '-', color: 'FF64748B' };
        return { text: val !== undefined && val !== null ? val.toString() : '', color: 'FF111111' };
    };

    // --- HOJA DE RESUMEN ---
    summarySheet.mergeCells('A1:C1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'OJ SERVICE - REPORTE TÉCNICO';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    summarySheet.addRow([]);
    summarySheet.addRow(['ESTABLECIMIENTO:', serviceData.tamboName]);
    summarySheet.addRow(['OPERADOR:', displayOperator]);
    summarySheet.addRow(['FECHA:', serviceData.date]);
    summarySheet.addRow(['ID REPORTE:', serviceData.id]);
    summarySheet.addRow(['HORA INICIO:', serviceData.startTime]);
    summarySheet.addRow(['HORA FIN:', serviceData.endTime || '-']);
    summarySheet.addRow([]);

    summarySheet.addRow(['PROTOCOLOS INCLUIDOS EN ESTE ARCHIVO:']).font = { bold: true };

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
    const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true };

    // --- GENERAR TODAS LAS HOJAS (SOLO SI TIENEN DATOS) ---
    for (const sectionInfo of sectionsToExport) {
        const sectionId = sectionInfo.id;
        const sectionTitle = sectionInfo.title;
        const responses = (serviceData.sections && serviceData.sections[sectionId]) || {};

        // Solo generar hoja si hay respuestas (incluyendo extras)
        const hasResponses = Object.entries(responses).some(([key, val]) => {
            if (key === '_extras') return Array.isArray(val) && val.length > 0;
            return val !== undefined && val !== null && val !== '';
        });
        if (!hasResponses) continue;

        // Nombre de hoja (Excel manual: max 31 chars, no chars especiales)
        const safeSheetName = sectionTitle.replace(/[:\\/?*[\]]/g, '').substring(0, 31).toUpperCase();
        const sectionSheet = workbook.addWorksheet(safeSheetName);

        // Encabezado de la hoja
        sectionSheet.mergeCells('A1:C1');
        const sTitle = sectionSheet.getCell('A1');
        sTitle.value = `PROTOCOLO: ${sectionTitle.toUpperCase()}`;
        sTitle.font = { bold: true, size: 14 };
        sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

        sectionSheet.addRow([]);

        // Cabecera de tabla
        const hRow = sectionSheet.addRow(['#', 'ÍTEM DE CONTROL / VERIFICACIÓN', 'VALOR PLANILLA', 'ESTADO / VALOR']);
        hRow.eachCell(cell => {
            cell.fill = headerFill;
            cell.font = headerFont;
            cell.alignment = { horizontal: 'center' };
        });

        // Filas de ítems
        const isMateriales = sectionId === 'materiales';

        // Resuelve el valor de planilla para ítems dinámicos
        const resolveSpecValue = (item, textFallback) => {
            const specKey = typeof item === 'object' && item !== null ? item.specKey : null;
            if (!specKey) return null;
            if (tamboSpecs && tamboSpecs[specKey] && String(tamboSpecs[specKey]).trim()) {
                return String(tamboSpecs[specKey]).trim();
            }
            return textFallback || null;
        };

        if (sectionInfo.items) {
            let itemCounter = 0;
            sectionInfo.items.forEach((item, index) => {
                const label = typeof item === 'string' ? item : item.name;
                const isDynamic = typeof item === 'object' && item !== null && !!item.specKey;
                const isSubsection = (typeof item === 'object' && item !== null && item.subsection === true)
                    || (typeof item === 'string' && item.trim().endsWith(':'));

                if (isSubsection) {
                    const displayLabel = label.trim().endsWith(':') ? label.trim() : `${label.trim()}:`;

                    // Subsección dinámica: tiene status propio (ok/fail/na) — exportar como ítem checkeable
                    if (isDynamic) {
                        itemCounter++;
                        const val = responses[index];
                        const textVal = responses[`${index}_text`];
                        const specVal = resolveSpecValue(item, textVal);
                        const symbol = getStatusSymbol(val);
                        const dRow = sectionSheet.addRow([itemCounter, displayLabel.toUpperCase(), specVal || '', symbol.text]);
                        dRow.getCell(2).font = { bold: true, size: 10 };
                        dRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                        dRow.getCell(3).font = { bold: true, color: { argb: 'FF92400E' } };
                        dRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCE8' } };
                        dRow.getCell(3).alignment = { horizontal: 'center' };
                        dRow.getCell(4).alignment = { horizontal: 'center' };
                        dRow.getCell(4).font = { bold: true, color: { argb: symbol.color } };
                        dRow.eachCell(cell => {
                            cell.border = { bottom: { style: 'thin', color: { argb: 'FFF0F0F0' } } };
                        });
                        return;
                    }

                    // Subsección estática: es un header de sección
                    const subRow = sectionSheet.addRow(['', displayLabel.toUpperCase(), '', '']);
                    subRow.eachCell(cell => {
                        cell.font = { bold: true, size: 10, color: { argb: 'FF334155' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                        cell.alignment = { vertical: 'middle' };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                        };
                    });
                    subRow.height = 25;

                    // ÚNICA OPCIÓN: subsección estática sin ítems hijos
                    const nextItem = sectionInfo.items[index + 1];
                    const isNextSubsection = !nextItem
                        || (typeof nextItem === 'object' && nextItem !== null && nextItem.subsection === true)
                        || (typeof nextItem === 'string' && nextItem.trim().endsWith(':'));

                    if (isNextSubsection) {
                        const val = responses[index];
                        const symbol = getStatusSymbol(val !== undefined && val !== null && val !== '' ? val : '');
                        const dRow = sectionSheet.addRow(['!', 'ÚNICA OPCIÓN', '', symbol.text]);
                        dRow.getCell(4).alignment = { horizontal: 'center' };
                        dRow.getCell(4).font = { bold: true, color: { argb: symbol.color } };
                        dRow.eachCell(cell => {
                            cell.border = { bottom: { style: 'thin', color: { argb: 'FFF0F0F0' } } };
                        });
                    }
                    return;
                }

                itemCounter++;

                const val = responses[index];
                const textVal = responses[`${index}_text`];
                const specVal = resolveSpecValue(item, textVal);
                const symbol = getStatusSymbol(val);

                const dRow = sectionSheet.addRow([itemCounter, label, specVal || '', symbol.text]);

                if (specVal) {
                    dRow.getCell(3).font = { bold: true, color: { argb: 'FF92400E' } };
                    dRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCE8' } };
                    dRow.getCell(3).alignment = { horizontal: 'center' };
                }
                dRow.getCell(4).alignment = { horizontal: 'center' };
                dRow.getCell(4).font = { bold: true, color: { argb: symbol.color } };

                dRow.eachCell(cell => {
                    cell.border = { bottom: { style: 'thin', color: { argb: 'FFF0F0F0' } } };
                });
            });
        }

        // Ítems extra agregados por el operador
        const extras = responses._extras || [];
        if (extras.length > 0) {
            const extraHeaderRow = sectionSheet.addRow(['', 'ÍTEMS AGREGADOS EN CAMPO', '', '']);
            extraHeaderRow.eachCell(cell => {
                cell.font = { bold: true, size: 10, color: { argb: 'FF166534' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
                cell.alignment = { vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF86EFAC' } },
                    bottom: { style: 'thin', color: { argb: 'FF86EFAC' } }
                };
            });
            extraHeaderRow.height = 22;

            extras.forEach((extra, i) => {
                const extraVal = isMateriales
                    ? (extra.qty != null && extra.qty !== 0 ? String(extra.qty) : '0')
                    : (extra.status ? getStatusSymbol(extra.status).text : '');
                const extraColor = isMateriales ? 'FF111111' : getStatusSymbol(extra.status).color;
                const dRow = sectionSheet.addRow([`+${i + 1}`, extra.text || '', '', extraVal]);
                dRow.getCell(4).alignment = { horizontal: 'center' };
                dRow.getCell(4).font = { bold: true, color: { argb: extraColor } };
                dRow.getCell(2).font = { italic: true, color: { argb: 'FF166534' } };
                dRow.eachCell(cell => {
                    cell.border = { bottom: { style: 'thin', color: { argb: 'FFBBF7D0' } } };
                });
            });
        }

        // Configuración de anchos
        sectionSheet.getColumn(1).width = 6;
        sectionSheet.getColumn(2).width = 55;
        sectionSheet.getColumn(3).width = 22;
        sectionSheet.getColumn(4).width = 18;

        // Agregar entrada en el resumen
        const isDone = Object.keys(responses).length > 0;
        summarySheet.addRow([`• ${sectionTitle.toUpperCase()}`, isDone ? '(COMPLETADO)' : '(SIN DATOS)']);
    }

    return workbook;
};

/**
 * Genera y descarga directamente un archivo XLSX desde los datos del service.
 */
export const exportServiceToExcel = async (serviceData, allChecklists = null, resolvedOperatorName = null, tamboSpecs = null) => {
    const workbook = generateServiceWorkbook(serviceData, allChecklists, resolvedOperatorName, tamboSpecs);

    // --- DESCARGA / COMPARTIR ---
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `Reporte_${serviceData.tamboName.replace(/\s+/g, '_')}_${serviceData.date.replace(/\//g, '-')}.xlsx`;

    // 1. Usar Web Share API nativa si está disponible (Salva la PWA en iOS/Android de trabarse)
    // El a.click() en celulares rompe el event loop de React y Firebase se desconecta!
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && navigator.share && navigator.canShare) {
        try {
            const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Reporte Técnico OJ Service',
                    text: `Service de Tambo: ${serviceData.tamboName} - Operador: ${resolvedOperatorName || serviceData.operator}`
                });
                return; // Si abre el Share Sheet nativo, salimos para no hacer trigger del HTML tag
            }
        } catch (err) {
            console.log('Error o cancelación en el Share nativo:', err);
            // En caso de error en mobile, igual intentamos el fallback por si acaso
        }
    }

    // 2. Fallback clásico para Desktop
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.setAttribute('download', fileName);

    document.body.appendChild(anchor);
    setTimeout(() => {
        anchor.click();
        setTimeout(() => {
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(url);
        }, 1000);
    }, 0);
};

/**
 * Genera y codifica en Base64 el archivo Excel para subir a Drive u otra API.
 */
export const getServiceExcelBase64 = async (serviceData, allChecklists = null, resolvedOperatorName = null, tamboSpecs = null) => {
    const workbook = generateServiceWorkbook(serviceData, allChecklists, resolvedOperatorName, tamboSpecs);
    const buffer = await workbook.xlsx.writeBuffer();

    // Convert ArrayBuffer to Base64
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = window.btoa(binary);

    return {
        filename: `Reporte_${serviceData.tamboName.replace(/\s+/g, '_')}_${serviceData.date.replace(/\//g, '-')}.xlsx`,
        base64: base64
    };
};
