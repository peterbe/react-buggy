import { AppContainer } from 'react-hot-loader';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

const rootEl = document.getElementById('root');
// If you get errors like:
// Warning: React.createElement: type should not be null, undefined, boolean, or number. It should be a string (for DOM elements) or a ReactClass (for composite components). Check the render method of `AppContainer`.
// then comment out these lines and uncomment the ones below.
ReactDOM.render(
  <AppContainer>
    <App />
  </AppContainer>,
  rootEl
);
// ReactDOM.render(
//   <App />,
//   rootEl
// );

if (module.hot) {
  module.hot.accept('./App', () => {
    // If you use Webpack 2 in ES modules mode, you can
    // use <App /> here rather than require() a <NextApp />.
    const NextApp = require('./App').default;
    ReactDOM.render(
      <AppContainer>
         <NextApp />
      </AppContainer>,
      rootEl
    );
  });
}
