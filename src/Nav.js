import React, { Component, PropTypes } from 'react';

export default class Nav extends Component {
  static propTypes = {
    countStatuses: PropTypes.object.isRequired,
    selectedStatuses: PropTypes.array.isRequired,
    selectStatus: PropTypes.func.isRequired,
  }
  constructor(props) {
    super(props);
    // this.state = { counter: 0 };
    this.clickStatus = this.clickStatus.bind(this)
  }

  clickStatus(event, status) {
    event.preventDefault()
    this.props.selectStatus(status)
    // console.log('B', b);
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
    let countStatuses = this.props.countStatuses
    let selectedStatuses = this.props.selectedStatuses
    return (
      <div className="pure-u" id="nav">
        <a href="#" className="nav-menu-button">Menu</a>
        <div className="nav-inner">
          <div className="pure-menu pure-menu-open">
            <ul>
              <li className="pure-menu-heading">Statuses</li>

                <li className="label">
                  <StatusLink
                    clickStatus={this.clickStatus}
                    status={'all'}
                    count={countStatuses.all} />
                </li>
                <li className="label">
                  <StatusLink
                    clickStatus={this.clickStatus}
                    status={'open'}
                    count={countStatuses.open} />
                </li>
                <li className="label">
                  <StatusLink
                    clickStatus={this.clickStatus}
                    status={'closed'}
                    count={countStatuses.closed} />
                </li>
                <li className="label">
                  <StatusLink
                    clickStatus={this.clickStatus}
                    status={'assigned'}
                    count={countStatuses.assigned} />
                </li>
                {/*
                <li className="label">
                  <a href="#" onClick={this.clickStatus.bind('open')}>
                    <span className="status status-open"></span>OPEN ({countStatus.open || 0})
                  </a>
                </li>
                <li className="label">
                  <a href="#" onClick={this.clickStatus.bind('closed')}>
                    <span className="status status-closed"></span>CLOSED ({countStatus.closed || 0})
                  </a>
                </li>
                <li className="label">
                  <a href="#" onClick={this.clickStatus.bind('assigned')}>
                    <span className="status status-assigned"></span>ASSIGNED TO ME ({countStatus.assigned || 0})
                  </a>
                </li>
                */}
              <li className="pure-menu-heading">Options</li>
              <li><a href="#">Config</a></li>
              <li><a href="#">About</a></li>
            </ul>
            <p className="bugzfeed-status">
              { this.props.bugzfeedConnected ?
                <img src="static/images/connected.gif" alt="Connected to Bugzfeed" /> :
                  <img src="static/images/disconnected.gif" alt="Not connected to Bugzfeed" />
              }
              { this.props.bugzfeedConnected ?
                <span title="Not connected to Bugzfeed">Not connected</span> :
                <span title="Connected to Bugzfeed version XXX">Connected</span>
              }
            </p>
          </div>
        </div>
      </div>
   );
  }
}

const StatusLink = ({ status, count, clickStatus }) => {
  count = count || 0
  let text = {
    'all': 'ALL',
    'open': 'OPEN',
    'closed': 'CLOSED',
    'assigned': 'ASSIGNED TO ME',
  }[status]
  let className = "status status-" + status.toUpperCase()
  return (
    <a href="#" onClick={(e) => clickStatus(e, status)}>
      <span className={className}></span>{text} ({count})
    </a>
  )
}
