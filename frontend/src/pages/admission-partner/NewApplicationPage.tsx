import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface University {
  id: string;
  name: string;
}

interface College {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
  duration: string;
  fees: number;
}

interface FormData {
  // Student Details
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  dateOfBirth: string;
  gender: string;
  fatherName: string;
  motherName: string;
  guardianPhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;

  // Academic Details
  universityId: string;
  collegeId: string;
  courseId: string;
  academicYear: string;

  // Previous Education
  lastQualification: string;
  lastInstitution: string;
  lastPercentage: string;
  passingYear: string;

  // Additional Info
  category: string;
  aadharNumber: string;
  notes: string;
}

const initialFormData: FormData = {
  studentName: '',
  studentEmail: '',
  studentPhone: '',
  dateOfBirth: '',
  gender: '',
  fatherName: '',
  motherName: '',
  guardianPhone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  universityId: '',
  collegeId: '',
  courseId: '',
  academicYear: new Date().getFullYear().toString(),
  lastQualification: '',
  lastInstitution: '',
  lastPercentage: '',
  passingYear: '',
  category: 'GENERAL',
  aadharNumber: '',
  notes: '',
};

const genderOptions = ['Male', 'Female', 'Other'];
const categoryOptions = ['GENERAL', 'OBC', 'SC', 'ST', 'EWS'];
const qualificationOptions = ['10th', '12th', 'Diploma', 'Graduate', 'Post Graduate'];

