import { jsPDF } from 'jspdf';
import { domToJpeg } from 'modern-screenshot';

export interface GeneratedContractPdf {
  blob: Blob;
  base64: string;
  fileName: string;
  pageCount: number;
}

export async function generateContractPdf(
  containerEl: HTMLElement,
  contractNumber: string
): Promise<GeneratedContractPdf> {
  const pageNodes = Array.from(
    containerEl.querySelectorAll<HTMLElement>('article.contract-a4-page')
  );
  if (pageNodes.length === 0) {
    throw new Error('No se encontraron páginas A4 para generar el PDF.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < pageNodes.length; i += 1) {
    const pageEl = pageNodes[i];
    const dataUrl = await domToJpeg(pageEl, {
      scale: 1.55,
      quality: 0.85,
      backgroundColor: '#ffffff',
    });
    if (i > 0) {
      doc.addPage('a4', 'portrait');
    }
    doc.addImage(dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  const blob = doc.output('blob');
  const dataUri = doc.output('datauristring');
  const commaIdx = dataUri.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : '';
  const safeNum = contractNumber.trim().replace(/[^A-Za-z0-9-]+/g, '_') || 'contrato';

  return {
    blob,
    base64,
    fileName: `Contrato_${safeNum}_firmado.pdf`,
    pageCount: pageNodes.length,
  };
}

export function triggerPdfDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
