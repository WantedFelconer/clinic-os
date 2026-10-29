# Codex Task Prompt: High-Fidelity Prescription PDF Generation & Print Matching

> **Instructions for Codex**:  
> You are acting as a Senior Full-Stack Engineer. Your objective is to upgrade the prescription PDF download in the ClinicOS Patient Dashboard so that it generates an exact, visually styled copy of the digital prescription—matching the printed UI layout (including clinic branding, Rx typography, patient info cards, structured medication tables, advice callouts, and doctor signature blocks) rather than a plain text document. Follow the architectural requirements, code specifications, and verification checklist below.

---

## 1. Context & Problem Description

ClinicOS is a multi-tenant healthcare SaaS built with **React 18 + TypeScript + Vite + Tailwind CSS** on the frontend and **Node.js + Express + MySQL** on the backend.

### Current Defect & Architectural Limitation:
1. **Plain Text PDF Output**:
   - In `PatientPortal` (`client/src/app/App.tsx`), clicking the **PDF** button on a prescription card calls `downloadPrescription(rx)`, which triggers `prescriptionsApi.downloadPdf(rx.clinic_id, rx.id)`.
   - In `ViewPrescriptionModal` (`client/src/app/components/ActionModals.tsx`), clicking **Download PDF** similarly calls `prescriptionsApi.downloadPdf(prescription.clinic_id, prescription.id)`.
   - That endpoint (`GET /api/clinics/:clinicId/prescriptions/:id/pdf`) invokes `prescriptionController.downloadPdf` (`server/src/controllers/prescriptionController.js`), which flattens prescription details into an array of string lines and runs `createTextPdf(lines)` (`server/src/utils/pdf.js`).
   - This produces a rudimentary, unstyled ASCII text document rendered in raw Helvetica with no layout, borders, Rx symbols, table grid, or branding.
2. **Discrepancy with On-Screen & Printed UI**:
   - When a patient clicks **View** on the dashboard, `ViewPrescriptionModal` renders a modern clinical document with clinic details, patient vitals, an Rx table, and clinical notes.
   - When a user clicks **Print Rx** (`window.print()`), the browser prints the DOM UI.
   - Patients downloading their prescription expect a **formal, clinic-branded medical document** identical to the printed version, not an unformatted plain-text dump.

---

## 2. Target Files

- `client/package.json` (Add dependencies: `jspdf`, `html2canvas`, and `@types/jspdf`)
- `client/src/app/components/PrescriptionDocument.tsx` (**NEW**: Shared printable prescription component)
- `client/src/app/utils/prescriptionPdf.ts` (**NEW**: High-resolution client-side DOM-to-PDF generation utility)
- `client/src/styles/index.css` or `client/src/styles/globals.css` (Add `@media print` rules for clean printing)
- `client/src/app/components/ActionModals.tsx` (Refactor `ViewPrescriptionModal` to use `PrescriptionDocument` and `prescriptionPdf`)
- `client/src/app/App.tsx` (Update `PatientPortal` to generate styled PDF on direct "PDF" download click)
- `server/src/utils/pdf.js` & `server/src/controllers/prescriptionController.js` (Optional backend fallback formatting)

---

## 3. Implementation Specifications

### Task 1: Add Dependencies (`client/package.json`)
Install `jspdf` and `html2canvas` in the `client` directory:
```bash
npm install jspdf html2canvas
npm install -D @types/jspdf
```
*Note: Ensure Vite resolves these packages cleanly without build warnings or SSR issues.*

---

### Task 2: Create Shared Component `PrescriptionDocument.tsx`
Create `client/src/app/components/PrescriptionDocument.tsx` as the single source of truth for prescription rendering. This component will be used by:
1. `ViewPrescriptionModal` for screen preview.
2. `window.print()` for physical printing.
3. `html2canvas` + `jspdf` for high-fidelity PDF generation.

#### Component Specifications:
- **Container**: Clean white background (`bg-white`), max-w-3xl, padded (`p-8`), rounded borders for modal view, borderless for print/PDF export.
- **Header Section**:
  - **Left**: Clinic Name (`text-xl font-black text-teal-800`), Clinic Address, Contact Phone & Email.
  - **Right**:
    - Doctor Info: `Dr. ${prescription.doctor_first_name} ${prescription.doctor_last_name}` (`font-bold text-slate-900`).
    - Qualifications: `${prescription.doctor_qualifications || 'Registered Medical Practitioner'}` (`text-xs text-slate-500`).
    - Date of Issue & Prescription ID (`font-mono text-xs text-slate-500`).
