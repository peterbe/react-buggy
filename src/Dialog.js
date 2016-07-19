import React, { Component } from 'react';

export default class Dialog extends Component {
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
      <dialog>
        <span className="blinking">Loading</span>
      </dialog>
   );
  }
}
