import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import api from '../api';

interface FeedbackBoxProps {
  patientId: string;
  assignedClinicianId: string;
}

export function FeedbackBox({ patientId, assignedClinicianId }: FeedbackBoxProps) {
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    try {
      await api.post('/api/feedback/', {
        clinician: assignedClinicianId,
        message: feedback.trim(),
      });

      setSubmitted(true);
      setFeedback('');
      console.log(assignedClinicianId);
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-slate-600" />
        <h3 className="text-lg font-semibold text-slate-900">Share Your Feedback</h3>
      </div>
      
      <p className="text-sm text-slate-600 mb-4">
        Have questions or concerns about your readings? Your healthcare team is here to help.
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Type your message, question, or concern here..."
          className="w-full p-3 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          rows={4}
          disabled={submitted}
        />
        
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-slate-500">
            Your care team typically responds within 24 hours
          </p>
          <button
            type="submit"
            disabled={!feedback.trim() || submitted}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitted ? (
              <>✓ Sent</>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Message
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