- **Divider**: A sleek horizontal rule or teal/slate accent bar.
- **Patient Information Card**:
  - Light muted background (`bg-slate-50 border border-slate-100 rounded-xl p-4`).
  - Grid layout showing:
    - **Patient**: Full name (`font-bold text-slate-900`).
    - **Age / Gender**: If available (`${prescription.patient_gender || '-'}` / `${prescription.patient_age || '-'}`).
    - **Date**: Formatted local date.
    - **Diagnosis**: Highlighted badge (`bg-teal-100 text-teal-800 font-bold px-2.5 py-1 rounded-md`).
- **Medical Symbol & Prescription Section**:
  - Prominent classic medical symbol **℞** (`text-2xl font-serif font-black text-teal-700`).
- **Medications Table**:
  - Clean, professional table with distinct headers:
    - `#` (Index)
    - `Medicine & Strength`
    - `Dosage`
    - `Frequency`
    - `Duration`
    - `Instructions`
  - Alternating row background (`hover:bg-slate-50/50`).
  - Handle empty items gracefully (`"No medication items listed."`).
- **Doctor Advice / Notes Box**:
  - Amber/warm accent box (`bg-amber-50/50 border border-amber-200/80 rounded-xl p-4`).
  - Header: **Doctor's Advice & Clinical Instructions**.
  - Text: Detailed notes from the doctor.
- **Footer & Signature Block**:
  - **Left**: Disclaimer ("This is a computer-generated digital prescription issued via ClinicOS. Valid without physical signature where permitted by law.").
  - **Right**:
    - Signature line: `_______________________`
    - `Dr. ${prescription.doctor_first_name} ${prescription.doctor_last_name}`
    - `Authorized Signatory`

```tsx
import React, { forwardRef } from "react";
import { Pill } from "lucide-react";

export interface PrescriptionDocumentProps {
  prescription: any;
  className?: string;
  isPrintOnly?: boolean;
}

export const PrescriptionDocument = forwardRef<HTMLDivElement, PrescriptionDocumentProps>(
  ({ prescription, className = "", isPrintOnly = false }, ref) => {
    if (!prescription) return null;

    const doctorName = `Dr. ${prescription.doctor_first_name || ""} ${prescription.doctor_last_name || ""}`.trim();
    const patientName = `${prescription.patient_first_name || ""} ${prescription.patient_last_name || ""}`.trim() || "Patient";
    const rxDate = prescription.created_at
      ? new Date(prescription.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : "N/A";

    return (
      <div
        ref={ref}
        className={`bg-white text-slate-800 p-8 max-w-3xl mx-auto ${className} ${
          isPrintOnly ? "print:block" : ""
        }`}
        style={{ width: "100%", maxWidth: "800px", minHeight: "1050px", boxSizing: "border-box" }}
      >
        {/* Clinic & Doctor Header */}
        <div className="flex justify-between items-start border-b-2 border-teal-600 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
                <Pill size={18} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {prescription.clinic_name || "ClinicOS Medical Center"}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {[prescription.clinic_address, prescription.clinic_phone, prescription.clinic_email]
                .filter(Boolean)
                .join(" • ") || "Comprehensive Healthcare & Clinical Services"}
            </p>
          </div>

          <div className="text-right">
            <h3 className="text-sm font-bold text-teal-800">{doctorName || "Attending Physician"}</h3>
            <p className="text-xs text-slate-500">{prescription.doctor_qualifications || "Consultant Physician"}</p>
            <p className="text-xs font-mono text-slate-400 mt-1">Rx ID: {String(prescription.id).slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* Patient & Date Meta Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Patient Name</span>
            <span className="font-bold text-slate-900 text-sm">{patientName}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Date</span>
            <span className="font-bold text-slate-800 text-sm">{rxDate}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-400 block font-semibold uppercase text-[10px] tracking-wider">Primary Diagnosis</span>
            <span className="inline-block mt-0.5 font-bold text-teal-800 bg-teal-100/70 border border-teal-200 px-2.5 py-0.5 rounded-md">
              {prescription.diagnosis || "General Consultation"}
            </span>
          </div>
        </div>

        {/* Rx Symbol Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-3xl font-serif font-black text-teal-700 leading-none">℞</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Prescribed Medications</span>
        </div>

        {/* Medications Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-8">#</th>
                <th className="py-2.5 px-3">Medicine</th>
                <th className="py-2.5 px-3">Dosage</th>
                <th className="py-2.5 px-3">Frequency</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(prescription.items || []).length > 0 ? (
                prescription.items.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-3 px-3 font-semibold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{item.medication_name}</td>
                    <td className="py-3 px-3">{item.dosage || "-"}</td>
                    <td className="py-3 px-3">{item.frequency || "-"}</td>
                    <td className="py-3 px-3">{item.duration || "-"}</td>
                    <td className="py-3 px-3 text-slate-600 italic">{item.instructions || item.route || "As directed"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No medication items recorded for this prescription.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Doctor Advice / Notes */}
        {prescription.notes && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 mb-8">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
              Physician Advice & Special Instructions
            </h4>
            <p className="text-xs text-amber-950 leading-relaxed whitespace-pre-wrap">{prescription.notes}</p>
          </div>
        )}

        {/* Footer & Doctor Signature Block */}
        <div className="mt-16 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div className="max-w-xs text-[11px] text-slate-400 leading-normal">
            <p className="font-semibold text-slate-500">ClinicOS Digital Health Platform</p>
            <p>This digital prescription is generated from certified clinical consultation records.</p>
          </div>

          <div className="text-right">
            <div className="inline-block border-b border-slate-400 w-44 mb-1"></div>
            <p className="font-bold text-slate-900">{doctorName}</p>
            <p className="text-[11px] text-slate-500">Authorized Physician Signature</p>
          </div>
        </div>
      </div>
    );
  }
);

PrescriptionDocument.displayName = "PrescriptionDocument";
```

