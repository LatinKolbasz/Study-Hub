import React from 'react';
import { Link } from 'react-router-dom';
import './navbar.css';

const Navbar = () => {
    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <h1>Study Hub</h1>
            </div>
            <ul className="navbar-links">
                <li>
                    <Link to="/assignments">Assignments</Link>
                </li>
                <li>
                    <Link to="/sector">Sector</Link>
                </li>
            </ul>
        </nav>
    );
};

export default Navbar;