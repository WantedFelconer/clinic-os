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

    const doctorName = [prescription.doctor_first_name, prescription.doctor_last_name].filter(Boolean).join(" ");
    const doctorDisplay = doctorName ? `Dr. ${doctorName}` : "Attending Physician";
    const patientName = [prescription.patient_first_name, prescription.patient_last_name].filter(Boolean).join(" ") || "Patient";
    const rxDate = prescription.created_at
      ? new Date(prescription.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : "N/A";

    const items = prescription.items || [];

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
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Pill size={20} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {prescription.clinic_name || "ClinicOS Medical Center"}
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              {[prescription.clinic_address, prescription.clinic_phone, prescription.clinic_email]
                .filter(Boolean)
                .join(" • ") || "Comprehensive Healthcare & Clinical Consultation Services"}
            </p>
          </div>

          <div className="text-right">
            <h3 className="text-sm font-bold text-teal-800">{doctorDisplay}</h3>
            <p className="text-xs text-slate-500">{prescription.doctor_qualifications || "Consultant Physician"}</p>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Rx ID: {String(prescription.id || "").slice(0, 8).toUpperCase()}
            </p>
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
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Prescribed Medications</span>
        </div>

        {/* Medications Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-8 text-center">#</th>
                <th className="py-2.5 px-3">Medicine & Strength</th>
                <th className="py-2.5 px-3">Dosage</th>
                <th className="py-2.5 px-3">Frequency</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.length > 0 ? (
                items.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-3 px-3 text-center font-semibold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{item.medication_name}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{item.dosage || "1 dose"}</td>
                    <td className="py-3 px-3 text-slate-700">{item.frequency || "As directed"}</td>
                    <td className="py-3 px-3 text-slate-700">{item.duration || "As advised"}</td>
                    <td className="py-3 px-3 text-slate-600 italic">
                      {[item.instructions, item.route && item.route !== "Oral" ? `(${item.route})` : null]
                        .filter(Boolean)
                        .join(" ") || "As directed"}
                    </td>
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
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 mb-8">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5">
              Physician Advice & Special Instructions
            </h4>
            <p className="text-xs text-amber-950 leading-relaxed whitespace-pre-wrap">{prescription.notes}</p>
          </div>
        )}

        {/* Footer & Doctor Signature Block */}
        <div className="mt-16 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div className="max-w-xs text-[11px] text-slate-400 leading-normal">
            <p className="font-semibold text-slate-600">ClinicOS Digital Health Platform</p>
            <p>This digital prescription is generated from certified clinical consultation records.</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Valid without physical signature where permitted by law.</p>
          </div>

          <div className="text-right">
            <div className="inline-block border-b border-slate-400 w-48 mb-1.5"></div>
            <p className="font-bold text-slate-900">{doctorDisplay}</p>
            <p className="text-[11px] text-slate-500">Authorized Physician Signature</p>
          </div>
        </div>
      </div>
    );
  }
);

PrescriptionDocument.displayName = "PrescriptionDocument";
