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
const generateServiceWorkbook = (serviceData, allChecklists = null, resolvedOperatorName = null) => {
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
            ...CHECKLIST_SECTIONS.FIELD_SERVICE.map(s => ({ ...s, group: 'FIELD_SERVICE' }))
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

    // --- GENERAR TODAS LAS HOJAS (COMPLETADAS O NO) ---
    for (const sectionInfo of sectionsToExport) {
        const sectionId = sectionInfo.id;
        const sectionTitle = sectionInfo.title;
        const responses = (serviceData.sections && serviceData.sections[sectionId]) || {};

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
        const hRow = sectionSheet.addRow(['#', 'ÍTEM DE CONTROL / VERIFICACIÓN', 'ESTADO / VALOR']);
        hRow.eachCell(cell => {
            cell.fill = headerFill;
            cell.font = headerFont;
            cell.alignment = { horizontal: 'center' };
        });

        // Filas de ítems
        if (sectionInfo.items) {
            let itemCounter = 0;
            sectionInfo.items.forEach((item, index) => {
                const label = typeof item === 'string' ? item : item.name;
                const isMaterialStyle = sectionInfo.group === 'MATERIALS' || sectionId === 'materiales' || sectionTitle.includes('Materiales');
                const isSubsection = typeof item === 'string' && (isMaterialStyle || item.trim().endsWith(':'));

                if (isSubsection) {
                    const displayLabel = label.trim().endsWith(':') ? label : `${label.trim()}:`;
                    const subRow = sectionSheet.addRow(['', displayLabel.toUpperCase(), '']);
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

                    // Lógica UNICA OPCIÓN: Si la sección está vacía, mostramos la fila para que la cabecera no quede colgada
                    const nextItem = sectionInfo.items[index + 1];
                    const isNextSubsection = !nextItem || (typeof nextItem === 'string' && (isMaterialStyle || nextItem.trim().endsWith(':')));

                    if (isNextSubsection) {
                        let finalVal = responses[index];
                        if (finalVal === undefined || finalVal === null || finalVal === '') {
                            finalVal = isMaterialStyle ? '0' : '';
                        }

                        const symbol = getStatusSymbol(finalVal);
                        const dRow = sectionSheet.addRow(['!', 'UNICA OPCIÓN', symbol.text]);
                        const statusCell = dRow.getCell(3);
                        statusCell.alignment = { horizontal: 'center' };
                        statusCell.font = { bold: true, color: { argb: symbol.color } };
                        dRow.eachCell(cell => {
                            cell.border = { bottom: { style: 'thin', color: { argb: 'FFF0F0F0' } } };
                        });
                    }
                    return;
                }

                itemCounter++;

                const val = responses[index];
                const symbol = getStatusSymbol(val);

                const dRow = sectionSheet.addRow([itemCounter, label, symbol.text]);

                // Estilo especial para la columna de estado
                const statusCell = dRow.getCell(3);
                statusCell.alignment = { horizontal: 'center' };
                statusCell.font = { bold: true, color: { argb: symbol.color } };

                // Bordes suaves
                dRow.eachCell(cell => {
                    cell.border = { bottom: { style: 'thin', color: { argb: 'FFF0F0F0' } } };
                });
            });
        }

        // Configuración de anchos
        sectionSheet.getColumn(1).width = 6;
        sectionSheet.getColumn(2).width = 65;
        sectionSheet.getColumn(3).width = 20;

        // Agregar entrada en el resumen
        const isDone = Object.keys(responses).length > 0;
        summarySheet.addRow([`• ${sectionTitle.toUpperCase()}`, isDone ? '(COMPLETADO)' : '(SIN DATOS)']);
    }

    return workbook;
};

/**
 * Genera y descarga directamente un archivo XLSX desde los datos del service.
 */
export const exportServiceToExcel = async (serviceData, allChecklists = null, resolvedOperatorName = null) => {
    const workbook = generateServiceWorkbook(serviceData, allChecklists, resolvedOperatorName);

    // --- DESCARGA ---
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.setAttribute('download', `Reporte_${serviceData.tamboName.replace(/\s+/g, '_')}_${serviceData.date.replace(/\//g, '-')}.xlsx`);

    // Al usar PWA en mobile a veces el click() frena el de main thread de JS perdiendo callbacks y el render
    // Lo hacemos asíncrono para no trabar el main thread
    document.body.appendChild(anchor);
    setTimeout(() => {
        anchor.click();
        setTimeout(() => {
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(url);
        }, 1000); // Darle tiempo a procesar el blob
    }, 0);
};

/**
 * Genera y codifica en Base64 el archivo Excel para subir a Drive u otra API.
 */
export const getServiceExcelBase64 = async (serviceData, allChecklists = null, resolvedOperatorName = null) => {
    const workbook = generateServiceWorkbook(serviceData, allChecklists, resolvedOperatorName);
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
