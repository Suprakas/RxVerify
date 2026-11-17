import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useLoginMutation } from './authApi';
import { getErrorInfo } from '../../app/api';
import { loginSchema, applyServerErrors } from '../../utils/schemas';
import { ROLE_HOME } from '../../utils/status';
import { safeNextPath } from '../../routes/guards';
import FormField from '../../components/FormField/FormField';
import Button from '../../components/Button/Button';
import './AuthPages.css';

export default function LoginPage() {
  const [login, { isLoading, error }] = useLoginMutation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values) => {
    try {
      const { user } = await login(values).unwrap();
      navigate(safeNextPath(params.get('next')) || ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      applyServerErrors(getErrorInfo(err).details, setError);
    }
  };

  const serverMessage = error ? getErrorInfo(error).message : '';

  return (
    <section className="auth-page" aria-labelledby="login-title">
      <h2 id="login-title" className="auth-page__title">
        Sign in
      </h2>
      <p className="auth-page__subtitle">Welcome back. Sign in to see your prescriptions.</p>

      {serverMessage && (
        <p className="auth-page__alert" role="alert">
          {serverMessage}
        </p>
      )}

      <form className="auth-page__form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Email" error={errors.email?.message} required>
          <input type="email" autoComplete="email" {...register('email')} />
        </FormField>
        <FormField label="Password" error={errors.password?.message} required>
          <input type="password" autoComplete="current-password" {...register('password')} />
        </FormField>
        <Button type="submit" size="lg" loading={isLoading}>
          Sign in
        </Button>
      </form>

      <p className="auth-page__switch">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </section>
  );
}
