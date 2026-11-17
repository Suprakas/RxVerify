import { api } from '../../app/api';

export const adminApi = api.injectEndpoints({
  endpoints: (build) => ({
    getStats: build.query({
      query: () => '/admin/stats',
      providesTags: ['Stats'],
    }),
    getUsers: build.query({
      query: ({ page = 1, role } = {}) => ({ url: '/admin/users', params: { page, limit: 10, ...(role ? { role } : {}) } }),
      providesTags: ['User'],
    }),
    createPharmacist: build.mutation({
      query: (body) => ({ url: '/admin/pharmacists', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    setUserActive: build.mutation({
      query: ({ id, isActive }) => ({ url: `/admin/users/${id}`, method: 'PATCH', body: { isActive } }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const { useGetStatsQuery, useGetUsersQuery, useCreatePharmacistMutation, useSetUserActiveMutation } = adminApi;
