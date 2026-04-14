import { prisma } from '../config/database';

/**
 * Industry Field Templates
 * Predefined field definitions for each industry
 */

// Field template type
interface FieldTemplate {
  name: string;
  label: string;
  fieldType: string;
  isRequired?: boolean;
  options?: Array<{ value: string; label: string; color?: string }>;
  groupName?: string;
  helpText?: string;
  displayWidth?: string;
}

// Education Industry Fields
export const EDUCATION_FIELDS: FieldTemplate[] = [
  // Student Information
  { name: 'course_interested', label: 'Course Interested', fieldType: 'SELECT', groupName: 'Academic', options: [
    { value: 'btech', label: 'B.Tech' },
    { value: 'mba', label: 'MBA' },
    { value: 'bba', label: 'BBA' },
    { value: 'mca', label: 'MCA' },
    { value: 'bsc', label: 'B.Sc' },
    { value: 'msc', label: 'M.Sc' },
    { value: 'other', label: 'Other' },
  ]},
  { name: 'branch_specialization', label: 'Branch/Specialization', fieldType: 'TEXT', groupName: 'Academic' },
  { name: 'academic_year', label: 'Academic Year', fieldType: 'SELECT', groupName: 'Academic', options: [
    { value: '2024-25', label: '2024-25' },
    { value: '2025-26', label: '2025-26' },
    { value: '2026-27', label: '2026-27' },
  ]},
  { name: 'intake_month', label: 'Intake Month', fieldType: 'SELECT', groupName: 'Academic', options: [
    { value: 'january', label: 'January' },
    { value: 'may', label: 'May' },
    { value: 'september', label: 'September' },
  ]},
  { name: 'preferred_university', label: 'Preferred University', fieldType: 'TEXT', groupName: 'Academic' },
  { name: 'center_location', label: 'Center/Campus Location', fieldType: 'TEXT', groupName: 'Academic' },

  // Parent Information
  { name: 'father_name', label: 'Father Name', fieldType: 'TEXT', groupName: 'Parent Info' },
  { name: 'father_mobile', label: 'Father Mobile', fieldType: 'PHONE', groupName: 'Parent Info' },
  { name: 'father_occupation', label: 'Father Occupation', fieldType: 'TEXT', groupName: 'Parent Info' },
  { name: 'mother_name', label: 'Mother Name', fieldType: 'TEXT', groupName: 'Parent Info' },
  { name: 'mother_mobile', label: 'Mother Mobile', fieldType: 'PHONE', groupName: 'Parent Info' },

  // Previous Education
  { name: 'previous_qualification', label: 'Previous Qualification', fieldType: 'TEXT', groupName: 'Education History' },
  { name: 'previous_institution', label: 'Previous Institution', fieldType: 'TEXT', groupName: 'Education History' },
  { name: 'previous_percentage', label: 'Previous Percentage/CGPA', fieldType: 'NUMBER', groupName: 'Education History' },
  { name: 'year_of_passing', label: 'Year of Passing', fieldType: 'NUMBER', groupName: 'Education History' },

  // Fee Information
  { name: 'total_fees', label: 'Total Fees', fieldType: 'CURRENCY', groupName: 'Financial', isRequired: false },
  { name: 'scholarship_amount', label: 'Scholarship Amount', fieldType: 'CURRENCY', groupName: 'Financial' },
  { name: 'fee_structure', label: 'Fee Structure', fieldType: 'SELECT', groupName: 'Financial', options: [
    { value: 'one_time', label: 'One Time' },
    { value: 'semester', label: 'Per Semester' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'emi', label: 'EMI' },
  ]},

  // Admission Status
  { name: 'admission_status', label: 'Admission Status', fieldType: 'SELECT', groupName: 'Admission', options: [
    { value: 'inquiry', label: 'Inquiry', color: '#6B7280' },
    { value: 'counseling', label: 'Counseling', color: '#3B82F6' },
    { value: 'document_pending', label: 'Document Pending', color: '#F59E0B' },
    { value: 'payment_pending', label: 'Payment Pending', color: '#EF4444' },
    { value: 'admitted', label: 'Admitted', color: '#10B981' },
    { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
  ]},
  { name: 'enrollment_number', label: 'Enrollment Number', fieldType: 'TEXT', groupName: 'Admission' },
  { name: 'counselor_name', label: 'Counselor Name', fieldType: 'TEXT', groupName: 'Admission' },

  // Dates
  { name: 'walkin_date', label: 'Walk-in Date', fieldType: 'DATE', groupName: 'Dates' },
  { name: 'counseling_date', label: 'Counseling Date', fieldType: 'DATE', groupName: 'Dates' },
  { name: 'admission_date', label: 'Admission Date', fieldType: 'DATE', groupName: 'Dates' },
];

// Real Estate Industry Fields
export const REAL_ESTATE_FIELDS: FieldTemplate[] = [
  // Property Interest
  { name: 'property_type', label: 'Property Type', fieldType: 'SELECT', groupName: 'Property Interest', options: [
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'plot', label: 'Plot' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'office', label: 'Office Space' },
    { value: 'shop', label: 'Shop' },
  ]},
  { name: 'property_purpose', label: 'Purpose', fieldType: 'SELECT', groupName: 'Property Interest', options: [
    { value: 'investment', label: 'Investment' },
    { value: 'self_use', label: 'Self Use' },
    { value: 'rental', label: 'Rental Income' },
  ]},
  { name: 'bhk_type', label: 'BHK Type', fieldType: 'SELECT', groupName: 'Property Interest', options: [
    { value: '1bhk', label: '1 BHK' },
    { value: '2bhk', label: '2 BHK' },
    { value: '3bhk', label: '3 BHK' },
    { value: '4bhk', label: '4 BHK' },
    { value: '5bhk+', label: '5+ BHK' },
  ]},
  { name: 'preferred_location', label: 'Preferred Location', fieldType: 'TEXT', groupName: 'Property Interest' },
  { name: 'carpet_area_min', label: 'Min Carpet Area (sq.ft)', fieldType: 'NUMBER', groupName: 'Property Interest' },
  { name: 'carpet_area_max', label: 'Max Carpet Area (sq.ft)', fieldType: 'NUMBER', groupName: 'Property Interest' },

  // Budget
  { name: 'budget_min', label: 'Minimum Budget', fieldType: 'CURRENCY', groupName: 'Financial' },
  { name: 'budget_max', label: 'Maximum Budget', fieldType: 'CURRENCY', groupName: 'Financial' },
  { name: 'payment_mode', label: 'Payment Mode', fieldType: 'SELECT', groupName: 'Financial', options: [
    { value: 'self_funded', label: 'Self Funded' },
    { value: 'home_loan', label: 'Home Loan' },
    { value: 'partial_loan', label: 'Partial Loan' },
  ]},
  { name: 'loan_required', label: 'Loan Required', fieldType: 'BOOLEAN', groupName: 'Financial' },
  { name: 'pre_approved', label: 'Pre-Approved Loan', fieldType: 'BOOLEAN', groupName: 'Financial' },

  // Timeline
  { name: 'possession_timeline', label: 'Possession Timeline', fieldType: 'SELECT', groupName: 'Timeline', options: [
    { value: 'immediate', label: 'Immediate' },
    { value: '3_months', label: '3 Months' },
    { value: '6_months', label: '6 Months' },
    { value: '1_year', label: '1 Year' },
    { value: 'flexible', label: 'Flexible' },
  ]},
  { name: 'site_visit_date', label: 'Site Visit Date', fieldType: 'DATE', groupName: 'Timeline' },
  { name: 'booking_date', label: 'Booking Date', fieldType: 'DATE', groupName: 'Timeline' },

  // Current Status
  { name: 'current_residence', label: 'Current Residence', fieldType: 'SELECT', groupName: 'Current Status', options: [
    { value: 'owned', label: 'Owned' },
    { value: 'rented', label: 'Rented' },
    { value: 'family', label: 'Family Home' },
  ]},
  { name: 'existing_property', label: 'Owns Existing Property', fieldType: 'BOOLEAN', groupName: 'Current Status' },
];

