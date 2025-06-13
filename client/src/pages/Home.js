import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ArrowRight,
  Award,
  Clock,
  FileText,
  Mic,
  PieChart,
  Shield,
} from "react-feather";
import logo from "../assets/images/logo.svg";

function Home() {
  const { currentUser } = useAuth();

  return (
    <div>
      {/* Hero section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <img
            src={logo}
            alt="The Deep Interview Logo"
            className="h-32 w-auto mx-auto mb-6"
          />
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Master Your Interview Skills with AI
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Practice interviews with our AI-powered platform and get
            personalized feedback to improve your chances of landing your dream
            job.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to={currentUser ? "/interview/setup" : "/register"}
              className="btn bg-white text-primary-600 hover:bg-gray-100 px-6 py-3 rounded-md font-semibold text-lg flex items-center justify-center"
            >
              {currentUser ? "Start Interview" : "Get Started"}
              <ArrowRight className="ml-2" size={20} />
            </Link>
            {!currentUser && (
              <Link
                to="/login"
                className="btn border-2 border-white text-white hover:bg-white hover:text-primary-600 px-6 py-3 rounded-md font-semibold text-lg"
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-primary-100 p-3 rounded-full w-fit mb-4">
                <Mic className="text-primary-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Voice Interaction</h3>
              <p className="text-gray-600">
                Practice your interview responses with natural voice
                interactions, just like a real interview.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-primary-100 p-3 rounded-full w-fit mb-4">
                <FileText className="text-primary-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Resume Analysis</h3>
              <p className="text-gray-600">
                Upload your resume and get personalized interview questions
                based on your experience and skills.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-primary-100 p-3 rounded-full w-fit mb-4">
                <Award className="text-primary-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Feedback</h3>
              <p className="text-gray-600">
                Receive detailed feedback on your responses with suggestions for
                improvement.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-primary-100 p-3 rounded-full w-fit mb-4">
                <PieChart className="text-primary-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Performance Analytics
              </h3>
              <p className="text-gray-600">
                Track your progress over time with detailed analytics and
                performance metrics.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-primary-100 p-3 rounded-full w-fit mb-4">
                <Shield className="text-primary-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Multiple Interview Types
              </h3>
              <p className="text-gray-600">
                Practice technical, behavioral, and custom interviews tailored
                to your industry.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-primary-100 p-3 rounded-full w-fit mb-4">
                <Clock className="text-primary-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Real-time Responses
              </h3>
              <p className="text-gray-600">
                Get immediate feedback on your answers to improve your interview
                skills faster.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {/* Step 1 */}
            <div>
              <div className="bg-secondary-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-secondary-600 text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Account</h3>
              <p className="text-gray-600">
                Sign up and create your profile with your professional details.
              </p>
            </div>

            {/* Step 2 */}
            <div>
              <div className="bg-secondary-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-secondary-600 text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Resume</h3>
              <p className="text-gray-600">
                Upload your resume to get personalized interview questions.
              </p>
            </div>

            {/* Step 3 */}
            <div>
              <div className="bg-secondary-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-secondary-600 text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Practice Interview</h3>
              <p className="text-gray-600">
                Select the interview type and difficulty level to start
                practicing.
              </p>
            </div>

            {/* Step 4 */}
            <div>
              <div className="bg-secondary-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-secondary-600 text-2xl font-bold">4</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Feedback</h3>
              <p className="text-gray-600">
                Receive detailed feedback and improve your interview skills.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 bg-gray-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Ace Your Next Interview?
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Join thousands of job seekers who have improved their interview
            skills with The Deep Interview.
          </p>
          <Link
            to={currentUser ? "/interview/setup" : "/register"}
            className="btn bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md font-semibold text-lg"
          >
            {currentUser ? "Start Practicing Now" : "Sign Up Free"}
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
