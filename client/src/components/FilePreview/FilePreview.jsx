import useAuthorizedFile from '../../hooks/useAuthorizedFile';
import { Spinner } from '../StateViews/StateViews';
import './FilePreview.css';

export default function FilePreview({ prescriptionId, version, fileName }) {
  const { url, type, loading, error } = useAuthorizedFile(prescriptionId, version);

  if (loading) return <Spinner label="Loading prescription file" />;
  if (error) return <p className="file-preview__error">{error}</p>;

  return (
    <figure className="file-preview">
      {type === 'application/pdf' ? (
        <object className="file-preview__pdf" data={url} type="application/pdf" aria-label={`Prescription file ${fileName}`}>
          <p>
            Your browser can’t show PDFs inline.{' '}
            <a href={url} download={fileName}>
              Download the file
            </a>
            .
          </p>
        </object>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="file-preview__link">
          <img className="file-preview__img" src={url} alt={`Uploaded prescription ${fileName}`} />
        </a>
      )}
      <figcaption className="file-preview__caption">
        {fileName}
        {type !== 'application/pdf' && <span> · opens full size in a new tab</span>}
      </figcaption>
    </figure>
  );
}
