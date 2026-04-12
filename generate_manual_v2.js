const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } = require('docx');

const IMG_DIR = 'C:/Users/harmeet.saini/.gemini/antigravity/brain/2e79a59e-5408-478b-8e72-37573dcc5715/';
const OUTPUT_FILE = 'e:/AI Agent/Bankai/Bankai_User_Manual.docx';

const images = {
    dashboard: 'panamax_dashboard_mockup_1775964669325.png',
    repository: 'panamax_testcase_management_mockup_1775964682295.png',
    editor: 'panamax_testcase_editor_mockup_1775964700254.png',
    import: 'panamax_import_module_mockup_1775964714621.png'
};

function createTableCell(text, isHeader = false) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text, bold: isHeader, color: isHeader ? "FFFFFF" : "000000" })],
            alignment: AlignmentType.CENTER,
        })],
        shading: isHeader ? { fill: "2E7D32", type: "solid", color: "2E7D32" } : undefined,
    });
}

function createImageParagraph(imgName, width = 500, height = 280) {
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
                new Paragraph({ text: "🚀 PANAMAX — Enterprise QA Agent Platform", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                new Paragraph({ text: "User Manual · v2.0 · April 2026", alignment: AlignmentType.CENTER, spacing: { after: 800 } }),

                new Paragraph({ text: "1. System Overview", heading: HeadingLevel.HEADING_2 }),
                new Paragraph({ text: "Panamax (formerly Bankai) is a premium QA Agent Platform designed to streamline test management, repository organization, and intelligence-driven reporting. It ensures centralized project management via a global project context." }),

                new Paragraph({ text: "2. Enterprise Dashboard", heading: HeadingLevel.HEADING_2 }),
                new Paragraph({ text: "The nerve center of your QA operations. The dashboard provides high-level visualization of project health, test coverage, and execution metrics." }),
                createImageParagraph(images.dashboard),

                new Paragraph({ text: "3. Test Case Repository", heading: HeadingLevel.HEADING_2 }),
                new Paragraph({ text: "Centralized management of your entire testing asset library. Search, filter, and organize test cases with precision." }),
                createImageParagraph(images.repository),

                new Paragraph({ text: "Repository Action Buttons:", heading: HeadingLevel.HEADING_3 }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                createTableCell("Button", true),
                                createTableCell("Action", true),
                                createTableCell("Purpose", true),
                            ],
                        }),
                        new TableRow({ children: [createTableCell("Create New"), createTableCell("Opens Full-Page Editor"), createTableCell("Initiates new test case creation")] }),
                        new TableRow({ children: [createTableCell("Export"), createTableCell("Generates Excel/CSV"), createTableCell("Downloads filtered list in Grouped Format")] }),
                        new TableRow({ children: [createTableCell("Edit"), createTableCell("Redirects to Editor"), createTableCell("Modify existing test case")] }),
                        new TableRow({ children: [createTableCell("Delete"), createTableCell("Permanent Removal"), createTableCell("Deletes the test case")] }),
                    ],
                }),

                new Paragraph({ text: "4. Full-Page Test Case Editor", heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }),
                new Paragraph({ text: "A focused environment for drafting test logic. Includes intelligent workflows like auto-pruning empty steps and dynamic classification filtering." }),
                createImageParagraph(images.editor),

                new Paragraph({ text: "5. Import Module", heading: HeadingLevel.HEADING_2 }),
                new Paragraph({ text: "Migrate existing test repositories via Excel or CSV. Supports multi-row step parsing and target project mapping." }),
                createImageParagraph(images.import),

                new Paragraph({ text: "6. Technical Administration", heading: HeadingLevel.HEADING_2 }),
                new Paragraph({ text: "Manage projects, suites, sprints, and audit logs via the Admin panel to maintain platform-wide governance." }),

                new Paragraph({ text: "\n\nGenerated by Antigravity AI for the Panamax Project.", alignment: AlignmentType.CENTER, spacing: { before: 800 } }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(OUTPUT_FILE, buffer);
    console.log('User Manual DOCX generated successfully at: ' + OUTPUT_FILE);
}

generate().catch(err => {
    console.error("Error generating manual DOCX:", err);
    process.exit(1);
});
