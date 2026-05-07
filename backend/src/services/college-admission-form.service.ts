import { prisma } from '../config/database';
import { AppError } from '../utils/errors';

// ==================== DTOs ====================

interface FormField {
  key: string;
  label: string;
  fieldType: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'radio' | 'checkbox' | 'file';
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select, radio, checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  helpText?: string;
  gridSpan?: number; // 1, 2 for layout
}

interface FormSection {
  name: string;
  description?: string;
  fields: string[]; // Array of field keys
}

interface CreateCollegeFormDto {
  organizationId: string;
  universityId: string;
  collegeId?: string;
  courseId?: string;
  formName: string;
  description?: string;
  formFields: FormField[];
  sections?: FormSection[];
}

interface UpdateCollegeFormDto {
  formName?: string;
  description?: string;
  formFields?: FormField[];
  sections?: FormSection[];
  isActive?: boolean;
}

// ==================== Service ====================

class CollegeAdmissionFormService {
  // Create a new form for a college/university
  async createForm(data: CreateCollegeFormDto) {
    // Check if form already exists for this combination
    const existing = await prisma.collegeAdmissionForm.findFirst({
      where: {
        organizationId: data.organizationId,
        universityId: data.universityId,
        collegeId: data.collegeId || null,
        courseId: data.courseId || null,
      },
    });

    if (existing) {
      throw new AppError(
        'A form already exists for this university/college/course combination. Please edit the existing form.',
        400
      );
    }

    // Validate form fields
    this.validateFormFields(data.formFields);

    const form = await prisma.collegeAdmissionForm.create({
      data: {
        organizationId: data.organizationId,
        universityId: data.universityId,
        collegeId: data.collegeId,
        courseId: data.courseId,
        formName: data.formName,
        description: data.description,
        formFields: data.formFields as any,
        sections: (data.sections || []) as any,
      },
    });

    return form;
  }

  // Get form by ID
  async getFormById(id: string) {
    const form = await prisma.collegeAdmissionForm.findUnique({
      where: { id },
    });

    if (!form) {
      throw new AppError('Form not found', 404);
    }

    return form;
  }

  // Get form for a specific university/college/course (hierarchical lookup)
  async getFormForCollege(organizationId: string, universityId: string, collegeId?: string, courseId?: string) {
    // Try to find the most specific form first
    const form = await prisma.collegeAdmissionForm.findFirst({
      where: {
        organizationId,
        universityId,
        isActive: true,
        OR: [
          // Most specific: course level
          { collegeId, courseId },
          // College level (no specific course)
          { collegeId, courseId: null },
          // University default (no college or course)
          { collegeId: null, courseId: null },
        ],
      },
      orderBy: [
        { courseId: 'desc' }, // Course-specific first
        { collegeId: 'desc' }, // Then college-specific
      ],
    });

    return form;
  }