// Healthcare Industry Fields
export const HEALTHCARE_FIELDS: FieldTemplate[] = [
  // Patient Information
  { name: 'patient_type', label: 'Patient Type', fieldType: 'SELECT', groupName: 'Patient Info', options: [
    { value: 'self', label: 'Self' },
    { value: 'family', label: 'Family Member' },
    { value: 'other', label: 'Other' },
  ]},
  { name: 'blood_group', label: 'Blood Group', fieldType: 'SELECT', groupName: 'Patient Info', options: [
    { value: 'a_positive', label: 'A+' },
    { value: 'a_negative', label: 'A-' },
    { value: 'b_positive', label: 'B+' },
    { value: 'b_negative', label: 'B-' },
    { value: 'o_positive', label: 'O+' },
    { value: 'o_negative', label: 'O-' },
    { value: 'ab_positive', label: 'AB+' },
    { value: 'ab_negative', label: 'AB-' },
  ]},
  { name: 'emergency_contact', label: 'Emergency Contact', fieldType: 'PHONE', groupName: 'Patient Info' },
  { name: 'relation_to_patient', label: 'Relation to Patient', fieldType: 'TEXT', groupName: 'Patient Info' },

  // Medical Information
  { name: 'department', label: 'Department', fieldType: 'SELECT', groupName: 'Medical', options: [
    { value: 'general', label: 'General Medicine' },
    { value: 'cardiology', label: 'Cardiology' },
    { value: 'orthopedics', label: 'Orthopedics' },
    { value: 'neurology', label: 'Neurology' },
    { value: 'oncology', label: 'Oncology' },
    { value: 'pediatrics', label: 'Pediatrics' },
    { value: 'gynecology', label: 'Gynecology' },
    { value: 'dermatology', label: 'Dermatology' },
    { value: 'ent', label: 'ENT' },
    { value: 'ophthalmology', label: 'Ophthalmology' },
  ]},
  { name: 'chief_complaint', label: 'Chief Complaint', fieldType: 'TEXTAREA', groupName: 'Medical' },
  { name: 'symptoms', label: 'Symptoms', fieldType: 'TEXTAREA', groupName: 'Medical' },
  { name: 'medical_history', label: 'Medical History', fieldType: 'TEXTAREA', groupName: 'Medical' },
  { name: 'allergies', label: 'Known Allergies', fieldType: 'TEXT', groupName: 'Medical' },
  { name: 'current_medications', label: 'Current Medications', fieldType: 'TEXTAREA', groupName: 'Medical' },

  // Appointment
  { name: 'preferred_doctor', label: 'Preferred Doctor', fieldType: 'TEXT', groupName: 'Appointment' },
  { name: 'appointment_type', label: 'Appointment Type', fieldType: 'SELECT', groupName: 'Appointment', options: [
    { value: 'consultation', label: 'Consultation' },
    { value: 'follow_up', label: 'Follow Up' },
    { value: 'procedure', label: 'Procedure' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'telemedicine', label: 'Telemedicine' },
  ]},
  { name: 'appointment_date', label: 'Appointment Date', fieldType: 'DATETIME', groupName: 'Appointment' },
  { name: 'referred_by', label: 'Referred By', fieldType: 'TEXT', groupName: 'Appointment' },

  // Insurance
  { name: 'has_insurance', label: 'Has Insurance', fieldType: 'BOOLEAN', groupName: 'Insurance' },
  { name: 'insurance_provider', label: 'Insurance Provider', fieldType: 'TEXT', groupName: 'Insurance' },
  { name: 'policy_number', label: 'Policy Number', fieldType: 'TEXT', groupName: 'Insurance' },
  { name: 'insurance_coverage', label: 'Coverage Type', fieldType: 'SELECT', groupName: 'Insurance', options: [
    { value: 'full', label: 'Full Coverage' },
    { value: 'partial', label: 'Partial Coverage' },
    { value: 'cashless', label: 'Cashless' },
  ]},
];

