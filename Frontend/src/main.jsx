import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import App2 from './App2.jsx';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App2 />
    </BrowserRouter>
  </QueryClientProvider>
  // </StrictMode>
);
