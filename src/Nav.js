import React, { Component, PropTypes } from 'react';

export default class Nav extends Component {
  static propTypes = {
    countStatuses: PropTypes.object.isRequired,
    selectedStatuses: PropTypes.array.isRequired,
    selectStatus: PropTypes.func.isRequired,
    toggleShowConfig: PropTypes.func.isRequired,
    ratelimitLimit: PropTypes.number.isRequired,
    ratelimitRemaining: PropTypes.number.isRequired,
    _clearAll:  PropTypes.func.isRequired,
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

  toggleShowConfig(event) {
    event.preventDefault()
    this.props.toggleShowConfig()
  }

  render() {
    let {
      countStatuses,
      selectedStatuses
    } = this.props
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
              <li className="pure-menu-heading">Options</li>
              <li><a href="#" onClick={e => this.toggleShowConfig(e)}>Config</a></li>
              <li><a href="#">About</a></li>
              <li>
                <a
                  href="#"
                  title="Debug option"
                  onClick={(e) => this.props._clearAll(e)}>Clear All<sup>*</sup></a></li>

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
            <RatelimitProgressBar
              limit={this.props.ratelimitLimit}
              remaining={this.props.ratelimitRemaining}
              />

          </div>
        </div>
      </div>
   );
  }
}

const RatelimitProgressBar = ({ limit, remaining }) => {
  let p = parseInt(100 * remaining / limit)
  // p = Math.max(p, 1)
  let backgroundColor = '#86e01e' // 100%
  if (p <= 5) {
    backgroundColor = '#f63a0f'
  } else if (p <= 25) {
    backgroundColor = '#f27011'
  } else if (p <= 50) {
    backgroundColor = '#f2b01e'
  } else if (p <= 75) {
    backgroundColor = '#f2d31b'
  }
  let style = {width: p + '%', backgroundColor: backgroundColor}
  let title = 'GitHub API Rate limit progress\n'
  title += `Limit: ${limit} Remaining: ${remaining} (${p}%)`
  return (
    <div className="progress"
      title={title}>
      <div className="progress-bar" style={style}></div>
    </div>
  )
}

const StatusLink = ({ status, count, clickStatus }) => {
  count = count || 0
  let text = {
    'all': 'ALL',
    'open': 'OPEN',
    'closed': 'CLOSED',
    'assigned': 'ASSIGNED TO ME',
  }[status]
  let className = 'status status-' + status.toUpperCase()
  return (
    <a href="#" onClick={(e) => clickStatus(e, status)}>
      <span className={className}></span>{text} ({count})
    </a>
  )
}