// Insurance Industry Fields
export const INSURANCE_FIELDS: FieldTemplate[] = [
  // Policy Interest
  { name: 'insurance_type', label: 'Insurance Type', fieldType: 'SELECT', groupName: 'Policy Interest', options: [
    { value: 'life', label: 'Life Insurance' },
    { value: 'health', label: 'Health Insurance' },
    { value: 'vehicle', label: 'Vehicle Insurance' },
    { value: 'home', label: 'Home Insurance' },
    { value: 'travel', label: 'Travel Insurance' },
    { value: 'business', label: 'Business Insurance' },
  ]},
  { name: 'coverage_amount', label: 'Coverage Amount Required', fieldType: 'CURRENCY', groupName: 'Policy Interest' },
  { name: 'premium_budget', label: 'Premium Budget (Monthly)', fieldType: 'CURRENCY', groupName: 'Policy Interest' },
  { name: 'policy_term', label: 'Policy Term (Years)', fieldType: 'NUMBER', groupName: 'Policy Interest' },

  // Applicant Details
  { name: 'applicant_age', label: 'Applicant Age', fieldType: 'NUMBER', groupName: 'Applicant Details' },
  { name: 'occupation', label: 'Occupation', fieldType: 'TEXT', groupName: 'Applicant Details' },
  { name: 'annual_income', label: 'Annual Income', fieldType: 'CURRENCY', groupName: 'Applicant Details' },
  { name: 'smoking_status', label: 'Smoking Status', fieldType: 'SELECT', groupName: 'Applicant Details', options: [
    { value: 'non_smoker', label: 'Non-Smoker' },
    { value: 'smoker', label: 'Smoker' },
    { value: 'ex_smoker', label: 'Ex-Smoker' },
  ]},
  { name: 'existing_medical_conditions', label: 'Existing Medical Conditions', fieldType: 'TEXTAREA', groupName: 'Applicant Details' },

  // Family Details (for health/life insurance)
  { name: 'family_members', label: 'Family Members to Cover', fieldType: 'NUMBER', groupName: 'Family Details' },
  { name: 'spouse_age', label: 'Spouse Age', fieldType: 'NUMBER', groupName: 'Family Details' },
  { name: 'children_count', label: 'Number of Children', fieldType: 'NUMBER', groupName: 'Family Details' },
  { name: 'dependents', label: 'Other Dependents', fieldType: 'NUMBER', groupName: 'Family Details' },

  // Existing Policies
  { name: 'has_existing_policy', label: 'Has Existing Policy', fieldType: 'BOOLEAN', groupName: 'Existing Coverage' },
  { name: 'existing_insurer', label: 'Current Insurer', fieldType: 'TEXT', groupName: 'Existing Coverage' },
  { name: 'existing_coverage', label: 'Current Coverage Amount', fieldType: 'CURRENCY', groupName: 'Existing Coverage' },
  { name: 'policy_renewal_date', label: 'Policy Renewal Date', fieldType: 'DATE', groupName: 'Existing Coverage' },
];

