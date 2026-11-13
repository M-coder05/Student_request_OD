const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { departmentFullName } = require('./departments');

const createPdfBuffer = (document) => new Promise((resolve, reject) => {
  const chunks = [];
  document.on('data', (chunk) => chunks.push(chunk));
  document.on('end', () => resolve(Buffer.concat(chunks)));
  document.on('error', reject);
  document.end();
});

const warnMissingCertificateSignatory = () => {
  if (!process.env.SIGNATORY_NAME?.trim() || !process.env.SIGNATORY_TITLE?.trim()) {
    console.warn('[certificates] SIGNATORY_NAME or SIGNATORY_TITLE is missing; certificates will use the title "Principal" without a name line.');
  }
};

const fitText = (doc, value, {
  x,
  y,
  width,
  height,
  font = 'Helvetica',
  maxSize = 12,
  minSize = 8,
  lineGap = 2,
  align = 'left',
}) => {
  const original = String(value ?? '').trim();
  const measure = (text, size) => {
    doc.font(font).fontSize(size);
    return doc.heightOfString(text, { width, lineGap });
  };
  let text = original;
  let fontSize = maxSize;

  while (fontSize > minSize && measure(text, fontSize) > height) {
    fontSize = Math.max(minSize, fontSize - 0.5);
  }

  if (measure(text, fontSize) > height) {
    let low = 0;
    let high = text.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (measure(`${text.slice(0, middle).trimEnd()}…`, fontSize) <= height) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    text = `${text.slice(0, low).trimEnd()}…`;
  }

  doc.font(font).fontSize(fontSize).text(text, x, y, {
    width,
    height,
    lineGap,
    align,
  });
};

const drawDetail = (doc, label, value, x, y, width) => {
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#52657c').text(label.toUpperCase(), x, y, { width });
  fitText(doc, value, {
    x,
    y: y + 13,
    width,
    height: 29,
    font: 'Helvetica',
    maxSize: 11,
    minSize: 7.5,
    lineGap: 1,
  });
};

const generateBonafidePdf = async (request, { demo = false } = {}) => {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const verificationUrl = !demo && request.verificationCode
    ? `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '')}/verify/${request.verificationCode}`
    : null;
  const qrBuffer = verificationUrl
    ? await QRCode.toBuffer(verificationUrl, { type: 'png', errorCorrectionLevel: 'M', width: 240, margin: 1 })
    : null;

  doc.rect(30, 30, pageWidth - 60, pageHeight - 60).lineWidth(1.4).strokeColor('#233b5c').stroke();
  doc.rect(38, 38, pageWidth - 76, pageHeight - 76).lineWidth(0.5).strokeColor('#28adbd').stroke();

  fitText(doc, process.env.COLLEGE_NAME || 'Your College Name', {
    x: 65,
    y: 66,
    width: pageWidth - 130,
    height: 36,
    font: 'Helvetica-Bold',
    maxSize: 27,
    minSize: 14,
    align: 'center',
  });
  doc.font('Helvetica').fontSize(9).fillColor('#52657c')
    .text('Smart Student Service Portal', 65, 106, { width: pageWidth - 130, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(21).fillColor('#182943')
    .text('BONAFIDE CERTIFICATE', 65, 151, { width: pageWidth - 130, align: 'center', characterSpacing: 0.8 });
  doc.moveTo(170, 186).lineTo(pageWidth - 170, 186).lineWidth(1).strokeColor('#28adbd').stroke();

  if (demo) {
    doc.save();
    doc.rotate(-25, { origin: [pageWidth / 2, 430] });
    doc.font('Helvetica-Bold').fontSize(42).fillColor('#d9e1eb')
      .text('DEMO - NOT VALID', 45, 414, { width: pageWidth - 90, align: 'center' });
    doc.restore();
  }

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#2459c7')
    .text('STUDENT DETAILS', 70, 207, { characterSpacing: 0.5 });
  const detailColumnWidth = (pageWidth - 164) / 2;
  const leftX = 82;
  const rightX = pageWidth / 2 + 5;
  drawDetail(doc, 'Student Name', request.studentName, leftX, 231, detailColumnWidth);
  drawDetail(doc, 'Register Number', request.registerNumber, rightX, 231, detailColumnWidth);
  drawDetail(doc, 'Department', departmentFullName(request.department), leftX, 283, detailColumnWidth);
  drawDetail(doc, 'Year', request.year, rightX, 283, detailColumnWidth);
  drawDetail(doc, 'Semester', request.semester, leftX, 335, detailColumnWidth);

  const purposeText = String(request.purpose || '').trim();
  const certificateText = `This is to certify that ${request.studentName || ''} is a bonafide student of the Department of ${departmentFullName(request.department) || ''}. This certificate is issued for the purpose of ${purposeText}.`;
  fitText(doc, certificateText, {
    x: 82,
    y: 385,
    width: pageWidth - 164,
    height: 240,
    font: 'Helvetica',
    maxSize: 13,
    minSize: 7,
    lineGap: 3,
  });

  const issuedDate = request.issuedAt ? new Date(request.issuedAt) : new Date();
  const issuedDateText = Number.isNaN(issuedDate.getTime())
    ? 'Not available'
    : new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(issuedDate);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#192b43')
    .text(`Issue date: ${issuedDateText}`, 82, 640, { width: 190 });
  if (!demo && request.certificateNumber) {
    doc.text(`Certificate No: ${request.certificateNumber}`, 300, 640, { width: 220 });
  }

  const signatureLineY = 710;
  const signatureLineX = pageWidth - 255;
  const signatureWidth = 170;
  doc.moveTo(signatureLineX, signatureLineY)
    .lineTo(signatureLineX + signatureWidth, signatureLineY)
    .lineWidth(0.8)
    .strokeColor('#52657c')
    .stroke();

  const signatoryName = process.env.SIGNATORY_NAME?.trim();
  const signatoryTitle = process.env.SIGNATORY_TITLE?.trim();
  const hasCompleteSignatory = Boolean(signatoryName && signatoryTitle);
  if (hasCompleteSignatory) {
    fitText(doc, signatoryName, {
      x: signatureLineX,
      y: signatureLineY + 9,
      width: signatureWidth,
      height: 19,
      font: 'Helvetica-Bold',
      maxSize: 11,
      minSize: 8,
      align: 'center',
    });
  }
  fitText(doc, hasCompleteSignatory ? signatoryTitle : 'Principal', {
    x: signatureLineX,
    y: signatureLineY + (hasCompleteSignatory ? 29 : 9),
    width: signatureWidth,
    height: 19,
    font: 'Helvetica',
    maxSize: 10,
    minSize: 8,
    align: 'center',
  });

  if (qrBuffer) {
    doc.image(qrBuffer, 78, 660, { width: 82, height: 82 });
    doc.font('Helvetica').fontSize(8).fillColor('#52657c')
      .text('Scan to verify', 68, 747, { width: 102, align: 'center' });
  } else if (demo) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#bb4652')
      .text('DEMO COPY — NOT AN OFFICIAL CERTIFICATE', 68, 747, { width: 260, align: 'left' });
  }

  return createPdfBuffer(doc);
};

generateBonafidePdf.warnMissingCertificateSignatory = warnMissingCertificateSignatory;

module.exports = generateBonafidePdf;
