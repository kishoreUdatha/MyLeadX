import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import {
  PaperAirplaneIcon,
  DocumentArrowUpIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  DocumentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Recipient {
  id: string;
  phone: string;
  name?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  messageId?: string;
  error?: string;
}

interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio' | 'document';
  preview?: string;
  name: string;
}

const STATUS_CONFIG = {
  pending: { color: 'bg-slate-100 text-slate-600', label: 'Pending' },
  sent: { color: 'bg-blue-100 text-blue-700', label: 'Sent' },
  delivered: { color: 'bg-emerald-100 text-emerald-700', label: 'Delivered' },
  read: { color: 'bg-violet-100 text-violet-700', label: 'Read' },
  failed: { color: 'bg-red-100 text-red-700', label: 'Failed' },
};

export default function BulkWhatsAppPage() {
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [phoneInput, setPhoneInput] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, total: 0 });
  const [whatsappConfigured, setWhatsappConfigured] = useState<boolean | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkWhatsAppConfig();
  }, []);

  const checkWhatsAppConfig = async () => {
    try {
      const response = await api.get('/exotel/whatsapp/status');
      setWhatsappConfigured(response.data.data?.configured ?? response.data.configured);
    } catch {
      setWhatsappConfigured(false);
    }
  };

  const parsePhoneNumbers = (input: string): string[] => {
    const phones = input
      .split(/[\n,\s]+/)
      .map(p => p.trim())
      .filter(p => p.length >= 10)
      .map(p => {
        let phone = p.replace(/[^0-9+]/g, '');
        if (!phone.startsWith('+')) {
          if (phone.startsWith('91') && phone.length === 12) {
            phone = '+' + phone;
          } else if (phone.length === 10) {
            phone = '+91' + phone;
          }
        }
        return phone;
      });
    return [...new Set(phones)];
  };

  const handleAddPhones = () => {
    const phones = parsePhoneNumbers(phoneInput);
    const newRecipients: Recipient[] = phones
      .filter(phone => !recipients.some(r => r.phone === phone))
      .map(phone => ({
        id: crypto.randomUUID(),
        phone,
        status: 'pending',
      }));

    setRecipients([...recipients, ...newRecipients]);
    setPhoneInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('File selected:', file?.name, file?.type, file?.size);
    if (!file) return;

    try {
      const newRecipients: Recipient[] = [];

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Excel file
        console.log('Processing Excel file...');
        const buffer = await file.arrayBuffer();
        console.log('Buffer size:', buffer.byteLength);
        const workbook = XLSX.read(buffer, { type: 'array' });
        console.log('Sheets:', workbook.SheetNames);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        console.log('Rows found:', data.length, 'First row:', data[0]);

        data.forEach((row, index) => {
          if (index === 0) {
            // Check if first row is header
            const firstCell = String(row[0] || '').toLowerCase();
            if (firstCell.includes('phone') || firstCell.includes('mobile') || firstCell.includes('number') || firstCell.includes('name') || isNaN(Number(firstCell.replace(/[^0-9]/g, '')))) {
              console.log('Skipping header row:', row);
              return; // Skip header row
            }
          }

          const phone = String(row[0] || '').trim();
          const name = String(row[1] || '').trim() || undefined;
          console.log('Row', index, '- Phone:', phone, 'Name:', name);

          if (phone && phone.length >= 10) {
            const normalizedPhone = parsePhoneNumbers(phone)[0];
            console.log('Normalized phone:', normalizedPhone);
            if (normalizedPhone && !recipients.some(r => r.phone === normalizedPhone) && !newRecipients.some(r => r.phone === normalizedPhone)) {
              newRecipients.push({
                id: crypto.randomUUID(),
                phone: normalizedPhone,
                name: name,
                status: 'pending',
              });
            }
          }
        });
        console.log('New recipients from Excel:', newRecipients.length);
      } else {
        // CSV/Text file
        const text = await file.text();
        const lines = text.split(/\r?\n/);

        lines.forEach((line, index) => {
          if (index === 0) {
            const lowerLine = line.toLowerCase();
            if (lowerLine.includes('phone') || lowerLine.includes('mobile') || lowerLine.includes('number')) {
              return;
            }
          }

          const parts = line.split(/[,\t]/).map(p => p.trim().replace(/"/g, ''));
          const phone = parts[0];
          const name = parts[1] || undefined;

          if (phone && phone.length >= 10) {
            const normalizedPhone = parsePhoneNumbers(phone)[0];
            if (normalizedPhone && !recipients.some(r => r.phone === normalizedPhone) && !newRecipients.some(r => r.phone === normalizedPhone)) {
              newRecipients.push({
                id: crypto.randomUUID(),
                phone: normalizedPhone,
                name,
                status: 'pending',
              });
            }
          }
        });
      }

      console.log('Total new recipients:', newRecipients.length);
      if (newRecipients.length > 0) {
        setRecipients([...recipients, ...newRecipients]);
        console.log('Recipients updated successfully');
      } else {
        alert('No valid phone numbers found in the file. Make sure column A contains phone numbers (10+ digits).');
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Error reading file: ' + (error as Error).message);
    }

    e.target.value = '';
  };

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter(r => r.id !== id));
  };

  const clearAllRecipients = () => {
    setRecipients([]);
  };

  const getMediaType = (file: File): 'image' | 'video' | 'audio' | 'document' => {
    const type = file.type;
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newMediaFiles: MediaFile[] = [];

    Array.from(files).forEach(file => {
      const mediaType = getMediaType(file);
      const mediaFile: MediaFile = {
        file,
        type: mediaType,
        name: file.name,
      };

      // Create preview for images and videos
      if (mediaType === 'image' || mediaType === 'video') {
        mediaFile.preview = URL.createObjectURL(file);
      }

      newMediaFiles.push(mediaFile);
    });

    setMediaFiles([...mediaFiles, ...newMediaFiles]);
    e.target.value = '';
  };

  const removeMedia = (index: number) => {
    const media = mediaFiles[index];
    if (media.preview) {
      URL.revokeObjectURL(media.preview);
    }
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return <PhotoIcon className="w-5 h-5" />;
      case 'video': return <VideoCameraIcon className="w-5 h-5" />;
      case 'audio': return <MusicalNoteIcon className="w-5 h-5" />;
      default: return <DocumentIcon className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSendBulk = async () => {
    if ((!message.trim() && mediaFiles.length === 0) || recipients.length === 0) return;

    setSending(true);
    setProgress({ sent: 0, total: recipients.length });

    try {
      const updatedRecipients = [...recipients];

      // Convert media files to base64 for sending
      const mediaData = await Promise.all(
        mediaFiles.map(async (media) => {
          const reader = new FileReader();
          return new Promise<{ type: string; data: string; filename: string }>((resolve) => {
            reader.onload = () => {
              resolve({
                type: media.type,
                data: reader.result as string,
                filename: media.name,
              });
            };
            reader.readAsDataURL(media.file);
          });
        })
      );

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];

        try {
          const response = await api.post('/exotel/whatsapp/send', {
            to: recipient.phone,
            message: message.replace(/{name}/g, recipient.name || ''),
            media: mediaData.length > 0 ? mediaData : undefined,
          });

          updatedRecipients[i] = {
            ...recipient,
            status: 'sent',
            messageId: response.data.messageId,
          };
        } catch (error: any) {
          updatedRecipients[i] = {
            ...recipient,
            status: 'failed',
            error: error.response?.data?.message || error.message,
          };
        }

        setRecipients([...updatedRecipients]);
        setProgress({ sent: i + 1, total: recipients.length });

        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Bulk send failed:', error);
    } finally {
      setSending(false);
    }
  };

  const stats = {
    total: recipients.length,
    pending: recipients.filter(r => r.status === 'pending').length,
    sent: recipients.filter(r => r.status === 'sent').length,
    delivered: recipients.filter(r => r.status === 'delivered').length,
    read: recipients.filter(r => r.status === 'read').length,
    failed: recipients.filter(r => r.status === 'failed').length,
  };

  if (whatsappConfigured === null) {
    return (
      <div className="flex items-center justify-center h-96">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (whatsappConfigured === false) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">WhatsApp Not Configured</h2>
          <p className="text-gray-500 mb-6">Configure WhatsApp in settings to send bulk messages</p>
          <a
            href="/settings/whatsapp"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Go to Settings
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bulk WhatsApp</h1>
          <p className="text-sm text-gray-500">Send messages to multiple contacts</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Recipients */}
        <div className="col-span-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Recipients</h2>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                {recipients.length}
              </span>
            </div>

            <div className="p-4 space-y-4">
              {/* Manual Input */}
              <div>
                <textarea
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="Enter phone numbers&#10;One per line or comma separated"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  rows={3}
                />
                <button
                  onClick={handleAddPhones}
                  disabled={!phoneInput.trim()}
                  className="w-full mt-2 h-9 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Numbers
                </button>
              </div>

              {/* File Upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-20 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer"
                >
                  <DocumentArrowUpIcon className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-600">Upload Excel or CSV</span>
                  <span className="text-xs text-gray-400">Columns: Phone, Name</span>
                </button>
              </div>

              {/* Recipients List */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">CONTACTS</span>
                  {recipients.length > 0 && (
                    <button
                      onClick={clearAllRecipients}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto space-y-1.5">
                  {recipients.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <UserGroupIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No contacts added yet</p>
                    </div>
                  ) : (
                    recipients.map((recipient) => {
                      const statusConfig = STATUS_CONFIG[recipient.status];
                      return (
                        <div
                          key={recipient.id}
                          className={`flex flex-col gap-1 p-2.5 rounded-lg group ${recipient.status === 'failed' ? 'bg-red-50' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {recipient.phone}
                              </p>
                              {recipient.name && (
                                <p className="text-xs text-gray-500 truncate">{recipient.name}</p>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                            {recipient.status === 'pending' && (
                              <button
                                onClick={() => removeRecipient(recipient.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {recipient.status === 'failed' && recipient.error && (
                            <p className="text-xs text-red-600 pl-1">
                              {recipient.error}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Message Composer */}
        <div className="col-span-8 space-y-4">
          {/* Campaign Name */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., March Admission Campaign"
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Message */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here...&#10;&#10;Use {name} for personalization"
              className="w-full px-3 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              rows={6}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">
                {message.length} characters
              </span>
              <button
                onClick={() => setMessage(message + '{name}')}
                className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium"
              >
                + Add Name
              </button>
            </div>
          </div>

          {/* Media Attachments */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Media Attachments <span className="text-gray-400 font-normal">(optional)</span>
            </label>

            {/* Hidden file inputs for each type */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleMediaUpload}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              onChange={handleMediaUpload}
              className="hidden"
            />
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleMediaUpload}
              className="hidden"
            />
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              multiple
              onChange={handleMediaUpload}
              className="hidden"
            />

            {/* Media Upload Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <PhotoIcon className="w-4 h-4" />
                Image
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
              >
                <VideoCameraIcon className="w-4 h-4" />
                Video
              </button>
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
              >
                <MusicalNoteIcon className="w-4 h-4" />
                Audio
              </button>
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <DocumentIcon className="w-4 h-4" />
                Document
              </button>
            </div>

            {/* Uploaded Media Preview */}
            {mediaFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-gray-500 font-medium">ATTACHED FILES ({mediaFiles.length})</div>
                <div className="grid grid-cols-2 gap-3">
                  {mediaFiles.map((media, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group"
                    >
                      {/* Preview */}
                      {media.type === 'image' && media.preview ? (
                        <img
                          src={media.preview}
                          alt={media.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : media.type === 'video' && media.preview ? (
                        <video
                          src={media.preview}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          media.type === 'audio' ? 'bg-amber-100 text-amber-600' :
                          media.type === 'video' ? 'bg-purple-100 text-purple-600' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {getMediaIcon(media.type)}
                        </div>
                      )}

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{media.name}</p>
                        <p className="text-xs text-gray-500">
                          {media.type.charAt(0).toUpperCase() + media.type.slice(1)} • {formatFileSize(media.file.size)}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeMedia(index)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mediaFiles.length === 0 && (
              <div className="text-center py-4 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-sm">No media attached</p>
                <p className="text-xs mt-1">Click buttons above to add images, videos, audio, or documents</p>
              </div>
            )}
          </div>

          {/* Progress */}
          {(sending || stats.sent > 0 || stats.failed > 0) && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Sending Progress</h3>
                {sending && (
                  <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                    Processing...
                  </span>
                )}
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.total > 0 ? ((stats.sent + stats.failed) / stats.total) * 100 : 0}%` }}
                />
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xl font-bold text-slate-700">{stats.total}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xl font-bold text-blue-600">{stats.sent}</p>
                  <p className="text-xs text-blue-500">Sent</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-xl font-bold text-emerald-600">{stats.delivered}</p>
                  <p className="text-xs text-emerald-500">Delivered</p>
                </div>
                <div className="text-center p-3 bg-violet-50 rounded-lg">
                  <p className="text-xl font-bold text-violet-600">{stats.read}</p>
                  <p className="text-xs text-violet-500">Read</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-xl font-bold text-red-600">{stats.failed}</p>
                  <p className="text-xs text-red-500">Failed</p>
                </div>
              </div>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSendBulk}
            disabled={sending || (!message.trim() && mediaFiles.length === 0) || recipients.length === 0}
            className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {sending ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Sending {progress.sent} of {progress.total}...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-5 h-5" />
                Send to {recipients.length} Recipients
                {mediaFiles.length > 0 && (
                  <span className="ml-1 text-green-200">
                    ({mediaFiles.length} {mediaFiles.length === 1 ? 'file' : 'files'})
                  </span>
                )}
              </>
            )}
          </button>

          {/* Help */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
            <DocumentTextIcon className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600">
              <p className="font-medium text-slate-700 mb-1">Tips</p>
              <p>• Upload Excel (.xlsx) or CSV with columns: <span className="font-mono bg-white px-1 rounded">Phone, Name</span></p>
              <p className="mt-1">• Phone numbers are automatically formatted with +91 country code</p>
              <p className="mt-1">• You can attach multiple images, videos, audio files, or documents</p>
              <p className="mt-1">• All media will be sent along with your message to each recipient</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
