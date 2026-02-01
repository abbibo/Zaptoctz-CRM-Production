import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth } from "../../context/FirebaseContext";

const Navbar = () => {
  // const navigate = useNavigate();
  const [role, setRole] = useState(localStorage.getItem("role"));
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      // Clear all local/session storage to remove credentials/state
      localStorage.removeItem("role");
      localStorage.removeItem("uid");
      sessionStorage.clear();
      
      // Force full page reload and redirect to login to clear in-memory state
      window.location.href = "/login";
    }
  };

  const closeMobileMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    const userRole = localStorage.getItem("role");
    if (userRole !== role) {
      setRole(userRole);
    }
  }, [role]);

  let dashboardLink = "/";
  if (role === "admin") dashboardLink = "/admin-dashboard";
  if (role === "manager") dashboardLink = "/manager-dashboard";
  if (role === "member") dashboardLink = "/member-dashboard";

  return (
    <nav className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white shadow-lg font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center space-x-2">
            {role && (
              <Link
                to={dashboardLink}
                className="text-2xl font-extrabold text-blue-400 hover:text-blue-500 transition"
              >
                Zaptockz CRM
              </Link>
            )}
          </div>

          {role && (
            <>
              {/* Desktop Menu */}
              <div className="hidden md:flex items-center space-x-6">
                <Link
                  to={dashboardLink}
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-semibold transition"
                >
                  Dashboard
                </Link>

                {role === "admin" && (
                  <>
                    <Link
                      to="/admin-dashboard/add-member"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-semibold transition"
                    >
                      Add Member
                    </Link>
                    <Link
                      to="/admin-dashboard/assign-leads"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-semibold transition"
                    >
                      Assign Leads
                    </Link>
                    <Link
                      to="/admin-dashboard/all-leads"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-semibold transition"
                    >
                      Leads
                    </Link>
                  </>
                )}

                {role === "manager" && (
                  <>
                                      <Link
                      to="/manager-new"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-semibold transition"
                    >
                      New Dashboard
                    </Link>
                    <Link
                      to="/manager/members"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-semibold transition"
                    >
                      Members
                    </Link>
                    <Link
                      to="/manager/assign-leads"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-semibold transition"
                    >
                      Assign Leads
                    </Link>
                  </>
                )}

                {role === "member" && (
                  <>
                    <Link
                      to="/member-dashboard/all-leads"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-semibold transition"
                    >
                      All Leads
                    </Link>
                    <Link
                      to="/member-dashboard/add-leads"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-semibold transition"
                    >
                      Add Leads
                    </Link>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className="bg-red-500 px-4 py-2 rounded-md text-sm font-bold hover:bg-red-600 transition"
                >
                  Logout
                </button>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                >
                  {isMenuOpen ? (
                    <svg
                      className="h-6 w-6"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-6 w-6"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {role && isMenuOpen && (
        <div className="md:hidden bg-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to={dashboardLink}
              onClick={closeMobileMenu}
              className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-semibold transition"
            >
              Dashboard
            </Link>

            {role === "admin" && (
              <>
                <Link
                  to="/admin-dashboard/add-member"
                  onClick={closeMobileMenu}
                  className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-semibold transition"
                >
                  Add Member
                </Link>
                <Link
                  to="/admin-dashboard/assign-leads"
                  onClick={closeMobileMenu}
                  className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-semibold transition"
                >
                  Assign Leads
                </Link>
                <Link
                  to="/admin-dashboard/add-template"
                  onClick={closeMobileMenu}
                  className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-semibold transition"
                >
                  Add Template
                </Link>
              </>
            )}

            {role === "manager" && (
              <>
                                                    <Link
                      to="/manager-new"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-semibold transition"
                    >
                      New Dashboard
                    </Link>
                <Link
                  to="/manager/members"
                  onClick={closeMobileMenu}
                  className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-semibold transition"
                >
                  Members
                </Link>
                <Link
                  to="/manager/assign-leads"
                  onClick={closeMobileMenu}
                  className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-semibold transition"
                >
                  Assign Leads
                </Link>
              </>
            )}

            {role === "member" && (
              <>
                <Link
                  to="/member-dashboard/all-leads"
                  onClick={closeMobileMenu}
                  className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-semibold transition"
                >
                  All Leads
                </Link>
                <Link
                  to="/member-dashboard/add-leads"
                  onClick={closeMobileMenu}
                  className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-semibold transition"
                >
                  Add Leads
                </Link>
              </>
            )}

            <button
              onClick={() => {
                closeMobileMenu();
                handleLogout();
              }}
              className="block w-full text-left bg-red-500 px-4 py-2 rounded text-base font-bold text-white hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
