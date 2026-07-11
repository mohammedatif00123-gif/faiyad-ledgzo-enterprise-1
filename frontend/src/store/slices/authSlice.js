import { createSlice } from '@reduxjs/toolkit';

const userStr = localStorage.getItem('user');
const initialUser = userStr && userStr !== 'null' ? JSON.parse(userStr) : null;
const initialToken = localStorage.getItem('accessToken');

const initialState = {
  user: initialUser,
  isAuthenticated: !!(initialToken && initialUser),
  accessToken: initialToken && initialToken !== 'null' ? initialToken : null,
  theme: localStorage.getItem('theme') || 'system',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = !!action.payload.accessToken;
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('accessToken', action.payload.accessToken);
    },
    logoutUser: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
    },
    updateToken: (state, action) => {
      state.accessToken = action.payload;
      state.isAuthenticated = !!(state.user && action.payload);
      localStorage.setItem('accessToken', action.payload);
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
  },
});

export const { setCredentials, logoutUser, updateToken, setTheme, updateUser } = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectTheme = (state) => state.auth.theme;
