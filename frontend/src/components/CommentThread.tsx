import React, { useEffect, useState } from 'react';
import { MessageCircle, Send, User } from 'lucide-react';
import api from '../api';

interface Comment {
  id: string;
  author: string;
  role: 'patient' | 'clinician';
  message: string;
  timestamp: Date;
  replies?: Comment[];
}

interface CommentThreadProps {
  patientId: string;
  clinicianId?: string;
  currentUserRole: 'patient' | 'clinician';
}

export function CommentThread({
  patientId,
  clinicianId,
  currentUserRole,
}: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchComments = async (silent = false) => {
    try {
      const actualPatientId = currentUserRole === 'patient' ? 'me' : patientId;
      if (!actualPatientId) return;

      if (!silent) setLoading(true);

      const response = await api.get(`/api/feedback/patient/${actualPatientId}/`);

      const mapped: Comment[] = response.data.map((comment: any) => ({
        id: String(comment.id),
        author: comment.author_name,
        role: comment.role,
        message: comment.message,
        timestamp: new Date(comment.created_at),
        replies: (comment.replies || []).map((reply: any) => ({
          id: String(reply.id),
          author: reply.author_name,
          role: reply.role,
          message: reply.message,
          timestamp: new Date(reply.created_at),
        })),
      }));

      setComments(mapped);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        console.error('Unauthorized: check auth token/cookies in api client');
      } else {
        console.error('Failed to fetch comments:', error);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const actualPatientId = currentUserRole === 'patient' ? 'me' : patientId;
    if (!actualPatientId) return;

    let active = true;

    const load = async () => {
      if (!active) return;
      await fetchComments();
    };

    load();

    const interval = setInterval(() => {
      if (active) fetchComments(true);
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [patientId, currentUserRole]);

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      if (parentId) {
        await api.post('/api/feedback/reply/', {
          parent: parentId,
          message: newComment.trim(),
        });
      } else {
        await api.post('/api/feedback/', {
          clinician: clinicianId,
          patient: patientId,
          message: newComment.trim(),
        });
      }

      await fetchComments();
      setReplyingTo(null);
      setNewComment('');
    } catch (error: any) {
      if (error?.response?.status === 401) {
        console.error('Unauthorized: check auth token/cookies in api client');
      } else {
        console.error('Failed to send message:', error);
      }
    }
  };

  const CommentItem = ({
    comment,
    isReply = false,
  }: {
    comment: Comment;
    isReply?: boolean;
  }) => (
    <div className={`${isReply ? 'ml-12 mt-3' : 'mb-4'}`}>
      <div
        className={`flex items-start gap-3 p-4 rounded-lg ${
          comment.role === 'patient'
            ? 'bg-blue-50 border border-blue-200'
            : 'bg-emerald-50 border border-emerald-200'
        }`}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            comment.role === 'patient' ? 'bg-blue-600' : 'bg-emerald-600'
          }`}
        >
          <User className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-900">{comment.author}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                comment.role === 'patient'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {comment.role === 'patient' ? 'Patient' : 'Clinician'}
            </span>
          </div>

          <p className="text-sm text-slate-700 mb-2">{comment.message}</p>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{comment.timestamp.toLocaleString()}</span>
            {!isReply && (
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {comment.replies &&
        comment.replies.map((reply) => (
          <CommentItem key={reply.id} comment={reply} isReply />
        ))}

      {replyingTo === comment.id && (
        <div className="ml-12 mt-3">
          <form onSubmit={(e) => handleSubmit(e, comment.id)} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type your reply..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setReplyingTo(null);
                setNewComment('');
              }}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-slate-600" />
        <h3 className="text-lg font-semibold text-slate-900">Patient Communication</h3>
      </div>

      <div className="space-y-4 mb-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading comments...</p>
        ) : comments.length > 0 ? (
          comments.map((comment) => <CommentItem key={comment.id} comment={comment} />)
        ) : (
          <p className="text-sm text-slate-500">No patient feedback yet.</p>
        )}
      </div>

      {!replyingTo && (
        <form onSubmit={(e) => handleSubmit(e)} className="pt-4 border-t border-slate-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={
                currentUserRole === 'patient'
                  ? 'Send a message to your care team...'
                  : 'Send a message to the patient...'
              }
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}