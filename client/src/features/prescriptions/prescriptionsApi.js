import { api } from '../../app/api';

const toFormData = ({ file, medicines, ...fields }) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });
  if (medicines) form.append('medicines', JSON.stringify(medicines));
  if (file) form.append('file', file);
  return form;
};

export const prescriptionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    /* customer */
    getMyPrescriptions: build.query({
      query: ({ page = 1, status } = {}) => ({ url: '/prescriptions/mine', params: { page, limit: 10, ...(status ? { status } : {}) } }),
      providesTags: (result) => [
        { type: 'Prescription', id: 'LIST' },
        ...(result ? result.items.map((p) => ({ type: 'Prescription', id: p.id })) : []),
      ],
    }),
    createPrescription: build.mutation({
      query: (values) => ({ url: '/prescriptions', method: 'POST', body: toFormData(values) }),
      invalidatesTags: [{ type: 'Prescription', id: 'LIST' }],
    }),
    reuploadPrescription: build.mutation({
      query: ({ id, file, notes }) => ({ url: `/prescriptions/${id}/file`, method: 'PUT', body: toFormData({ file, notes }) }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Prescription', id }, { type: 'Prescription', id: 'LIST' }, { type: 'Audit', id }],
    }),

    /* shared */
    getPrescription: build.query({
      query: (id) => `/prescriptions/${id}`,
      transformResponse: (res) => res.prescription,
      providesTags: (_r, _e, id) => [{ type: 'Prescription', id }],
    }),
    getAuditTrail: build.query({
      query: (id) => `/prescriptions/${id}/audit`,
      transformResponse: (res) => res.entries,
      providesTags: (_r, _e, id) => [{ type: 'Audit', id }],
    }),

    /* pharmacist */
    getQueue: build.query({
      query: ({ view = 'open', page = 1 } = {}) => ({ url: '/prescriptions/queue', params: { view, page, limit: 10 } }),
      providesTags: ['Queue'],
    }),
    claimPrescription: build.mutation({
      query: (id) => ({ url: `/prescriptions/${id}/claim`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => ['Queue', { type: 'Prescription', id }, { type: 'Audit', id }],
    }),
    releasePrescription: build.mutation({
      query: (id) => ({ url: `/prescriptions/${id}/release`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => ['Queue', { type: 'Prescription', id }, { type: 'Audit', id }],
    }),
    decidePrescription: build.mutation({
      query: ({ id, decision, reason }) => ({ url: `/prescriptions/${id}/status`, method: 'PATCH', body: { decision, reason } }),
      invalidatesTags: (_r, _e, { id }) => ['Queue', 'Stats', { type: 'Prescription', id }, { type: 'Audit', id }],
    }),
    retryExtraction: build.mutation({
      query: (id) => ({ url: `/prescriptions/${id}/extract`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Prescription', id }],
    }),
  }),
});

export const {
  useGetMyPrescriptionsQuery,
  useCreatePrescriptionMutation,
  useReuploadPrescriptionMutation,
  useGetPrescriptionQuery,
  useGetAuditTrailQuery,
  useGetQueueQuery,
  useClaimPrescriptionMutation,
  useReleasePrescriptionMutation,
  useDecidePrescriptionMutation,
  useRetryExtractionMutation,
} = prescriptionsApi;
