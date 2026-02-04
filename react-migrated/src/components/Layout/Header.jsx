import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';

export const Header = ({ onMenuClick }) => {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navLinkClass = (path) => clsx(
        "px-3 py-2 rounded-md text-sm font-medium transition-colors block md:inline-block",
        location.pathname === path
            ? "bg-slate-100 text-slate-900"
            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
    );

    return (
        <nav className="bg-white shadow z-50 relative">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">

                    {/* Left Side: Mobile Menu & Logo */}
                    <div className="flex items-center">
                        {/* Mobile Global Nav Toggle */}
                        <div className="mr-2 flex md:hidden">
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="bg-white inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                            >
                                {isMobileMenuOpen ? (
                                    <X className="h-6 w-6" />
                                ) : (
                                    <Menu className="h-6 w-6" />
                                )}
                            </button>
                        </div>

                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center space-x-3">
                            <Link to="/" className="flex items-center space-x-2">
                                <img src="/asset/logo/graphicat.png" alt="Logo" className="h-10 w-auto" />
                                <span className="font-bold text-lg text-slate-800 hidden lg:block">Story Generator</span>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:ml-10 md:flex md:items-baseline md:space-x-4">
                            <Link to="/" className={navLinkClass('/')}>Story Generator</Link>
                            <Link to="/brochure" className={navLinkClass('/brochure')}>Brochure Generator</Link>
                            <Link to="/welcome" className={navLinkClass('/welcome')}>Welcome on Board</Link>
                        </div>
                    </div>

                    {/* Right Side: Mobile Sidebar Toggle (Only on Story Page) */}
                    {location.pathname === '/' && (
                        <div className="flex md:hidden">
                            <button
                                type="button"
                                onClick={onMenuClick}
                                className="bg-white inline-flex items-center justify-center p-2 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                                title="Open Settings"
                            >
                                <SlidersHorizontal className="h-6 w-6" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Navigation Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-slate-200 bg-white absolute w-full left-0 z-50 shadow-lg">
                    <div className="space-y-1 px-2 pt-2 pb-3 sm:px-3">
                        <Link
                            to="/"
                            className={navLinkClass('/')}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Story Generator
                        </Link>
                        <Link
                            to="/brochure"
                            className={navLinkClass('/brochure')}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Brochure Generator
                        </Link>
                        <Link
                            to="/welcome"
                            className={navLinkClass('/welcome')}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Welcome on Board
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};