  // List all forms for an organization
  async listForms(params: {
    organizationId: string;
    universityId?: string;
    collegeId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { organizationId, universityId, collegeId, isActive, page = 1, limit = 20 } = params;

    const where: any = { organizationId };

    if (universityId) where.universityId = universityId;
    if (collegeId) where.collegeId = collegeId;
    if (isActive !== undefined) where.isActive = isActive;

    const [forms, total] = await Promise.all([
      prisma.collegeAdmissionForm.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.collegeAdmissionForm.count({ where }),
    ]);

    return {
      forms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Update form
  async updateForm(id: string, data: UpdateCollegeFormDto) {
    const form = await prisma.collegeAdmissionForm.findUnique({
      where: { id },
    });

    if (!form) {
      throw new AppError('Form not found', 404);
    }

    // Validate form fields if provided
    if (data.formFields) {
      this.validateFormFields(data.formFields);
    }

    const updated = await prisma.collegeAdmissionForm.update({
      where: { id },
      data: {
        formName: data.formName,
        description: data.description,
        formFields: data.formFields as any,
        sections: data.sections as any,
        isActive: data.isActive,
      },
    });

    return updated;
  }

  // Delete form
  async deleteForm(id: string) {
    const form = await prisma.collegeAdmissionForm.findUnique({
      where: { id },
    });

    if (!form) {
      throw new AppError('Form not found', 404);
    }

    await prisma.collegeAdmissionForm.delete({
      where: { id },
    });

    return { message: 'Form deleted successfully' };
  }

  // Clone form (copy from one college to another)
  async cloneForm(sourceId: string, targetData: { collegeId?: string; courseId?: string; formName: string }) {
    const sourceForm = await prisma.collegeAdmissionForm.findUnique({
      where: { id: sourceId },
    });

    if (!sourceForm) {
      throw new AppError('Source form not found', 404);
    }

    // Check if target already has a form
    const existing = await prisma.collegeAdmissionForm.findFirst({
      where: {
        organizationId: sourceForm.organizationId,
        universityId: sourceForm.universityId,
        collegeId: targetData.collegeId || null,
        courseId: targetData.courseId || null,
      },
    });

    if (existing) {
      throw new AppError('A form already exists for the target college/course', 400);
    }

    const cloned = await prisma.collegeAdmissionForm.create({
      data: {
        organizationId: sourceForm.organizationId,
        universityId: sourceForm.universityId,
        collegeId: targetData.collegeId,
        courseId: targetData.courseId,
        formName: targetData.formName,
        description: sourceForm.description,
        formFields: sourceForm.formFields as any,
        sections: sourceForm.sections as any,
      },
    });

    return cloned;
  }

  // Get default form template with common fields
  getDefaultFormTemplate(): FormField[] {
    return [
      // Personal Information
      { key: 'studentName', label: 'Student Full Name', fieldType: 'text', required: true, gridSpan: 2 },
      { key: 'dateOfBirth', label: 'Date of Birth', fieldType: 'date', required: true },
      { key: 'gender', label: 'Gender', fieldType: 'select', required: true, options: ['Male', 'Female', 'Other'] },
      { key: 'category', label: 'Category', fieldType: 'select', required: true, options: ['General', 'OBC', 'SC', 'ST', 'EWS'] },
      { key: 'religion', label: 'Religion', fieldType: 'text', required: false },
      { key: 'nationality', label: 'Nationality', fieldType: 'text', required: true },

      // Contact Information
      { key: 'studentPhone', label: 'Student Phone', fieldType: 'phone', required: true },
      { key: 'studentEmail', label: 'Student Email', fieldType: 'email', required: false },
      { key: 'address', label: 'Address', fieldType: 'textarea', required: true, gridSpan: 2 },
      { key: 'city', label: 'City', fieldType: 'text', required: true },
      { key: 'state', label: 'State', fieldType: 'text', required: true },
      { key: 'pincode', label: 'PIN Code', fieldType: 'text', required: true },

      // Parent Information
      { key: 'fatherName', label: "Father's Name", fieldType: 'text', required: true },
      { key: 'fatherPhone', label: "Father's Phone", fieldType: 'phone', required: true },
      { key: 'fatherOccupation', label: "Father's Occupation", fieldType: 'text', required: false },
      { key: 'motherName', label: "Mother's Name", fieldType: 'text', required: false },
      { key: 'motherPhone', label: "Mother's Phone", fieldType: 'phone', required: false },
      { key: 'annualIncome', label: 'Annual Family Income', fieldType: 'select', required: false, options: ['Below 1 Lakh', '1-3 Lakhs', '3-5 Lakhs', '5-10 Lakhs', 'Above 10 Lakhs'] },

      // Academic Information
      { key: 'qualifyingExam', label: 'Qualifying Examination', fieldType: 'text', required: true },
      { key: 'hallTicketNumber', label: 'Hall Ticket / Roll Number', fieldType: 'text', required: false },
      { key: 'passingYear', label: 'Year of Passing', fieldType: 'number', required: true },
      { key: 'percentage', label: 'Percentage / CGPA', fieldType: 'text', required: true },
      { key: 'boardUniversity', label: 'Board / University', fieldType: 'text', required: true },

      // Identity
      { key: 'aadhaarNumber', label: 'Aadhaar Number', fieldType: 'text', required: false, validation: { pattern: '^[0-9]{12}$', message: 'Enter valid 12-digit Aadhaar' } },
    ];
  }

  // Get default sections template
  getDefaultSectionsTemplate(): FormSection[] {
    return [
      {
        name: 'Personal Information',
        description: 'Basic details of the student',
        fields: ['studentName', 'dateOfBirth', 'gender', 'category', 'religion', 'nationality'],
      },
      {
        name: 'Contact Information',
        description: 'Address and contact details',
        fields: ['studentPhone', 'studentEmail', 'address', 'city', 'state', 'pincode'],
      },
      {
        name: 'Parent/Guardian Information',
        description: 'Details of parents or guardian',
        fields: ['fatherName', 'fatherPhone', 'fatherOccupation', 'motherName', 'motherPhone', 'annualIncome'],
      },
      {
        name: 'Academic Information',
        description: 'Previous education details',
        fields: ['qualifyingExam', 'hallTicketNumber', 'passingYear', 'percentage', 'boardUniversity'],
      },
      {
        name: 'Identity Documents',
        description: 'Government ID information',
        fields: ['aadhaarNumber'],
      },
    ];
  }

  // Validate form fields structure
  private validateFormFields(fields: FormField[]) {
    const keys = new Set<string>();

    for (const field of fields) {
      // Check for required properties
      if (!field.key || !field.label || !field.fieldType) {
        throw new AppError(`Invalid field: missing required properties (key, label, fieldType)`, 400);
      }

      // Check for duplicate keys
      if (keys.has(field.key)) {
        throw new AppError(`Duplicate field key: ${field.key}`, 400);
      }
      keys.add(field.key);

      // Validate select/radio/checkbox have options
      if (['select', 'radio', 'checkbox'].includes(field.fieldType) && (!field.options || field.options.length === 0)) {
        throw new AppError(`Field "${field.key}" requires options array`, 400);
      }

      // Validate fieldType
      const validTypes = ['text', 'textarea', 'number', 'email', 'phone', 'date', 'select', 'radio', 'checkbox', 'file'];
      if (!validTypes.includes(field.fieldType)) {
        throw new AppError(`Invalid fieldType "${field.fieldType}" for field "${field.key}"`, 400);
      }
    }
  }
}

export const collegeAdmissionFormService = new CollegeAdmissionFormService();
