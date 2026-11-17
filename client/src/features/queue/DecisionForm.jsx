import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { useDecidePrescriptionMutation } from '../prescriptions/prescriptionsApi';
import { getErrorInfo } from '../../app/api';
import { showToast } from '../../app/toastSlice';
import { decisionSchema, applyServerErrors } from '../../utils/schemas';
import FormField from '../../components/FormField/FormField';
import Button from '../../components/Button/Button';

const OPTIONS = [
  { value: 'APPROVED', label: 'Approve', help: 'The prescription is valid and matches the entries.' },
  { value: 'NEEDS_INFO', label: 'Ask for more info', help: 'The customer can upload a new file.' },
  { value: 'REJECTED', label: 'Reject', help: 'Final. The customer sees your reason.' },
];

const DONE_MESSAGES = {
  APPROVED: 'Prescription approved',
  NEEDS_INFO: 'Sent back to the customer for more information',
  REJECTED: 'Prescription rejected',
};

export default function DecisionForm({ prescriptionId, disabled }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [decide, { isLoading, error }] = useDecidePrescriptionMutation();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(decisionSchema), defaultValues: { decision: undefined, reason: '' } });

  const decision = watch('decision');

  const onSubmit = async (values) => {
    try {
      await decide({ id: prescriptionId, ...values }).unwrap();
      dispatch(showToast({ message: DONE_MESSAGES[values.decision], tone: 'success' }));
      navigate('/queue');
    } catch (err) {
      applyServerErrors(getErrorInfo(err).details, setError);
    }
  };

  const serverError = error ? getErrorInfo(error) : null;

  return (
    <form className="decision" onSubmit={handleSubmit(onSubmit)} noValidate>
      <fieldset className="decision__options" disabled={disabled}>
        <legend className="decision__legend">Decision</legend>
        {OPTIONS.map((o) => (
          <label key={o.value} className={`decision__option decision__option--${o.value.toLowerCase()} ${decision === o.value ? 'is-selected' : ''}`}>
            <input type="radio" value={o.value} {...register('decision')} />
            <span>
              <span className="decision__label">{o.label}</span>
              <span className="decision__help">{o.help}</span>
            </span>
          </label>
        ))}
        {errors.decision && (
          <p className="field__error" role="alert">
            {errors.decision.message}
          </p>
        )}
      </fieldset>

      <FormField
        label={decision === 'APPROVED' ? 'Note (optional)' : 'Reason for the customer'}
        hint={decision === 'APPROVED' ? undefined : 'Be specific so they know what to do next.'}
        error={errors.reason?.message}
        required={decision && decision !== 'APPROVED'}
      >
        <textarea rows={3} maxLength={500} disabled={disabled} {...register('reason')} />
      </FormField>

      {serverError && !Object.keys(serverError.details).length && (
        <p className="form-alert" role="alert">
          {serverError.message}
        </p>
      )}

      <Button type="submit" loading={isLoading} disabled={disabled}>
        Submit decision
      </Button>
    </form>
  );
}
