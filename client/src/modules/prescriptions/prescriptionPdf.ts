import { jsPDF } from "jspdf";

/**
 * Generates and downloads an exact high-fidelity vector PDF copy of a prescription.
 * Uses native vector commands to guarantee 100% valid PDF payloads without DOM or rasterization bugs.
 */
export function generatePrescriptionPdf(prescription: any): void {
  if (!prescription) return;

  const jsPDFClass = (jsPDF as any)?.jsPDF || jsPDF;
  const doc = new jsPDFClass({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  // 1. Top Decorative Accent Bar (Teal)
  doc.setFillColor(13, 148, 136); // Teal 600
  doc.rect(margin, margin, contentWidth, 2.5, "F");

  // 2. Clinic & Physician Header
  const clinicName = prescription.clinic_name || "ClinicOS Medical Center";
  const clinicContact = [
    prescription.clinic_address,
    prescription.clinic_phone,
    prescription.clinic_email,
  ].filter(Boolean).join(" • ") || "Comprehensive Healthcare & Clinical Services";

  const doctorName = [prescription.doctor_first_name, prescription.doctor_last_name].filter(Boolean).join(" ");
  const doctorDisplay = doctorName ? `Dr. ${doctorName}` : "Attending Physician";
  const doctorQuals = prescription.doctor_qualifications || "Consultant Physician";
  const rxId = String(prescription.id || "").slice(0, 8).toUpperCase();
  const rxDate = prescription.created_at
    ? new Date(prescription.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(clinicName, margin, margin + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  const wrappedContact = doc.splitTextToSize(clinicContact, 100);
  doc.text(wrappedContact, margin, margin + 16);

  // Right-aligned doctor info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 118, 110); // Teal 700
  doc.text(doctorDisplay, pageWidth - margin, margin + 11, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(doctorQuals, pageWidth - margin, margin + 16, { align: "right" });
  doc.text(`Rx ID: ${rxId} • Date: ${rxDate}`, pageWidth - margin, margin + 21, { align: "right" });

  // 3. Patient Info Card
  const patientName = [prescription.patient_first_name, prescription.patient_last_name].filter(Boolean).join(" ") || "Patient";
  const diagnosis = prescription.diagnosis || "General Consultation";

  let y = margin + 27;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "FD");

  // Labels
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text("PATIENT NAME", margin + 5, y + 6);
  doc.text("CONSULTATION DATE", margin + 65, y + 6);
  doc.text("PRIMARY DIAGNOSIS", margin + 115, y + 6);

  // Values
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(patientName, margin + 5, y + 13);
  doc.text(rxDate, margin + 65, y + 13);

  // Diagnosis Badge
  doc.setFillColor(204, 251, 241); // Teal 100
  doc.setDrawColor(153, 246, 228); // Teal 200
  doc.roundedRect(margin + 115, y + 8, 55, 6.5, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(17, 94, 89); // Teal 800
  const diagText = doc.splitTextToSize(diagnosis, 51)[0] || diagnosis;
  doc.text(diagText, margin + 117.5, y + 12.5);

  // 4. Rx Symbol & Section Header
  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(13, 148, 136); // Teal 600
  doc.text("Rx", margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("PRESCRIBED MEDICATIONS", margin + 11, y - 1);

  // 5. Medications Table
  y += 5;
  const colX = {
    idx: margin + 3,
    med: margin + 10,
    dos: margin + 70,
    freq: margin + 98,
    dur: margin + 128,
    inst: margin + 150,
  };

  // Header Row
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.rect(margin, y, contentWidth, 8, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text("#", colX.idx, y + 5.5);
  doc.text("MEDICINE & STRENGTH", colX.med, y + 5.5);
  doc.text("DOSAGE", colX.dos, y + 5.5);
  doc.text("FREQUENCY", colX.freq, y + 5.5);
  doc.text("DURATION", colX.dur, y + 5.5);
  doc.text("INSTRUCTIONS", colX.inst, y + 5.5);

  y += 8;
  const items = prescription.items || [];

  if (items.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 10, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("No medication items recorded for this prescription.", margin + 50, y + 6.5);
    y += 10;
  } else {
    items.forEach((item: any, i: number) => {
      if (y > 235) {
        doc.addPage();
        y = margin;
      }

      const rowBg = i % 2 === 0 ? 255 : 248;
      doc.setFillColor(rowBg, rowBg === 255 ? 255 : 250, rowBg === 255 ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 9, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(String(i + 1), colX.idx, y + 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const medName = doc.splitTextToSize(item.medication_name || "Medicine", 56)[0];
      doc.text(medName, colX.med, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(item.dosage || "1 dose", colX.dos, y + 6);
      doc.text(item.frequency || "As directed", colX.freq, y + 6);
      doc.text(item.duration || "As advised", colX.dur, y + 6);

      const instructions = [item.instructions, item.route && item.route !== "Oral" ? `(${item.route})` : null]
        .filter(Boolean)
        .join(" ") || "As directed";
      const instText = doc.splitTextToSize(instructions, 26)[0];
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text(instText, colX.inst, y + 6);

      y += 9;
    });
  }

  // 6. Doctor Advice / Notes Box
  if (prescription.notes) {
    y += 5;
    if (y > 220) {
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(254, 243, 199); // Amber 100/50
    doc.setDrawColor(253, 230, 138); // Amber 200

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 53, 15); // Amber 900
    const wrappedNotes = doc.splitTextToSize(prescription.notes, contentWidth - 10);
    const boxHeight = Math.max(16, wrappedNotes.length * 4.5 + 10);

    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(146, 64, 14);
    doc.text("PHYSICIAN ADVICE & CLINICAL INSTRUCTIONS:", margin + 5, y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 53, 15);
    doc.text(wrappedNotes, margin + 5, y + 10.5);

    y += boxHeight;
  }

  // 7. Signature & Footer Block
  const footerY = Math.max(y + 12, 245);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("ClinicOS Digital Health Platform", margin, footerY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Valid computer-generated prescription issued from verified clinical consultation records.", margin, footerY + 10);
  doc.text("Valid without physical signature where permitted by law.", margin, footerY + 14);

  // Doctor signature line
  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - margin - 45, footerY + 12, pageWidth - margin, footerY + 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(doctorDisplay, pageWidth - margin - 22.5, footerY + 17, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Authorized Physician Signature", pageWidth - margin - 22.5, footerY + 21, { align: "center" });

  const filename = `prescription-${prescription.id || "document"}.pdf`;
  doc.save(filename);
}

/**
 * Prints the prescription using an isolated print iframe.
 * Avoids any modal clipping, overflow restrictions, or blank page print bugs.
 */
export function printPrescription(prescription: any): void {
  if (!prescription) return;

  const doctorName = [prescription.doctor_first_name, prescription.doctor_last_name].filter(Boolean).join(" ");
  const doctorDisplay = doctorName ? `Dr. ${doctorName}` : "Attending Physician";
  const doctorQuals = prescription.doctor_qualifications || "Consultant Physician";
  const clinicName = prescription.clinic_name || "ClinicOS Medical Center";
  const clinicContact = [
    prescription.clinic_address,
    prescription.clinic_phone,
    prescription.clinic_email,
  ].filter(Boolean).join(" • ") || "Comprehensive Healthcare & Clinical Services";
  const patientName = [prescription.patient_first_name, prescription.patient_last_name].filter(Boolean).join(" ") || "Patient";
  const rxId = String(prescription.id || "").slice(0, 8).toUpperCase();
  const rxDate = prescription.created_at
    ? new Date(prescription.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const items = prescription.items || [];

  const rowsHtml = items.length > 0
    ? items.map((item: any, i: number) => `
      <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #94a3b8;">${i + 1}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${item.medication_name || ''}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #334155;">${item.dosage || '1 dose'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #334155;">${item.frequency || 'As directed'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #334155;">${item.duration || 'As advised'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-style: italic;">${[item.instructions, item.route && item.route !== 'Oral' ? `(${item.route})` : null].filter(Boolean).join(' ') || 'As directed'}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #94a3b8;">No medication items recorded.</td></tr>`;

  const notesHtml = prescription.notes
    ? `<div style="margin-top: 20px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #92400e; margin-bottom: 4px;">Physician Advice & Special Instructions</div>
        <div style="font-size: 12px; color: #78350f; line-height: 1.5; white-space: pre-wrap;">${prescription.notes}</div>
       </div>`
    : '';

  const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Prescription-${rxId}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background: #ffffff; color: #0f172a; padding: 10px; }
          .accent-bar { height: 4px; background: #0d9488; border-radius: 2px; margin-bottom: 18px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 18px; }
          .clinic-name { font-size: 20px; font-weight: 800; color: #0f172a; }
          .clinic-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
          .doc-name { font-size: 14px; font-weight: 700; color: #0f766e; text-align: right; }
          .doc-sub { font-size: 11px; color: #64748b; text-align: right; margin-top: 2px; }
          .rx-meta { font-size: 11px; font-family: monospace; color: #94a3b8; text-align: right; margin-top: 4px; }
          .patient-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #94a3b8; }
          .val { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
          .badge { background: #ccfbf1; color: #115e59; border: 1px solid #99f6e4; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
          .rx-title { font-size: 24px; font-weight: 900; color: #0d9488; font-family: serif; display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
          .rx-sub { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; font-family: sans-serif; }
          table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-size: 12px; }
          th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; }
          .footer-left { font-size: 10px; color: #94a3b8; line-height: 1.4; }
          .footer-right { text-align: right; }
          .sign-line { width: 160px; border-bottom: 1px solid #94a3b8; margin-bottom: 6px; display: inline-block; }
          .sign-name { font-size: 12px; font-weight: 700; color: #0f172a; }
          .sign-title { font-size: 10px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="accent-bar"></div>
        <div class="header">
          <div>
            <div class="clinic-name">${clinicName}</div>
            <div class="clinic-sub">${clinicContact}</div>
          </div>
          <div>
            <div class="doc-name">${doctorDisplay}</div>
            <div class="doc-sub">${doctorQuals}</div>
            <div class="rx-meta">Rx ID: ${rxId} • Date: ${rxDate}</div>
          </div>
        </div>

        <div class="patient-card">
          <div>
            <div class="label">Patient Name</div>
            <div class="val">${patientName}</div>
          </div>
          <div>
            <div class="label">Consultation Date</div>
            <div class="val">${rxDate}</div>
          </div>
          <div>
            <div class="label">Primary Diagnosis</div>
            <div class="badge">${prescription.diagnosis || "General Consultation"}</div>
          </div>
        </div>

        <div class="rx-title">
          ℞ <span class="rx-sub">Prescribed Medications</span>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>Medicine & Strength</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
              <th>Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        ${notesHtml}

        <div class="footer">
          <div class="footer-left">
            <p><strong>ClinicOS Digital Health Platform</strong></p>
            <p>Valid computer-generated prescription issued from verified clinical records.</p>
            <p>Valid without physical signature where permitted by law.</p>
          </div>
          <div class="footer-right">
            <div class="sign-line"></div>
            <div class="sign-name">${doctorDisplay}</div>
            <div class="sign-title">Authorized Physician Signature</div>
          </div>
        </div>
      </body>
    </html>
  `;

  // Create isolated iframe to guarantee 100% clean print without empty pages
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(printHtml);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 250);
}
