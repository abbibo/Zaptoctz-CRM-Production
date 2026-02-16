import React, { useState, useEffect } from "react";
import { auth, db } from "../context/FirebaseContext";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";
import { HiEye, HiEyeOff } from "react-icons/hi";

const Login = () => {
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Show/Hide password
  const [showPassword, setShowPassword] = useState(false);
  // Error & success messages, loading state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  // Track if authentication status has been checked
  const [authChecked, setAuthChecked] = useState(false);

  const navigate = useNavigate();

  // Check authentication status on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "members", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            // If user is inactive, sign them out and show error
            if (userData.status === "inactive") {
              await auth.signOut();
              setError("Your account is inactive. Please contact admin.");
              setLoading(false);
              setAuthChecked(true);
              return;
            }

            // Redirect based on role
            const role = userData.role;
            if (role === "admin") {
              navigate("/admin-dashboard");
            } else if (role === "manager") {
              navigate("/manager-dashboard");
            } else {
              navigate("/member-dashboard");
            }
          } else {
            await auth.signOut();
            setError("User data not found. Please contact support.");
            setAuthChecked(true);
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          await auth.signOut();
          setError(err.message || "An error occurred. Please try again.");
          setAuthChecked(true);
        }
      } else {
        setAuthChecked(true);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const docRef = doc(db, "members", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();

        if (userData.status === "inactive") {
          setError("Your account is inactive. Please contact admin.");
          setLoading(false);
          await auth.signOut();
          return;
        }

        const role = userData.role;


        if (role === "admin") {
          navigate("/admin-dashboard");
        } else if (role === "manager") {
          navigate("/manager-dashboard");
        } else {
          navigate("/member-dashboard");
        }
      } else {
        setError("User role not found. If you just signed up, please try again in a moment.");
        setLoading(false);
      }
    } catch (err) {
      let errorMessage = "";
      switch (err.code) {
        case "auth/user-not-found":
          errorMessage = "User not found. Please check your email.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email format. Please enter a valid email.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
        case "auth/invalid-credential":
          // as requested, show "User ID or password is incorrect"
          errorMessage = "User ID or password is incorrect.";
          break;
        default:
          errorMessage = err.message;
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Handle forgot password by sending a reset link
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Ensure user has entered an email
    if (!email) {
      setError("Please enter your email to reset your password.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("A password reset link has been sent to your email address.");
      setLoading(false);
    } catch (err) {
      setError(`Error sending reset link: ${err.message}`);
      setLoading(false);
    }
  };

  // Show a spinner while checking auth status
  if (!authChecked) {
    return (
      <div className="fixed inset-0 overflow-hidden flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div
      className="
        fixed inset-0 overflow-hidden 
        bg-gradient-to-b from-[#0B0E19] to-[#0B0E19]
        flex items-center justify-center px-4
        bg-[length:40px_40px] 
        bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22none%22/><circle cx=%222%22 cy=%222%22 r=%221%22 fill=%22%23777777%22 /></svg>')]
        bg-opacity-5
      "
    >
      {/* Login Box */}
      <div className="w-full max-w-md bg-[#131725] rounded-2xl shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold text-center mb-6">Sign in to your Account</h2>

        {/* Error / Success messages */}
        {error && (
          <div className="bg-red-600 text-white text-sm p-2 rounded mb-4 text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-600 text-white text-sm p-2 rounded mb-4 text-center">
            {success}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div className="relative">
            <FaUser className="absolute left-3 top-3 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              className="
                w-full pl-10 pr-3 py-2 bg-[#1B2032] 
                rounded-md focus:ring-2 focus:ring-blue-600 outline-none 
                text-sm text-gray-100 placeholder-gray-400
              "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <FaLock className="absolute left-3 top-3 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="
                w-full pl-10 pr-10 py-2 bg-[#1B2032]
                rounded-md focus:ring-2 focus:ring-blue-600 outline-none 
                text-sm text-gray-100 placeholder-gray-400
              "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {/* Show/Hide Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-200"
            >
              {showPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
            </button>
          </div>

          {/* Forgot Password (send reset link) */}
          <div className="text-right text-sm">
            <button
              onClick={handleForgotPassword}
              className="text-blue-500 hover:underline hover:text-blue-400"
            >
              Forgot Your Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`
              w-full py-2 mt-2 rounded-md text-sm font-semibold 
              transition-colors 
              ${loading 
                ? "bg-blue-900 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700"}
            `}
          >
            {loading ? "Processing..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
