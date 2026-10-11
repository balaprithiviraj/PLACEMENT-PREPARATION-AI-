import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import StudentLayout from './components/StudentLayout.jsx';
import AuroraBackground from './components/AuroraBackground.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import ResumeAnalyzer from './pages/ResumeAnalyzer.jsx';
import ResumeStudio from './pages/ResumeStudio.jsx';
import ResumeResult from './pages/ResumeResult.jsx';
import SkillGap from './pages/SkillGap.jsx';
import CareerRoles from './pages/CareerRoles.jsx';
import Aptitude from './pages/Aptitude.jsx';
import TechnicalPractice from './pages/TechnicalPractice.jsx';
import Quiz from './pages/Quiz.jsx';
import QuizResult from './pages/QuizResult.jsx';
import Interview from './pages/Interview.jsx';
import Progress from './pages/Progress.jsx';
import Events from './pages/Events.jsx';
import EventDetails from './pages/EventDetails.jsx';
import MyEvents from './pages/MyEvents.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import Students from './pages/admin/Students.jsx';
import Questions from './pages/admin/Questions.jsx';
import Categories from './pages/admin/Categories.jsx';
import Analytics from './pages/admin/Analytics.jsx';
import AiQuestionGenerator from './pages/AiQuestionGenerator.jsx';
import GeneratedQuiz from './pages/GeneratedQuiz.jsx';

function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <AuroraBackground />
      <p className="eyebrow">Lost in space</p>
      <h1 className="font-display text-gradient mt-4 text-7xl font-extrabold">404</h1>
      <p className="mt-3 text-sm text-slate-400">The page you are looking for does not exist or was moved.</p>
      <Link to="/" className="btn-primary mt-6 px-6 py-3">
        Go Home
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/ai-question-generator" element={<AiQuestionGenerator />} />
          <Route path="/generated-quiz" element={<GeneratedQuiz />} />

          {/* Student (protected) */}
          <Route
            element={
              <ProtectedRoute>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/resume" element={<ResumeAnalyzer />} />
            <Route path="/resume-studio" element={<ResumeStudio />} />
            <Route path="/resume/:id" element={<ResumeResult />} />
            <Route path="/skill-gap" element={<SkillGap />} />
            <Route path="/career-roles" element={<CareerRoles />} />
            <Route path="/aptitude" element={<Aptitude />} />
            <Route path="/technical" element={<TechnicalPractice />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz-result/:id" element={<QuizResult />} />
            <Route path="/interview" element={<Interview />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/my-events" element={<MyEvents />} />
          </Route>

          {/* Admin (protected, adminOnly) */}
          <Route
            element={
              <ProtectedRoute adminOnly>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<Students />} />
            <Route path="/admin/questions" element={<Questions />} />
            <Route path="/admin/categories" element={<Categories />} />
            <Route path="/admin/analytics" element={<Analytics />} />
          </Route>

          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
