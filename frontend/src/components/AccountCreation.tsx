import React, { useState, useEffect } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import api from '../api';

interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
}

interface AccountCreationProps {
  
}

export function AccountCreation({}: AccountCreationProps) {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'patient' as 'patient' | 'clinician' | 'admin',
    password: '',
    clinician: '' as string | number,  // clinician ID
    matDeviceId: '',
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');


  useEffect(() => {
  fetchClinicians();  
}, []);


const fetchClinicians = async () => {
  try {
    const response = await api.get('/api/users/clinicians/');
    console.log('ALL clinicians:', response.data);  
    setDoctors(response.data);
  } catch (err) {
    console.error('Failed to fetch clinicians:', err);
  }
};


  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setSuccess('');

  try {
    
    const submitData: any = {
      username: formData.username,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      role: formData.role,
      password: formData.password,
    };

   
    if (formData.role === 'patient') {
      submitData.clinician = formData.clinician;  
      submitData.mat_device_id = formData.matDeviceId;
    }


    // FIXED: Add leading slash for URL
    const response = await api.post('/api/user/adminregister/', submitData);  
    
    setSuccess(`Account created successfully for ${formData.firstName} ${formData.lastName}!`);
    
    // Reset form
    setFormData({
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      role: 'patient',
      password: '',
      clinician: '',
      matDeviceId: '',
    });
    
  } catch (error: any) {
    setError(error.response?.data?.detail || 'Failed to create account');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="w-5 h-5 text-slate-600" />
        <h3 className="text-lg font-semibold text-slate-900">Create New Account</h3>
      </div>

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Username 
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address 
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              First Name 
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Last Name 
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Password 
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            User Role 
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['patient', 'clinician', 'admin'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setFormData({ ...formData, role, clinician: '' })}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  formData.role === role
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Patient-specific fields */}
        {formData.role === 'patient' && (
  <>
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Assigned Clinician 
      </label>
      <select
        value={formData.clinician}
        onChange={(e) => setFormData({ ...formData, clinician: e.target.value })}
        required
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
      >
        <option value="">Select clinician</option>
        {doctors.map((doctor) => (
  <option key={doctor.id} value={doctor.id}>
    {doctor.first_name} {doctor.last_name}
  </option>
))}
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Sensore Mat Device ID 
      </label>
      <input
        type="text"
        value={formData.matDeviceId}
        onChange={(e) => setFormData({ ...formData, matDeviceId: e.target.value })}
        required
        placeholder=""
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
      />
    </div>
  </>
)}


        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>
    </div>
  );
}
