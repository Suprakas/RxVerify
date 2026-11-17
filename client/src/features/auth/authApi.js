import { api } from '../../app/api';
import { setCredentials, loggedOut } from './authSlice';

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          // The page shows the error from the mutation result.
        }
      },
    }),
    register: build.mutation({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          // The page shows the error from the mutation result.
        }
      },
    }),
    logout: build.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(loggedOut());
          // Drop every cached response so the next user starts clean.
          dispatch(api.util.resetApiState());
        }
      },
    }),
    getConfig: build.query({
      query: () => '/config',
      providesTags: ['Config'],
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useLogoutMutation, useGetConfigQuery } = authApi;
