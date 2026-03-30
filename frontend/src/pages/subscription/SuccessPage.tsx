import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function SuccessPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success Animation */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-bounce-slow">
            <CheckCircleIcon className="w-16 h-16 text-green-500" />
          </div>
          <div className="absolute -top-2 -right-2 animate-pulse">
            <SparklesIcon className="w-8 h-8 text-amber-400" />
          </div>
          <div className="absolute -bottom-2 -left-2 animate-pulse delay-100">
            <SparklesIcon className="w-6 h-6 text-primary-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          Payment Successful!
        </h1>

        <p className="text-lg text-slate-600 mb-6">
          Welcome to your new plan! Your subscription is now active and you have
          full access to all features.
        </p>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="font-semibold text-slate-900 mb-4">What's next?</h2>
          <ul className="text-left space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600">Create your first AI Voice Agent</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600">Set up auto-assignment for social media leads</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600">Build custom forms and landing pages</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600">Invite your team members</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full btn btn-primary py-3 text-lg"
          >
            Go to Dashboard
          </button>

          <p className="text-sm text-slate-500">
            Redirecting in {countdown} seconds...
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            A confirmation email has been sent to your registered email address.
            <br />
            Need help? Contact us at{' '}
            <a href="mailto:support@yourcrm.com" className="text-primary-600 hover:underline">
              support@yourcrm.com
            </a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
      `}</style>
    </div>
  );
}
