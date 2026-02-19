import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useFirebase } from "../../context/FirebaseContext";

const Navbar = () => {
    const { user, role, auth } = useFirebase();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

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

    let dashboardLink = "/";
    if (role === "admin") dashboardLink = "/admin-dashboard";
    if (role === "manager") dashboardLink = "/manager-dashboard";
    if (role === "member") dashboardLink = "/member-dashboard";

    return (
        <nav className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white shadow-lg font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo - Removed */}
                    <div className="flex-shrink-0 flex items-center space-x-2">
                        {/* Logo removed as per request */}
                    </div>

                    {/* Right Side Content */}
                    <>
                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-6">
                            {role && (
                                <>
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
                                </>
                            )}

                            {/* Profile Dropdown */}
                            {user && (
                                <div className="relative ml-3">
                                    <div>
                                        <button
                                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                                            className="flex text-sm border-2 border-transparent rounded-full focus:outline-none focus:border-white transition"
                                        >
                                            <span className="sr-only">Open user menu</span>
                                            <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-white">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </button>
                                    </div>
                                    {isProfileOpen && (
                                        <div
                                            className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 text-gray-700"
                                            role="menu"
                                            aria-orientation="vertical"
                                            aria-labelledby="user-menu"
                                        >
                                            <div className="px-4 py-2 border-b">
                                                <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
                                                <p className="text-xs text-gray-500 capitalize">{role}</p>
                                            </div>
                                            <button
                                                onClick={handleLogout}
                                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                                role="menuitem"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                             {/* Logout Button (kept for redundancy if preferred, or remove if Profile Dropdown is enough. User request says "Log Out button to the top-right corner, adding an adjacent Profile icon") */}
                             {/* Based on request, I should keep the logout button but maybe just the profile icon is what they want if the dropdown has logout. 
                                 However, the request says "relocating the Log Out button to the top-right corner, adding an adjacent Profile icon". 
                                 So I will keep the separate logout button as well for now, or maybe they meant the logout button IS inside the profile icon? 
                                 "adding an adjacent Profile icon" implies they are separate.
                                 Let's keep the logout button but maybe style it differently or just keep it there.
                                 Wait, "Log Out button to the top-right corner" - it was already there. 
                                 Let's keep the logout button AND the profile icon.
                              */}
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center">
                             {/* Mobile Profile Icon */}
                             {user && (
                                <div className="mr-3">
                                   <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-white">
                                        <span className="text-xs font-bold">{user.email?.charAt(0).toUpperCase()}</span>
                                    </div>
                                </div>
                             )}

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
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden bg-gray-800">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {user && (
                             <div className="px-3 py-2 text-gray-300 border-b border-gray-700 mb-2">
                                <p className="text-sm font-bold text-white truncate">{user.email}</p>
                                <p className="text-xs text-gray-400 capitalize">{role}</p>
                             </div>
                        )}

                        {role && (
                            <>
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
                            </>
                        )}

                        <button
                            onClick={() => {
                                closeMobileMenu();
                                handleLogout();
                            }}
                            className="block w-full text-left bg-red-500 px-4 py-2 rounded text-base font-bold text-white hover:bg-red-600 transition mt-4"
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