// Automotive Industry Fields
export const AUTOMOTIVE_FIELDS: FieldTemplate[] = [
  // Vehicle Interest
  { name: 'vehicle_type', label: 'Vehicle Type', fieldType: 'SELECT', groupName: 'Vehicle Interest', options: [
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'hatchback', label: 'Hatchback' },
    { value: 'crossover', label: 'Crossover' },
    { value: 'mpv', label: 'MPV' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'commercial', label: 'Commercial' },
  ]},
  { name: 'vehicle_brand', label: 'Preferred Brand', fieldType: 'TEXT', groupName: 'Vehicle Interest' },
  { name: 'vehicle_model', label: 'Model Interested', fieldType: 'TEXT', groupName: 'Vehicle Interest' },
  { name: 'variant', label: 'Variant', fieldType: 'TEXT', groupName: 'Vehicle Interest' },
  { name: 'fuel_type', label: 'Fuel Type', fieldType: 'SELECT', groupName: 'Vehicle Interest', options: [
    { value: 'petrol', label: 'Petrol' },
    { value: 'diesel', label: 'Diesel' },
    { value: 'electric', label: 'Electric' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'cng', label: 'CNG' },
  ]},
  { name: 'transmission', label: 'Transmission', fieldType: 'SELECT', groupName: 'Vehicle Interest', options: [
    { value: 'manual', label: 'Manual' },
    { value: 'automatic', label: 'Automatic' },
    { value: 'cvt', label: 'CVT' },
    { value: 'imt', label: 'iMT' },
  ]},
  { name: 'color_preference', label: 'Color Preference', fieldType: 'TEXT', groupName: 'Vehicle Interest' },

  // Financial
  { name: 'vehicle_budget', label: 'Budget', fieldType: 'CURRENCY', groupName: 'Financial' },
  { name: 'down_payment', label: 'Down Payment', fieldType: 'CURRENCY', groupName: 'Financial' },
  { name: 'finance_required', label: 'Finance Required', fieldType: 'BOOLEAN', groupName: 'Financial' },
  { name: 'loan_tenure', label: 'Preferred Loan Tenure (Months)', fieldType: 'NUMBER', groupName: 'Financial' },

  // Exchange
  { name: 'has_exchange', label: 'Exchange Vehicle', fieldType: 'BOOLEAN', groupName: 'Exchange' },
  { name: 'exchange_brand', label: 'Exchange Vehicle Brand', fieldType: 'TEXT', groupName: 'Exchange' },
  { name: 'exchange_model', label: 'Exchange Vehicle Model', fieldType: 'TEXT', groupName: 'Exchange' },
  { name: 'exchange_year', label: 'Exchange Vehicle Year', fieldType: 'NUMBER', groupName: 'Exchange' },
  { name: 'exchange_kms', label: 'KMs Driven', fieldType: 'NUMBER', groupName: 'Exchange' },

  // Purchase Timeline
  { name: 'purchase_timeline', label: 'Purchase Timeline', fieldType: 'SELECT', groupName: 'Timeline', options: [
    { value: 'immediate', label: 'Immediate' },
    { value: '1_week', label: 'Within 1 Week' },
    { value: '1_month', label: 'Within 1 Month' },
    { value: '3_months', label: 'Within 3 Months' },
    { value: 'exploring', label: 'Just Exploring' },
  ]},
  { name: 'test_drive_date', label: 'Test Drive Date', fieldType: 'DATE', groupName: 'Timeline' },
  { name: 'preferred_dealership', label: 'Preferred Dealership', fieldType: 'TEXT', groupName: 'Timeline' },
];

