import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useReuploadPrescriptionMutation } from './prescriptionsApi';
import { useGetConfigQuery } from '../auth/authApi';
import { getErrorInfo } from '../../app/api';
import { showToast } from '../../app/toastSlice';
import FileUpload from '../../components/FileUpload/FileUpload';
import FormField from '../../components/FormField/FormField';
import Button from '../../components/Button/Button';

export default function ReuploadForm({ prescriptionId }) {
  const dispatch = useDispatch();
  const { data: config } = useGetConfigQuery();
  const [reupload, { isLoading, error }] = useReuploadPrescriptionMutation();
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [fileError, setFileError] = useState(null);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setFileError('Choose the new file to upload');
      return;
    }
    try {
      await reupload({ id: prescriptionId, file, notes: notes.trim() || undefined }).unwrap();
      dispatch(showToast({ message: 'New file sent. It’s back in the review queue.', tone: 'success' }));
      setFile(null);
      setNotes('');
    } catch {
      // Message shown below from the mutation's error state.
    }
  };

  const serverError = error ? getErrorInfo(error) : null;

  return (
    <form className="card reupload" onSubmit={onSubmit} noValidate aria-labelledby="reupload-title">
      <h2 id="reupload-title" className="card__title">
        Send a new file
      </h2>
      <FileUpload
        label="New prescription file"
        value={file}
        onChange={(f) => {
          setFile(f);
          setFileError(null);
        }}
        error={fileError || serverError?.details?.file}
        maxMb={config?.maxUploadMb || 5}
      />
      <FormField label="Message for the pharmacist" hint="Optional">
        <textarea rows={2} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
      {serverError && !serverError.details?.file && (
        <p className="form-alert" role="alert">
          {serverError.message}
        </p>
      )}
      <div className="rx-form__actions">
        <Button type="submit" loading={isLoading}>
          Send for review
        </Button>
      </div>
    </form>
  );
}
