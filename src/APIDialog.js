import React, { Component, PropTypes } from 'react';
import { ShowProject, RenderMarkdown } from './Common'


export default class APIDialog extends Component {
  static propTypes = {
    ratelimitLimit: PropTypes.number.isRequired,
    ratelimitRemaining: PropTypes.number.isRequired,
    toggleShowConfig: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {closed: false}
  }

  clickShowConfig(event) {
    event.preventDefault()
    this.props.toggleShowConfig()
    this.setState({closed: true})
  }

  closeDialog(event) {
    event.preventDefault()
    this.setState({closed: true})
  }

  render() {
    const { ratelimitLimit, ratelimitRemaining } = this.props
    if (!ratelimitRemaining && !closed) {
      return <RateLimitedError
        limit={ratelimitLimit}
        closeDialog={e => this.closeDialog(e)}
        clickShowConfig={e => this.clickShowConfig(e)} />
    }
    return null
  }
}


const RateLimitedError = ({ limit, clickShowConfig, closeDialog }) => {
  return (
    <div className="pure-u error-dialog">
      <p className="close">
        <a
          title="Close warning"
          href="#"
          onClick={e => closeDialog(e)}
        >&times;</a>
      </p>
      <h2>API Rate Limit Maxed Out</h2>
      <h3>You have reached the limit of <b>{limit}</b>.</h3>
      <h4>To remedy this, click <a href="#" onClick={e => clickShowConfig(e)}>Config</a> and sign in with GitHub</h4>
    </div>
  )
}
