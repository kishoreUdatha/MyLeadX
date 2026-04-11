/**
 * Message Activity Report - SMS/WhatsApp/Email activity tracking
 */
import { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, EnvelopeIcon, DevicePhoneMobileIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard, ReportTable } from './components/ReportTemplate';

export default function MessageActivityReportPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setData({
      summary: { totalMessages: 4580, sms: 1250, whatsapp: 2180, email: 1150, deliveryRate: '94.5%' },
      users: [
        { user: 'John Smith', sms: 245, whatsapp: 420, email: 185, total: 850, delivered: 810, failed: 40, pending: 0, deliveryRate: '95.3%' },
        { user: 'Sarah Johnson', sms: 310, whatsapp: 545, email: 295, total: 1150, delivered: 1095, failed: 45, pending: 10, deliveryRate: '95.2%' },
        { user: 'Mike Wilson', sms: 198, whatsapp: 365, email: 175, total: 738, delivered: 685, failed: 48, pending: 5, deliveryRate: '92.8%' },
        { user: 'Emily Brown', sms: 285, whatsapp: 495, email: 265, total: 1045, delivered: 998, failed: 42, pending: 5, deliveryRate: '95.5%' },
        { user: 'David Lee', sms: 212, whatsapp: 355, email: 230, total: 797, delivered: 742, failed: 50, pending: 5, deliveryRate: '93.1%' },
      ],
    });
    setIsLoading(false);
  };

  const columns = [
    { key: 'user', label: 'User' },
    { key: 'sms', label: 'SMS', align: 'center' as const, render: (val: number) => <span className="text-blue-600">{val}</span> },
    { key: 'whatsapp', label: 'WhatsApp', align: 'center' as const, render: (val: number) => <span className="text-green-600">{val}</span> },
    { key: 'email', label: 'Email', align: 'center' as const, render: (val: number) => <span className="text-purple-600">{val}</span> },
    { key: 'total', label: 'Total', align: 'center' as const, render: (val: number) => <span className="font-bold">{val}</span> },
    { key: 'delivered', label: 'Delivered', align: 'center' as const, render: (val: number) => <span className="text-green-600 font-medium">{val}</span> },
    { key: 'failed', label: 'Failed', align: 'center' as const, render: (val: number) => <span className="text-red-500">{val}</span> },
    { key: 'pending', label: 'Pending', align: 'center' as const, render: (val: number) => <span className="text-yellow-600">{val}</span> },
    { key: 'deliveryRate', label: 'Delivery Rate', align: 'center' as const, render: (val: string) => {
      const num = parseFloat(val);
      return <span className={`font-medium ${num >= 95 ? 'text-green-600' : num >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>{val}</span>;
    }},
  ];

  return (
    <ReportTemplate title="Message Activity Report" description="Track SMS, WhatsApp, and Email messaging activities" icon={ChatBubbleLeftRightIcon} iconColor="bg-cyan-500" isLoading={isLoading} onRefresh={loadData}>
      {data && (
        <div className="space-y-6">
          <ReportStatsGrid>
            <ReportStatCard label="Total Messages" value={data.summary.totalMessages} icon={ChatBubbleLeftRightIcon} iconColor="bg-blue-500" />
            <ReportStatCard label="SMS Sent" value={data.summary.sms} icon={DevicePhoneMobileIcon} iconColor="bg-purple-500" />
            <ReportStatCard label="WhatsApp Sent" value={data.summary.whatsapp} icon={ChatBubbleLeftRightIcon} iconColor="bg-green-500" />
            <ReportStatCard label="Delivery Rate" value={data.summary.deliveryRate} icon={CheckCircleIcon} iconColor="bg-orange-500" />
          </ReportStatsGrid>
          <ReportTable columns={columns} data={data.users} />
        </div>
      )}
    </ReportTemplate>
  );
}
