const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = require('docx');

const IMG_DIR = 'C:/Users/harmeet.saini/.gemini/antigravity/brain/686be8ea-4dc2-4c8a-b179-00599ab7ff12/';
const OUTPUT_FILE = path.join(IMG_DIR, 'Bankai_User_Manual.docx');

function createTableCell(text, isHeader = false) {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: isHeader })],
      alignment: AlignmentType.CENTER,
    })],
  });
}

function createImageParagraph(imgName, width = 600, height = 300) {
  const imgPath = path.join(IMG_DIR, imgName);
  if (!fs.existsSync(imgPath)) {
    console.error('Image not found:', imgPath);
    return new Paragraph({
      children: [new TextRun({ text: '[Image missing: ' + imgName + ']', color: 'FF0000' })]
    });
  }
  return new Paragraph({
    children: [
      new ImageRun({
        data: fs.readFileSync(imgPath),
        transformation: { width, height },
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
  });
}

async function generate() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: "BANKAI — Test Case Management Platform", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: "User Manual · v1.0 · March 2026", alignment: AlignmentType.CENTER, spacing: { after: 400 } }),

        new Paragraph({ text: "1. Introduction", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Bankai is an enterprise-grade, on-premises Manual Test Case Management System (TCMS) for professional QA teams. It is designed to be the single source of truth for all test case design, organization, and management activities — inspired by industry tools such as Jira Xray, TestRail, and Zephyr." }),

        new Paragraph({ text: "2. Dashboard Overview", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "The Dashboard provides a real-time overview of your entire test management state, showing project metrics and critical status updates." }),
        createImageParagraph('screenshot_dashboard_1774817620515.png'),

        new Paragraph({ text: "3. Project Management", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Projects are the top-level container for all test cases. Each project has a unique key that becomes the prefix for all auto-generated test case IDs." }),
        createImageParagraph('screenshot_projects_1774817629089.png'),

        new Paragraph({ text: "4. Test Repository", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "This is the core module for creating and maintaining test cases with full Jira Xray/TestRail field models." }),
        createImageParagraph('screenshot_testcases_1774817637074.png'),

        new Paragraph({ text: "5. Sprint Management", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Sprints represent time-boxed execution cycles. You can link test cases to specific sprints to track progress." }),
        createImageParagraph('screenshot_sprints_1774817658296.png'),

        new Paragraph({ text: "6. Bulk Import from Excel", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Bankai auto-detects column headers for your existing spreadsheets (RA format, Sprint format, etc.) and imports multi-row steps automatically." }),
        createImageParagraph('screenshot_import_1774817665384.png'),

        new Paragraph({ text: "7. User Administration", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Admin Ops allows full control over user accounts, roles (Admin/Tester/Viewer), and passwords." }),
        createImageParagraph('screenshot_admin_1774817675139.png'),

        new Paragraph({ text: "8. Requirement Coverage Matrix", heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createTableCell("Requirement", true),
                createTableCell("Status", true),
                createTableCell("Module", true),
              ],
            }),
            new TableRow({ children: [createTableCell("RBAC (Admin/Tester/Viewer)"), createTableCell("Live"), createTableCell("Admin Ops")] }),
            new TableRow({ children: [createTableCell("Projects & Modules"), createTableCell("Live"), createTableCell("Projects")] }),
            new TableRow({ children: [createTableCell("Test Case Management"), createTableCell("Live"), createTableCell("Repository")] }),
            new TableRow({ children: [createTableCell("Excel Bulk Import"), createTableCell("Live"), createTableCell("Import")] }),
            new TableRow({ children: [createTableCell("Sprint Tracking"), createTableCell("Live"), createTableCell("Sprints")] }),
            new TableRow({ children: [createTableCell("Dashboard Coverage Chart"), createTableCell("Live"), createTableCell("Dashboard")] }),
          ],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT_FILE, buffer);
  console.log('Manual generated successfully at: ' + OUTPUT_FILE);
}

generate().catch(err => {
  console.error("Error generating manual:", err);
  process.exit(1);
});
