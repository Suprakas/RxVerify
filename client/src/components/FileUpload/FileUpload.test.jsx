import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileUpload, { validateFile } from './FileUpload';

function Harness({ onChange = () => {} }) {
  const [file, setFile] = useState(null);
  return (
    <FileUpload
      value={file}
      maxMb={1}
      onChange={(f) => {
        setFile(f);
        onChange(f);
      }}
    />
  );
}

const png = (size = 100) => new File([new Uint8Array(size)], 'rx.png', { type: 'image/png' });

describe('validateFile', () => {
  test('checks presence, type and size', () => {
    expect(validateFile(null, 5)).toMatch(/choose/i);
    expect(validateFile(new File(['x'], 'a.txt', { type: 'text/plain' }), 5)).toMatch(/JPG, PNG, WEBP or PDF/);
    expect(validateFile(png(2 * 1024 * 1024), 1)).toMatch(/1 MB or smaller/);
    expect(validateFile(png(), 1)).toBeNull();
  });
});

describe('FileUpload', () => {
  test('has a real button for keyboard users', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument();
  });

  test('accepts a valid image and shows its name with remove and change actions', async () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.upload(screen.getByTestId('file-input'), png());
    expect(onChange).toHaveBeenLastCalledWith(expect.any(File));
    expect(screen.getByText('rx.png')).toBeInTheDocument();
    expect(screen.getByAltText(/preview of the selected prescription/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText(/drag your prescription here/i)).toBeInTheDocument();
  });

  test('rejects a file that is too large and announces the error', async () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.upload(screen.getByTestId('file-input'), png(2 * 1024 * 1024));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole('alert')).toHaveTextContent(/1 MB or smaller/);
  });
});
