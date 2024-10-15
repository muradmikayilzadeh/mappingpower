import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';

import Navbar from './components/Navbar';
import Controller from './components/Controller';
import Basemaps from './components/BaseMaps';

// Pages
import MainPage from './pages/client/MainPage';
import AdminLoginPage from './pages/admin/LoginPage';
import Dashboard from './pages/admin/Dashboard';
import MapsPage from './pages/admin/MapsPage';
import CreateMapPage from './pages/admin/MapsPage/crud/createAndEdit';
import NarrativesPage from './pages/admin/NarrativesPage';
import CreateNarrativePage from './pages/admin/NarrativesPage/crud/createAndEdit';
import SettingsPage from './pages/admin/SettingsPage';

import MapGroupsPage from './pages/admin/MapGroupsPage';
import CreateMapGroupPage from './pages/admin/MapGroupsPage/crud/createAndEdit';

import ErasPage from './pages/admin/ErasPage';
import CreateEraPage from './pages/admin/ErasPage/crud/createAndEdit';
import MediaPage from './pages/admin/MediaPage';


function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route
            path="/"
            element={<MainPage />}
          />

          <Route
            path="/admin"
            element={<AdminLoginPage />}
          />

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/maps"
            element={<MapsPage/>}
          />

          <Route
            path="/new-map"
            element={<CreateMapPage/>}
          />

          <Route
            path="/edit-map/:id"
            element={<CreateMapPage/>}
          />

          <Route
            path="/map-groups"
            element={<MapGroupsPage/>}
          />

          <Route
            path="/new-map-group"
            element={<CreateMapGroupPage/>}
          />

          <Route
            path="/edit-map-group/:id"
            element={<CreateMapGroupPage/>}
          />

          <Route
            path="/eras"
            element={<ErasPage/>}
          />

          <Route
            path="/create-era"
            element={<CreateEraPage/>}
          />

          <Route
            path="/edit-era/:id"
            element={<CreateEraPage/>}
          />

          <Route
            path="/media"
            element={<MediaPage/>}
          />

          <Route
            path="/narratives"
            element={<NarrativesPage/>}
          />

          <Route
            path="/create-narrative"
            element={<CreateNarrativePage/>}
          />

          <Route
            path="/edit-narrative/:id"
            element={<CreateNarrativePage/>}
          />

          <Route
            path="/settings"
            element={<SettingsPage/>}
          />

          </Routes>
      </Router>
    </>
  );
}

export default App;
