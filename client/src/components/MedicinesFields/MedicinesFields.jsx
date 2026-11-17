import { useFieldArray } from 'react-hook-form';
import Button from '../Button/Button';
import FormField from '../FormField/FormField';
import './MedicinesFields.css';

/** Repeating rows of name / dosage / quantity, built on react-hook-form's useFieldArray. */
export default function MedicinesFields({ control, register, errors }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'medicines' });
  const rowErrors = errors.medicines || [];

  return (
    <fieldset className="medicines">
      <legend className="medicines__legend">
        Medicines <span className="medicines__required" aria-hidden="true">*</span>
      </legend>
      <p className="medicines__hint">Add each medicine as written on the prescription.</p>

      <ol className="medicines__list">
        {fields.map((field, index) => (
          <li key={field.id} className="medicines__row">
            <span className="medicines__index" aria-hidden="true">
              {index + 1}
            </span>
            <FormField label={`Medicine ${index + 1} name`} error={rowErrors[index]?.name?.message} className="medicines__name" required>
              <input type="text" placeholder="e.g. Amoxicillin" {...register(`medicines.${index}.name`)} />
            </FormField>
            <FormField label="Dosage" error={rowErrors[index]?.dosage?.message} className="medicines__dosage">
              <input type="text" placeholder="e.g. 500 mg" {...register(`medicines.${index}.dosage`)} />
            </FormField>
            <FormField label="Qty" error={rowErrors[index]?.quantity?.message} className="medicines__qty" required>
              <input type="number" min="1" max="1000" inputMode="numeric" {...register(`medicines.${index}.quantity`)} />
            </FormField>
            <Button
              variant="ghost"
              size="sm"
              className="medicines__remove"
              onClick={() => remove(index)}
              disabled={fields.length === 1}
              aria-label={`Remove medicine ${index + 1}`}
            >
              Remove
            </Button>
          </li>
        ))}
      </ol>

      {rowErrors.root?.message && (
        <p className="medicines__error" role="alert">
          {rowErrors.root.message}
        </p>
      )}
      {typeof rowErrors.message === 'string' && (
        <p className="medicines__error" role="alert">
          {rowErrors.message}
        </p>
      )}

      <Button variant="secondary" size="sm" onClick={() => append({ name: '', dosage: '', quantity: 1 })} disabled={fields.length >= 20}>
        + Add another medicine
      </Button>
    </fieldset>
  );
}
