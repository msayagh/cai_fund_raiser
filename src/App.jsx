import React, { useState } from "react";
import MosqueDonation  from "./mosque-donation";
import DonorPortal     from "./pages/DonorPortal";
import AdminSetup      from "./pages/AdminSetup";
import AdminDashboard  from "./pages/AdminDashboard";
import AppNav          from "./components/AppNav";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [language, setLanguage]       = useState("en");
  const navigate = (page) => setCurrentPage(page);
  const sharedProps = { navigate, language, setLanguage };

  return (
    <div style={{ minHeight:"100vh", background:"#090c18", display:"flex", flexDirection:"column", color:"#f0e8d8" }}>
      <AppNav navigate={navigate} currentPage={currentPage} language={language} setLanguage={setLanguage} />
      {currentPage === "home"  && <MosqueDonation language={language} setLanguage={setLanguage} navigate={navigate} />}
      {currentPage === "donor" && <DonorPortal {...sharedProps} />}
      {currentPage === "setup" && <AdminSetup {...sharedProps} />}
      {currentPage === "admin" && <AdminDashboard {...sharedProps} />}
    </div>
  );
}
