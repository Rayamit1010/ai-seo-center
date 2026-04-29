import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import PptxGenJS from "pptxgenjs";
import {
  ENGINEERING_REVIEW,
  renderReviewHtml,
  renderReviewMarkdown,
  type CodeChangeExample,
} from "../lib/review/engineering-review-data";

const OUTPUT_DIR = path.join(process.cwd(), "docs", "reviews");
const BASE_NAME = `seo-command-center-engineering-review-${ENGINEERING_REVIEW.generatedOn}`;

function createCodeBlock(text: string) {
  return text.split("\n").map(
    (line) =>
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: line || " ",
            font: "Courier New",
            size: 20,
          }),
        ],
      })
  );
}

function createBulletList(items: string[]) {
  return items.map(
    (item) =>
      new Paragraph({
        text: item,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
  );
}

function createCodeChangeSection(change: CodeChangeExample) {
  return [
    new Paragraph({
      text: change.title,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 180, after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Context: ${change.context}` })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      text: "Before",
      heading: HeadingLevel.HEADING_4,
    }),
    ...createCodeBlock(change.before),
    new Paragraph({
      text: "After",
      heading: HeadingLevel.HEADING_4,
    }),
    ...createCodeBlock(change.after),
    new Paragraph({
      children: [new TextRun({ text: `Outcome: ${change.outcome}` })],
      spacing: { after: 160 },
    }),
  ];
}

async function writeDocx(filePath: string) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: ENGINEERING_REVIEW.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: ENGINEERING_REVIEW.subtitle,
            alignment: AlignmentType.CENTER,
            spacing: { after: 220 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on: ${ENGINEERING_REVIEW.generatedOn}`,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Repository root: ${ENGINEERING_REVIEW.repositoryRoot}`,
                bold: true,
              }),
            ],
            spacing: { after: 220 },
          }),
          new Paragraph({
            text: "1. Project Understanding",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: ENGINEERING_REVIEW.projectPurpose,
            spacing: { after: 120 },
          }),
          new Paragraph({
            text: "How the system currently works",
            heading: HeadingLevel.HEADING_2,
          }),
          ...createBulletList(ENGINEERING_REVIEW.currentFlow),
          new Paragraph({
            text: "Tech stack",
            heading: HeadingLevel.HEADING_2,
          }),
          ...createBulletList(ENGINEERING_REVIEW.techStack),
          new Paragraph({
            text: "Main modules",
            heading: HeadingLevel.HEADING_2,
          }),
          ...createBulletList(ENGINEERING_REVIEW.modules),
          new Paragraph({
            text: "2. Deep Code Review",
            heading: HeadingLevel.HEADING_1,
          }),
          ...ENGINEERING_REVIEW.findings.flatMap((finding, index) => [
            new Paragraph({
              text: `${index + 1}. ${finding.title}`,
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: `Severity: ${finding.severity}`,
              spacing: { after: 80 },
            }),
            new Paragraph({
              text: `Problem: ${finding.problem}`,
              spacing: { after: 80 },
            }),
            new Paragraph({
              text: `Why it matters: ${finding.whyItMatters}`,
              spacing: { after: 80 },
            }),
            new Paragraph({
              text: `Resolution: ${finding.resolution}`,
              spacing: { after: 80 },
            }),
            new Paragraph({
              text: `Impacted files: ${finding.impactedFiles.join(", ")}`,
              spacing: { after: 160 },
            }),
          ]),
          new Paragraph({
            text: "3. Error Fixing",
            heading: HeadingLevel.HEADING_1,
          }),
          ...ENGINEERING_REVIEW.codeChanges.flatMap(createCodeChangeSection),
          new Paragraph({
            text: "4. Functional Improvements Implemented",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "UI/UX",
            heading: HeadingLevel.HEADING_2,
          }),
          ...createBulletList(ENGINEERING_REVIEW.uiUxImprovements),
          new Paragraph({
            text: "Backend Logic",
            heading: HeadingLevel.HEADING_2,
          }),
          ...createBulletList(ENGINEERING_REVIEW.backendImprovements),
          new Paragraph({
            text: "Database and Query Layer",
            heading: HeadingLevel.HEADING_2,
          }),
          ...createBulletList(ENGINEERING_REVIEW.databaseImprovements),
          new Paragraph({
            text: "API Structure",
            heading: HeadingLevel.HEADING_2,
          }),
          ...createBulletList(ENGINEERING_REVIEW.apiImprovements),
          new Paragraph({
            text: "5. Feature Enhancements Implemented",
            heading: HeadingLevel.HEADING_1,
          }),
          ...createBulletList(ENGINEERING_REVIEW.featureEnhancements),
          new Paragraph({
            text: "6. Performance Optimization",
            heading: HeadingLevel.HEADING_1,
          }),
          ...createBulletList(ENGINEERING_REVIEW.performanceOptimizations),
          new Paragraph({
            text: "Important Database Indexes",
            heading: HeadingLevel.HEADING_2,
          }),
          ...createBulletList(ENGINEERING_REVIEW.databaseIndexes),
          new Paragraph({
            text: "7. Code Structure Improvement",
            heading: HeadingLevel.HEADING_1,
          }),
          ...createBulletList(ENGINEERING_REVIEW.structureImprovements),
          new Paragraph({
            text: "8. Final Summary",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "Fixes Applied",
            heading: HeadingLevel.HEADING_2,
          }),
          ...createBulletList(ENGINEERING_REVIEW.fixesApplied),
          new Paragraph({
            text: "Verification Completed",
            heading: HeadingLevel.HEADING_2,
          }),
          ...createBulletList(ENGINEERING_REVIEW.verification),
          new Paragraph({
            text: "Suggested Next Steps",
            heading: HeadingLevel.HEADING_2,
          }),
          ...createBulletList(ENGINEERING_REVIEW.nextSteps),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  await writeFile(filePath, buffer);
}

function addTextSlide(
  pptx: PptxGenJS,
  title: string,
  lines: string[],
  options?: { small?: boolean }
) {
  const slide = pptx.addSlide();
  slide.background = { color: "F6F8FC" };
  slide.addText(title, {
    x: 0.5,
    y: 0.35,
    w: 12.2,
    h: 0.5,
    fontFace: "Aptos Display",
    fontSize: 24,
    bold: true,
    color: "122033",
  });
  slide.addText(
    lines.map((line) => `• ${line}`).join("\n"),
    {
      x: 0.7,
      y: 1.1,
      w: 11.6,
      h: 5.7,
      fontFace: "Aptos",
      fontSize: options?.small ? 14 : 16,
      color: "334155",
      breakLine: false,
      margin: 0.1,
      valign: "top",
    }
  );
}

function addTitleSlide(pptx: PptxGenJS) {
  const slide = pptx.addSlide();
  slide.background = {
    color: "0F172A",
  };
  slide.addText(ENGINEERING_REVIEW.title, {
    x: 0.7,
    y: 1.1,
    w: 11.2,
    h: 0.9,
    fontFace: "Aptos Display",
    fontSize: 26,
    bold: true,
    color: "FFFFFF",
  });
  slide.addText(ENGINEERING_REVIEW.subtitle, {
    x: 0.7,
    y: 2.0,
    w: 10.8,
    h: 0.8,
    fontFace: "Aptos",
    fontSize: 16,
    color: "CBD5E1",
  });
  slide.addText(`Generated on ${ENGINEERING_REVIEW.generatedOn}`, {
    x: 0.7,
    y: 5.9,
    w: 4,
    h: 0.3,
    fontFace: "Aptos",
    fontSize: 12,
    color: "93C5FD",
  });
}

async function writePptx(filePath: string) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "OpenAI Codex";
  pptx.company = "TechGeekStudio";
  pptx.subject = "SEO Command Center engineering review";
  pptx.title = ENGINEERING_REVIEW.title;

  addTitleSlide(pptx);
  addTextSlide(pptx, "Project Purpose and Flow", [
    ENGINEERING_REVIEW.projectPurpose,
    ...ENGINEERING_REVIEW.currentFlow,
  ]);
  addTextSlide(pptx, "Tech Stack and Modules", [
    ...ENGINEERING_REVIEW.techStack,
    ...ENGINEERING_REVIEW.modules,
  ], { small: true });
  addTextSlide(
    pptx,
    "Top Issues Found",
    ENGINEERING_REVIEW.findings.map(
      (finding) => `${finding.severity}: ${finding.title} — ${finding.whyItMatters}`
    ),
    { small: true }
  );
  addTextSlide(pptx, "Security and Reliability Fixes", [
    ...ENGINEERING_REVIEW.fixesApplied.slice(0, 4),
    ...ENGINEERING_REVIEW.apiImprovements.slice(0, 2),
  ]);
  addTextSlide(pptx, "Functional and Feature Improvements", [
    ...ENGINEERING_REVIEW.uiUxImprovements.slice(0, 3),
    ...ENGINEERING_REVIEW.featureEnhancements,
  ]);
  addTextSlide(pptx, "Performance and Database Work", [
    ...ENGINEERING_REVIEW.performanceOptimizations,
    ...ENGINEERING_REVIEW.databaseIndexes.slice(0, 4),
  ], { small: true });
  addTextSlide(pptx, "Code Structure Improvements", [
    ...ENGINEERING_REVIEW.structureImprovements,
    ...ENGINEERING_REVIEW.backendImprovements.slice(0, 2),
  ]);
  addTextSlide(pptx, "Verification Completed", ENGINEERING_REVIEW.verification);
  addTextSlide(pptx, "Recommended Next Steps", ENGINEERING_REVIEW.nextSteps);

  await pptx.writeFile({ fileName: filePath });
}

async function writePdf(filePath: string, html: string) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "0.45in",
        right: "0.45in",
        bottom: "0.45in",
        left: "0.45in",
      },
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const markdown = renderReviewMarkdown(ENGINEERING_REVIEW);
  const html = renderReviewHtml(ENGINEERING_REVIEW);

  const markdownPath = path.join(OUTPUT_DIR, `${BASE_NAME}.md`);
  const htmlPath = path.join(OUTPUT_DIR, `${BASE_NAME}.html`);
  const docxPath = path.join(OUTPUT_DIR, `${BASE_NAME}.docx`);
  const pdfPath = path.join(OUTPUT_DIR, `${BASE_NAME}.pdf`);
  const pptxPath = path.join(OUTPUT_DIR, `${BASE_NAME}.pptx`);

  await writeFile(markdownPath, markdown, "utf8");
  await writeFile(htmlPath, html, "utf8");
  await writeDocx(docxPath);
  await writePdf(pdfPath, html);
  await writePptx(pptxPath);

  const output = [
    markdownPath,
    htmlPath,
    docxPath,
    pdfPath,
    pptxPath,
  ];

  for (const item of output) {
    console.log(item);
  }
}

main().catch((error) => {
  console.error("Failed to generate engineering review artifacts:", error);
  process.exitCode = 1;
});
