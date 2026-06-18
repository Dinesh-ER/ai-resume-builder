import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GoogleLoginButton from "../component/login";
import "./Login.css";

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already authenticated, redirect to home page
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="login-page-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="login-page-container">
      <div className="login-glass-card">
        <div className="login-logo-container">
          <span className="login-logo-icon">📝</span>
          <h1 className="login-title">ResumeAI</h1>
          <p className="login-subtitle">Craft your professional resume with the power of Gemini AI</p>
        </div>
        
        <div className="login-action-container">
          <GoogleLoginButton onSuccess={() => navigate("/")} />
        </div>
        
        <div className="login-footer">
          <p>© 2026 ResumeAI. Powered by Google Gemini.</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
