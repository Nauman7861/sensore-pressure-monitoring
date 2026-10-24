import React, { useState, useEffect } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

// 1. Match the Django User model fields
interface Patient {
  id: number;
  first_name: string;
  last_name: string;
}

export default function PressureUpload() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [recordedAt, setRecordedAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: "" });

  // Load patients from your ClinicianPatientsView
  useEffect(() => {
    axios
      .get("http://localhost:8000/api/clinician/patients/") 
      .then((res) => {
        // Ensure res.data is an array before setting
        setPatients(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Failed to load patients:", err);
        setStatus({ type: 'error', msg: "Could not load patient list." });
      });
  }, []);

  // Drag & Drop Logic
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus({ type: null, msg: "" }); // Clear previous messages
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    onDrop,
  } as any);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setStatus({ type: 'error', msg: "Please select a CSV file first." });
      return;
    }

    // 2. Prepare FormData to match Django Serializer
    const formData = new FormData();
    formData.append("patient", patientId); // Matches 'patient' ForeignKey in Django
    formData.append("recorded_at", recordedAt); // Django handles ISO strings or YYYY-MM-DD
    formData.append("file", file); // Matches 'file' FileField in Django

    try {
      setUploadProgress(1); // Start progress bar
      
      await axios.post(
        "http://localhost:8000/api/upload-pressure/", // URL from your urls.py
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          },
        }
      );

      // Success State
      setStatus({ type: 'success', msg: "Data uploaded and processed successfully!" });
      setPatientId("");
      setRecordedAt("");
      setFile(null);
      setUploadProgress(0);

    } catch (error: any) {
      console.error("Upload error:", error.response?.data || error.message);
      setStatus({ 
        type: 'error', 
        msg: error.response?.data?.detail || "Upload failed. Please check your connection." 
      });
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        
        <h2 className="text-xl font-bold text-slate-800">Upload Patient Pressure CSV</h2>

        {/* Status Messages */}
        {status.type && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {status.msg}
          </div>
        )}

        {/* Patient Select */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Patient</label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
            required
          >
            <option value="">Select Patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.first_name} {patient.last_name}
              </option>
            ))}
          </select>
        </div>

        {/* Recorded At */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Recorded At</label>
          <input
            type="datetime-local"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
            required
          />
        </div>

        {/* Drag Drop Area */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">CSV File</label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl h-44 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragActive ? "border-purple-600 bg-purple-50" : "border-slate-300 hover:border-purple-400 hover:bg-slate-50"
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                <p className="text-slate-800 font-semibold">{file.name}</p>
                <button type="button" onClick={(e) => {e.stopPropagation(); setFile(null);}} className="text-xs text-red-500 underline mt-2">Remove file</button>
              </div>
            ) : (
              <div className="flex flex-col items-center p-4">
                <UploadCloud className="w-10 h-10 text-purple-500 mb-2" />
                <p className="text-slate-700 font-medium">Drag & drop CSV here</p>
                <p className="text-sm text-slate-400">or click to browse files</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-500 text-right">Uploading: {uploadProgress}%</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!file || !patientId || !recordedAt}
          className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition-all ${
            file && patientId && recordedAt ? "bg-purple-600 hover:bg-purple-700 active:scale-[0.98]" : "bg-slate-300 cursor-not-allowed"
          }`}
        >
          {uploadProgress > 0 ? "Processing..." : "Confirm & Upload Data"}
        </button>
      </form>
    </div>
  );
}
