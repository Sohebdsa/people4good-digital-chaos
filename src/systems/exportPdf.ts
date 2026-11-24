import { ASSESSMENT, ASSESSMENT_DISCLAIMER, categoryScore, isComplete, maturityLevel, overallScore } from '../data/assessment';
import { RISK_BY_ID } from '../data/risks';
import { useApp } from '../store/appStore';

/** Standard PDF fonts only cover WinAnsi; normalise typographic characters. */
const clean = (t: string) =>
  t
    .replace(/[–—]/g, '-')
    .replace(/·/g, '|')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\n]/g, '');

/** Builds the results PDF (self-assessment + workshop worksheets). jsPDF is lazy-loaded. */
export async function exportResultsPdf() {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableMod.default;
  const { assessment, workshop } = useApp.getState();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const ink: [number, number, number] = [20, 33, 61];
  const teal: [number, number, number] = [31, 181, 168];
  const sun: [number, number, number] = [255, 201, 60];
  let y = 0;

  // header band
  doc.setFillColor(...ink);
  doc.rect(0, 0, W, 96, 'F');
  doc.setFillColor(...sun);
  doc.rect(0, 96, W, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PEOPLE4GOOD AI LAB', M, 32);
  doc.setFontSize(22);
  doc.text('Digital Maturity Results', M, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const org = (assessment.orgName ?? '').trim() || 'Our organisation';
  doc.text(clean(`${org}  |  Generated ${new Date().toLocaleDateString()}`), M, 80);
  y = 128;

  const heading = (t: string) => {
    if (y > 740) {
      doc.addPage();
      y = 50;
    }
    doc.setTextColor(...ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(t, M, y);
    y += 8;
    doc.setDrawColor(...teal);
    doc.setLineWidth(2);
    doc.line(M, y, M + 60, y);
    y += 16;
  };
  const para = (t: string, size = 10, color: [number, number, number] = [60, 66, 84]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(clean(t), W - M * 2);
    if (y + lines.length * (size + 3) > 800) {
      doc.addPage();
      y = 50;
    }
    doc.text(lines, M, y);
    y += lines.length * (size + 3) + 6;
  };
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // assessment
  if (isComplete(assessment.answers)) {
    const overall = overallScore(assessment.answers);
    const lvl = maturityLevel(overall);
    heading('Digital maturity self-assessment');
    para(`Overall score: ${overall}/100 — ${lvl.name}. ${lvl.description}`, 11, ink);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Area', 'Weight', 'Score']],
      body: ASSESSMENT.map((c) => [c.name, `${c.weight}%`, `${categoryScore(assessment.answers, c.id)}%`]),
      headStyles: { fillColor: ink },
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: 'center', cellWidth: 70 }, 2: { halign: 'center', cellWidth: 70 } },
    });
    y = lastY() + 14;
    if (assessment.focus.length) para(`Priority areas chosen: ${assessment.focus.map((f) => ASSESSMENT.find((c) => c.id === f)?.name).join(', ')}`);
    para(ASSESSMENT_DISCLAIMER, 8.5, [120, 120, 130]);
  }

  // workshop worksheets
  const hasProblems = workshop.problems.length > 0 || workshop.problemNotes.trim();
  const ex = workshop.experiment;
  const hasExperiment = ex.task.trim() || ex.tool.trim();
  if (hasProblems || hasExperiment || workshop.automation.length) {
    heading('Workshop worksheets');
    if (hasProblems) {
      para('Problems identified (Day 1):', 11, ink);
      workshop.problems.forEach((id) => RISK_BY_ID[id] && para(`- ${RISK_BY_ID[id].name}: ${RISK_BY_ID[id].message}`));
      if (workshop.problemNotes.trim()) para(`Notes: ${workshop.problemNotes.trim()}`);
    }
    if (hasExperiment) {
      para('AI experiment sheet (Day 2):', 11, ink);
      autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        body: [
          ['Task to try', ex.task || '-'],
          ['Approved tool', ex.tool || '-'],
          ['Data used', ex.data || '-'],
          ['No personal data confirmed', ex.noPersonalData ? 'Yes' : 'Not confirmed'],
          ['Human review step', ex.review || '-'],
          ['Success looks like', ex.success || '-'],
        ].map((r) => r.map(clean)),
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 150 } },
      });
      y = lastY() + 14;
    }
    if (workshop.automation.length) {
      para('Automation opportunities (Day 2):', 11, ink);
      autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        head: [['Process', 'Hours / month', 'Automation idea']],
        body: workshop.automation.map((a) => [a.process || '-', a.hours || '-', a.idea || '-'].map(clean)),
        headStyles: { fillColor: ink },
        styles: { fontSize: 9 },
      });
      y = lastY() + 14;
    }
  }

  // footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    doc.text('PEOPLE4GOOD: Escape the Digital Chaos - educational planning tool. Suggestions are not universal recommendations or legal advice.', M, 822);
    doc.text(`${p}/${pages}`, W - M, 822, { align: 'right' });
  }
  const safe = org.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'ngo';
  doc.save(`${safe}-digital-maturity-results.pdf`);
}
