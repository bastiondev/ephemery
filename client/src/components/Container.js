import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons'

export default function Container(props) {
  return (
    <div style={{maxWidth: '1000px'}} 
        className="container pt-lg-6 pt-4 d-flex flex-column h-100">
      <h1 className="display-3 text-center mb-5">Ephemery</h1>
      <div className="flex-shrink-0">
        {props.children}
      </div>
      <footer className="footer mt-auto py-3 text-center">
        <p>
          Made with &hearts; in Atlanta &nbsp;&middot;&nbsp; &copy; <a href="https://bastion.dev" className="link-dark">Bastion Data</a> 2021 &nbsp;&middot;&nbsp; <a href="https://github.com/bastiondev/ephemery"><FontAwesomeIcon icon={faGithub} className="link-dark"/></a>
        </p>
      </footer>
    </div>
  )
}