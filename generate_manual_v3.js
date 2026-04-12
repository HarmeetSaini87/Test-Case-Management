const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, Spacing } = require('docx');

const IMG_DIR = 'C:/Users/harmeet.saini/.gemini/antigravity/brain/2e79a59e-5408-478b-8e72-37573dcc5715/';
const OUTPUT_FILE = 'e:/AI Agent/Bankai/Bankai_User_Manual_Detailed.docx';

const images = {
    dashboard: 'panamax_dashboard_mockup_1775964669325.png',
    repository: 'panamax_testcase_management_mockup_1775964682295.png',
    editor: 'panamax_testcase_editor_mockup_1775964700254.png',
    import: 'panamax_import_module_mockup_1775964714621.png'
};

function createTableCell(text, isHeader = false) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text, bold: isHeader, color: isHeader ? "FFFFFF" : "333333", size: 22 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 }
        })],
        shading: isHeader ? { fill: "1B5E20", type: "solid", color: "1B5E20" } : undefined,
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
        }
    });
}

function createImageParagraph(imgName, width = 520, height = 290) {
    const imgPath = path.join(IMG_DIR, imgName);
    if (!fs.existsSync(imgPath)) {
        return new Paragraph({ children: [new TextRun({ text: '[Reference Image: ' + imgName + ']', color: '888888', italic: true })], alignment: AlignmentType.CENTER });
    }
    return new Paragraph({
        children: [
            new ImageRun({
                data: fs.readFileSync(imgPath),
                transformation: { width, height },
            }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
    });
}

function createBullet(text) {
    return new Paragraph({
        text,
        bullet: { level: 0 },
        spacing: { before: 100 }
    });
}

async function generate() {
    const doc = new Document({
        title: "Panamax User Manual",
        description: "Comprehensive Guide for Panamax QA Platform",
        sections: [{
            properties: {
                page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
            },
            children: [
                // COVER PAGE
                new Paragraph({ text: "PANAMAX", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { before: 2000 } }),
                new Paragraph({ children: [new TextRun({ text: "Enterprise Test Management & Analytics Platform", size: 28, color: "666666" })], alignment: AlignmentType.CENTER, spacing: { after: 1000 } }),
                new Paragraph({ children: [new TextRun({ text: "Official User Manual · v2.0", bold: true, size: 24 })], alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "Issued: April 2026", alignment: AlignmentType.CENTER, spacing: { after: 4000 } }),

                // 1. INTRODUCTION
                new Paragraph({ text: "1. Platform Overview", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
                new Paragraph({ text: "Panamax is a high-performance QA Agent Platform designed to unify test case design, execution analytics, and repository management. The platform is built on a project-centric architecture, ensuring that every piece of data is contextualized and actionable.", spacing: { before: 200, after: 200 } }),
                new Paragraph({ children: [new TextRun({ text: "The Golden Rule: ", bold: true, color: "C62828" }), new TextRun({ text: "Always select an Active Project from the Top Navigation Bar to enable data visibility across all modules." })], spacing: { after: 400 } }),

                // 2. DASHBOARD
                new Paragraph({ text: "2. Interactive Dashboard", heading: HeadingLevel.HEADING_1 }),
                new Paragraph({ text: "The Dashboard serves as the command center, providing real-time visibility into quality metrics and team performance.", spacing: { after: 200 } }),
                createImageParagraph(images.dashboard),
                new Paragraph({ text: "Key Interaction Features:", bold: true, spacing: { before: 200 } }),
                createBullet("Summary Tiles: Instant Pass/Fail/Blocked counts for the selected project."),
                createBullet("Author Performance: Track which contributors are most active in repository development."),
                createBullet("Execution Trends: Visualize pass rate shifts across time to identify regressions."),
                createBullet("Interactive Drill-Down: Click any chart segment to automatically filter the results table below for surgical root-cause analysis."),

                // 3. TEST REPOSITORY
                new Paragraph({ text: "3. Test Case Repository", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
                new Paragraph({ text: "Manage, search, and organize your test assets with enterprise-grade filtering tools.", spacing: { after: 200 } }),
                createImageParagraph(images.repository),
                new Paragraph({ text: "Repository Action Logic:", bold: true, spacing: { before: 200 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [createTableCell("Action", true), createTableCell("Platform Behavior", true)] }),
                        new TableRow({ children: [createTableCell("Create New"), createTableCell("Redirects to focused editor for fresh drafting.")] }),
                        new TableRow({ children: [createTableCell("Export"), createTableCell("Generates 'Grouped' Excel files suitable for multi-step scenarios.")] }),
                        new TableRow({ children: [createTableCell("Edit"), createTableCell("Navigates to the ID-specific full-page editor.")] }),
                        new TableRow({ children: [createTableCell("Delete"), createTableCell("Permanent deletion of the test asset with cascading cleanup.")] }),
                    ],
                }),

                // 4. EDITOR
                new Paragraph({ text: "4. Full-Page Test Case Editor", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
                new Paragraph({ text: "Draft professional test cases with intelligent validation and cascading classification.", spacing: { after: 200 } }),
                createImageParagraph(images.editor),
                new Paragraph({ text: "Essential Drafting Rules:", bold: true, spacing: { before: 200 } }),
                createBullet("Cascading Dropdowns: Module selection filters Sub-Module, which in turn filters Entity."),
                createBullet("Mandatory Steps: The platform blocks saves if the test script is empty."),
                createBullet("Version Tagging: Link tests to multiple release versions using the badge system."),
                createBullet("Auto-Pruning: Empty step rows are automatically removed on save to maintain data integrity."),

                // 5. BULK OPS
                new Paragraph({ text: "5. Bulk Import & Data Migration", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
                new Paragraph({ text: "Migrate thousands of test cases from Excel or CSV within minutes.", spacing: { after: 200 } }),
                createImageParagraph(images.import),
                new Paragraph({ text: "Import Workflow:", bold: true }),
                createBullet("1. Download Sample: Use the official template to ensure header alignment."),
                createBullet("2. Map Context: Assign your import to a specific Project and Sprint."),
                createBullet("3. Validation: The system pre-scans for invalid classification values before committing."),

                // 6. CONCLUSION
                new Paragraph({ text: "6. Administration & Audit", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
                new Paragraph({ text: "Administrators have full control over the platform's metadata and governance:", spacing: { after: 200 } }),
                createBullet("Project/Module Tree Definition."),
                createBullet("Custom Test Categories and Intents Management."),
                createBullet("User Role Management (Admin, Tester, Viewer)."),
                createBullet("System Audit logs for change tracking."),

                new Paragraph({ text: "\n\n\n\nGenerated by Antigravity AI for Panamax.", alignment: AlignmentType.CENTER, spacing: { before: 2000 } }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(OUTPUT_FILE, buffer);
    console.log('Detailed User Manual generated successfully at: ' + OUTPUT_FILE);
}

generate().catch(err => {
    console.error("Error generating detailed manual:", err);
    process.exit(1);
});
