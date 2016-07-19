import React, { Component } from 'react';
import Layout from './Layout';
import Dialog from './Dialog';
import Nav from './Nav';
import List from './List';
import Main from './Main';

// If you use React Router, make this component
// render <Router> with your routes. Currently,
// only synchronous routes are hot reloaded, and
// you will see a warning from <Router> on every reload.
// You can ignore this warning. For details, see:
// https://github.com/reactjs/react-router/issues/2182

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      countStatuses: {},
      selectedStatuses: [],
      projects: [{org: 'mozilla', repo:'airmozilla', count:123}],
    }
    this.selectStatus = this.selectStatus.bind(this)
  }

  selectStatus(status) {
    console.log('STATUS', status)
  }

  addProject(project) {
    let projects = this.state.projects
    projects.push(project)
    this.setState({projects: projects})
  }

  render() {
    return (
      <Layout>
        {/*<Dialog />*/}
        <Nav
          countStatuses={this.state.countStatuses}
          selectedStatuses={this.state.selectedStatuses}
          selectStatus={this.selectStatus}
          />
        <List />
        <Main
          projects={this.state.projects}
          addProject={(p) => this.addProject(p)}/>
      </Layout>
    );
  }
}
