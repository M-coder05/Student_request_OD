const fs = require('fs');
const path = require('path');
const generateBonafidePdf = require('../utils/bonafidePdf');

const main = async () => {
  const verificationCode = 'PDF-GENERATOR-TEST-CODE-6f4a19d3e2b7c8a05d1f6b9a';
  process.env.COLLEGE_NAME ||= 'North Valley Institute of Technology';
  process.env.SIGNATORY_NAME ||= 'Dr. Morgan Sample';
  process.env.SIGNATORY_TITLE ||= 'Principal';
  process.env.FRONTEND_URL = 'https://student-portal.example.test';
  const request = {
    studentName: 'Alexandra Test Student with an Extended Full Name',
    registerNumber: 'REGPDFTEST8201',
    department: 'Computer Science and Information Technology',
    year: '3',
    semester: '6',
    purpose: `PDF generator integration testing with an extended purpose to verify that longer content wraps or shrinks while staying within one A4 page. ${'Additional supporting purpose detail. '.repeat(24)}`,
    certificateNumber: 'BONA-2026-TEST-8201',
    verificationCode,
    issuedAt: new Date('2026-11-01T00:00:00.000Z'),
  };
  const outputPath = path.join(__dirname, '..', 'tmp', 'test-bonafide.pdf');
  const demoOutputPath = path.join(__dirname, '..', 'tmp', 'test-bonafide-demo.pdf');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const [pdf, demoPdf] = await Promise.all([
    generateBonafidePdf(request),
    generateBonafidePdf(request, { demo: true }),
  ]);
  fs.writeFileSync(outputPath, pdf);
  fs.writeFileSync(demoOutputPath, demoPdf);
  console.log(JSON.stringify({
    certificates: [
      { outputPath, size: pdf.length, demo: false },
      { outputPath: demoOutputPath, size: demoPdf.length, demo: true },
    ],
    expectedQrPayload: `${process.env.FRONTEND_URL}/verify/${verificationCode}`,
  }));
};

main().catch((error) => {
  console.error('PDF generator test failed:', error.message);
  process.exitCode = 1;
});
