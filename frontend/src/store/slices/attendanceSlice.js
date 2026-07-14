import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const checkIn = createAsyncThunk('attendance/checkIn', async (_, { rejectWithValue }) => {
  try {
    const response = await api.post('/attendance/check-in');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Check-in failed');
  }
});

export const checkOut = createAsyncThunk('attendance/checkOut', async (_, { rejectWithValue }) => {
  try {
    const response = await api.post('/attendance/check-out');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Check-out failed');
  }
});

export const getTodayAttendance = createAsyncThunk('attendance/today', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/attendance/today');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance');
  }
});

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    today: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearAttendanceError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkIn.pending, (state) => { state.loading = true; })
      .addCase(checkIn.fulfilled, (state, action) => {
        state.loading = false;
        state.today = action.payload.data;
      })
      .addCase(checkIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(checkOut.pending, (state) => { state.loading = true; })
      .addCase(checkOut.fulfilled, (state, action) => {
        state.loading = false;
        state.today = action.payload.data;
      })
      .addCase(getTodayAttendance.fulfilled, (state, action) => {
        state.today = action.payload.data;
      });
  },
});

export const { clearAttendanceError } = attendanceSlice.actions;
export default attendanceSlice.reducer;
