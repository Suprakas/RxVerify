import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGetUsersQuery, useCreatePharmacistMutation, useSetUserActiveMutation } from './adminApi';
import { selectUser } from '../auth/authSlice';
import { getErrorInfo } from '../../app/api';
import { showToast } from '../../app/toastSlice';
import { pharmacistSchema, applyServerErrors } from '../../utils/schemas';
import { formatDate } from '../../utils/format';
import FormField from '../../components/FormField/FormField';
import Button from '../../components/Button/Button';
import Pagination from '../../components/Pagination/Pagination';
import { SkeletonList, ErrorState, EmptyState } from '../../components/StateViews/StateViews';
import '../prescriptions/Prescriptions.css';
import '../queue/Queue.css';
import './Admin.css';

function AddPharmacistForm({ onDone }) {
  const dispatch = useDispatch();
  const [createPharmacist, { isLoading }] = useCreatePharmacistMutation();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(pharmacistSchema), defaultValues: { name: '', email: '', password: '' } });

  const onSubmit = async (values) => {
    try {
      await createPharmacist(values).unwrap();
      dispatch(showToast({ message: `${values.name} can now sign in as a pharmacist`, tone: 'success' }));
      reset();
      onDone();
    } catch (err) {
      const info = getErrorInfo(err);
      applyServerErrors(info.details, setError);
      if (!Object.keys(info.details).length) dispatch(showToast({ message: info.message, tone: 'error' }));
    }
  };

  return (
    <form className="card add-user" onSubmit={handleSubmit(onSubmit)} noValidate aria-labelledby="add-title">
      <h2 id="add-title" className="card__title">
        Add a pharmacist
      </h2>
      <div className="add-user__grid">
        <FormField label="Full name" error={errors.name?.message} required>
          <input type="text" {...register('name')} />
        </FormField>
        <FormField label="Email" error={errors.email?.message} required>
          <input type="email" autoComplete="off" {...register('email')} />
        </FormField>
        <FormField label="Temporary password" hint="Share it securely" error={errors.password?.message} required>
          <input type="password" autoComplete="new-password" {...register('password')} />
        </FormField>
      </div>
      <div className="add-user__actions">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          Create account
        </Button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const me = useSelector(selectUser);
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const role = params.get('role') || '';
  const page = Number(params.get('page')) || 1;
  const [adding, setAdding] = useState(false);
  const { data, isLoading, error, refetch } = useGetUsersQuery({ page, role });
  const [setActive, { isLoading: saving, originalArgs }] = useSetUserActiveMutation();

  const toggle = async (user) => {
    try {
      await setActive({ id: user.id, isActive: !user.isActive }).unwrap();
      dispatch(showToast({ message: `${user.name} ${user.isActive ? 'deactivated' : 'reactivated'}`, tone: 'success' }));
    } catch (err) {
      dispatch(showToast({ message: getErrorInfo(err).message, tone: 'error' }));
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Users</h1>
          <p className="page-header__subtitle">Deactivating a user signs them out everywhere.</p>
        </div>
        {!adding && <Button onClick={() => setAdding(true)}>Add pharmacist</Button>}
      </header>

      {adding && <AddPharmacistForm onDone={() => setAdding(false)} />}

      <div className="toolbar">
        <label className="toolbar__filter">
          <span>Role</span>
          <select value={role} onChange={(e) => setParams(e.target.value ? { role: e.target.value } : {})}>
            <option value="">All</option>
            <option value="customer">Customers</option>
            <option value="pharmacist">Pharmacists</option>
            <option value="admin">Admins</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState message={getErrorInfo(error).message} onRetry={refetch} />
      ) : !data.items.length ? (
        <EmptyState title="No users found" />
      ) : (
        <>
          <div className="queue-table-wrap">
            <table className="users-table">
              <caption className="visually-hidden">Users</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <td className="users-table__name">{u.name}</td>
                    <td>{u.email}</td>
                    <td className="users-table__role">{u.role}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      <span className={`user-state ${u.isActive ? 'user-state--active' : ''}`}>{u.isActive ? 'Active' : 'Deactivated'}</span>
                    </td>
                    <td className="users-table__actions">
                      {u.id !== me.id && (
                        <Button
                          size="sm"
                          variant={u.isActive ? 'secondary' : 'primary'}
                          onClick={() => toggle(u)}
                          loading={saving && originalArgs?.id === u.id}
                          aria-label={`${u.isActive ? 'Deactivate' : 'Reactivate'} ${u.name}`}
                        >
                          {u.isActive ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={(p) => setParams({ ...(role ? { role } : {}), page: String(p) })}
          />
        </>
      )}
    </div>
  );
}