export const AdmissionPartnerNewApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const [universities, setUniversities] = useState<University[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    fetchUniversities();
  }, []);

  useEffect(() => {
    if (formData.universityId) {
      fetchColleges(formData.universityId);
    } else {
      setColleges([]);
      setFormData(prev => ({ ...prev, collegeId: '', courseId: '' }));
    }
  }, [formData.universityId]);

  useEffect(() => {
    if (formData.collegeId) {
      fetchCourses(formData.collegeId);
    } else if (formData.universityId) {
      fetchCourses(formData.universityId);
    } else {
      setCourses([]);
      setFormData(prev => ({ ...prev, courseId: '' }));
    }
  }, [formData.collegeId, formData.universityId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admission_partner_token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchUniversities = async () => {
    try {
      setLoadingOptions(true);
      const response = await fetch('/api/partner-portal/universities', {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setUniversities(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch universities:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchColleges = async (universityId: string) => {
    try {
      const response = await fetch(`/api/partner-portal/universities/${universityId}/colleges`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setColleges(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch colleges:', error);
    }
  };

  const fetchCourses = async (entityId: string) => {
    try {
      const endpoint = formData.collegeId
        ? `/api/partner-portal/colleges/${entityId}/courses`
        : `/api/partner-portal/universities/${entityId}/courses`;
      const response = await fetch(endpoint, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        if (!formData.studentName || !formData.studentPhone || !formData.dateOfBirth) {
          toast.error('Please fill all required student details');
          return false;
        }
        if (formData.studentPhone.length < 10) {
          toast.error('Please enter a valid phone number');
          return false;
        }
        return true;
      case 2:
        if (!formData.universityId || !formData.academicYear) {
          toast.error('Please select university and academic year');
          return false;
        }
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (asDraft: boolean = false) => {
    if (!asDraft && !validateStep(step)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/partner-portal/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...formData,
          status: asDraft ? 'DRAFT' : 'APPLICATION_SUBMITTED',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create application');
      }

      toast.success(asDraft ? 'Application saved as draft' : 'Application submitted successfully!');
      navigate('/admission-partner/applications');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Student Details', icon: UserIcon },
    { number: 2, title: 'Course Selection', icon: AcademicCapIcon },
    { number: 3, title: 'Education & Documents', icon: DocumentTextIcon },
    { number: 4, title: 'Review & Submit', icon: CheckCircleIcon },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admission-partner')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Application</h1>
          <p className="text-gray-600">Fill in the student details to create an application</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          {steps.map((s, index) => (
            <React.Fragment key={s.number}>
              <div className={`flex items-center ${step >= s.number ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step > s.number ? 'bg-primary-600 text-white' :
                  step === s.number ? 'bg-primary-100 text-primary-600 border-2 border-primary-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {step > s.number ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    <s.icon className="h-5 w-5" />
                  )}
                </div>
                <span className="ml-2 font-medium hidden sm:block">{s.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 rounded ${step > s.number ? 'bg-primary-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {/* Step 1: Student Details */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Student Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Full name as per documents"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="studentPhone"
                  value={formData.studentPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="10-digit mobile number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="studentEmail"
                  value={formData.studentEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="student@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select Gender</option>
                  {genderOptions.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {categoryOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name</label>
                <input
                  type="text"
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Phone</label>
                <input
                  type="tel"
                  name="guardianPhone"
                  value={formData.guardianPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                <input
                  type="text"
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="12-digit Aadhar number"
                  maxLength={12}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Complete address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  maxLength={6}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Course Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Course Selection</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  University <span className="text-red-500">*</span>
                </label>
                <select
                  name="universityId"
                  value={formData.universityId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={loadingOptions}
                  required
                >
                  <option value="">Select University</option>
                  {universities.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
                <select
                  name="collegeId"
                  value={formData.collegeId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={!formData.universityId || colleges.length === 0}
                >
                  <option value="">Select College (Optional)</option>
                  {colleges.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  name="courseId"
                  value={formData.courseId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={!formData.universityId || courses.length === 0}
                >
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.duration && `(${c.duration})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <select
                  name="academicYear"
                  value={formData.academicYear}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  {[0, 1, 2].map(offset => {
                    const year = new Date().getFullYear() + offset;
                    return (
                      <option key={year} value={year.toString()}>
                        {year}-{year + 1}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {formData.courseId && courses.find(c => c.id === formData.courseId) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Selected Course Details</h3>
                {(() => {
                  const course = courses.find(c => c.id === formData.courseId);
                  return course ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700">Course:</span> {course.name}
                      </div>
                      <div>
                        <span className="text-blue-700">Duration:</span> {course.duration || 'N/A'}
                      </div>
                      {course.fees && (
                        <div>
                          <span className="text-blue-700">Fees:</span> Rs. {course.fees.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Education Details */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Previous Education</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Qualification
                </label>
                <select
                  name="lastQualification"
                  value={formData.lastQualification}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select Qualification</option>
                  {qualificationOptions.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Institution Name
                </label>
                <input
                  type="text"
                  name="lastInstitution"
                  value={formData.lastInstitution}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="School/College name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Percentage/CGPA
                </label>
                <input
                  type="text"
                  name="lastPercentage"
                  value={formData.lastPercentage}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., 85% or 8.5 CGPA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passing Year
                </label>
                <input
                  type="text"
                  name="passingYear"
                  value={formData.passingYear}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., 2023"
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Any additional information about the student..."
              />
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Review Application</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Student Details Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Student Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Name:</span> {formData.studentName}</div>
                  <div><span className="text-gray-500">Phone:</span> {formData.studentPhone}</div>
                  <div><span className="text-gray-500">Email:</span> {formData.studentEmail || 'N/A'}</div>
                  <div><span className="text-gray-500">DOB:</span> {formData.dateOfBirth}</div>
                  <div><span className="text-gray-500">Gender:</span> {formData.gender || 'N/A'}</div>
                  <div><span className="text-gray-500">Category:</span> {formData.category}</div>
                </div>
              </div>

              {/* Course Details Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <AcademicCapIcon className="h-5 w-5" />
                  Course Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">University:</span>{' '}
                    {universities.find(u => u.id === formData.universityId)?.name || 'N/A'}
                  </div>
                  <div>
                    <span className="text-gray-500">College:</span>{' '}
                    {colleges.find(c => c.id === formData.collegeId)?.name || 'N/A'}
                  </div>
                  <div>
                    <span className="text-gray-500">Course:</span>{' '}
                    {courses.find(c => c.id === formData.courseId)?.name || 'N/A'}
                  </div>
                  <div><span className="text-gray-500">Academic Year:</span> {formData.academicYear}</div>
                </div>
              </div>

              {/* Education Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5" />
                  Previous Education
                </h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Qualification:</span> {formData.lastQualification || 'N/A'}</div>
                  <div><span className="text-gray-500">Institution:</span> {formData.lastInstitution || 'N/A'}</div>
                  <div><span className="text-gray-500">Percentage:</span> {formData.lastPercentage || 'N/A'}</div>
                  <div><span className="text-gray-500">Year:</span> {formData.passingYear || 'N/A'}</div>
                </div>
              </div>

              {/* Address Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Address</h3>
                <div className="text-sm text-gray-700">
                  {formData.address && <div>{formData.address}</div>}
                  {(formData.city || formData.state || formData.pincode) && (
                    <div>{[formData.city, formData.state, formData.pincode].filter(Boolean).join(', ')}</div>
                  )}
                  {!formData.address && !formData.city && <div className="text-gray-400">Not provided</div>}
                </div>
              </div>
            </div>

            {formData.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-900 mb-2">Notes</h3>
                <p className="text-sm text-yellow-700">{formData.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Save as Draft
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdmissionPartnerNewApplicationPage;
