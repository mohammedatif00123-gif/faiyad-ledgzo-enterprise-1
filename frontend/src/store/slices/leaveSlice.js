import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const applyLeave = createAsyncThunk('leaves/apply', async (leaveData, { rejectWithValue }) => {
  try {
    const response = await api.post('/leaves/apply', leaveData);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to apply leave');
  }
});

export const getMyLeaves = createAsyncThunk('leaves/myLeaves', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/leaves/my-leaves');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch leaves');
  }
});

const leaveSlice = createSlice({
  name: 'leaves',
  initialState: {
    myLeaves: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getMyLeaves.pending, (state) => { state.loading = true; })
      .addCase(getMyLeaves.fulfilled, (state, action) => {
        state.loading = false;
        state.myLeaves = action.payload.data;
      })
      .addCase(getMyLeaves.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(applyLeave.fulfilled, (state, action) => {
        state.myLeaves.unshift(action.payload.data);
      });
  },
});

export default leaveSlice.reducer;