// IT Services / B2B Fields
export const IT_SERVICES_FIELDS: FieldTemplate[] = [
  // Company Information
  { name: 'company_size', label: 'Company Size', fieldType: 'SELECT', groupName: 'Company Info', options: [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '500+', label: '500+ employees' },
  ]},
  { name: 'industry_vertical', label: 'Industry Vertical', fieldType: 'TEXT', groupName: 'Company Info' },
  { name: 'annual_it_budget', label: 'Annual IT Budget', fieldType: 'CURRENCY', groupName: 'Company Info' },
  { name: 'decision_maker', label: 'Decision Maker', fieldType: 'BOOLEAN', groupName: 'Company Info' },
  { name: 'decision_timeline', label: 'Decision Timeline', fieldType: 'SELECT', groupName: 'Company Info', options: [
    { value: 'immediate', label: 'Immediate' },
    { value: '1_month', label: '1 Month' },
    { value: '3_months', label: '3 Months' },
    { value: '6_months', label: '6 Months' },
    { value: 'next_year', label: 'Next Year' },
  ]},

  // Service Interest
  { name: 'service_type', label: 'Service Type', fieldType: 'MULTISELECT', groupName: 'Service Interest', options: [
    { value: 'web_dev', label: 'Web Development' },
    { value: 'mobile_app', label: 'Mobile App Development' },
    { value: 'cloud', label: 'Cloud Services' },
    { value: 'devops', label: 'DevOps' },
    { value: 'ai_ml', label: 'AI/ML' },
    { value: 'data', label: 'Data Analytics' },
    { value: 'security', label: 'Cybersecurity' },
    { value: 'consulting', label: 'IT Consulting' },
    { value: 'support', label: 'IT Support' },
  ]},
  { name: 'project_description', label: 'Project Description', fieldType: 'TEXTAREA', groupName: 'Service Interest' },
  { name: 'tech_stack', label: 'Preferred Tech Stack', fieldType: 'TEXT', groupName: 'Service Interest' },
  { name: 'project_budget', label: 'Project Budget', fieldType: 'CURRENCY', groupName: 'Service Interest' },
  { name: 'project_duration', label: 'Expected Duration (Months)', fieldType: 'NUMBER', groupName: 'Service Interest' },

  // Current Setup
  { name: 'current_systems', label: 'Current Systems Used', fieldType: 'TEXTAREA', groupName: 'Current Setup' },
  { name: 'pain_points', label: 'Pain Points', fieldType: 'TEXTAREA', groupName: 'Current Setup' },
  { name: 'competitors_evaluated', label: 'Competitors Evaluated', fieldType: 'TEXT', groupName: 'Current Setup' },
];

