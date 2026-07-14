import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import { E2EEProvider } from './context/E2EEContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <E2EEProvider>
        <SocketProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </BrowserRouter>
        </SocketProvider>
      </E2EEProvider>
    </Provider>
  </React.StrictMode>,
)
