import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LocalizationProvider } from './localization/LocalizationContext.tsx';
import { EducationLevelProvider } from './localization/EducationLevelContext.tsx';
import { ThemeProvider } from './theme/ThemeContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <ThemeProvider>
      <LocalizationProvider>
        <EducationLevelProvider>
          <App />
        </EducationLevelProvider>
      </LocalizationProvider>
    </ThemeProvider>
  </AuthProvider>
);