// Map industry type to field templates
export const INDUSTRY_FIELD_TEMPLATES: Record<string, FieldTemplate[]> = {
  EDUCATION: EDUCATION_FIELDS,
  REAL_ESTATE: REAL_ESTATE_FIELDS,
  HEALTHCARE: HEALTHCARE_FIELDS,
  INSURANCE: INSURANCE_FIELDS,
  AUTOMOTIVE: AUTOMOTIVE_FIELDS,
  IT_SERVICES: IT_SERVICES_FIELDS,
  // Default fields for custom/other industries
  CUSTOM: [
    { name: 'custom_field_1', label: 'Custom Field 1', fieldType: 'TEXT', groupName: 'Custom' },
    { name: 'custom_field_2', label: 'Custom Field 2', fieldType: 'TEXT', groupName: 'Custom' },
    { name: 'notes', label: 'Notes', fieldType: 'TEXTAREA', groupName: 'Custom' },
  ],
};

/**
 * Create field definitions for an organization based on industry
 */
export const createIndustryFields = async (
  organizationId: string,
  industryType: string
) => {
  const fields = INDUSTRY_FIELD_TEMPLATES[industryType] || INDUSTRY_FIELD_TEMPLATES.CUSTOM;

  const createdFields = [];

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];

    // Check if field already exists
    const existing = await prisma.fieldDefinition.findUnique({
      where: {
        organizationId_entityType_name: {
          organizationId,
          entityType: 'lead',
          name: field.name,
        },
      },
    });

    if (existing) {
      continue; // Skip if already exists
    }

    const created = await prisma.fieldDefinition.create({
      data: {
        organizationId,
        name: field.name,
        label: field.label,
        fieldType: field.fieldType as any,
        entityType: 'lead',
        isRequired: field.isRequired ?? false,
        options: field.options,
        groupName: field.groupName,
        helpText: field.helpText,
        displayWidth: field.displayWidth || 'half',
        displayOrder: i,
        isFromTemplate: true,
      },
    });

    createdFields.push(created);
  }

  return createdFields;
};

/**
 * Get available industry types with field counts
 */
export const getAvailableIndustries = () => {
  return Object.entries(INDUSTRY_FIELD_TEMPLATES).map(([industry, fields]) => ({
    industry,
    fieldCount: fields.length,
    groups: [...new Set(fields.map(f => f.groupName))],
  }));
};

/**
 * Get field templates for preview (without creating)
 */
export const getIndustryFieldsPreview = (industryType: string) => {
  return INDUSTRY_FIELD_TEMPLATES[industryType] || INDUSTRY_FIELD_TEMPLATES.CUSTOM;
};

/**
 * Delete industry fields for an organization
 */
export const deleteIndustryFields = async (organizationId: string) => {
  // Only delete template-created fields
  await prisma.fieldDefinition.deleteMany({
    where: {
      organizationId,
      isFromTemplate: true,
    },
  });
};

/**
 * Reset industry fields (delete and recreate)
 */
export const resetIndustryFields = async (
  organizationId: string,
  industryType: string
) => {
  await deleteIndustryFields(organizationId);
  return createIndustryFields(organizationId, industryType);
};

export default {
  createIndustryFields,
  getAvailableIndustries,
  getIndustryFieldsPreview,
  deleteIndustryFields,
  resetIndustryFields,
  INDUSTRY_FIELD_TEMPLATES,
};
