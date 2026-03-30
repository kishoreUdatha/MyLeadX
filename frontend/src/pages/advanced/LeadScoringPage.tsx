import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface LeadScore {
  id: string;
  leadId: string;
  overallScore: number;
  engagementScore: number;
  qualificationScore: number;
  sentimentScore: number;
  intentScore: number;
  buyingSignals: string[];
  objections: string[];
  grade: string;
  priority: number;
  callCount: number;
  avgCallDuration: number;
  lastInteraction: string;
  lead?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: string;
  };
}

export default function LeadScoringPage() {
  const [scores, setScores] = useState<LeadScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadScore | null>(null);

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const response = await api.get('/advanced/lead-scores/top?limit=50');
      setScores(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch lead scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'A_PLUS': { bg: 'bg-green-500', text: 'text-white' },
      'A': { bg: 'bg-green-400', text: 'text-white' },
      'B': { bg: 'bg-blue-500', text: 'text-white' },
      'C': { bg: 'bg-yellow-500', text: 'text-gray-900' },
      'D': { bg: 'bg-orange-500', text: 'text-white' },
      'F': { bg: 'bg-red-500', text: 'text-white' },
    };
    return colors[grade] || { bg: 'bg-gray-500', text: 'text-white' };
  };

  const getGradeLabel = (grade: string) => {
    return grade.replace('_PLUS', '+');
  };

  const getPriorityLabel = (priority: number) => {
    if (priority <= 2) return { label: 'Hot', color: 'text-red-600', bg: 'bg-red-100' };
    if (priority <= 4) return { label: 'Warm', color: 'text-orange-600', bg: 'bg-orange-100' };
    if (priority <= 6) return { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Cold', color: 'text-blue-600', bg: 'bg-blue-100' };
  };

  const ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link to="/advanced" className="text-blue-600 hover:underline text-sm">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">AI Lead Scoring</h1>
          <p className="text-gray-500">Leads ranked by AI-powered scoring algorithm</p>
        </div>
      </div>

      {/* Score Distribution Summary */}
      <div className="grid grid-cols-6 gap-4 mb-8">
        {['A_PLUS', 'A', 'B', 'C', 'D', 'F'].map((grade) => {
          const count = scores.filter(s => s.grade === grade).length;
          const gradeColor = getGradeColor(grade);
          return (
            <div key={grade} className="bg-white rounded-lg shadow p-4 text-center">
              <div className={`inline-block px-3 py-1 rounded-lg ${gradeColor.bg} ${gradeColor.text} font-bold text-lg mb-2`}>
                {getGradeLabel(grade)}
              </div>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-500">leads</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lead List */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Scored Leads</h2>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {scores.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No scored leads yet. Scores are calculated after AI calls.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Lead
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Grade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Calls
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scores.map((score) => {
                    const gradeColor = getGradeColor(score.grade);
                    const priority = getPriorityLabel(score.priority);
                    return (
                      <tr
                        key={score.id}
                        onClick={() => setSelectedLead(score)}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedLead?.id === score.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {score.lead?.firstName || 'Lead'} {score.lead?.lastName || score.leadId.slice(0, 8)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {score.lead?.email || 'No email'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xl font-bold text-blue-600">
                            {score.overallScore}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded ${gradeColor.bg} ${gradeColor.text} font-bold`}>
                            {getGradeLabel(score.grade)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded ${priority.bg} ${priority.color} text-xs font-medium`}>
                            {priority.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {score.callCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Score Details Panel */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Score Breakdown</h2>
          </div>
          <div className="p-4">
            {selectedLead ? (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-blue-600 mb-2">
                    {selectedLead.overallScore}
                  </div>
                  <span className={`px-3 py-1 rounded-lg ${getGradeColor(selectedLead.grade).bg} ${getGradeColor(selectedLead.grade).text} font-bold text-lg`}>
                    Grade {getGradeLabel(selectedLead.grade)}
                  </span>
                </div>

                <div className="space-y-1 mb-6">
                  <ScoreBar label="Engagement" score={selectedLead.engagementScore} color="bg-blue-500" />
                  <ScoreBar label="Qualification" score={selectedLead.qualificationScore} color="bg-green-500" />
                  <ScoreBar label="Sentiment" score={selectedLead.sentimentScore} color="bg-purple-500" />
                  <ScoreBar label="Intent" score={selectedLead.intentScore} color="bg-orange-500" />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Buying Signals</h3>
                  {selectedLead.buyingSignals && selectedLead.buyingSignals.length > 0 ? (
                    <ul className="space-y-1">
                      {selectedLead.buyingSignals.map((signal, i) => (
                        <li key={i} className="text-sm text-green-700 flex items-center">
                          <span className="mr-2">+</span> {signal}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No buying signals detected</p>
                  )}
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Objections</h3>
                  {selectedLead.objections && selectedLead.objections.length > 0 ? (
                    <ul className="space-y-1">
                      {selectedLead.objections.map((objection, i) => (
                        <li key={i} className="text-sm text-red-700 flex items-center">
                          <span className="mr-2">-</span> {objection}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No objections recorded</p>
                  )}
                </div>

                <div className="border-t pt-4 mt-4 text-sm text-gray-500">
                  <div className="flex justify-between mb-1">
                    <span>Total Calls:</span>
                    <span className="font-medium text-gray-900">{selectedLead.callCount}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Avg Duration:</span>
                    <span className="font-medium text-gray-900">
                      {Math.round(selectedLead.avgCallDuration / 60)}m {selectedLead.avgCallDuration % 60}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Contact:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(selectedLead.lastInteraction).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {selectedLead.lead && (
                  <Link
                    to={`/leads/${selectedLead.lead.id}`}
                    className="block mt-4 text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    View Lead Details
                  </Link>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📊</div>
                <p>Select a lead to view score breakdown</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
