import IconButton from '@mui/material/IconButton';

import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

import { useAppDispatch, useAppSelector } from '@/store/hooks';

import { toggleTheme } from '@/store/slices/ui/uiSlice';

const ThemeToggle = () => {
  const dispatch = useAppDispatch();

  const mode = useAppSelector(
    (state) => state.ui.themeMode
  );

  return (
    <IconButton
      color="inherit"
      onClick={() => dispatch(toggleTheme())}
    >
      {mode === 'light' ? (
        <DarkModeIcon />
      ) : (
        <LightModeIcon />
      )}
    </IconButton>
  );
};

export default ThemeToggle;