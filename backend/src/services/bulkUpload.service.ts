import ExcelJS from 'exceljs';
import { prisma } from '../config/database';
import { LeadSource, LeadPriority } from '@prisma/client';
import { BadRequestError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { rawImportService } from './rawImport.service';

// System fields available for mapping (organized by category for all industries)
export const SYSTEM_FIELDS = [
  // === REQUIRED FIELDS ===
  { key: 'firstName', label: 'First Name', required: true, category: 'Basic Info' },
  { key: 'phone', label: 'Phone', required: true, category: 'Basic Info' },

  // === BASIC CONTACT INFO ===
  { key: 'lastName', label: 'Last Name', required: false, category: 'Basic Info' },
  { key: 'email', label: 'Email', required: false, category: 'Basic Info' },
  { key: 'alternatePhone', label: 'Alternate Phone', required: false, category: 'Basic Info' },
  { key: 'whatsapp', label: 'WhatsApp', required: false, category: 'Basic Info' },
  { key: 'gender', label: 'Gender', required: false, category: 'Basic Info' },
  { key: 'dateOfBirth', label: 'Date of Birth', required: false, category: 'Basic Info' },
  { key: 'age', label: 'Age', required: false, category: 'Basic Info' },

  // === ADDRESS INFO ===
  { key: 'address', label: 'Address', required: false, category: 'Address' },
  { key: 'city', label: 'City', required: false, category: 'Address' },
  { key: 'state', label: 'State', required: false, category: 'Address' },
  { key: 'pincode', label: 'Pincode/ZIP', required: false, category: 'Address' },
  { key: 'country', label: 'Country', required: false, category: 'Address' },
  { key: 'district', label: 'District', required: false, category: 'Address' },
  { key: 'area', label: 'Area/Locality', required: false, category: 'Address' },

  // === FAMILY/GUARDIAN INFO (Education, Healthcare) ===
  { key: 'fatherName', label: 'Father Name', required: false, category: 'Family Info' },
  { key: 'fatherPhone', label: 'Father Phone', required: false, category: 'Family Info' },
  { key: 'fatherOccupation', label: 'Father Occupation', required: false, category: 'Family Info' },
  { key: 'motherName', label: 'Mother Name', required: false, category: 'Family Info' },
  { key: 'motherPhone', label: 'Mother Phone', required: false, category: 'Family Info' },
  { key: 'motherOccupation', label: 'Mother Occupation', required: false, category: 'Family Info' },
  { key: 'guardianName', label: 'Guardian Name', required: false, category: 'Family Info' },
  { key: 'guardianPhone', label: 'Guardian Phone', required: false, category: 'Family Info' },
  { key: 'guardianRelation', label: 'Guardian Relation', required: false, category: 'Family Info' },
  { key: 'spouseName', label: 'Spouse Name', required: false, category: 'Family Info' },
  { key: 'spousePhone', label: 'Spouse Phone', required: false, category: 'Family Info' },
  { key: 'familyIncome', label: 'Family Income', required: false, category: 'Family Info' },

  // === EDUCATION FIELDS ===
  { key: 'qualification', label: 'Qualification', required: false, category: 'Education' },
  { key: 'highestEducation', label: 'Highest Education', required: false, category: 'Education' },
  { key: 'course', label: 'Course/Program', required: false, category: 'Education' },
  { key: 'specialization', label: 'Specialization/Branch', required: false, category: 'Education' },
  { key: 'institution', label: 'Institution/College', required: false, category: 'Education' },
  { key: 'university', label: 'University/Board', required: false, category: 'Education' },
  { key: 'yearOfPassing', label: 'Year of Passing', required: false, category: 'Education' },
  { key: 'currentYear', label: 'Current Year/Semester', required: false, category: 'Education' },
  { key: 'marks', label: 'Marks/Percentage', required: false, category: 'Education' },
  { key: 'cgpa', label: 'CGPA/GPA', required: false, category: 'Education' },
  { key: 'rollNumber', label: 'Roll Number', required: false, category: 'Education' },
  { key: 'hallTicketNo', label: 'Hall Ticket No', required: false, category: 'Education' },
  { key: 'academicYear', label: 'Academic Year', required: false, category: 'Education' },
  { key: 'preferredCourse', label: 'Preferred Course', required: false, category: 'Education' },
  { key: 'preferredCollege', label: 'Preferred College', required: false, category: 'Education' },
  { key: 'admissionType', label: 'Admission Type', required: false, category: 'Education' },
  { key: 'entranceExam', label: 'Entrance Exam', required: false, category: 'Education' },
  { key: 'entranceRank', label: 'Entrance Rank/Score', required: false, category: 'Education' },
  { key: 'category', label: 'Category (OC/BC/SC/ST)', required: false, category: 'Education' },

  // === B2B/CORPORATE FIELDS ===
  { key: 'companyName', label: 'Company Name', required: false, category: 'Business' },
  { key: 'designation', label: 'Designation/Job Title', required: false, category: 'Business' },
  { key: 'department', label: 'Department', required: false, category: 'Business' },
  { key: 'industry', label: 'Industry Type', required: false, category: 'Business' },
  { key: 'companySize', label: 'Company Size', required: false, category: 'Business' },
  { key: 'website', label: 'Website', required: false, category: 'Business' },
  { key: 'linkedIn', label: 'LinkedIn URL', required: false, category: 'Business' },
  { key: 'gstNumber', label: 'GST Number', required: false, category: 'Business' },
  { key: 'panNumber', label: 'PAN Number', required: false, category: 'Business' },
  { key: 'annualRevenue', label: 'Annual Revenue', required: false, category: 'Business' },
  { key: 'decisionMaker', label: 'Decision Maker', required: false, category: 'Business' },

  // === EMPLOYMENT/HR FIELDS ===
  { key: 'occupation', label: 'Occupation', required: false, category: 'Employment' },
  { key: 'experience', label: 'Experience (Years)', required: false, category: 'Employment' },
  { key: 'skills', label: 'Skills', required: false, category: 'Employment' },
  { key: 'currentCTC', label: 'Current CTC/Salary', required: false, category: 'Employment' },
  { key: 'expectedCTC', label: 'Expected CTC', required: false, category: 'Employment' },
  { key: 'noticePeriod', label: 'Notice Period', required: false, category: 'Employment' },
  { key: 'employmentType', label: 'Employment Type', required: false, category: 'Employment' },
  { key: 'employmentStatus', label: 'Employment Status', required: false, category: 'Employment' },
  { key: 'preferredLocation', label: 'Preferred Location', required: false, category: 'Employment' },
  { key: 'resumeLink', label: 'Resume Link', required: false, category: 'Employment' },

  // === REAL ESTATE FIELDS ===
  { key: 'propertyType', label: 'Property Type', required: false, category: 'Real Estate' },
  { key: 'propertySize', label: 'Property Size (sqft)', required: false, category: 'Real Estate' },
  { key: 'bedrooms', label: 'Bedrooms (BHK)', required: false, category: 'Real Estate' },
  { key: 'propertyBudget', label: 'Property Budget', required: false, category: 'Real Estate' },
  { key: 'propertyLocation', label: 'Preferred Property Location', required: false, category: 'Real Estate' },
  { key: 'propertyPurpose', label: 'Purpose (Buy/Rent/Invest)', required: false, category: 'Real Estate' },
  { key: 'possessionTimeline', label: 'Possession Timeline', required: false, category: 'Real Estate' },
  { key: 'currentResidence', label: 'Current Residence Type', required: false, category: 'Real Estate' },
  { key: 'loanRequired', label: 'Home Loan Required', required: false, category: 'Real Estate' },

  // === HEALTHCARE/MEDICAL FIELDS ===
  { key: 'patientName', label: 'Patient Name', required: false, category: 'Healthcare' },
  { key: 'patientAge', label: 'Patient Age', required: false, category: 'Healthcare' },
  { key: 'patientRelation', label: 'Relation to Patient', required: false, category: 'Healthcare' },
  { key: 'symptoms', label: 'Symptoms/Condition', required: false, category: 'Healthcare' },
  { key: 'preferredDoctor', label: 'Preferred Doctor', required: false, category: 'Healthcare' },
  { key: 'preferredHospital', label: 'Preferred Hospital', required: false, category: 'Healthcare' },
  { key: 'appointmentType', label: 'Appointment Type', required: false, category: 'Healthcare' },
  { key: 'insuranceProvider', label: 'Insurance Provider', required: false, category: 'Healthcare' },
  { key: 'insuranceId', label: 'Insurance ID', required: false, category: 'Healthcare' },
  { key: 'medicalHistory', label: 'Medical History', required: false, category: 'Healthcare' },
  { key: 'bloodGroup', label: 'Blood Group', required: false, category: 'Healthcare' },

  // === INSURANCE/FINANCE FIELDS ===
  { key: 'annualIncome', label: 'Annual Income', required: false, category: 'Finance' },
  { key: 'monthlyIncome', label: 'Monthly Income', required: false, category: 'Finance' },
  { key: 'existingPolicies', label: 'Existing Policies', required: false, category: 'Finance' },
  { key: 'investmentAmount', label: 'Investment Amount', required: false, category: 'Finance' },
  { key: 'riskAppetite', label: 'Risk Appetite', required: false, category: 'Finance' },
  { key: 'loanAmount', label: 'Loan Amount Required', required: false, category: 'Finance' },
  { key: 'loanType', label: 'Loan Type', required: false, category: 'Finance' },
  { key: 'creditScore', label: 'Credit Score', required: false, category: 'Finance' },

  // === AUTOMOTIVE FIELDS ===
  { key: 'vehicleInterest', label: 'Vehicle Interest', required: false, category: 'Automotive' },
  { key: 'vehicleType', label: 'Vehicle Type', required: false, category: 'Automotive' },
  { key: 'vehicleBrand', label: 'Preferred Brand', required: false, category: 'Automotive' },
  { key: 'vehicleModel', label: 'Preferred Model', required: false, category: 'Automotive' },
  { key: 'vehicleBudget', label: 'Vehicle Budget', required: false, category: 'Automotive' },
  { key: 'currentVehicle', label: 'Current Vehicle', required: false, category: 'Automotive' },
  { key: 'exchangeVehicle', label: 'Exchange Vehicle', required: false, category: 'Automotive' },
  { key: 'financingPreferred', label: 'Financing Preferred', required: false, category: 'Automotive' },
  { key: 'purchaseTimeline', label: 'Purchase Timeline', required: false, category: 'Automotive' },

  // === TRAVEL/HOSPITALITY FIELDS ===
  { key: 'travelDestination', label: 'Travel Destination', required: false, category: 'Travel' },
  { key: 'travelDate', label: 'Travel Date', required: false, category: 'Travel' },
  { key: 'returnDate', label: 'Return Date', required: false, category: 'Travel' },
  { key: 'groupSize', label: 'Group Size', required: false, category: 'Travel' },
  { key: 'travelPurpose', label: 'Travel Purpose', required: false, category: 'Travel' },
  { key: 'travelBudget', label: 'Travel Budget', required: false, category: 'Travel' },
  { key: 'accommodationType', label: 'Accommodation Type', required: false, category: 'Travel' },
  { key: 'passportNumber', label: 'Passport Number', required: false, category: 'Travel' },
  { key: 'visaStatus', label: 'Visa Status', required: false, category: 'Travel' },

  // === E-COMMERCE/RETAIL FIELDS ===
  { key: 'productInterest', label: 'Product Interest', required: false, category: 'Retail' },
  { key: 'preferredBrand', label: 'Preferred Brand', required: false, category: 'Retail' },
  { key: 'purchaseBudget', label: 'Purchase Budget', required: false, category: 'Retail' },
  { key: 'orderQuantity', label: 'Order Quantity', required: false, category: 'Retail' },
  { key: 'deliveryAddress', label: 'Delivery Address', required: false, category: 'Retail' },
  { key: 'paymentMethod', label: 'Payment Method', required: false, category: 'Retail' },

  // === LEAD/CAMPAIGN INFO ===
  { key: 'source', label: 'Lead Source', required: false, category: 'Lead Info' },
  { key: 'campaign', label: 'Campaign Name', required: false, category: 'Lead Info' },
  { key: 'medium', label: 'Medium', required: false, category: 'Lead Info' },
  { key: 'referredBy', label: 'Referred By', required: false, category: 'Lead Info' },
  { key: 'interest', label: 'Interest/Product', required: false, category: 'Lead Info' },
  { key: 'budget', label: 'Budget', required: false, category: 'Lead Info' },
  { key: 'priority', label: 'Priority', required: false, category: 'Lead Info' },
  { key: 'leadScore', label: 'Lead Score', required: false, category: 'Lead Info' },
  { key: 'enquiryDate', label: 'Enquiry Date', required: false, category: 'Lead Info' },
  { key: 'followUpDate', label: 'Follow-up Date', required: false, category: 'Lead Info' },
  { key: 'notes', label: 'Notes/Comments', required: false, category: 'Lead Info' },
  { key: 'tags', label: 'Tags', required: false, category: 'Lead Info' },

  // === PREFERENCES ===
  { key: 'preferredLanguage', label: 'Preferred Language', required: false, category: 'Preferences' },
  { key: 'preferredContactTime', label: 'Preferred Contact Time', required: false, category: 'Preferences' },
  { key: 'preferredContactMethod', label: 'Preferred Contact Method', required: false, category: 'Preferences' },
  { key: 'timezone', label: 'Timezone', required: false, category: 'Preferences' },

  // === SECONDARY CONTACT (Generic) ===
  { key: 'secondaryContactName', label: 'Secondary Contact Name', required: false, category: 'Secondary Contact' },
  { key: 'secondaryContactPhone', label: 'Secondary Contact Phone', required: false, category: 'Secondary Contact' },
  { key: 'secondaryContactEmail', label: 'Secondary Contact Email', required: false, category: 'Secondary Contact' },
  { key: 'secondaryContactRelation', label: 'Relationship', required: false, category: 'Secondary Contact' },

  // === SPECIAL OPTIONS ===
  { key: 'customField', label: 'Custom Field', required: false, category: 'Other' },
  { key: 'skip', label: 'Skip/Ignore', required: false, category: 'Other' },
];

// Column mapping from user
export interface ColumnMapping {
  sourceColumn: string;
  targetField: string; // key from SYSTEM_FIELDS or 'customField' or 'skip'
  customFieldName?: string; // if targetField is 'customField', this is the name
}

// Preview result
export interface FilePreviewResult {
  columns: Array<{
    name: string;
    detectedAs: string;
    sampleValues: string[];
    confidence: number;
  }>;
  totalRows: number;
  systemFields: typeof SYSTEM_FIELDS;
}

interface ParsedLead {
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  whatsapp?: string;
  notes?: string;
  // Generic fields for all industries
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  companyName?: string;
  designation?: string;
  website?: string;
  source?: string;
  interest?: string;
  budget?: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  secondaryContactRelation?: string;
  customFields?: Record<string, unknown>;
}

interface BulkUploadResult {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  insertedLeads: number;
  duplicates: Array<{ phone: string; email?: string; reason: string }>;
  errors: Array<{ row: number; errors: string[] }>;
}

interface LeadWithAssignment {
  organizationId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  whatsapp?: string;
  source: LeadSource;
  priority: LeadPriority;
  notes?: string;
  // Generic fields
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  companyName?: string;
  designation?: string;
  website?: string;
  interest?: string;
  budget?: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  secondaryContactRelation?: string;
  customFields: Record<string, unknown>;
  counselorId?: string;
}

export class BulkUploadService {
  // Column aliases for auto-detection (comprehensive for all industries)
  private columnAliases: Record<string, string[]> = {
    // === BASIC INFO ===
    firstName: [
      'first_name', 'firstname', 'first name', 'given name', 'given_name',
      'name', 'student name', 'student_name', 'full name', 'fullname', 'full_name',
      'candidate name', 'candidate_name', 'applicant name', 'applicant_name',
      'lead name', 'lead_name', 'customer name', 'customer_name', 'person name',
      'contact name', 'contact_name', 'client name', 'client_name', 'naam',
      'patient name', 'patient_name', 'buyer name', 'buyer_name',
    ],
    lastName: ['last_name', 'lastname', 'last name', 'surname', 'family name', 'family_name'],
    email: [
      'email', 'email_address', 'email address', 'e-mail', 'e_mail', 'mail',
      'email id', 'email_id', 'emailid', 'primary email', 'primary_email',
    ],
    phone: [
      'phone', 'mobile', 'phone_number', 'phone number', 'mobile_number', 'mobile number',
      'contact', 'contact_number', 'contact number', 'cell', 'cell_number', 'cell number',
      'telephone', 'tel', 'primary phone', 'primary_phone', 'primary mobile',
      'mobile no', 'mobile_no', 'phone no', 'phone_no', 'contact no', 'contact_no',
      'number', 'mobile1', 'phone1',
    ],
    alternatePhone: [
      'alternate_phone', 'alternate phone', 'secondary phone', 'secondary_phone', 'alt_phone',
      'alternate mobile', 'alternate_mobile', 'phone2', 'mobile2', 'other phone', 'other_phone',
    ],
    whatsapp: ['whatsapp', 'whatsapp_number', 'whatsapp number', 'wa number', 'wa_number', 'whatsapp no'],
    gender: ['gender', 'sex', 'male/female', 'm/f'],
    dateOfBirth: [
      'dob', 'date of birth', 'date_of_birth', 'dateofbirth', 'birth date', 'birth_date',
      'birthdate', 'birthday',
    ],
    age: ['age', 'years', 'age_years'],

    // === ADDRESS ===
    address: [
      'address', 'full address', 'full_address', 'street address', 'street_address',
      'street', 'locality', 'house no', 'house_no', 'flat no', 'flat_no',
      'permanent address', 'permanent_address', 'residential address', 'residential_address',
    ],
    city: ['city', 'town', 'village', 'location', 'place'],
    district: ['district', 'dist', 'dist_name', 'district_name'],
    state: ['state', 'province', 'region', 'state_name'],
    pincode: [
      'pincode', 'pin code', 'pin_code', 'zip', 'zipcode', 'zip code', 'zip_code',
      'postal code', 'postal_code', 'postalcode',
    ],
    country: ['country', 'nation', 'country_name'],
    area: ['area', 'locality', 'neighborhood', 'sector', 'zone'],

    // === FAMILY INFO ===
    fatherName: [
      'father name', 'father_name', 'fathername', 'father', 'dad name', 'dad_name',
      'fname', 'f_name', 'f name', 'parent name', 'parent_name',
    ],
    fatherPhone: [
      'father phone', 'father_phone', 'fatherphone', 'father mobile', 'father_mobile',
      'fathermobile', 'parent phone', 'parent_phone', 'parent mobile', 'parent_mobile',
      'father contact', 'father_contact',
    ],
    fatherOccupation: [
      'father occupation', 'father_occupation', 'father job', 'father_job',
      'father profession', 'father_profession',
    ],
    motherName: [
      'mother name', 'mother_name', 'mothername', 'mother', 'mom name', 'mom_name',
      'mname', 'm_name', 'm name',
    ],
    motherPhone: [
      'mother phone', 'mother_phone', 'motherphone', 'mother mobile', 'mother_mobile',
      'mothermobile', 'mother contact', 'mother_contact',
    ],
    motherOccupation: [
      'mother occupation', 'mother_occupation', 'mother job', 'mother_job',
      'mother profession', 'mother_profession',
    ],
    guardianName: [
      'guardian name', 'guardian_name', 'guardianname', 'guardian',
    ],
    guardianPhone: [
      'guardian phone', 'guardian_phone', 'guardianphone', 'guardian mobile', 'guardian_mobile',
      'guardian contact', 'guardian_contact',
    ],
    guardianRelation: [
      'guardian relation', 'guardian_relation', 'relation with guardian',
    ],
    spouseName: ['spouse name', 'spouse_name', 'spousename', 'spouse', 'husband name', 'wife name'],
    spousePhone: ['spouse phone', 'spouse_phone', 'spouse mobile', 'spouse_mobile'],
    familyIncome: [
      'family income', 'family_income', 'household income', 'household_income',
      'annual family income', 'annual_family_income',
    ],

    // === EDUCATION ===
    qualification: [
      'qualification', 'degree', 'education', 'educational qualification',
      'educational_qualification', 'highest qualification', 'highest_qualification',
    ],
    highestEducation: [
      'highest education', 'highest_education', 'education level', 'education_level',
    ],
    course: [
      'course', 'course name', 'course_name', 'program', 'programme', 'course interested',
      'interested course', 'interested_course', 'preferred course', 'preferred_course',
    ],
    specialization: [
      'specialization', 'branch', 'stream', 'major', 'specialisation', 'department',
      'spec', 'subject',
    ],
    institution: [
      'institution', 'college', 'college name', 'college_name', 'collegename',
      'school', 'school name', 'school_name', 'institute', 'institute name', 'institute_name',
    ],
    university: [
      'university', 'board', 'university name', 'university_name', 'board name', 'board_name',
      'affiliated to', 'affiliated_to',
    ],
    yearOfPassing: [
      'year of passing', 'year_of_passing', 'passing year', 'passing_year',
      'graduation year', 'graduation_year', 'pass out year', 'passout year',
    ],
    currentYear: [
      'current year', 'current_year', 'year', 'semester', 'current semester', 'current_semester',
      'studying in', 'class', 'standard',
    ],
    marks: [
      'marks', 'percentage', 'percent', 'score', 'marks obtained', 'marks_obtained',
      'aggregate', 'overall marks', 'overall_marks',
    ],
    cgpa: ['cgpa', 'gpa', 'cg', 'grade', 'grade point', 'grade_point'],
    rollNumber: [
      'roll number', 'roll_number', 'rollno', 'roll no', 'roll', 'registration number',
      'registration_number', 'reg no', 'reg_no',
    ],
    hallTicketNo: [
      'hall ticket', 'hall_ticket', 'hallticket', 'hall ticket no', 'hall_ticket_no',
      'ht no', 'ht_no', 'htno',
    ],
    academicYear: [
      'academic year', 'academic_year', 'ay', 'session', 'batch', 'batch year', 'batch_year',
    ],
    preferredCourse: [
      'preferred course', 'preferred_course', 'course preference', 'course_preference',
      'interested in course', 'want to study',
    ],
    preferredCollege: [
      'preferred college', 'preferred_college', 'college preference', 'college_preference',
      'interested college', 'target college',
    ],
    admissionType: [
      'admission type', 'admission_type', 'seat type', 'seat_type', 'quota',
      'admission category', 'admission_category',
    ],
    entranceExam: [
      'entrance exam', 'entrance_exam', 'entrance', 'exam name', 'exam_name',
      'competitive exam', 'competitive_exam',
    ],
    entranceRank: [
      'entrance rank', 'entrance_rank', 'rank', 'entrance score', 'entrance_score',
      'exam rank', 'exam_rank', 'exam score', 'exam_score',
    ],
    category: [
      'category', 'caste', 'caste category', 'caste_category', 'social category',
      'oc', 'bc', 'sc', 'st', 'obc', 'reservation category',
    ],

    // === B2B/CORPORATE ===
    companyName: [
      'company', 'company name', 'company_name', 'organization', 'org', 'org name', 'org_name',
      'business', 'business name', 'business_name', 'employer', 'firm', 'firm name',
    ],
    designation: [
      'designation', 'title', 'job title', 'job_title', 'position', 'role', 'job role',
      'job_role',
    ],
    department: ['department', 'dept', 'division', 'team'],
    industry: [
      'industry', 'industry type', 'industry_type', 'sector', 'business type', 'business_type',
    ],
    companySize: [
      'company size', 'company_size', 'employee count', 'employee_count', 'team size', 'team_size',
      'no of employees', 'no_of_employees',
    ],
    website: ['website', 'web', 'url', 'site', 'company website', 'company_website', 'web address'],
    linkedIn: ['linkedin', 'linkedin url', 'linkedin_url', 'linkedin profile', 'linkedin_profile'],
    gstNumber: ['gst', 'gst number', 'gst_number', 'gstin', 'gst no', 'gst_no'],
    panNumber: ['pan', 'pan number', 'pan_number', 'pan no', 'pan_no', 'pan card'],
    annualRevenue: [
      'annual revenue', 'annual_revenue', 'revenue', 'turnover', 'annual turnover', 'annual_turnover',
    ],
    decisionMaker: [
      'decision maker', 'decision_maker', 'dm', 'key decision maker', 'authority',
    ],

    // === EMPLOYMENT/HR ===
    occupation: ['occupation', 'profession', 'job', 'work', 'employment'],
    experience: [
      'experience', 'exp', 'years of experience', 'years_of_experience', 'work experience',
      'work_experience', 'total experience', 'total_experience',
    ],
    skills: ['skills', 'skill set', 'skill_set', 'skillset', 'key skills', 'key_skills'],
    currentCTC: [
      'current ctc', 'current_ctc', 'currentctc', 'current salary', 'current_salary',
      'present salary', 'present_salary', 'ctc', 'salary',
    ],
    expectedCTC: [
      'expected ctc', 'expected_ctc', 'expectedctc', 'expected salary', 'expected_salary',
      'desired ctc', 'desired_ctc', 'desired salary', 'desired_salary',
    ],
    noticePeriod: [
      'notice period', 'notice_period', 'noticeperiod', 'notice', 'np',
      'serving notice', 'serving_notice',
    ],
    employmentType: [
      'employment type', 'employment_type', 'job type', 'job_type', 'work type', 'work_type',
    ],
    employmentStatus: [
      'employment status', 'employment_status', 'working status', 'working_status',
      'currently working', 'currently_working', 'fresher/experienced',
    ],
    preferredLocation: [
      'preferred location', 'preferred_location', 'location preference', 'location_preference',
      'desired location', 'desired_location', 'work location', 'work_location',
    ],
    resumeLink: [
      'resume link', 'resume_link', 'resume url', 'resume_url', 'cv link', 'cv_link',
      'resume', 'cv',
    ],

    // === REAL ESTATE ===
    propertyType: [
      'property type', 'property_type', 'type of property', 'flat/house/plot', 'unit type',
    ],
    propertySize: [
      'property size', 'property_size', 'size', 'sqft', 'sq ft', 'square feet', 'area sqft',
    ],
    bedrooms: ['bedrooms', 'bhk', 'beds', 'no of bedrooms', 'no_of_bedrooms', 'bed rooms'],
    propertyBudget: [
      'property budget', 'property_budget', 'budget range', 'budget_range', 'price range',
    ],
    propertyLocation: [
      'property location', 'property_location', 'preferred property location',
      'project location', 'project_location',
    ],
    propertyPurpose: [
      'property purpose', 'property_purpose', 'purpose', 'buy/rent', 'buy or rent',
      'looking for', 'requirement type',
    ],
    possessionTimeline: [
      'possession timeline', 'possession_timeline', 'when to buy', 'timeline',
      'possession date', 'possession_date', 'moving date',
    ],
    currentResidence: [
      'current residence', 'current_residence', 'staying in', 'residence type', 'residence_type',
    ],
    loanRequired: [
      'loan required', 'loan_required', 'home loan', 'home_loan', 'need loan', 'finance required',
    ],

    // === HEALTHCARE ===
    patientName: ['patient name', 'patient_name', 'patientname', 'patient'],
    patientAge: ['patient age', 'patient_age', 'patientage'],
    patientRelation: [
      'patient relation', 'patient_relation', 'relation to patient', 'booking for',
    ],
    symptoms: ['symptoms', 'condition', 'health issue', 'health_issue', 'complaint', 'problem'],
    preferredDoctor: [
      'preferred doctor', 'preferred_doctor', 'doctor', 'doctor name', 'doctor_name',
      'consultant', 'specialist',
    ],
    preferredHospital: [
      'preferred hospital', 'preferred_hospital', 'hospital', 'hospital name', 'hospital_name',
      'clinic', 'clinic name',
    ],
    appointmentType: [
      'appointment type', 'appointment_type', 'consultation type', 'consultation_type',
      'visit type', 'visit_type',
    ],
    insuranceProvider: [
      'insurance provider', 'insurance_provider', 'insurance company', 'insurance_company',
      'insurance', 'health insurance',
    ],
    insuranceId: [
      'insurance id', 'insurance_id', 'policy number', 'policy_number', 'policy no', 'policy_no',
    ],
    medicalHistory: [
      'medical history', 'medical_history', 'health history', 'health_history',
      'past medical history', 'pmh',
    ],
    bloodGroup: ['blood group', 'blood_group', 'bloodgroup', 'blood type', 'blood_type'],

    // === FINANCE/INSURANCE ===
    annualIncome: [
      'annual income', 'annual_income', 'yearly income', 'yearly_income', 'income per year',
    ],
    monthlyIncome: [
      'monthly income', 'monthly_income', 'income per month', 'monthly salary',
    ],
    existingPolicies: [
      'existing policies', 'existing_policies', 'current policies', 'current_policies',
      'existing insurance', 'existing_insurance',
    ],
    investmentAmount: [
      'investment amount', 'investment_amount', 'investment', 'amount to invest',
    ],
    riskAppetite: [
      'risk appetite', 'risk_appetite', 'risk profile', 'risk_profile', 'risk tolerance',
    ],
    loanAmount: [
      'loan amount', 'loan_amount', 'loan required amount', 'amount required', 'finance amount',
    ],
    loanType: ['loan type', 'loan_type', 'type of loan', 'loan category', 'loan_category'],
    creditScore: ['credit score', 'credit_score', 'cibil', 'cibil score', 'cibil_score'],

    // === AUTOMOTIVE ===
    vehicleInterest: [
      'vehicle interest', 'vehicle_interest', 'interested vehicle', 'interested_vehicle',
    ],
    vehicleType: [
      'vehicle type', 'vehicle_type', 'type of vehicle', 'car/bike', 'segment',
    ],
    vehicleBrand: [
      'vehicle brand', 'vehicle_brand', 'brand', 'make', 'manufacturer', 'car brand',
    ],
    vehicleModel: [
      'vehicle model', 'vehicle_model', 'model', 'car model', 'bike model', 'variant',
    ],
    vehicleBudget: [
      'vehicle budget', 'vehicle_budget', 'car budget', 'bike budget', 'budget for vehicle',
    ],
    currentVehicle: [
      'current vehicle', 'current_vehicle', 'existing vehicle', 'existing_vehicle',
      'present vehicle', 'present_vehicle',
    ],
    exchangeVehicle: [
      'exchange vehicle', 'exchange_vehicle', 'trade in', 'trade_in', 'exchange',
    ],
    financingPreferred: [
      'financing preferred', 'financing_preferred', 'finance option', 'finance_option',
      'loan preferred', 'loan_preferred', 'payment mode',
    ],
    purchaseTimeline: [
      'purchase timeline', 'purchase_timeline', 'when to purchase', 'buying timeline',
      'buying_timeline', 'expected purchase',
    ],

    // === TRAVEL ===
    travelDestination: [
      'travel destination', 'travel_destination', 'destination', 'going to', 'travel to',
    ],
    travelDate: [
      'travel date', 'travel_date', 'departure date', 'departure_date', 'start date',
      'journey date', 'journey_date',
    ],
    returnDate: ['return date', 'return_date', 'coming back', 'end date', 'end_date'],
    groupSize: [
      'group size', 'group_size', 'no of travelers', 'no_of_travelers', 'pax',
      'number of people', 'travellers',
    ],
    travelPurpose: [
      'travel purpose', 'travel_purpose', 'purpose of travel', 'trip type', 'trip_type',
      'travel type', 'travel_type',
    ],
    travelBudget: [
      'travel budget', 'travel_budget', 'trip budget', 'trip_budget', 'package budget',
    ],
    accommodationType: [
      'accommodation type', 'accommodation_type', 'hotel type', 'hotel_type',
      'stay type', 'stay_type', 'accommodation',
    ],
    passportNumber: [
      'passport number', 'passport_number', 'passportno', 'passport no', 'passport_no',
      'passport',
    ],
    visaStatus: ['visa status', 'visa_status', 'visa', 'visa type', 'visa_type'],

    // === E-COMMERCE/RETAIL ===
    productInterest: [
      'product interest', 'product_interest', 'interested product', 'interested_product',
      'product name', 'product_name', 'item interest',
    ],
    preferredBrand: [
      'preferred brand', 'preferred_brand', 'brand preference', 'brand_preference',
      'favorite brand', 'favourite brand',
    ],
    purchaseBudget: [
      'purchase budget', 'purchase_budget', 'shopping budget', 'shopping_budget',
    ],
    orderQuantity: [
      'order quantity', 'order_quantity', 'quantity', 'qty', 'no of units', 'no_of_units',
    ],
    deliveryAddress: [
      'delivery address', 'delivery_address', 'shipping address', 'shipping_address',
    ],
    paymentMethod: [
      'payment method', 'payment_method', 'mode of payment', 'payment mode', 'payment_mode',
    ],

    // === LEAD/CAMPAIGN INFO ===
    source: [
      'source', 'lead source', 'lead_source', 'origin', 'channel',
      'where did you hear', 'how did you find',
    ],
    campaign: ['campaign', 'campaign name', 'campaign_name', 'marketing campaign'],
    medium: ['medium', 'utm medium', 'utm_medium', 'marketing medium'],
    referredBy: [
      'referred by', 'referred_by', 'referral', 'referrer', 'reference', 'reference by',
    ],
    interest: [
      'interest', 'interested in', 'interested_in', 'product', 'product interest', 'product_interest',
      'service', 'service interest', 'requirement', 'looking for', 'looking_for',
    ],
    budget: ['budget', 'amount', 'price range', 'price_range', 'investment'],
    priority: ['priority', 'lead priority', 'lead_priority', 'urgency', 'importance'],
    leadScore: ['lead score', 'lead_score', 'score', 'rating'],
    enquiryDate: [
      'enquiry date', 'enquiry_date', 'inquiry date', 'inquiry_date', 'date of enquiry',
      'enquiry on', 'enquiry_on',
    ],
    followUpDate: [
      'follow up date', 'follow_up_date', 'followup date', 'followup_date', 'next followup',
      'next follow up', 'callback date', 'callback_date',
    ],
    notes: ['notes', 'comments', 'remarks', 'description', 'note', 'comment', 'remark', 'message'],
    tags: ['tags', 'tag', 'labels', 'label'],

    // === PREFERENCES ===
    preferredLanguage: [
      'preferred language', 'preferred_language', 'language', 'communication language',
    ],
    preferredContactTime: [
      'preferred contact time', 'preferred_contact_time', 'best time to call', 'contact time',
      'preferred time', 'preferred_time',
    ],
    preferredContactMethod: [
      'preferred contact method', 'preferred_contact_method', 'contact method', 'contact_method',
      'how to contact', 'contact via',
    ],
    timezone: ['timezone', 'time zone', 'time_zone', 'tz'],

    // === SECONDARY CONTACT ===
    secondaryContactName: [
      'secondary contact', 'secondary_contact', 'secondary contact name', 'secondary_contact_name',
      'emergency contact', 'emergency_contact', 'alternate contact name',
    ],
    secondaryContactPhone: [
      'secondary phone', 'secondary_phone', 'secondary contact phone', 'secondary_contact_phone',
      'emergency phone', 'emergency_phone', 'emergency contact phone', 'alternate contact phone',
    ],
    secondaryContactEmail: [
      'secondary email', 'secondary_email', 'secondary contact email', 'secondary_contact_email',
      'alternate email', 'alternate_email',
    ],
    secondaryContactRelation: [
      'relationship', 'relation', 'contact relation', 'contact_relation', 'relation type',
      'relation_type', 'secondary relation',
    ],
  };

  // Preview file - returns columns with auto-detected mappings and sample data
  async previewFile(buffer: Buffer, mimetype: string): Promise<FilePreviewResult> {
    const workbook = new ExcelJS.Workbook();
    let headers: string[] = [];
    let dataRows: Record<string, unknown>[] = [];

    try {
      if (mimetype === 'text/csv') {
        const csvContent = buffer.toString('utf-8');
        const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
          throw new BadRequestError('File is empty or has no valid data rows');
        }
        headers = this.parseCSVLine(lines[0]);
        for (let i = 1; i < Math.min(lines.length, 6); i++) { // Get 5 sample rows
          const values = this.parseCSVLine(lines[i]);
          const row: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          dataRows.push(row);
        }
      } else {
        await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount < 2) {
          throw new BadRequestError('File is empty or has no valid data rows');
        }
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          headers[colNumber - 1] = String(cell.value || `Column${colNumber}`);
        });
        let rowCount = 0;
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1 || rowCount >= 5) return;
          const rowData: Record<string, unknown> = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1] || `Column${colNumber}`;
            rowData[header] = cell.value ?? '';
          });
          dataRows.push(rowData);
          rowCount++;
        });
      }
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      throw new BadRequestError('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
    }

    // Detect column types
    const detectedTypes = this.detectColumnTypesAdvanced(headers, dataRows);

    // Build column preview
    const columns = headers.map((header) => {
      const sampleValues = dataRows
        .map((row) => String(row[header] || ''))
        .filter((v) => v.trim() !== '')
        .slice(0, 3);

      const detected = detectedTypes[header] || { field: 'customField', confidence: 0 };

      return {
        name: header,
        detectedAs: detected.field,
        sampleValues,
        confidence: detected.confidence,
      };
    });

    // Count total rows
    let totalRows = dataRows.length;
    if (mimetype === 'text/csv') {
      const csvContent = buffer.toString('utf-8');
      totalRows = csvContent.split(/\r?\n/).filter(line => line.trim()).length - 1;
    } else {
      const workbook2 = new ExcelJS.Workbook();
      await workbook2.xlsx.load(buffer as unknown as ArrayBuffer);
      totalRows = Math.max(0, workbook2.worksheets[0]?.rowCount - 1 || 0);
    }

    return {
      columns,
      totalRows,
      systemFields: SYSTEM_FIELDS,
    };
  }

  // Advanced column type detection using both header names and values
  private detectColumnTypesAdvanced(
    headers: string[],
    dataRows: Record<string, unknown>[]
  ): Record<string, { field: string; confidence: number }> {
    const result: Record<string, { field: string; confidence: number }> = {};

    for (const header of headers) {
      const headerLower = header.toLowerCase().trim();
      let bestMatch = { field: 'customField', confidence: 0 };

      // Check header name against aliases
      for (const [field, aliases] of Object.entries(this.columnAliases)) {
        for (const alias of aliases) {
          if (headerLower === alias.toLowerCase()) {
            bestMatch = { field, confidence: 100 };
            break;
          }
          if (headerLower.includes(alias.toLowerCase()) || alias.toLowerCase().includes(headerLower)) {
            const conf = Math.min(90, 50 + (alias.length / headerLower.length) * 30);
            if (conf > bestMatch.confidence) {
              bestMatch = { field, confidence: Math.round(conf) };
            }
          }
        }
        if (bestMatch.confidence === 100) break;
      }

      // If no header match, try value-based detection
      if (bestMatch.confidence < 50 && dataRows.length > 0) {
        const values = dataRows.map((row) => String(row[header] || '')).filter((v) => v.trim());
        const valueDetection = this.detectFieldFromValues(values);
        if (valueDetection.confidence > bestMatch.confidence) {
          bestMatch = valueDetection;
        }
      }

      result[header] = bestMatch;
    }

    return result;
  }

  // Detect field type from values
  private detectFieldFromValues(values: string[]): { field: string; confidence: number } {
    if (values.length === 0) return { field: 'customField', confidence: 0 };

    let phoneCount = 0;
    let emailCount = 0;
    let nameCount = 0;

    for (const value of values) {
      const trimmed = value.trim();
      const normalized = trimmed.replace(/[\s\-\(\)\.]/g, '');

      if (/^\+?\d{7,15}$/.test(normalized)) phoneCount++;
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) emailCount++;
      if (/^[a-zA-Z\s\.]{2,50}$/.test(trimmed) && !trimmed.includes('@')) nameCount++;
    }

    const total = values.length;
    const threshold = 0.5;

    if (phoneCount / total >= threshold) {
      return { field: 'phone', confidence: Math.round((phoneCount / total) * 100) };
    }
    if (emailCount / total >= threshold) {
      return { field: 'email', confidence: Math.round((emailCount / total) * 100) };
    }
    if (nameCount / total >= threshold) {
      return { field: 'firstName', confidence: Math.round((nameCount / total) * 80) };
    }

    return { field: 'customField', confidence: 0 };
  }

  // Parse Excel/CSV file
  async parseFile(buffer: Buffer, mimetype: string): Promise<ParsedLead[]> {
    const workbook = new ExcelJS.Workbook();

    try {
      if (mimetype === 'text/csv') {
        // For CSV, parse manually since exceljs csv.read requires a stream
        const csvContent = buffer.toString('utf-8');
        const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
          throw new BadRequestError('File is empty or has no valid data rows');
        }

        // Parse CSV header and rows
        const headers = this.parseCSVLine(lines[0]);
        const jsonData: Record<string, unknown>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = this.parseCSVLine(lines[i]);
          const row: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          jsonData.push(row);
        }

        return this.mapToLeads(jsonData);
      } else {
        // Pass buffer directly - exceljs accepts Node.js Buffer
        await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
      }
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      throw new BadRequestError('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      throw new BadRequestError('File is empty or has no valid data rows');
    }

    // Convert worksheet to JSON
    const jsonData: Record<string, unknown>[] = [];
    const headers: string[] = [];

    // Get headers from first row
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value || `Column${colNumber}`);
    });

    // Get data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1] || `Column${colNumber}`;
        rowData[header] = cell.value ?? '';
      });

      // Fill in missing columns with empty string
      headers.forEach(header => {
        if (!(header in rowData)) {
          rowData[header] = '';
        }
      });

      jsonData.push(rowData);
    });

    if (jsonData.length === 0) {
      throw new BadRequestError('File is empty or has no valid data rows');
    }

    return this.mapToLeads(jsonData);
  }

  // Helper to parse CSV line handling quoted values
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  // Map raw data to lead format
  private mapToLeads(data: Record<string, unknown>[]): ParsedLead[] {
    // Separate mappings for first name only vs full name columns
    const firstNameOnlyAliases = [
      'first_name', 'firstname', 'first name', 'given name', 'given_name'
    ];
    const fullNameAliases = [
      'name', 'student name', 'student_name', 'full name', 'fullname', 'full_name',
      'candidate name', 'candidate_name', 'applicant name', 'applicant_name',
      'lead name', 'lead_name', 'customer name', 'customer_name', 'person name',
      'contact name', 'contact_name', 'naam', 'student', 'candidate', 'applicant',
      'person', 'user', 'user_name', 'username', 'stu_name', 'stuname'
    ];

    const columnMappings: Record<string, string[]> = {
      firstName: [...firstNameOnlyAliases, ...fullNameAliases],
      lastName: ['last_name', 'lastname', 'last name', 'surname', 'family name', 'family_name'],
      email: [
        'email', 'email_address', 'email address', 'e-mail', 'e_mail', 'mail',
        'email id', 'email_id', 'emailid', 'student email', 'student_email',
        'contact email', 'contact_email', 'primary email', 'primary_email'
      ],
      phone: [
        'phone', 'mobile', 'phone_number', 'phone number', 'mobile_number', 'mobile number',
        'contact', 'contact_number', 'contact number', 'cell', 'cell_number', 'cell number',
        'telephone', 'tel', 'tel_number', 'primary phone', 'primary_phone', 'primary mobile',
        'student phone', 'student_phone', 'student mobile', 'student_mobile',
        'whatsapp', 'whatsapp_number', 'whatsapp number', 'wa number', 'wa_number',
        'mobile no', 'mobile_no', 'phone no', 'phone_no', 'contact no', 'contact_no',
        'mob', 'mob_no', 'mob no', 'ph', 'ph_no', 'ph no', 'number', 'mobile1', 'phone1',
        'stu_mobileno', 'stumobileno', 'stu mobileno', 'stu_mobile', 'stumobile', 'stu mobile',
        'mobileno', 'mobile_no', 'phoneno'
      ],
      alternatePhone: [
        'alternate_phone', 'alternate phone', 'secondary phone', 'secondary_phone', 'alt_phone',
        'alternate mobile', 'alternate_mobile', 'phone2', 'mobile2', 'other phone', 'other_phone',
        'guardian phone', 'guardian_phone', 'emergency contact', 'emergency_contact'
      ],
      notes: ['notes', 'comments', 'remarks', 'description', 'note', 'comment', 'remark'],
      // Education-specific field mappings
      fatherName: [
        'fname', 'f_name', 'f name', 'father name', 'father_name', 'fathername',
        'father', 'dad name', 'dad_name', 'parent name', 'parent_name'
      ],
      motherName: [
        'mname', 'm_name', 'm name', 'mother name', 'mother_name', 'mothername',
        'mother', 'mom name', 'mom_name'
      ],
      fatherPhone: [
        'father phone', 'father_phone', 'fatherphone', 'father mobile', 'father_mobile',
        'fathermobile', 'parent phone', 'parent_phone', 'parent mobile', 'parent_mobile'
      ],
      motherPhone: [
        'mother phone', 'mother_phone', 'motherphone', 'mother mobile', 'mother_mobile',
        'mothermobile'
      ],
      gender: ['gender', 'sex', 'male/female', 'm/f'],
      dateOfBirth: [
        'dob', 'date of birth', 'date_of_birth', 'dateofbirth', 'birth date', 'birth_date',
        'birthdate', 'birthday'
      ],
      address: [
        'address', 'full address', 'full_address', 'street address', 'street_address',
        'stu_address', 'stuaddress', 'student address', 'student_address',
        'hno', 'house no', 'house_no', 'houseno', 'street', 'locality', 'area'
      ],
      city: ['city', 'town', 'village', 'stu_dist_name', 'district', 'dist'],
      state: ['state', 'province', 'region'],
      pincode: [
        'pincode', 'pin code', 'pin_code', 'zip', 'zipcode', 'zip code', 'zip_code',
        'postal code', 'postal_code', 'postalcode'
      ],
      country: ['country', 'nation'],
      companyName: [
        'collegename', 'college name', 'college_name', 'institution', 'institution name',
        'institution_name', 'school', 'school name', 'school_name', 'university',
        'university name', 'university_name', 'company', 'company name', 'company_name',
        'organization', 'org', 'org name', 'org_name'
      ],
    };

    // Fields to exclude from customFields (internal/technical codes)
    const excludeFromCustomFields = new Set([
      'college_code', 'collegecode', 'new_coll_code', 'newcollcode', 'new coll code',
      'collegedistrict', 'college district', 'college_district',
      'rollno', 'roll no', 'roll_no', 'roll number', 'roll_number',
      'admission_no', 'admissionno', 'admission no', 'admission number',
      'category', 'caste', 'religion', 'nationality', 'blood_group', 'bloodgroup',
      'aadhar', 'aadhaar', 'aadhar_no', 'aadhaar_no', 'pan', 'pan_no',
      'serial', 'sr_no', 'srno', 'sl_no', 'slno', 's_no', 'sno', 'id', 'row_id',
    ]);

    // First pass: detect column types from values if headers don't match
    const detectedColumns = this.detectColumnTypes(data);

    return data.map((row) => {
      const lead: ParsedLead = {
        firstName: '',
        phone: '',
      };

      const customFields: Record<string, unknown> = {};
      const usedKeys = new Set<string>();
      let nameSourceIsFullName = false;

      // Map standard fields by header name
      for (const [field, aliases] of Object.entries(columnMappings)) {
        for (const alias of aliases) {
          const key = Object.keys(row).find(
            (k) => k.toLowerCase().trim() === alias.toLowerCase()
          );
          if (key && row[key]) {
            (lead as unknown as Record<string, unknown>)[field] = String(row[key]).trim();
            usedKeys.add(key);
            // Track if firstName came from a full name column
            if (field === 'firstName' && fullNameAliases.includes(alias.toLowerCase())) {
              nameSourceIsFullName = true;
            }
            break;
          }
        }
      }

      // Smart detection: If phone not found by header, use detected phone column
      if (!lead.phone && detectedColumns.phoneColumn) {
        const phoneValue = row[detectedColumns.phoneColumn];
        if (phoneValue) {
          lead.phone = String(phoneValue).trim();
          usedKeys.add(detectedColumns.phoneColumn);
        }
      }

      // Smart detection: If email not found by header, use detected email column
      if (!lead.email && detectedColumns.emailColumn) {
        const emailValue = row[detectedColumns.emailColumn];
        if (emailValue) {
          lead.email = String(emailValue).trim();
          usedKeys.add(detectedColumns.emailColumn);
        }
      }

      // Smart detection: If name not found by header, use detected name column or first text column
      if (!lead.firstName && detectedColumns.nameColumn) {
        const nameValue = row[detectedColumns.nameColumn];
        if (nameValue) {
          lead.firstName = String(nameValue).trim();
          usedKeys.add(detectedColumns.nameColumn);
          nameSourceIsFullName = true; // Detected columns are usually full names
        }
      }

      // FIX: Handle duplicate name issue - ALWAYS check if lastName is duplicated in firstName
      // This handles both: 1) full name columns 2) separate firstName/lastName columns with duplicate data
      if (lead.lastName && lead.firstName) {
        const firstNameUpper = lead.firstName.toUpperCase().trim();
        const lastNameUpper = lead.lastName.toUpperCase().trim();

        // Check if lastName is already contained in firstName (duplicate entry)
        // e.g., firstName="VASANTHA VENKATA SAIRAM", lastName="VENKATA SAIRAM" -> clear lastName
        if (firstNameUpper.includes(lastNameUpper) || firstNameUpper.endsWith(lastNameUpper)) {
          lead.lastName = undefined;
        }
        // Also check reverse: if firstName is contained in lastName (rare but possible)
        // e.g., firstName="REDDY", lastName="LOKESH REDDY" -> swap and clear
        else if (lastNameUpper.includes(firstNameUpper) && lastNameUpper.length > firstNameUpper.length) {
          lead.firstName = lead.lastName;
          lead.lastName = undefined;
        }
      }

      // If we have a full name but no lastName, try to split intelligently
      if (nameSourceIsFullName && lead.firstName && !lead.lastName) {
        const nameParts = lead.firstName.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          // Keep first part(s) as firstName, last part as lastName
          // For names like "SHAIK SHABBEER ALI", keep "SHAIK SHABBEER" as first, "ALI" as last
          lead.lastName = nameParts.pop();
          lead.firstName = nameParts.join(' ');
        }
      }

      // Collect remaining fields as custom fields (excluding technical/internal codes)
      for (const [key, value] of Object.entries(row)) {
        if (!usedKeys.has(key) && value) {
          const keyLower = key.toLowerCase().trim().replace(/[\s_-]+/g, '_');
          // Skip technical/internal fields
          if (!excludeFromCustomFields.has(keyLower) && !excludeFromCustomFields.has(key.toLowerCase().trim())) {
            customFields[key] = value;
          }
        }
      }

      if (Object.keys(customFields).length > 0) {
        lead.customFields = customFields;
      }

      return lead;
    });
  }

  // Detect column types by analyzing cell values
  private detectColumnTypes(data: Record<string, unknown>[]): {
    phoneColumn?: string;
    emailColumn?: string;
    nameColumn?: string;
  } {
    if (data.length === 0) return {};

    const sampleSize = Math.min(10, data.length);
    const sampleRows = data.slice(0, sampleSize);
    const columns = Object.keys(data[0]);

    const columnScores: Record<string, { phone: number; email: number; name: number }> = {};

    for (const col of columns) {
      columnScores[col] = { phone: 0, email: 0, name: 0 };

      for (const row of sampleRows) {
        const value = row[col];
        if (!value) continue;

        const strValue = String(value).trim();

        // Check if value looks like a phone number
        const normalizedPhone = strValue.replace(/[\s\-\(\)\.]/g, '');
        if (/^\+?\d{7,15}$/.test(normalizedPhone)) {
          columnScores[col].phone++;
        }

        // Check if value looks like an email
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
          columnScores[col].email++;
        }

        // Check if value looks like a name (alphabetic with spaces, 2-50 chars)
        if (/^[a-zA-Z\s\.]{2,50}$/.test(strValue) && !strValue.includes('@')) {
          columnScores[col].name++;
        }
      }
    }

    // Find best matching columns (>50% of samples should match)
    const threshold = sampleSize * 0.5;
    let phoneColumn: string | undefined;
    let emailColumn: string | undefined;
    let nameColumn: string | undefined;

    let maxPhoneScore = 0;
    let maxEmailScore = 0;
    let maxNameScore = 0;

    for (const [col, scores] of Object.entries(columnScores)) {
      if (scores.phone > threshold && scores.phone > maxPhoneScore) {
        maxPhoneScore = scores.phone;
        phoneColumn = col;
      }
      if (scores.email > threshold && scores.email > maxEmailScore) {
        maxEmailScore = scores.email;
        emailColumn = col;
      }
      if (scores.name > threshold && scores.name > maxNameScore) {
        maxNameScore = scores.name;
        nameColumn = col;
      }
    }

    return { phoneColumn, emailColumn, nameColumn };
  }

  // Validate leads
  validateLeads(leads: ParsedLead[]): {
    valid: ParsedLead[];
    invalid: Array<{ row: number; errors: string[] }>;
  } {
    const valid: ParsedLead[] = [];
    const invalid: Array<{ row: number; errors: string[] }> = [];

    leads.forEach((lead, index) => {
      const errors: string[] = [];

      if (!lead.firstName || lead.firstName.trim() === '') {
        errors.push('First name is required');
      }

      if (!lead.phone || lead.phone.trim() === '') {
        errors.push('Phone number is required');
      } else {
        // Normalize phone number (remove spaces, dashes, etc.)
        lead.phone = this.normalizePhone(lead.phone);
        if (!this.isValidPhone(lead.phone)) {
          errors.push('Invalid phone number format');
        }
      }

      if (lead.email && !this.isValidEmail(lead.email)) {
        errors.push('Invalid email format');
      }

      if (errors.length > 0) {
        invalid.push({ row: index + 2, errors }); // +2 for header row and 0-index
      } else {
        valid.push(lead);
      }
    });

    return { valid, invalid };
  }

  // Check for duplicates against existing database records
  async detectDuplicates(
    organizationId: string,
    leads: ParsedLead[]
  ): Promise<{
    unique: ParsedLead[];
    duplicates: Array<{ phone: string; email?: string; reason: string }>;
  }> {
    const phones = leads.map((l) => l.phone);
    const emails = leads.filter((l) => l.email).map((l) => l.email!.toLowerCase());

    // Batch size to avoid PostgreSQL bind variable limit (max 32767)
    const BATCH_SIZE = 10000;
    const existingPhones = new Set<string>();
    const existingEmails = new Set<string>();

    // Query phones in batches
    for (let i = 0; i < phones.length; i += BATCH_SIZE) {
      const phoneBatch = phones.slice(i, i + BATCH_SIZE);
      const results = await prisma.lead.findMany({
        where: {
          organizationId,
          phone: { in: phoneBatch },
        },
        select: { phone: true },
      });
      results.forEach((l) => existingPhones.add(l.phone));
    }

    // Query emails in batches
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const emailBatch = emails.slice(i, i + BATCH_SIZE);
      const results = await prisma.lead.findMany({
        where: {
          organizationId,
          email: { in: emailBatch, mode: 'insensitive' },
        },
        select: { email: true },
      });
      results.forEach((l) => {
        if (l.email) existingEmails.add(l.email.toLowerCase());
      });
    }

    const unique: ParsedLead[] = [];
    const duplicates: Array<{ phone: string; email?: string; reason: string }> = [];
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();

    for (const lead of leads) {
      let isDuplicate = false;
      let reason = '';

      // Check against database
      if (existingPhones.has(lead.phone)) {
        isDuplicate = true;
        reason = 'Phone number already exists in database';
      } else if (lead.email && existingEmails.has(lead.email.toLowerCase())) {
        isDuplicate = true;
        reason = 'Email already exists in database';
      }
      // Check against current batch (internal duplicates)
      else if (seenPhones.has(lead.phone)) {
        isDuplicate = true;
        reason = 'Duplicate phone number in uploaded file';
      } else if (lead.email && seenEmails.has(lead.email.toLowerCase())) {
        isDuplicate = true;
        reason = 'Duplicate email in uploaded file';
      }

      if (isDuplicate) {
        duplicates.push({ phone: lead.phone, email: lead.email, reason });
      } else {
        unique.push(lead);
        seenPhones.add(lead.phone);
        if (lead.email) {
          seenEmails.add(lead.email.toLowerCase());
        }
      }
    }

    return { unique, duplicates };
  }

  // Round-robin lead distribution
  async distributLeads(
    organizationId: string,
    leads: ParsedLead[],
    counselorIds?: string[]
  ): Promise<LeadWithAssignment[]> {
    // Get counselors if not provided
    let counselors: { id: string; activeLeadCount: number }[];

    if (counselorIds && counselorIds.length > 0) {
      // Use provided counselor IDs
      const users = await prisma.user.findMany({
        where: {
          id: { in: counselorIds },
          organizationId,
          isActive: true,
        },
        select: {
          id: true,
          _count: {
            select: {
              leadAssignments: { where: { isActive: true } },
            },
          },
        },
      });

      counselors = users.map((u) => ({
        id: u.id,
        activeLeadCount: u._count.leadAssignments,
      }));
    } else {
      // Get all active counselors
      const users = await prisma.user.findMany({
        where: {
          organizationId,
          role: { slug: 'counselor' },
          isActive: true,
        },
        select: {
          id: true,
          _count: {
            select: {
              leadAssignments: { where: { isActive: true } },
            },
          },
        },
      });

      counselors = users.map((u) => ({
        id: u.id,
        activeLeadCount: u._count.leadAssignments,
      }));
    }

    if (counselors.length === 0) {
      // No counselors available, return leads without assignment
      return leads.map((lead) => ({
        organizationId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        alternatePhone: lead.alternatePhone,
        source: LeadSource.BULK_UPLOAD,
        priority: LeadPriority.MEDIUM,
        notes: lead.notes,
        // Extended fields
        fatherName: lead.fatherName,
        motherName: lead.motherName,
        fatherPhone: lead.fatherPhone,
        motherPhone: lead.motherPhone,
        gender: lead.gender,
        dateOfBirth: lead.dateOfBirth,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        pincode: lead.pincode,
        country: lead.country,
        companyName: lead.companyName,
        customFields: lead.customFields || {},
      }));
    }

    // Sort by workload (ascending)
    counselors.sort((a, b) => a.activeLeadCount - b.activeLeadCount);

    // Distribute leads using round-robin
    return leads.map((lead, index) => {
      const counselorIndex = index % counselors.length;
      return {
        organizationId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        alternatePhone: lead.alternatePhone,
        source: LeadSource.BULK_UPLOAD,
        priority: LeadPriority.MEDIUM,
        notes: lead.notes,
        // Extended fields
        fatherName: lead.fatherName,
        motherName: lead.motherName,
        fatherPhone: lead.fatherPhone,
        motherPhone: lead.motherPhone,
        gender: lead.gender,
        dateOfBirth: lead.dateOfBirth,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        pincode: lead.pincode,
        country: lead.country,
        companyName: lead.companyName,
        customFields: lead.customFields || {},
        counselorId: counselors[counselorIndex].id,
      };
    });
  }

  // Bulk insert leads with assignments - OPTIMIZED with createMany
  async bulkInsert(
    leads: LeadWithAssignment[],
    assignedById?: string
  ): Promise<number> {
    const BATCH_SIZE = 5000; // Larger batches are fine with createMany
    let insertedCount = 0;

    // Process in batches
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);

      // Pre-generate UUIDs for leads so we can create assignments
      const leadsWithIds = batch.map((leadData) => {
        const { counselorId, ...leadFields } = leadData;
        return {
          id: uuidv4(),
          counselorId,
          leadFields,
        };
      });

      // Prepare lead data for createMany
      const leadRecords = leadsWithIds.map((item) => ({
        id: item.id,
        ...item.leadFields,
      }));

      // Prepare assignment data for createMany
      const assignmentRecords = leadsWithIds
        .filter((item) => item.counselorId)
        .map((item) => ({
          id: uuidv4(),
          leadId: item.id,
          assignedToId: item.counselorId!,
          assignedById,
          isActive: true,
        }));

      // Use transaction to insert both leads and assignments
      await prisma.$transaction(async (tx) => {
        // Bulk insert leads
        await tx.lead.createMany({
          data: leadRecords as any,
          skipDuplicates: true,
        });

        // Bulk insert assignments if any
        if (assignmentRecords.length > 0) {
          await tx.leadAssignment.createMany({
            data: assignmentRecords as any,
            skipDuplicates: true,
          });
        }
      }, {
        timeout: 300000, // 5 minute timeout per batch
      });

      insertedCount += batch.length;
      console.log(`[BulkUpload] Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} leads (Total: ${insertedCount}/${leads.length})`);
    }

    return insertedCount;
  }

  // Main bulk upload process
  async processUpload(
    organizationId: string,
    buffer: Buffer,
    mimetype: string,
    counselorIds?: string[],
    assignedById?: string
  ): Promise<BulkUploadResult> {
    // 1. Parse file
    const parsedLeads = await this.parseFile(buffer, mimetype);

    // 2. Validate leads
    const { valid, invalid } = this.validateLeads(parsedLeads);

    // 3. Detect duplicates
    const { unique, duplicates } = await this.detectDuplicates(organizationId, valid);

    // 4. Distribute leads
    const leadsWithAssignments = await this.distributLeads(
      organizationId,
      unique,
      counselorIds
    );

    // 5. Bulk insert
    const insertedCount = await this.bulkInsert(leadsWithAssignments, assignedById);

    return {
      totalRows: parsedLeads.length,
      validRows: valid.length,
      duplicateRows: duplicates.length,
      invalidRows: invalid.length,
      insertedLeads: insertedCount,
      duplicates,
      errors: invalid,
    };
  }

  // Helper functions
  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)\.]/g, '');
  }

  private isValidPhone(phone: string): boolean {
    // Allow numbers with optional + prefix, 7-15 digits
    return /^\+?\d{7,15}$/.test(phone);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Process upload to Raw Import Records (new flow)
  async processUploadToRaw(
    organizationId: string,
    uploadedById: string,
    buffer: Buffer,
    mimetype: string,
    fileName: string,
    fileSize: number
  ): Promise<{
    bulkImportId: string;
    totalRows: number;
    validRows: number;
    duplicateRows: number;
    invalidRows: number;
    insertedRecords: number;
  }> {
    // 1. Parse file
    const parsedRecords = await this.parseFile(buffer, mimetype);
    console.log(`[BulkUpload] Parsed ${parsedRecords.length} records from file`);
    if (parsedRecords.length > 0) {
      console.log(`[BulkUpload] Sample parsed record:`, JSON.stringify(parsedRecords[0]));
    }

    // 2. Validate records
    const { valid, invalid } = this.validateLeads(parsedRecords);
    console.log(`[BulkUpload] Validation: ${valid.length} valid, ${invalid.length} invalid`);
    if (invalid.length > 0 && invalid.length <= 5) {
      console.log(`[BulkUpload] Invalid records:`, JSON.stringify(invalid));
    } else if (invalid.length > 5) {
      console.log(`[BulkUpload] First 5 invalid records:`, JSON.stringify(invalid.slice(0, 5)));
    }

    // 3. Detect duplicates at tenant level (check against both leads AND raw_import_records)
    const recordsForDuplicateCheck = valid.map((r) => ({
      phone: r.phone,
      email: r.email,
    }));
    const { unique, duplicates } = await rawImportService.detectDuplicates(
      organizationId,
      recordsForDuplicateCheck,
      { skipRawImportCheck: false } // Check against all existing records in the organization
    );
    console.log(`[BulkUpload] Duplicate detection: ${unique.length} unique, ${duplicates.length} duplicates`);

    // Filter valid records to only unique ones
    const uniquePhones = new Set(unique.map((u) => u.phone));
    const uniqueRecords = valid.filter((r) => uniquePhones.has(r.phone));

    // 4. Create BulkImport record
    const bulkImport = await rawImportService.createBulkImport({
      organizationId,
      uploadedById,
      fileName,
      fileSize,
      mimeType: mimetype,
      totalRows: parsedRecords.length,
      validRows: valid.length,
      invalidRows: invalid.length,
      duplicateRows: duplicates.length,
    });

    // 5. Insert into RawImportRecord (NOT leads)
    const insertedCount = await rawImportService.createRecords(
      bulkImport.id,
      organizationId,
      uniqueRecords.map((record) => ({
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phone: record.phone,
        alternatePhone: record.alternatePhone,
        customFields: record.customFields,
      }))
    );

    console.log(`[BulkUpload] Created raw import ${bulkImport.id} with ${insertedCount} records`);

    return {
      bulkImportId: bulkImport.id,
      totalRows: parsedRecords.length,
      validRows: valid.length,
      duplicateRows: duplicates.length,
      invalidRows: invalid.length,
      insertedRecords: insertedCount,
    };
  }

  // Process upload with user-defined column mappings
  async processUploadWithMappings(
    organizationId: string,
    uploadedById: string,
    buffer: Buffer,
    mimetype: string,
    fileName: string,
    fileSize: number,
    columnMappings: ColumnMapping[]
  ): Promise<{
    bulkImportId: string;
    totalRows: number;
    validRows: number;
    duplicateRows: number;
    invalidRows: number;
    insertedRecords: number;
  }> {
    // 1. Parse raw data from file
    const rawData = await this.parseRawData(buffer, mimetype);
    console.log(`[BulkUpload] Parsed ${rawData.length} raw rows from file`);

    // 2. Apply user's column mappings
    const parsedRecords = this.applyColumnMappings(rawData, columnMappings);
    console.log(`[BulkUpload] Applied mappings to ${parsedRecords.length} records`);
    if (parsedRecords.length > 0) {
      console.log(`[BulkUpload] Sample mapped record:`, JSON.stringify(parsedRecords[0]));
    }

    // 3. Validate records
    const { valid, invalid } = this.validateLeads(parsedRecords);
    console.log(`[BulkUpload] Validation: ${valid.length} valid, ${invalid.length} invalid`);

    // 4. Detect duplicates
    const recordsForDuplicateCheck = valid.map((r) => ({
      phone: r.phone,
      email: r.email,
    }));
    const { unique, duplicates } = await rawImportService.detectDuplicates(
      organizationId,
      recordsForDuplicateCheck,
      { skipRawImportCheck: false }
    );
    console.log(`[BulkUpload] Duplicate detection: ${unique.length} unique, ${duplicates.length} duplicates`);

    // Filter valid records to only unique ones
    const uniquePhones = new Set(unique.map((u) => u.phone));
    const uniqueRecords = valid.filter((r) => uniquePhones.has(r.phone));

    // 5. Create BulkImport record
    const bulkImport = await rawImportService.createBulkImport({
      organizationId,
      uploadedById,
      fileName,
      fileSize,
      mimeType: mimetype,
      totalRows: parsedRecords.length,
      validRows: valid.length,
      invalidRows: invalid.length,
      duplicateRows: duplicates.length,
    });

    // 6. Insert into RawImportRecord
    const insertedCount = await rawImportService.createRecords(
      bulkImport.id,
      organizationId,
      uniqueRecords.map((record) => ({
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phone: record.phone,
        alternatePhone: record.alternatePhone,
        customFields: record.customFields,
      }))
    );

    console.log(`[BulkUpload] Created raw import ${bulkImport.id} with ${insertedCount} records`);

    return {
      bulkImportId: bulkImport.id,
      totalRows: parsedRecords.length,
      validRows: valid.length,
      duplicateRows: duplicates.length,
      invalidRows: invalid.length,
      insertedRecords: insertedCount,
    };
  }

  // Parse raw data without mapping (returns raw row objects)
  private async parseRawData(buffer: Buffer, mimetype: string): Promise<Record<string, unknown>[]> {
    const workbook = new ExcelJS.Workbook();
    const jsonData: Record<string, unknown>[] = [];

    try {
      if (mimetype === 'text/csv') {
        const csvContent = buffer.toString('utf-8');
        const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
          throw new BadRequestError('File is empty or has no valid data rows');
        }
        const headers = this.parseCSVLine(lines[0]);
        for (let i = 1; i < lines.length; i++) {
          const values = this.parseCSVLine(lines[i]);
          const row: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          jsonData.push(row);
        }
      } else {
        await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount < 2) {
          throw new BadRequestError('File is empty or has no valid data rows');
        }
        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          headers[colNumber - 1] = String(cell.value || `Column${colNumber}`);
        });
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowData: Record<string, unknown> = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1] || `Column${colNumber}`;
            rowData[header] = cell.value ?? '';
          });
          headers.forEach(header => {
            if (!(header in rowData)) {
              rowData[header] = '';
            }
          });
          jsonData.push(rowData);
        });
      }
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      throw new BadRequestError('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
    }

    return jsonData;
  }

  // Apply user's column mappings to raw data
  private applyColumnMappings(
    rawData: Record<string, unknown>[],
    columnMappings: ColumnMapping[]
  ): ParsedLead[] {
    return rawData.map((row) => {
      const lead: ParsedLead = {
        firstName: '',
        phone: '',
      };
      const customFields: Record<string, unknown> = {};

      for (const mapping of columnMappings) {
        const value = row[mapping.sourceColumn];
        if (value === undefined || value === null || String(value).trim() === '') continue;

        const strValue = String(value).trim();

        if (mapping.targetField === 'skip') {
          continue;
        } else if (mapping.targetField === 'customField') {
          const fieldName = mapping.customFieldName || mapping.sourceColumn;
          customFields[fieldName] = strValue;
        } else {
          // Map to system field
          (lead as unknown as Record<string, unknown>)[mapping.targetField] = strValue;
        }
      }

      // Handle full name splitting if lastName is not provided
      if (lead.firstName && !lead.lastName) {
        const nameParts = lead.firstName.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          lead.lastName = nameParts.pop();
          lead.firstName = nameParts.join(' ');
        }
      }

      // Normalize phone number
      if (lead.phone) {
        lead.phone = this.normalizePhone(lead.phone);
      }

      if (Object.keys(customFields).length > 0) {
        lead.customFields = customFields;
      }

      return lead;
    });
  }
}

export const bulkUploadService = new BulkUploadService();