---

### Task 3: Create PDF Generator Utility `prescriptionPdf.ts`
Create `client/src/app/utils/prescriptionPdf.ts`:

```typescript
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface ExportPdfOptions {
  filename?: string;
  quality?: number;
}

/**
 * Captures a DOM element and generates an A4 PDF document matching the exact printed UI.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: ExportPdfOptions = {}
): Promise<void> {
  const filename = options.filename || "prescription.pdf";

  // Use scale 2 for high-resolution 300 DPI retina quality
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  // Standard A4 dimensions in mm
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // Render first page
  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  // Handle multi-page prescriptions if medication list is long
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  pdf.save(filename);
}
```

---

### Task 4: Add Print Stylesheet (`@media print`)
In `client/src/styles/index.css` (or `client/src/styles/globals.css`), add print rules so that clicking **Print Rx** prints ONLY the prescription document and hides all modal overlays, headers, sidebars, and buttons:

```css
@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }

  /* Hide everything on the page except the printable prescription */
  body * {
    visibility: hidden;
  }

  #printable-prescription-root,
  #printable-prescription-root * {
    visibility: visible;
  }

  #printable-prescription-root {
    position: absolute;
    left: 0;
    top: 0;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 10mm !important;
    box-shadow: none !important;
    border: none !important;
  }

  @page {
    size: A4 portrait;
    margin: 10mm;
  }
}
```

---

### Task 5: Refactor `ViewPrescriptionModal` (`client/src/app/components/ActionModals.tsx`)
Update `ViewPrescriptionModal` to:
1. Render `PrescriptionDocument` inside a container with `ref={prescriptionRef}` and `id="printable-prescription-root"`.
2. When the user clicks **Download PDF**:
   - Call `exportElementToPdf(prescriptionRef.current, { filename: `prescription-${prescription.id}.pdf` })`.
   - Toggle `downloading` state while capturing and saving.
3. When the user clicks **Print Rx**:
   - Call `window.print()`.

