import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { useRegisterMutation } from './authApi';
import { getErrorInfo } from '../../app/api';
import { registerSchema, applyServerErrors } from '../../utils/schemas';
import FormField from '../../components/FormField/FormField';
import Button from '../../components/Button/Button';
import './AuthPages.css';

export default function RegisterPage() {
  const [registerUser, { isLoading, error }] = useRegisterMutation();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async ({ confirmPassword, ...values }) => {
    try {
      await registerUser(values).unwrap();
      navigate('/prescriptions', { replace: true });
    } catch (err) {
      applyServerErrors(getErrorInfo(err).details, setError);
    }
  };

  const info = getErrorInfo(error);
  const serverMessage = error && !Object.keys(info.details).length ? info.message : '';

  return (
    <section className="auth-page" aria-labelledby="register-title">
      <h2 id="register-title" className="auth-page__title">
        Create your account
      </h2>
      <p className="auth-page__subtitle">Upload prescriptions and track their review.</p>

      {serverMessage && (
        <p className="auth-page__alert" role="alert">
          {serverMessage}
        </p>
      )}

      <form className="auth-page__form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Full name" error={errors.name?.message} required>
          <input type="text" autoComplete="name" {...register('name')} />
        </FormField>
        <FormField label="Email" error={errors.email?.message} required>
          <input type="email" autoComplete="email" {...register('email')} />
        </FormField>
        <FormField label="Password" hint="At least 8 characters with a letter and a number" error={errors.password?.message} required>
          <input type="password" autoComplete="new-password" {...register('password')} />
        </FormField>
        <FormField label="Confirm password" error={errors.confirmPassword?.message} required>
          <input type="password" autoComplete="new-password" {...register('confirmPassword')} />
        </FormField>
        <Button type="submit" size="lg" loading={isLoading}>
          Create account
        </Button>
      </form>

      <p className="auth-page__switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </section>
  );
}
