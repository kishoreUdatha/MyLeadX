import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/auth.service';
import { showToast } from '../../utils/toast';

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { t } = useTranslation(['auth', 'validation']);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setIsSubmitted(true);
      showToast.success('auth.resetEmailSent');
    } catch (error) {
      showToast.error('auth.resetEmailFailed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('auth:forgotPassword.checkEmail')}</h2>
        <p className="text-gray-600 mb-6">
          {t('auth:forgotPassword.emailSentMessage')}
        </p>
        <Link
          to="/login"
          className="font-medium text-primary-600 hover:text-primary-500"
        >
          {t('auth:forgotPassword.backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth:forgotPassword.title')}</h2>
      <p className="text-gray-600 mb-6">
        {t('auth:forgotPassword.subtitle')}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="label">
            {t('auth:forgotPassword.emailLabel')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email', {
              required: t('validation:email.required'),
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: t('validation:email.invalid'),
              },
            })}
            className="input"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn btn-primary"
        >
          {isLoading ? t('auth:forgotPassword.sending') : t('auth:forgotPassword.sendInstructions')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        {t('auth:forgotPassword.rememberPassword')}{' '}
        <Link
          to="/login"
          className="font-medium text-primary-600 hover:text-primary-500"
        >
          {t('auth:forgotPassword.backToLogin')}
        </Link>
      </p>
    </div>
  );
}