```tsx
import { PrescriptionDocument } from "./PrescriptionDocument";
import { exportElementToPdf } from "../utils/prescriptionPdf";

export function ViewPrescriptionModal({
  open,
  onClose,
  prescription,
}: {
  open: boolean;
  onClose: () => void;
  prescription: any;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const prescriptionRef = useRef<HTMLDivElement>(null);

  if (!open || !prescription) return null;

  const handleDownloadPdf = async () => {
    if (!prescriptionRef.current) return;
    setDownloading(true);
    setDownloadError("");
    try {
      await exportElementToPdf(prescriptionRef.current, {
        filename: `prescription-${prescription.id || "rx"}.pdf`,
      });
    } catch (err: any) {
      setDownloadError("Failed to generate PDF. Please try printing or refresh.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 print:p-0 print:bg-transparent" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none" onClick={e => e.stopPropagation()}>
        {/* Top Action Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-3.5 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download size={14} /> {downloading ? "Generating PDF..." : "Download PDF"}
            </button>
            <h2 className="text-base font-bold text-slate-900 ml-2">Prescription Details</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-white flex items-center gap-1.5 text-slate-700 transition-colors"
            >
              <Printer size={14} /> Print Rx
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors ml-2" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {downloadError && (
          <div role="alert" className="mx-6 mt-4 p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-100 print:hidden">
            {downloadError}
          </div>
        )}

        {/* Scrollable Printable Container */}
        <div className="overflow-y-auto flex-1 p-4 bg-slate-100/50 print:p-0 print:bg-transparent">
          <div id="printable-prescription-root" className="rounded-xl shadow-xs border border-slate-200/80 overflow-hidden print:shadow-none print:border-none">
            <PrescriptionDocument ref={prescriptionRef} prescription={prescription} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 6: Direct "PDF" Download from Patient Dashboard (`client/src/app/App.tsx`)
In `PatientPortal` (`client/src/app/App.tsx`):
1. Add an off-screen/hidden container mounting `PrescriptionDocument` for the prescription being downloaded.
2. Refactor `downloadPrescription(rx)`:
   - When the patient clicks **PDF** on any prescription card:
   - Set `activeExportRx(rx)` and `downloadingPrescriptionId(rx.id)`.
   - Await the next DOM tick (`setTimeout` / `requestAnimationFrame`) to ensure the offscreen document is rendered.
   - Run `exportElementToPdf(hiddenRef.current, { filename: `prescription-${rx.id}.pdf` })`.
   - Provide a fallback: if `exportElementToPdf` fails or throws, gracefully fallback to `prescriptionsApi.downloadPdf(rx.clinic_id, rx.id)`.

```tsx
// Inside PatientPortal:
const [exportingRx, setExportingRx] = useState<any>(null);
const hiddenExportRef = useRef<HTMLDivElement>(null);

const downloadPrescription = async (prescription: any) => {
  setDownloadingPrescriptionId(prescription.id);
  setExportingRx(prescription);

  // Give React a frame to mount the hidden prescription document
  setTimeout(async () => {
    try {
      if (hiddenExportRef.current) {
        await exportElementToPdf(hiddenExportRef.current, {
          filename: `prescription-${prescription.id}.pdf`,
        });
      } else {
        // Fallback to API if ref is unavailable
        const response = await prescriptionsApi.downloadPdf(prescription.clinic_id, prescription.id);
        const url = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = `prescription-${prescription.id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setPortalError(getApiErrorMessage(error, "Unable to generate the prescription PDF."));
    } finally {
      setDownloadingPrescriptionId("");
      setExportingRx(null);
    }
  }, 100);
};

// In JSX before closing </div> of PatientPortal:
{exportingRx && (
  <div style={{ position: "fixed", left: "-9999px", top: 0, width: "800px", zIndex: -1 }}>
    <PrescriptionDocument ref={hiddenExportRef} prescription={exportingRx} />
  </div>
)}
```

---

## 4. Edge Cases & Robustness Guidelines

1. **Retina / HiDPI Scaling**:
   - `html2canvas` must be configured with `scale: 2` to prevent blurry text in the generated PDF.
2. **Missing Doctor or Clinic Data**:
   - Fall back gracefully to `prescription.clinic_name || "Medical Clinic"` and `Dr. Attending Doctor` if relations are partially unpopulated.
3. **Multi-Page Handling**:
   - Ensure the PDF utility splits long medication lists or lengthy notes across pages using standard A4 height slicing without clipping text.
4. **Print Chrome Isolation**:
   - Verify that `@media print` completely hides headers, sidebars, dashboard tables, and modal backgrounds so users printing directly through the browser get a clean, single-page medical document.
5. **No Broken Production Builds**:
   - Verify that `npm run build` in `client` succeeds with Vite without type errors or unresolved imports.

---

## 5. Verification Checklist

- [ ] **Dependency Check**: `jspdf` and `html2canvas` installed in `client/package.json`.
- [ ] **Modal PDF Download**:
  - Log in as a patient -> Navigate to Prescriptions -> Click **View**.
  - Click **Download PDF**.
  - Open downloaded PDF: Confirm it has the clinic banner, doctor info, patient card, styled medication table, doctor advice box, and signature line (identical to the UI).
- [ ] **Dashboard Direct PDF Download**:
  - On the Prescriptions list card, click the **PDF** button directly.
  - Confirm the button shows "Generating...", downloads the identical formatted PDF, and resets button state.
- [ ] **Print Rx Verification**:
  - In `ViewPrescriptionModal`, click **Print Rx**.
  - Check browser print preview: Ensure only the A4 prescription document appears without the dark modal backdrop, buttons, or dashboard behind it.
- [ ] **Vite Production Build**:
  - Run `npm run build` in `client/` and verify 0 errors.
