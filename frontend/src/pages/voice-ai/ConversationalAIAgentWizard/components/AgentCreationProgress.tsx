/**
 * Agent Creation Progress Display
 */

import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

interface Props {
  steps: string[];
}

export function AgentCreationProgress({ steps }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Creating your agent</h2>
          <p className="text-gray-600 mt-2">This may take a moment...</p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              {index < steps.length - 1 ? (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              ) : (
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                </div>
              )}
              <span className={`${index < steps.length - 1 ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                {step}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AgentCreationProgress;
