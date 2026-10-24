import React, { useState, useEffect } from 'react';
import { Users, Search, Edit, Trash2, Shield, X, Save, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: 'patient' | 'clinician' | 'admin';
  status: 'active' | 'inactive';
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'patient' | 'clinician' | 'admin'>('all');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://127.0.0.1:8000/api/users/');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();

        const transformedUsers: User[] = data.map((user: any) => ({
          id: user.id.toString(),
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          name: `${user.first_name} ${user.last_name}`.trim() || user.username,
          email: user.email,
          role: user.role as 'patient' | 'clinician' | 'admin',
          status: 'active',
        }));

        setUsers(transformedUsers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleEditClick = (user: User) => {
    setEditFormData(user);
    setIsEditModalOpen(true);
  };

  const handleSaveChanges = async () => {
    try {
      const response = await fetch(`/api/users/${editFormData.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: editFormData.firstName,
          last_name: editFormData.lastName,
          username: editFormData.username,
          email: editFormData.email,
          role: editFormData.role,
          is_active: editFormData.status === 'active',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUsers = users.map((u) =>
        u.id === editFormData.id
          ? ({
              ...u,
              ...editFormData,
              name: `${editFormData.firstName || u.firstName} ${editFormData.lastName || u.lastName}`.trim(),
            } as User)
          : u
      );

      setUsers(updatedUsers);
      setIsEditModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}?`)) return;

    try {
      const response = await fetch(`/api/users/${userId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter((user) => user.id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleDownloadReport = (user: User) => {
    const doc = new jsPDF();
    let currentY = 20;

    doc.setFontSize(18);
    doc.text('Patient Report', 14, currentY);
    currentY += 10;

    doc.setFontSize(14);
    doc.text('Patient Information', 14, currentY);
    currentY += 8;

    doc.setFontSize(11);
    doc.text(`Name: ${user.name}`, 14, currentY);
    currentY += 6;
    doc.text(`Username: ${user.username}`, 14, currentY);
    currentY += 6;
    doc.text(`Email: ${user.email}`, 14, currentY);
    currentY += 6;
    doc.text(`Status: ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}`, 14, currentY);
    currentY += 12;

    doc.setFontSize(14);
    doc.text('Recent Session Summary', 14, currentY);
    currentY += 8;

    const sessionData = [
      ['Apr 16, 2026 - 2:30 PM', '38.5', '58.2', '3', 'At Risk'],
      ['Apr 15, 2026 - 1:45 PM', '35.2', '52.1', '1', 'Stable'],
      ['Apr 14, 2026 - 3:15 PM', '42.8', '65.3', '5', 'Critical'],
    ];

    autoTable(doc, {
      head: [['Session Date', 'Avg Pressure', 'Peak Pressure', 'Alerts', 'Status']],
      body: sessionData,
      startY: currentY,
      theme: 'grid',
      headStyles: { fillColor: [147, 51, 234] },
      styles: { fontSize: 10 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.text('Summary', 14, currentY);
    currentY += 6;
    doc.setFontSize(10);

    const summaryText = `This report provides a summary of recent pressure monitoring sessions for ${user.name}. The data shows pressure distribution patterns and alerts generated during monitoring periods.`;
    const splitText = doc.splitTextToSize(summaryText, 180);
    doc.text(splitText, 14, currentY);

    doc.save(`Patient_Report_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const colors = {
      patient: 'bg-blue-100 text-blue-700',
      clinician: 'bg-emerald-100 text-emerald-700',
      admin: 'bg-purple-100 text-purple-700',
    };
    return colors[role as keyof typeof colors] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 relative">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">User Directory</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading users...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 relative">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">User Directory</h3>
        </div>
        <div className="text-center py-12 text-red-600">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 relative">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-slate-600" />
        <h3 className="text-lg font-semibold text-slate-900">User Directory ({users.length})</h3>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'patient', 'clinician', 'admin'].map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                filterRole === role ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-3 px-4 text-sm font-semibold text-slate-700">Name</th>
              <th className="py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
              <th className="py-3 px-4 text-sm font-semibold text-slate-700">Username</th>
              <th className="py-3 px-4 text-sm font-semibold text-slate-700">Role</th>
              <th className="py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
              <th className="py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {user.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <span className="font-medium text-slate-900">{user.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{user.email}</td>
                <td className="py-3 px-4 text-sm text-slate-600 font-mono">{user.username}</td>
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>

                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditClick(user)}
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Edit User"
                    >
                      <Edit className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 group-hover:text-red-700" />
                    </button>
                    {user.role === 'patient' && (
                      <button
                        onClick={() => handleDownloadReport(user)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                        title="Download Patient Report"
                      >
                        <Download className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900">Edit User Details</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editFormData.firstName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editFormData.lastName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={editFormData.username || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={editFormData.role || 'patient'}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="patient">Patient</option>
                    <option value="clinician">Clinician</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editFormData.status || 'active'}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredUsers.length === 0 && !loading && (
        <div className="text-center py-8 text-slate-500">
          No users found matching "{searchTerm || 'your criteria'}"
        </div>
      )}
    </div>
  );
}
