import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { useCreatePrescriptionMutation } from './prescriptionsApi';
import { useGetConfigQuery } from '../auth/authApi';
import { getErrorInfo } from '../../app/api';
import { showToast } from '../../app/toastSlice';
import { prescriptionSchema, applyServerErrors } from '../../utils/schemas';
import { todayIso } from '../../utils/format';
import FormField from '../../components/FormField/FormField';
import FileUpload from '../../components/FileUpload/FileUpload';
import MedicinesFields from '../../components/MedicinesFields/MedicinesFields';
import Button from '../../components/Button/Button';
import './Prescriptions.css';

export default function NewPrescriptionPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: config } = useGetConfigQuery();
  const [createPrescription, { isLoading, error }] = useCreatePrescriptionMutation();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      patientName: '',
      doctorName: '',
      issueDate: '',
      notes: '',
      medicines: [{ name: '', dosage: '', quantity: 1 }],
      file: undefined,
    },
  });

  const onSubmit = async (values) => {
    try {
      const { prescription } = await createPrescription(values).unwrap();
      dispatch(showToast({ message: 'Prescription submitted. A pharmacist will review it soon.', tone: 'success' }));
      navigate(`/prescriptions/${prescription.id}`);
    } catch (err) {
      applyServerErrors(getErrorInfo(err).details, setError);
    }
  };

  const serverError = error ? getErrorInfo(error) : null;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Upload a prescription</h1>
          <p className="page-header__subtitle">A pharmacist checks it against what you enter here.</p>
        </div>
      </header>

      {serverError && !Object.keys(serverError.details).length && (
        <p className="form-alert" role="alert">
          {serverError.message}
        </p>
      )}

      <form className="card rx-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Controller
          name="file"
          control={control}
          render={({ field }) => (
            <FileUpload value={field.value || null} onChange={(file) => field.onChange(file || undefined)} error={errors.file?.message} maxMb={config?.maxUploadMb || 5} />
          )}
        />

        <div className="rx-form__grid">
          <FormField label="Patient name" error={errors.patientName?.message} required>
            <input type="text" autoComplete="name" {...register('patientName')} />
          </FormField>
          <FormField label="Doctor name" error={errors.doctorName?.message} required>
            <input type="text" {...register('doctorName')} />
          </FormField>
          <FormField label="Issue date" hint="The date written on the prescription" error={errors.issueDate?.message} required>
            <input type="date" max={todayIso()} {...register('issueDate')} />
          </FormField>
        </div>

        <MedicinesFields control={control} register={register} errors={errors} />

        <FormField label="Notes for the pharmacist" hint="Optional, up to 500 characters" error={errors.notes?.message}>
          <textarea rows={3} {...register('notes')} />
        </FormField>

        <div className="rx-form__actions">
          <Button variant="secondary" to="/prescriptions">
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            Submit for review
          </Button>
        </div>
      </form>
    </div>
  );
}
