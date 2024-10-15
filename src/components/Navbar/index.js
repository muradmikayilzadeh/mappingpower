// Navbar.js

import React from 'react';
import './style.modules.css';
import logo from '../../images/logo.svg';

function Navbar({ onLinkClick }) {
    return (
        <nav className='navbar'>
            <div className='logoSection'>
                <img src={logo} alt='logo' className='logo' />
            </div>
            <div className='itemsSection'>
                <ul>
                    <li onClick={() => onLinkClick('introduction')}>introduction</li>
                    <li onClick={() => onLinkClick('bibliography')}>bibliography</li>
                    <li onClick={() => onLinkClick('credits')}>credits</li>
                    <li onClick={() => onLinkClick('feedback')}>feedback</li>
                    <li>
                        <img style={{ maxWidth: "15px" }} src="https://www.imaginedsanfrancisco.org/wp-content/themes/imaginedsf-custom-theme/static/share.svg" alt="share" className="ShareButton__StyledShareIcon-sc-151rsxt-1 kogIld" />
                    </li>
                </ul>
            </div>
        </nav>
    );
}

export default Navbar;
