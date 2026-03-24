import api, { getErrorMessage } from './index';
import { ApiResponse } from '../types';

export interface BookAppointmentPayload {
  leadId: string;
  title: string;
  description?: string;
  scheduledAt: string; // ISO date string
  duration: number; // minutes
  locationType: 'PHONE' | 'VIDEO' | 'IN_PERSON';
  locationDetails?: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  sendCalendarInvite: boolean;
  sendReminders: boolean;
}

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  locationType: string;
  locationDetails?: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'RESCHEDULED';
  calendarEventId?: string;
  calendarEventLink?: string;
  createdAt: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export const appointmentsApi = {
  /**
   * Book a new appointment during call
   */
  bookAppointment: async (payload: BookAppointmentPayload): Promise<Appointment> => {
    try {
      const response = await api.post<ApiResponse<Appointment>>(
        '/telecaller/appointments',
        payload
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get available time slots for a date
   */
  getAvailableSlots: async (date: string): Promise<TimeSlot[]> => {
    try {
      const response = await api.get<ApiResponse<TimeSlot[]>>(
        `/telecaller/appointments/available-slots?date=${date}`
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get appointments for a lead
   */
  getLeadAppointments: async (leadId: string): Promise<Appointment[]> => {
    try {
      const response = await api.get<ApiResponse<Appointment[]>>(
        `/leads/${leadId}/appointments`
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Cancel an appointment
   */
  cancelAppointment: async (appointmentId: string, reason?: string): Promise<void> => {
    try {
      await api.post(`/telecaller/appointments/${appointmentId}/cancel`, { reason });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Reschedule an appointment
   */
  rescheduleAppointment: async (
    appointmentId: string,
    newScheduledAt: string
  ): Promise<Appointment> => {
    try {
      const response = await api.post<ApiResponse<Appointment>>(
        `/telecaller/appointments/${appointmentId}/reschedule`,
        { scheduledAt: newScheduledAt }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Quick book - uses default settings
   */
  quickBook: async (
    leadId: string,
    contactName: string,
    contactPhone: string,
    contactEmail: string | undefined,
    scheduledAt: string
  ): Promise<Appointment> => {
    try {
      const response = await api.post<ApiResponse<Appointment>>(
        '/telecaller/appointments/quick-book',
        {
          leadId,
          contactName,
          contactPhone,
          contactEmail,
          scheduledAt,
          duration: 30,
          locationType: 'PHONE',
          sendCalendarInvite: true,
          sendReminders: true,
        }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

export default appointmentsApi;
