import React, { Component } from 'react';

export default class List extends Component {
  constructor(props) {
    super(props);
    // this.state = { counter: 0 };
  }

  // componentDidMount() {
  //   this.interval = setInterval(this.tick.bind(this), 1000);
  // }

  // tick() {
  //   this.setState({
  //     counter: this.state.counter + 1
  //   });
  // }
  //
  // componentWillUnmount() {
  //   clearInterval(this.interval);
  // }

  render() {
    return (
      <div className="pure-u-1" id="list">
        <div id="list-options">
          <form className="pure-form" id="searchform">
            <input
              type="text"
              id="search_q"
              className="pure-input-rounded"
              placeholder="Search..." />
            <button
              className="pure-button secondary-button"
              type="button"
              >Clear</button>
            <button
              className="pure-button secondary-button"
              type="button" title="Filter by Project"
              >
                <span>Filter</span>
                <span>Close</span>
                <span>(X)</span>
            </button>
          </form>
        </div>{/* /list-options */}
        <div id="product-filters">
          <ul>
            <li className="selected">
              <a href="#">ALL (X)</a>
            </li>
            <li>
              <a href="#">socorro (X)</a>
              <a href="#">airmozilla (X)</a>
            </li>
          </ul>
        </div>{/* /product-filters */}
        <div id="list-items">
          <div className="email-item pure-g">
            <div className="pure-u">
              {/* Only do this if we have an email address */}
              <img
                className="email-avatar"
                alt="avatar"
                title="Person who created the Issue/Pull Request"/>
              <br/>
              <br/>
              <span
                style={{marginLeft: 10}}
                className="badge badge-small"
                title="Number of comments">x</span>
            </div>
            <div className="pure-u-5-6">
              <h5 className="email-name">ORG / REPO</h5>
              <h4 className="email-subject">
                <img
                  className="padlock"
                  src="static/images/padlock.png"
                  alt="Padlock"
                  title="Only visible to people who are cool"/>
                <a
                  href="{{ makeBugzillaLink(bug.id) }}"
                  target="_blank">ID</a>
                <span>SUMMARY</span>
              </h4>

              <p className="email-desc">
                <img
                  src="static/images/avatar.png"
                  className="email-avatar"
                  alt="Avatar"
                  title="Last person to comment"
                  height="32" width="32"/>
                <span>extract...</span>
                <br/>
                <span className="badge badge-small badge-*status*">*status*</span>
              </p>
            </div>
          </div>{/* /email-item */}

          <div className="email-item">
            <p>Filtered too much?</p>
            <p>Matching only: <code>search</code>.
              <a href="#">Reset</a>
            </p>
            <p>
              You've filtered by: <br/> <b>*projects</b>.
              <a href="#">Reset</a>
            </p>
            <p>
              Only showing: <br/> <b>*status*</b>.
              <a href="#">Reset</a>
            </p>
          </div>{/* /email-item */}

          <div className="email-item">
            <p>
              Limited to the XXX most recently changed.<br/>
              <a href="#">Load more</a>
            </p>
          </div>{/* /email-item */}

        </div>
      </div>
   );
  }
}
