import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationArrow } from '@fortawesome/free-solid-svg-icons';
import { 
  faChrome, 
  faFirefox, 
  faEdge, 
  faSafari, 
  faInternetExplorer 
} from '@fortawesome/free-brands-svg-icons';

export default function GuestCard(props) {
  
  const guest = props.guest;

  let broserIcon = <span />;
  if (/Firefox/.test(guest.browser)) {
    broserIcon = <FontAwesomeIcon icon={faFirefox} className="" />
  } else if (/Edge/.test(guest.browser)) {
    broserIcon = <FontAwesomeIcon icon={faEdge} className="" />
  } else if (/Safari/.test(guest.browser)) {
    broserIcon = <FontAwesomeIcon icon={faSafari} className="" />
  } else if (/Chrome/.test(guest.browser)) {
    broserIcon = <FontAwesomeIcon icon={faChrome} className="" />
  } else if (/IE/.test(guest.browser)) {
    broserIcon = <FontAwesomeIcon icon={faInternetExplorer} className="" />
  }

  return (
    <div className="col">
      <div className="card">
        <div className="card-body">
          <table className="table table-borderless table-sm mb-0">
            <tbody>
              <tr>
                <td width="1%" className="text-end text-nowrap">
                  <strong>Browser</strong>
                </td>
                <td>{broserIcon} {guest.browser} / {guest.os}</td>
              </tr>
              <tr>
                <td width="1%" className="text-end text-nowrap">
                  <strong>Location</strong>
                </td>
                <td>
                  <FontAwesomeIcon icon={faLocationArrow} /> {guest.location || 'Unknown'}
                </td>
              </tr>
              <tr>
                <td width="1%" className="text-end text-nowrap">
                  <strong>IP</strong>
                </td>
                <td>{guest.ip}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

}
