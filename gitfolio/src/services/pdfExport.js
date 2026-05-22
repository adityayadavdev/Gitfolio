import React from 'react';
import { createRoot } from 'react-dom/client';
import PDFPortfolioTemplate from '../components/PDF/PDFPortfolioTemplate';

async function exportPortfolioPDF(username, profile, languageScores, topProjects, metrics, template = 'minimal') {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '794px';
  container.style.backgroundColor = 'white';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    React.createElement(PDFPortfolioTemplate, {
      profile,
      languageScores,
      topProjects,
      metrics,
      template,
    })
  );

  await new Promise(resolve => setTimeout(resolve, 500));

  const { default: html2canvas } = await import('html2canvas');
  const { default: jsPDF } = await import('jspdf');

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#fff',
  });

  const imgData = canvas.toDataURL('image/jpeg', 1.0);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(imgData);
  const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
  heightLeft -= pdfHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  pdf.save(`${username}-portfolio.pdf`);

  root.unmount();
  document.body.removeChild(container);
}

export { exportPortfolioPDF };
