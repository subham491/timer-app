import { combineReducers } from '@reduxjs/toolkit';
import uiReducer from './slices/ui/uiSlice';
import authReducer from './slices/auth/authSlice';
import timerReducer from './slices/timer/timerSlice';
import projectsReducer from './slices/projects/projectsSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  timer: timerReducer,
  projects: projectsReducer,
});

export default rootReducer;
