import React from 'react';

// XXX we probably don't need this
export default function Layout({ children }) {
  return (
    <div className="pure-g-r content" id="layout">
      {children}
    </div>
  )
}
